// pages/orders.tsx
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  img?: string;
};

type Order = {
  id: string;                 // "T169..." or similar
  reference: string;          // same as id or paystack ref
  createdAt?: string;         // ISO datetime
  total: number;
  items: OrderItem[];
  // paymentStatus is what we verify from Paystack
  paymentStatus: "PAID" | "FAILED" | "PENDING";
  // (optional) maintain an old 'status' for backward compatibility
  status?: "COMPLETED" | "FAILED" | "PENDING";
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({}); // collapsed by default

  // load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mm_orders");
      if (!raw) return;
      const parsed: Order[] = JSON.parse(raw);

      // normalize & collapse by default
      const normalized = parsed.map((o) => {
        const statusFromPayment =
          o.paymentStatus === "PAID"
            ? "COMPLETED"
            : o.paymentStatus === "FAILED"
            ? "FAILED"
            : "PENDING";
        return {
          ...o,
          status: statusFromPayment as Order["status"],
        };
      });

      setOrders(normalized);
    } catch {
      setOrders([]);
    }
  }, []);

  const persist = (list: Order[]) => {
    setOrders(list);
    try {
      localStorage.setItem("mm_orders", JSON.stringify(list));
    } catch {}
  };

  // helper: copy
  const copy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      alert("Copied!");
    } catch {
      alert("Copy failed.");
    }
  };

  // Re-verify one order against /api/paystack-verify
  const reverify = async (ord: Order) => {
    try {
      const res = await fetch(
        `/api/paystack-verify?reference=${encodeURIComponent(ord.reference)}`
      );
      const data = await res.json();
      // data.status: "success" | "failed" | "pending"
      const newPayment =
        data.status === "success"
          ? "PAID"
          : data.status === "failed"
          ? "FAILED"
          : "PENDING";

      const newStatus =
        newPayment === "PAID"
          ? "COMPLETED"
          : newPayment === "FAILED"
          ? "FAILED"
          : "PENDING";

      const next = orders.map((o) =>
        o.id === ord.id ? { ...o, paymentStatus: newPayment, status: newStatus } : o
      );
      persist(next);
    } catch (e) {
      alert("Could not verify right now. Try again later.");
    }
  };

  // format
  const currency = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;
  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const dd = d.toLocaleDateString("en-GB"); // 12/09/2025
    const tt = d.toLocaleTimeString("en-GB", { hour12: false }); // 18:13:01
    return `${dd}, ${tt}`;
    // If you want "EAT": append " EAT"
  };

  // pill utils
  const headPillClass = (o: Order) => {
    switch (o.paymentStatus) {
      case "PAID":
        return "pill pill--green";
      case "FAILED":
        return "pill pill--red";
      default:
        return "pill pill--grey";
    }
  };
  const headPillText = (o: Order) => {
    switch (o.paymentStatus) {
      case "PAID":
        return "COMPLETED";
      case "FAILED":
        return "FAILED";
      default:
        return "PENDING";
    }
  };
  const statusPillClass = (o: Order) => {
    switch (o.paymentStatus) {
      case "PAID":
        return "pill pill--green";
      case "FAILED":
        return "pill pill--red";
      default:
        return "pill pill--grey";
    }
  };
  const statusPillText = (o: Order) => o.paymentStatus; // already PAID/FAILED/PENDING in caps

  const toggle = (id: string) =>
    setOpenIds((m) => ({ ...m, [id]: !m[id] })); // collapsed by default

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>My Orders • Mastermind</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <img src="/favicon.ico" alt="" className="brandIcon" aria-hidden />
            My Orders
          </div>
          <a href="/" className="backBtn">← Back to Shop</a>
        </div>
      </header>

      <main className="container" style={{ padding: "10px 12px 40px" }}>
        {orders.length === 0 ? (
          <div className="empty">No orders yet.</div>
        ) : (
          <div className="list">
            {orders
              .slice()
              .reverse()
              .map((o) => {
                const open = !!openIds[o.id]; // collapsed by default
                return (
                  <article key={o.id} className="orderCard">
                    {/* Summary row (always visible) */}
                    <button
                      className="summary"
                      onClick={() => toggle(o.id)}
                      aria-expanded={open}
                    >
                      <div className="sumLeft">
                        <div className="orderId">
                          Order <span className="mono">#{o.id}</span>
                        </div>
                        {/* Date under ID */}
                        {o.createdAt ? (
                          <div className="date">{fmtDate(o.createdAt)}</div>
                        ) : null}
                      </div>
                      <div className="sumRight">
                        <span className={headPillClass(o)}>{headPillText(o)}</span>
                        <span className="amount">{currency(o.total)}</span>
                      </div>
                    </button>

                    {/* Details (only when open) */}
                    {open && (
                      <div className="details">
                        {/* Items (first item shown like before) */}
                        {o.items[0] && (
                          <div className="itemRow">
                            <div className="thumb">
                              <img
                                src={o.items[0].img || "/placeholder.png"}
                                alt=""
                                loading="lazy"
                              />
                            </div>
                            <div className="itemInfo">
                              <div className="name">{o.items[0].name}</div>
                              <div className="muted">
                                {`KES ${o.items[0].price} × ${o.items[0].qty} = `}
                                <span className="strong">
                                  {currency(o.items[0].price * o.items[0].qty)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid">
                          <div>
                            <div className="label">Reference</div>
                            <div className="refRow">
                              <code className="mono">{o.reference}</code>
                              <button
                                className="copyBtn"
                                onClick={() => copy(o.reference)}
                              >
                                Copy
                              </button>
                            </div>
                          </div>

                          <div>
                            <div className="label">Status</div>
                            <span className={statusPillClass(o)}>
                              {statusPillText(o)}
                            </span>
                          </div>

                          <div>
                            <div className="label">Total</div>
                            <div className="strong">{currency(o.total)}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
        )}
      </main>

      <style jsx>{`
        .container { max-width: 1100px; margin: 0 auto; }

        .topbar { position: sticky; top: 0; z-index: 50; background:#111; color:#fff; }
        .topbar__inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; padding:12px 12px; }
        .brand { display:flex; gap:8px; align-items:center; font-weight:800; }
        .brandIcon { width:22px; height:22px; border-radius:4px; }
        .backBtn { background:#fff; color:#111; border:1px solid #eee; border-radius:12px; padding:8px 12px; text-decoration:none; font-weight:700; }

        .list { display: grid; gap: 14px; }
        .orderCard { background:#fff; border:1px solid #eee; border-radius:16px; overflow:hidden; }

        .summary { width:100%; background:#fff; border:none; cursor:pointer; padding:14px; display:flex; align-items:center; justify-content:space-between; }
        .summary:hover { background:#fafafa; }
        .sumLeft .orderId { font-weight:800; }
        .date { color:#888; font-size:12px; margin-top:2px; }
        .sumRight { display:flex; align-items:center; gap:10px; }
        .amount { font-weight:800; color:#111; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

        .pill { padding:6px 12px; border-radius:9999px; font-weight:800; font-size:12px; letter-spacing:.2px; text-transform:uppercase; }
        .pill--green { background:#dff6e7; color:#107a42; border:1px solid #c9efd9; }
        .pill--red   { background:#ffe2e2; color:#b42318; border:1px solid #ffcece; }
        .pill--grey  { background:#eee; color:#555; border:1px solid #e2e2e2; }

        .details { padding: 0 14px 14px; border-top:1px solid #f0f0f0; }
        .itemRow { display:flex; gap:12px; align-items:center; padding:12px 0; }
        .thumb { width:56px; height:56px; border-radius:12px; background:#f2f2f2; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .thumb img { width:100%; height:100%; object-fit:cover; }
        .itemInfo .name { font-weight:800; }
        .muted { color:#666; }
        .strong { font-weight:800; }

        .grid { display:grid; gap:12px; grid-template-columns: 1fr; }
        @media (min-width: 680px) { .grid { grid-template-columns: 1fr 1fr 1fr; } }

        .label { font-size:12px; color:#666; margin-bottom:4px; }
        .refRow { display:flex; gap:8px; align-items:center; }
        .copyBtn { background:#f4d03f; color:#111; border:none; padding:6px 10px; border-radius:10px; font-weight:800; cursor:pointer; }

        .empty { color:#666; padding:16px; }
      `}</style>
    </div>
  );
}
