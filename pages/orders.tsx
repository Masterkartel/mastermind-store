// pages/orders.tsx
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

type OrderItem = {
  name: string;
  price: number;
  qty: number;
  img?: string; // public path like "/torch.png"
};

type Order = {
  id: string;                 // e.g. reference
  status: "pending" | "completed" | "failed" | "paid";
  total: number;
  createdAt: string;          // ISO string
  items: OrderItem[];
  reference?: string;
  paymentStatus?: "paid" | "failed" | "pending" | "completed";
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  // Load orders saved by checkout (from localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mm_orders");
      if (raw) {
        const parsed: Order[] = JSON.parse(raw);
        setOrders(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setOrders([]);
    }
  }, []);

  // Sort newest first
  const list = useMemo(
    () =>
      [...orders].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [orders]
  );

  const fmtKES = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;
  const fmtDateTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-KE", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pillFor = (s?: string) => {
    const v = (s || "").toLowerCase();
    if (v === "completed" || v === "paid") return "pill pill--ok";
    if (v === "failed") return "pill pill--bad";
    return "pill pill--pending";
  };

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>My Orders • Mastermind</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Top bar */}
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <img src="/favicon.ico" className="brandIcon" alt="" />
            My Orders
          </div>
          <a href="/" className="backBtn">← Back to Shop</a>
        </div>
      </header>

      <main className="container" style={{ padding: "14px 12px 24px" }}>
        {list.length === 0 ? (
          <div className="empty">No orders yet.</div>
        ) : (
          <div className="stack">
            {list.map((o) => {
              const topStatus = o.status || o.paymentStatus || "pending";
              return (
                <article key={o.id} className="orderCard">
                  <div className="orderCard__top">
                    <div className="orderTitle">
                      <div className="muted">Order</div>
                      <div className="orderId">#{o.id}</div>
                      <div className="orderDate">{fmtDateTime(o.createdAt)}</div>
                    </div>
                    <div className="orderTopRight">
                      <span className={pillFor(topStatus)}>
                        {topStatus.toUpperCase()}
                      </span>
                      <span className="orderTotal">{fmtKES(o.total)}</span>
                    </div>
                  </div>

                  <div className="divider" />

                  {/* Items */}
                  <div className="items">
                    {o.items.map((it, idx) => (
                      <div key={idx} className="itemRow">
                        {it.img ? (
                          <img
                            src={it.img}
                            alt={it.name}
                            className="thumb"
                            loading="lazy"
                          />
                        ) : (
                          <div className="thumb thumb--blank" aria-hidden />
                        )}

                        <div className="itemMain">
                          <div className="itemName">{it.name}</div>
                          <div className="itemMeta">
                            {fmtKES(it.price)} × {it.qty} ={" "}
                            <strong>{fmtKES(it.price * it.qty)}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="summary">
                    <div className="row">
                      <div className="label">Reference</div>
                      <div className="value mono">
                        {o.reference || o.id}
                      </div>
                    </div>
                    <div className="row">
                      <div className="label">Status</div>
                      <div className="value">
                        <span className={pillFor(o.paymentStatus || o.status)}>
                          {(o.paymentStatus || o.status || "pending")
                            .toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="row">
                      <div className="label">Total</div>
                      <div className="value strong">{fmtKES(o.total)}</div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <style jsx>{`
        .container { max-width: 1000px; margin: 0 auto; }
        .topbar { position: sticky; top: 0; z-index: 50; background: #111; color: #fff; border-bottom: 1px solid rgba(255,255,255,.08); }
        .topbar__inner { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 10px 16px; }
        .brand { font-weight: 800; display: flex; align-items: center; gap: 8px; letter-spacing: .2px; }
        .brandIcon { width: 22px; height: 22px; border-radius: 4px; }
        .backBtn { background: #fff; color: #111; text-decoration: none; border-radius: 12px; padding: 8px 12px; border: 1px solid #e7e7e7; font-weight: 700; }

        .empty { background: #fff; border: 1px solid #eee; border-radius: 14px; padding: 18px; text-align: center; color: #666; }
        .stack { display: grid; gap: 14px; }

        .orderCard { background: #fff; border: 1px solid #eee; border-radius: 16px; padding: 12px; }
        .orderCard__top { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
        .orderTitle { display: grid; gap: 2px; }
        .orderId { font-weight: 800; }
        .orderDate { color: #888; font-size: 12px; }
        .orderTopRight { display: flex; align-items: center; gap: 8px; }
        .orderTotal { font-weight: 800; color: #0a0a0a; }

        .divider { height: 1px; background: #f0f0f0; margin: 10px 0; }

        .items { display: grid; gap: 10px; }
        .itemRow { display: grid; grid-template-columns: 46px 1fr; gap: 10px; align-items: center; }
        .thumb { width: 42px; height: 42px; border-radius: 8px; background: #f5f5f5; object-fit: contain; }
        .thumb--blank { background: #f2f2f2; }
        .itemMain { display: grid; gap: 2px; }
        .itemName { font-weight: 800; }
        .itemMeta { color: #6b7280; font-size: 13px; }

        .summary { margin-top: 8px; display: grid; gap: 6px; }
        .row { display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center; }
        .label { color: #6b7280; }
        .value { }
        .value.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .value.strong { font-weight: 800; }

        .muted { color: #9ca3af; }

        .pill { padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 800; }
        .pill--ok { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
        .pill--bad { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .pill--pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
      `}</style>
    </div>
  );
}
