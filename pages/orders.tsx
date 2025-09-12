// pages/orders.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  img?: string;
};
type Order = {
  id: string;               // same as reference
  reference: string;
  status: string;           // "PAID" | "FAILED" | "PENDING" | etc.
  createdAt?: string;       // ISO string
  items: OrderItem[];
  total: number;            // in KES
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mm_orders");
      const parsed: Order[] = raw ? JSON.parse(raw) : [];
      // newest first
      parsed.sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      });
      setOrders(parsed);
    } catch {
      setOrders([]);
    }
  }, []);

  const currency = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

  const statusChip = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "PAID") return <span className="chip chip--paid">COMPLETED</span>;
    if (s === "FAILED") return <span className="chip chip--failed">FAILED</span>;
    return <span className="chip chip--pending">PENDING</span>;
  };

  const fmtDate = (iso?: string) => {
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

  return (
    <div className="wrap">
      <Head>
        <title>My Orders • Mastermind</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <header className="topbar">
        <div className="title">
          <img src="/favicon.ico" className="logo" alt="" />
          My Orders
        </div>
        <Link href="/" className="backBtn">← Back to Shop</Link>
      </header>

      <main className="container">
        {orders.length === 0 ? (
          <div className="empty">
            No orders yet. <Link href="/">Start shopping</Link>
          </div>
        ) : (
          <div className="list">
            {orders.map((o) => {
              const isOpen = !!open[o.id];
              return (
                <article key={o.id} className={`card ${isOpen ? "open" : ""}`}>
                  <button
                    className="cardHead"
                    onClick={() => setOpen((m) => ({ ...m, [o.id]: !m[o.id] }))}
                    aria-expanded={isOpen}
                  >
                    <div className="left">
                      <div className="ordId">Order #{o.id}</div>
                      <div className="date">{fmtDate(o.createdAt) || "\u2014"}</div>
                    </div>
                    <div className="right">
                      {statusChip(o.status)}
                      <div className="total">{currency(o.total)}</div>
                      <div className="chev">{isOpen ? "▴" : "▾"}</div>
                    </div>
                  </button>

                  <div className="body">
                    <ul className="items">
                      {o.items.map((it, i) => {
                        const lineTotal = it.price * it.qty;
                        return (
                          <li key={`${it.id}-${i}`} className="row">
                            <div className="thumb">
                              {it.img ? (
                                <img src={it.img} alt={it.name} />
                              ) : (
                                <div className="ph" />
                              )}
                            </div>
                            <div className="info">
                              <div className="name">{it.name}</div>
                              <div className="meta">
                                {currency(it.price)} × {it.qty} ={" "}
                                <b>{currency(lineTotal)}</b>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    <dl className="summary">
                      <div>
                        <dt>Reference</dt>
                        <dd>{o.reference}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>
                          {statusChip(o.status)}
                        </dd>
                      </div>
                      <div>
                        <dt>Total</dt>
                        <dd className="bold">{currency(o.total)}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <style jsx>{`
        :global(html, body) { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
        .wrap { background:#fafafa; min-height:100vh; }
        .container { max-width:900px; margin:0 auto; padding:12px; }
        .topbar {
          position:sticky; top:0; z-index:5;
          display:flex; justify-content:space-between; align-items:center;
          background:#111; color:#fff; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.08);
        }
        .title { display:flex; align-items:center; gap:8px; font-weight:700; }
        .logo { width:22px; height:22px; border-radius:4px; }
        .backBtn {
          background:#fff; color:#111; text-decoration:none; font-weight:600;
          padding:8px 12px; border-radius:10px; border:1px solid #eee;
        }

        .empty { margin:24px 0; color:#555; }
        .list { display:grid; gap:14px; }

        .card {
          background:#fff; border:1px solid #eee; border-radius:14px; overflow:hidden;
          box-shadow:0 1px 0 rgba(0,0,0,.03);
        }
        .cardHead {
          width:100%; display:flex; align-items:center; justify-content:space-between;
          padding:12px; background:#fff; border:none; text-align:left; cursor:pointer;
        }
        .left { display:flex; flex-direction:column; gap:4px; }
        .ordId { font-weight:700; }
        .date { color:#888; font-size:12px; }
        .right { display:flex; align-items:center; gap:10px; }
        .total { font-weight:800; color:#0b1; }
        .chev { color:#888; }

        .chip {
          padding:4px 8px; border-radius:999px; font-size:12px; font-weight:700;
          border:1px solid transparent; line-height:1;
        }
        .chip--paid { background:#e9f8ef; color:#0a7a3c; border-color:#c9efd8; }
        .chip--failed { background:#ffecec; color:#c22727; border-color:#ffd5d5; }
        .chip--pending { background:#f2f2f2; color:#555; border-color:#e7e7e7; }

        .body { padding:10px 12px 14px; border-top:1px solid #f2f2f2; }
        .items { list-style:none; margin:0; padding:0; display:grid; gap:10px; }
        .row { display:flex; gap:10px; align-items:center; border:1px solid #f1f1f1; border-radius:12px; padding:10px; }
        .thumb { width:54px; height:54px; border-radius:10px; overflow:hidden; background:#f7f7f7; display:flex; align-items:center; justify-content:center; }
        .thumb img { width:100%; height:100%; object-fit:cover; }
        .ph { width:100%; height:100%; background:#f0f0f0; }
        .info { display:flex; flex-direction:column; gap:4px; }
        .name { font-weight:700; }
        .meta { color:#666; font-size:13px; }

        .summary {
          display:grid; gap:10px; margin-top:12px;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        }
        dt { color:#777; font-size:13px; }
        dd { margin:2px 0 0; }
        .bold { font-weight:800; }
      `}</style>
    </div>
  );
}
