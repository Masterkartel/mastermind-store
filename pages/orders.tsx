// pages/orders.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Head from "next/head";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  img?: string;
};

type Order = {
  id: string;                 // e.g. "T698660489556561"
  reference?: string;         // Paystack reference
  createdAt?: string;         // ISO string
  total: number;
  status?: "PENDING" | "COMPLETED" | "FAILED";
  paymentStatus?: "PENDING" | "PAID" | "FAILED"; // UI line
  items: OrderItem[];
};

const ORDERS_KEY = "mm_orders";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [verifyingRefs, setVerifyingRefs] = useState<Record<string, boolean>>(
    {}
  );

  // Load orders from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      const arr: Order[] = raw ? JSON.parse(raw) : [];
      setOrders(Array.isArray(arr) ? arr : []);
    } catch {
      setOrders([]);
    }
  }, []);

  // Save orders when they change
  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch {}
  }, [orders]);

  // Auto-verify any PENDING order that has a reference
  useEffect(() => {
    const pending = orders.filter(
      (o) => (o.status ?? "PENDING") === "PENDING" && o.reference
    );
    if (!pending.length) return;

    const controller = new AbortController();

    (async () => {
      for (const o of pending) {
        const ref = o.reference!;
        if (verifyingRefs[ref]) continue;

        setVerifyingRefs((m) => ({ ...m, [ref]: true }));
        try {
          const res = await fetch(`/api/paystack-verify?reference=${encodeURIComponent(ref)}`, {
            method: "GET",
            signal: controller.signal,
          });

          // If API is reachable and returns result
          if (res.ok) {
            const json = await res.json().catch(() => ({} as any));

            // Heuristic: accept multiple possible shapes from the worker
            const ok =
              json?.status === "success" ||
              json?.data?.status === "success" ||
              json?.data?.data?.status === "success";

            const failed =
              json?.status === "failed" ||
              json?.data?.status === "failed" ||
              json?.data?.data?.status === "failed";

            setOrders((prev) =>
              prev.map((ord) => {
                if (ord.reference !== ref) return ord;
                if (ok) {
                  return {
                    ...ord,
                    status: "COMPLETED",
                    paymentStatus: "PAID",
                  };
                }
                if (failed) {
                  return {
                    ...ord,
                    status: "FAILED",
                    paymentStatus: "FAILED",
                  };
                }
                // No conclusive answer; keep pending
                return ord;
              })
            );
          }
        } catch {
          // Network fail: keep it pending; user can refresh later
        } finally {
          setVerifyingRefs((m) => {
            const n = { ...m };
            delete n[ref];
            return n;
          });
        }
      }
    })();

    return () => controller.abort();
  }, [orders, verifyingRefs]);

  const niceDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const hasOrders = useMemo(() => orders.length > 0, [orders]);

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>My Orders • Mastermind</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Header */}
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <span className="brandDot" aria-hidden />
            My Orders
          </div>
          <Link href="/" className="backBtn" aria-label="Back to Shop">
            ← Back to Shop
          </Link>
        </div>
      </header>

      <main className="container" style={{ padding: "12px" }}>
        {!hasOrders ? (
          <div className="empty">
            No orders yet.{" "}
            <Link href="/" className="link">
              Go back to shop
            </Link>
            .
          </div>
        ) : (
          <div className="col">
            {orders
              .slice()
              .reverse()
              .map((o, idx) => {
                const topBadge =
                  o.status === "COMPLETED"
                    ? "COMPLETED"
                    : o.status === "FAILED"
                    ? "FAILED"
                    : "PENDING";
                const payLine =
                  o.paymentStatus ??
                  (o.status === "COMPLETED"
                    ? "PAID"
                    : o.status === "FAILED"
                    ? "FAILED"
                    : "PENDING");
                return (
                  <article key={(o.reference || o.id) + idx} className="orderCard">
                    <div className="orderCard__head">
                      <div className="idRow">
                        <div className="muted">Order</div>
                        <div className="mono strong">
                          #{o.id || o.reference || "—"}
                        </div>
                        <div className={`pill pill--${topBadge.toLowerCase()}`}>
                          {topBadge}
                        </div>
                      </div>
                      <div className="right">
                        <div className="amount">
                          KES {Math.round(o.total).toLocaleString("en-KE")}
                        </div>
                      </div>
                    </div>

                    {o.createdAt ? (
                      <div className="orderDate">{niceDate(o.createdAt)}</div>
                    ) : null}

                    {/* Items (first item expanded) */}
                    <div className="items">
                      {o.items.map((it, i) => (
                        <div className="item" key={it.id + i}>
                          <div className="thumbWrap">
                            {it.img ? (
                              <img
                                src={it.img}
                                alt={it.name}
                                className="thumb"
                                loading="lazy"
                              />
                            ) : (
                              <div className="thumb thumb--empty" />
                            )}
                          </div>
                          <div className="itemBody">
                            <div className="itemName">{it.name}</div>
                            <div className="muted">
                              KES {Math.round(it.price).toLocaleString("en-KE")} ×{" "}
                              {it.qty} ={" "}
                              <span className="strong">
                                KES{" "}
                                {Math.round(it.price * it.qty).toLocaleString("en-KE")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Meta */}
                    <div className="meta">
                      <div className="metaRow">
                        <div className="muted">Reference</div>
                        <div className="mono">
                          {o.reference || "—"}{" "}
                          {o.reference ? (
                            <button
                              className="copyBtn"
                              onClick={() => {
                                navigator.clipboard
                                  .writeText(o.reference!)
                                  .catch(() => {});
                              }}
                            >
                              Copy
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="metaRow">
                        <div className="muted">Status</div>
                        <div>
                          <span
                            className={`pill pill--${
                              payLine === "PAID"
                                ? "completed"
                                : payLine === "FAILED"
                                ? "failed"
                                : "pending"
                            }`}
                          >
                            {payLine}
                          </span>
                          {o.reference && (o.status ?? "PENDING") === "PENDING" ? (
                            <span className="checking">
                              {verifyingRefs[o.reference]
                                ? " • checking…"
                                : " • awaiting confirmation"}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="metaRow">
                        <div className="muted">Total</div>
                        <div className="strong">
                          KES {Math.round(o.total).toLocaleString("en-KE")}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        )}
      </main>

      <style jsx>{`
        .container { max-width: 980px; margin: 0 auto; }
        .topbar { background:#111; color:#fff; position:sticky; top:0; z-index:20; }
        .topbar__inner { max-width:980px; margin:0 auto; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; }
        .brand { font-weight:800; display:flex; align-items:center; gap:10px; }
        .brandDot { width:18px; height:18px; border-radius:6px; background:#f4d03f; display:inline-block; }
        .backBtn { background:#fff; color:#111; padding:8px 14px; border-radius:12px; text-decoration:none; border:1px solid #eee; font-weight:700; }

        .empty { margin:18px; background:#fff; border:1px solid #eee; border-radius:12px; padding:16px; }
        .link { color:#5b34eb; font-weight:700; }

        .col { display:grid; gap:12px; }
        .orderCard { background:#fff; border:1px solid #eee; border-radius:16px; padding:12px; }
        .orderCard__head { display:flex; justify-content:space-between; align-items:center; gap:10px; }
        .idRow { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .muted { color:#777; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .strong { font-weight:800; }
        .amount { font-weight:800; }
        .orderDate { color:#666; margin:4px 0 8px; }

        .items { display:grid; gap:8px; margin-top:6px; }
        .item { display:flex; gap:12px; align-items:center; }
        .thumbWrap { width:56px; height:56px; border-radius:12px; background:#f4f4f4; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .thumb { width:100%; height:100%; object-fit:cover; display:block; }
        .thumb--empty { width:56px; height:56px; border-radius:12px; background:#eee; }
        .itemBody { flex:1; }
        .itemName { font-weight:800; }

        .meta { margin-top:10px; display:grid; gap:8px; }
        .metaRow { display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; }
        .copyBtn { margin-left:8px; border:1px solid #e5e5e5; background:#fff; padding:2px 8px; border-radius:10px; font-weight:700; cursor:pointer; }
        .checking { color:#888; font-size:12px; margin-left:6px; }

        .pill { padding:4px 10px; border-radius:999px; font-weight:800; font-size:12px; text-transform:uppercase; }
        .pill--completed { background:#dff5e6; color:#116b2d; }
        .pill--pending { background:#f4f4f4; color:#444; }
        .pill--failed { background:#fde2e2; color:#8a1f1f; }
      `}</style>
    </div>
  );
}
