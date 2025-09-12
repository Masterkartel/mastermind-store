// pages/orders.tsx
import { useEffect, useState } from "react";
import Head from "next/head";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  img?: string;
};

type Order = {
  id: string; // local id (e.g. T<timestamp>)
  reference: string; // paystack reference
  createdAt?: string; // ISO
  total: number; // KES
  status?: "PENDING" | "COMPLETED" | "FAILED";
  paymentStatus?: "PENDING" | "PAID" | "FAILED";
  items: OrderItem[];
};

const ORDERS_KEY = "mm_orders";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});

  // Load saved orders
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      setOrders(Array.isArray(arr) ? arr.reverse() : []);
    } catch {
      setOrders([]);
    }
  }, []);

  // If ?ref= is present, trigger verify for that order
  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (!ref) return;
    const match = orders.find((o) => o.reference === ref);
    if (match && match.paymentStatus !== "PAID") {
      verifyOne(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const fmtDate = (iso?: string) => {
    try {
      if (!iso) return "";
      return new Date(iso).toLocaleString();
    } catch {
      return "";
    }
  };

  const currency = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

  const badge = (text: string, kind: "pending" | "paid" | "failed" | "completed") => {
    const base = "inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold";
    const map: Record<typeof kind, React.CSSProperties> = {
      pending:   { background: "#eee",    color: "#333" },
      paid:      { background: "#d9f7e7", color: "#1e7a4a" },
      failed:    { background: "#ffe2e2", color: "#a11f1f" },
      completed: { background: "#d9f7e7", color: "#1e7a4a" },
    };
    return (
      <span style={{ ...map[kind], border: "1px solid rgba(0,0,0,0.06)" }} className={base}>
        {text}
      </span>
    );
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Reference copied");
    } catch {
      alert("Could not copy");
    }
  };

  const persist = (next: Order[]) => {
    try {
      // Save in original order (oldest first)
      localStorage.setItem(ORDERS_KEY, JSON.stringify([...next].reverse()));
    } catch {}
    setOrders(next);
  };

  // Verify one order using our API (Cloudflare function /api/paystack-verify)
  const verifyOne = async (order: Order) => {
    setVerifying((v) => ({ ...v, [order.reference]: true }));
    try {
      const res = await fetch(`/api/paystack-verify?reference=${encodeURIComponent(order.reference)}`);
      const data: { status?: "PAID" | "FAILED" | "PENDING"; paidAt?: string } = await res.json();

      const next: Order[] = orders.map((o) => {
        if (o.reference !== order.reference) return o;

        const newPayment: Order["paymentStatus"] =
          data.status === "PAID" ? "PAID" : data.status === "FAILED" ? "FAILED" : "PENDING";

        const newStatus: Order["status"] =
          newPayment === "PAID" ? "COMPLETED" : newPayment === "FAILED" ? "FAILED" : "PENDING";

        const updated: Order = {
          ...o,
          paymentStatus: newPayment,
          status: newStatus,
        };
        return updated;
      });

      persist(next);
    } catch {
      // ignore
    } finally {
      setVerifying((v) => ({ ...v, [order.reference]: false }));
    }
  };

  // Auto-verify all pending on first load
  useEffect(() => {
    orders.forEach((o) => {
      if (o.paymentStatus === "PENDING") verifyOne(o);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerTitle = "My Orders";

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>{headerTitle} • Mastermind</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      {/* Top black header with favicon + visible back button */}
      <header style={{ background: "#111", color: "#fff", position: "sticky", top: 0, zIndex: 50 }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "12px 16px",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
            <img src="/favicon.ico" alt="" width={22} height={22} style={{ borderRadius: 4 }} />
            {headerTitle}
          </div>
          <a
            href="/"
            style={{
              background: "#fff",
              color: "#111",
              borderRadius: 12,
              padding: "8px 12px",
              textDecoration: "none",
              fontWeight: 800,
              border: "1px solid rgba(0,0,0,.08)",
            }}
          >
            ← Back to Shop
          </a>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "12px auto", padding: "0 12px", display: "grid", gap: 12 }}>
        {orders.length === 0 ? (
          <div style={{ color: "#666", padding: 16, background: "#fff", border: "1px solid #eee", borderRadius: 14 }}>
            No orders yet.
          </div>
        ) : (
          orders.map((o) => {
            const sum = o.items.reduce((s, it) => s + it.price * it.qty, 0);
            const headStatus =
              o.paymentStatus === "PAID"
                ? badge("PAID", "paid")
                : o.paymentStatus === "FAILED"
                ? badge("FAILED", "failed")
                : badge("PENDING", "pending");

            return (
              <details key={o.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 14 }}>
                <summary
                  style={{
                    listStyle: "none",
                    cursor: "pointer",
                    padding: 12,
                    borderBottom: "1px solid #f1f1f1",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ color: "#666", fontWeight: 800 }}>Order</div>
                  <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>#{o.id}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {headStatus}
                    <div style={{ fontWeight: 800 }}>{currency(o.total || sum)}</div>
                  </div>
                </summary>

                <div style={{ padding: 12, display: "grid", gap: 10 }}>
                  {/* Date */}
                  <div style={{ color: "#666" }}>{fmtDate(o.createdAt)}</div>

                  {/* First line preview */}
                  {o.items[0] && (
                    <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 10, alignItems: "center" }}>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 12,
                          background: "#f4f4f4",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {o.items[0].img ? (
                          <img
                            src={o.items[0].img}
                            alt={o.items[0].name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        ) : null}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800 }}>{o.items[0].name}</div>
                        <div style={{ color: "#666" }}>
                          KES {o.items[0].price} × {o.items[0].qty} ={" "}
                          <span style={{ fontWeight: 800 }}>KES {o.items[0].price * o.items[0].qty}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reference + copy */}
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center" }}>
                    <div style={{ color: "#666" }}>Reference</div>
                    <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{o.reference}</div>
                    <button
                      onClick={() => copyToClipboard(o.reference)}
                      style={{
                        background: "#f4d03f",
                        color: "#111",
                        border: "none",
                        borderRadius: 10,
                        padding: "6px 10px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Copy
                    </button>
                  </div>

                  {/* Status + reverify */}
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "center" }}>
                    <div style={{ color: "#666" }}>Status</div>
                    <div>
                      {o.paymentStatus === "PAID"
                        ? badge("PAID", "paid")
                        : o.paymentStatus === "FAILED"
                        ? badge("FAILED", "failed")
                        : badge("PENDING", "pending")}
                      <button
                        onClick={() => verifyOne(o)}
                        disabled={!!verifying[o.reference]}
                        style={{
                          marginLeft: 10,
                          background: "#fff",
                          border: "1px solid #ddd",
                          borderRadius: 10,
                          padding: "6px 10px",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {verifying[o.reference] ? "Checking…" : "Re-verify"}
                      </button>
                    </div>
                  </div>

                  {/* Total */}
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10 }}>
                    <div style={{ color: "#666" }}>Total</div>
                    <div style={{ fontWeight: 800 }}>{currency(o.total || sum)}</div>
                  </div>
                </div>
              </details>
            );
          })
        )}
      </main>
    </div>
  );
}
