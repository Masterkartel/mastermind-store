// pages/orders.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Head from "next/head";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number; // unit price
};

type Order = {
  id: string;           // e.g., paystack reference or generated uuid
  dateISO: string;      // ISO string, e.g., new Date().toISOString()
  total: number;        // grand total
  currency: string;     // "KES"
  items: OrderItem[];
  status?: "paid" | "pending" | "failed" | "refunded";
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on client
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mm_orders");
      if (raw) {
        const parsed = JSON.parse(raw) as Order[];
        if (Array.isArray(parsed)) setOrders(parsed);
      }
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  }, []);

  // newest first
  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      const da = new Date(a.dateISO).getTime() || 0;
      const db = new Date(b.dateISO).getTime() || 0;
      return db - da;
    });
  }, [orders]);

  const currency = (n: number, cur: string) =>
    `${cur} ${Math.round(n).toLocaleString("en-KE")}`;

  const clearOrders = () => {
    if (!confirm("Remove all saved orders from this device?")) return;
    try {
      localStorage.removeItem("mm_orders");
      setOrders([]);
    } catch {}
  };

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa", minHeight: "100vh" }}>
      <Head>
        <title>My Orders • Mastermind Electricals & Electronics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Top bar */}
      <header className="topbar">
        <div className="topbar__inner">
          <Link href="/" className="brand">
            <img src="/favicon.ico" alt="" className="brandIcon" aria-hidden />
            Mastermind Electricals & Electronics
          </Link>
          <div className="rightActions">
            <Link href="/" className="btn btn--light small">← Back to Shop</Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: "16px 12px 40px" }}>
        <h1 className="h1">My Orders</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          Orders on this page are saved only on this device.
        </p>

        {!loaded ? (
          <div className="card" style={{ marginTop: 14 }}>Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="empty">
            <div className="empty__box">No orders yet</div>
            <Link href="/" className="btn btn--accent" style={{ marginTop: 10 }}>
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="list">
              {sorted.map((o) => {
                const date = new Date(o.dateISO);
                const when = isNaN(date.getTime())
                  ? o.dateISO
                  : date.toLocaleString();
                return (
                  <article className="order" key={o.id}>
                    <div className="order__head">
                      <div>
                        <div className="order__id">Order #{o.id}</div>
                        <div className="order__meta">{when}</div>
                      </div>
                      <div className="order__total">
                        {currency(o.total || 0, o.currency || "KES")}
                        {o.status ? (
                          <span className={`badge badge--${o.status}`}>{o.status}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="items">
                      {o.items?.map((it) => (
                        <div className="item" key={it.id}>
                          <div className="item__name">{it.name}</div>
                          <div className="item__qty">×{it.qty}</div>
                          <div className="item__price">
                            {currency((it.price || 0) * (it.qty || 0), o.currency || "KES")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>

            <button className="btn btn--light" onClick={clearOrders} style={{ marginTop: 12 }}>
              Clear orders on this device
            </button>
          </>
        )}
      </main>

      <style jsx>{`
        .container { max-width: 900px; margin: 0 auto; }
        .topbar { position: sticky; top: 0; z-index: 10; background: #111; color: #fff; border-bottom: 1px solid rgba(255,255,255,.08); }
        .topbar__inner { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; padding: 10px 12px; }
        .brand { color:#fff; text-decoration:none; font-weight:800; letter-spacing:.3px; display:flex; align-items:center; gap:8px; }
        .brandIcon { width:22px; height:22px; border-radius:4px; }
        .rightActions { display:flex; gap:8px; }
        .h1 { font-size:26px; font-weight:800; margin: 8px 0 6px; }
        .muted { color:#666; }

        .btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; border-radius:12px; font-weight:800; text-decoration:none; cursor:pointer; }
        .btn--accent { background:#02c39a; color:#111; padding:10px 14px; border:none; } /* teal-ish to stand out here */
        .btn--light { background:#fff; color:#111; padding:10px 14px; border:1px solid #eee; }
        .small { padding:8px 12px; }

        .card { background:#fff; border:1px solid #eee; border-radius:16px; padding:14px; }

        .empty { display:grid; justify-items:center; gap:8px; margin-top:16px; }
        .empty__box { background:#fff; border:1px dashed #ddd; color:#777; border-radius:12px; padding:18px; }

        .list { display:grid; gap:12px; margin-top:14px; }
        .order { background:#fff; border:1px solid #eee; border-radius:16px; padding:12px; }
        .order__head { display:grid; grid-template-columns: 1fr auto; align-items:center; gap:8px; }
        .order__id { font-weight:800; }
        .order__meta { color:#666; font-size:12px; }
        .order__total { display:flex; align-items:center; gap:8px; font-weight:800; }
        .badge { padding:4px 8px; border-radius:999px; font-size:12px; font-weight:800; text-transform:capitalize; }
        .badge--paid { background:#e9fbe7; color:#145a32; border:1px solid #c8f0c3; }
        .badge--pending { background:#fff7e6; color:#7a4e00; border:1px solid #ffe2a8; }
        .badge--failed { background:#fdeaea; color:#7b1f1f; border:1px solid #f5c2c2; }
        .badge--refunded { background:#eef6ff; color:#0a2533; border:1px solid #d5eaff; }

        .items { display:grid; gap:8px; margin-top:10px; }
        .item { display:grid; grid-template-columns: 1fr auto auto; gap:8px; align-items:center; border-top:1px solid #f1f1f1; padding-top:8px; }
        .item__name { font-weight:600; }
        .item__qty { color:#666; font-variant-numeric: tabular-nums; }
        .item__price { font-weight:700; }
      `}</style>
    </div>
  );
}
