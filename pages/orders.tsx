// pages/orders.tsx
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  img?: string;
};

type Order = {
  id: string;                 // e.g. "T031011257064777"
  reference: string;          // paystack reference
  status: "paid" | "completed" | "failed" | "pending";
  createdAt?: string;         // ISO date
  total: number;              // KES
  items: OrderItem[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  // Load orders saved by checkout (stored under "mm_orders")
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mm_orders");
      if (raw) setOrders(JSON.parse(raw));
    } catch (_) {}
  }, []);

  // If a fresh reference arrives via ?r=XYZ, bubble that order to the top
  const highlightedRef = useMemo(() => {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href);
    return u.searchParams.get("r") || "";
  }, []);

  const sorted = useMemo(() => {
    const arr = [...orders];
    // newest first by createdAt (fallback to original order)
    arr.sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });
    // bump highlighted ref to top
    if (highlightedRef) {
      const i = arr.findIndex((o) => o.reference === highlightedRef);
      if (i > 0) {
        const [x] = arr.splice(i, 1);
        arr.unshift(x);
      }
    }
    return arr;
  }, [orders, highlightedRef]);

  const fmtKES = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;
  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return "—";
    return new Date(t).toLocaleString("en-KE", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pillClass = (s: Order["status"]) => {
    if (s === "failed") return "pill pill--red";
    if (s === "pending") return "pill pill--amber";
    // paid / completed → green
    return "pill pill--green";
  };

  return (
    <div className="wrap">
      <Head>
        <title>My Orders — Mastermind</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Topbar */}
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <img src="/favicon.ico" className="icon" alt="" aria-hidden />
            <span>My Orders</span>
          </div>
          <a href="/" className="backBtn">← Back to Shop</a>
        </div>
      </header>

      <main className="container">
        {sorted.length === 0 ? (
          <div className="empty">No orders yet.</div>
        ) : (
          <div className="list">
            {sorted.map((o) => (
              <details
                key={o.reference}
                className="card"
                open={highlightedRef && highlightedRef === o.reference}
              >
                <summary className="summary">
                  <div className="id">
                    <div className="muted">Order</div>
                    <div className="mono">#{o.id || o.reference}</div>
                    <div className="date">{fmtDate(o.createdAt)}</div>
                  </div>
                  <div className="right">
                    <span className={pillClass(o.status)}>
                      {o.status === "failed"
                        ? "FAILED"
                        : o.status === "pending"
                        ? "PENDING"
                        : "COMPLETED"}
                    </span>
                    <div className="total">{fmtKES(o.total)}</div>
                  </div>
                </summary>

                <div className="items">
                  {o.items.map((it) => (
                    <div key={it.id} className="row">
                      <div className="thumb">
                        <img
                          src={it.img || "/placeholder.png"}
                          alt={it.name}
                          loading="lazy"
                        />
                      </div>
                      <div className="meta">
                        <div className="name">{it.name}</div>
                        <div className="sub">
                          {fmtKES(it.price)} × {it.qty} ={" "}
                          <strong>{fmtKES(it.price * it.qty)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="kv">
                    <div className="k">Reference</div>
                    <div className="v mono">{o.reference}</div>
                  </div>
                  <div className="kv">
                    <div className="k">Status</div>
                    <div className="v">
                      <span className={pillClass(o.status)}>
                        {o.status === "failed"
                          ? "FAILED"
                          : o.status === "pending"
                          ? "PENDING"
                          : "PAID"}
                      </span>
                    </div>
                  </div>
                  <div className="kv">
                    <div className="k">Total</div>
                    <div className="v strong">{fmtKES(o.total)}</div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        .wrap { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; background:#fafafa; min-height:100vh; }
        .container { max-width: 900px; margin: 0 auto; padding: 12px; }
        .topbar { background:#111; color:#fff; position:sticky; top:0; z-index:40; }
        .topbar__inner { max-width:900px; margin:0 auto; padding:12px; display:flex; align-items:center; justify-content:space-between; }
        .brand { display:flex; align-items:center; gap:8px; font-weight:800; }
        .icon { width:22px; height:22px; border-radius:4px; }
        .backBtn { background:#fff; color:#111; text-decoration:none; border:1px solid #eee; padding:8px 12px; border-radius:12px; font-weight:800; }
        .empty { background:#fff; border:1px solid #eee; border-radius:14px; padding:16px; color:#666; }

        .list { display:grid; gap:12px; }
        .card { background:#fff; border:1px solid #eee; border-radius:14px; overflow:hidden; }
        .summary { list-style:none; cursor:pointer; padding:12px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .summary::-webkit-details-marker { display:none; }
        .id { display:grid; gap:2px; }
        .muted { color:#9ca3af; font-size:12px; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .date { color:#6b7280; font-size:12px; }
        .right { display:flex; align-items:center; gap:10px; }
        .total { font-weight:800; }
        .items { padding:12px; display:grid; gap:10px; border-top:1px dashed #eee; }
        .row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px dashed #f0f0f0; }
        .row:last-child { border-bottom:none; }
        .thumb { width:56px; height:56px; border-radius:12px; background:#f5f5f5; display:grid; place-items:center; overflow:hidden; }
        .thumb img { width:100%; height:100%; object-fit:cover; }
        .meta .name { font-weight:800; }
        .sub { color:#6b7280; }
        .kv { display:grid; grid-template-columns: 120px 1fr; gap:6px; align-items:center; }
        .k { color:#6b7280; }
        .v { }
        .strong { font-weight:800; }

        .pill { padding:6px 10px; border-radius:9999px; font-size:12px; font-weight:800; display:inline-block; }
        .pill--green { background:#dcfce7; color:#166534; border:1px solid #bbf7d0; }
        .pill--red { background:#fee2e2; color:#7f1d1d; border:1px solid #fecaca; }
        .pill--amber { background:#fef3c7; color:#78350f; border:1px solid #fde68a; }
      `}</style>
    </div>
  );
}
