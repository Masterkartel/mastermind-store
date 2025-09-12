// pages/orders.tsx
import { useEffect, useMemo, useState } from "react";
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
  id: string;                 // e.g., payment reference
  reference?: string;         // duplicate of id if you want
  status: "PAID" | "FAILED" | "PENDING";
  createdAt: string;          // ISO string
  items: OrderItem[];
  total: number;              // KES
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Load orders from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mm_orders");
      if (raw) {
        const parsed = JSON.parse(raw) as Order[];
        if (Array.isArray(parsed)) {
          setOrders(parsed);
        }
      }
    } catch {}
  }, []);

  // newest first
  const sorted = useMemo(
    () =>
      [...orders].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [orders]
  );

  const fmt = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

  const toggle = (id: string) => {
    setExpanded((cur) => (cur === id ? null : id));
  };

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa", minHeight: "100vh" }}>
      <Head>
        <title>My Orders • Mastermind</title>
        <link rel="icon" href="/favicon.ico" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <img src="/favicon.ico" alt="" className="brandIcon" aria-hidden />
            My Orders
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/" className="btn btn--light small">⬅ Back to Shop</Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: "16px 12px 40px" }}>
        {sorted.length === 0 ? (
          <div className="emptyWrap">
            <div className="card emptyCard">
              <div className="h3" style={{ marginBottom: 6 }}>No orders yet</div>
              <div className="muted">You haven’t placed any orders. Start shopping and your orders will show up here.</div>
              <div style={{ marginTop: 14 }}>
                <Link href="/" className="btn btn--accent">Shop now</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="list">
            {sorted.map((o) => {
              const isOpen = expanded === o.id;
              return (
                <article key={o.id} className="orderCard">
                  <button className="orderHead" onClick={() => toggle(o.id)}>
                    <div className="headLeft">
                      <div className="orderTitle">
                        Order <span className="mono">#{o.id}</span>
                      </div>
                      <div className="muted smallText">
                        {new Date(o.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="headRight">
                      <span className={`badge ${o.status.toLowerCase()}`}>
                        {o.status === "PAID" ? "PAID" : o.status === "FAILED" ? "FAILED" : "PENDING"}
                      </span>
                      <div className="total">{fmt(o.total)}</div>
                      <div className={`chev ${isOpen ? "up" : "down"}`}>▾</div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="orderBody">
                      <ul className="items">
                        {o.items.map((it, i) => (
                          <li key={`${o.id}-${i}`} className="row">
                            <div className="thumb">
                              {it.img ? (
                                <img src={it.img} alt={it.name} />
                              ) : (
                                <div className="ph" />
                              )}
                            </div>
                            <div className="info">
                              <div className="name">{it.name}</div>
                              <div className="muted">
                                {fmt(it.price)} × {it.qty} = <b>{fmt(it.price * it.qty)}</b>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>

                      <div className="meta">
                        <div className="metaRow">
                          <span className="muted">Reference</span>
                          <span className="mono">{o.reference || o.id}</span>
                        </div>
                        <div className="metaRow">
                          <span className="muted">Status</span>
                          <span className={`badge ${o.status.toLowerCase()}`}>
                            {o.status}
                          </span>
                        </div>
                        <div className="metaRow">
                          <span className="muted">Total</span>
                          <span className="strong">{fmt(o.total)}</span>
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

        .topbar { position: sticky; top: 0; z-index: 40; background: #111; color: #fff; border-bottom: 1px solid rgba(255,255,255,.08); }
        .topbar__inner { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; padding: 10px 12px; }
        .brand { font-weight: 700; letter-spacing: .2px; display:flex; align-items:center; gap:8px; }
        .brandIcon { width: 20px; height: 20px; border-radius: 4px; }

        .btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; border-radius:12px; font-weight:700; text-decoration:none; cursor:pointer; }
        .btn--light { background:#fff; color:#111; padding:8px 14px; border:1px solid #eee; }
        .btn--accent { background:#f4d03f; color:#111; padding:10px 16px; border:none; }
        .small { padding:8px 12px; font-size: 14px; }

        .emptyWrap { display:flex; justify-content:center; padding-top: 24px; }
        .emptyCard { max-width:560px; text-align:center; }

        .list { display: grid; gap: 12px; padding-top: 16px; }
        .orderCard { background:#fff; border:1px solid #eee; border-radius:14px; overflow:hidden; }

        .orderHead {
          width: 100%;
          background: #fff;
          border: none;
          padding: 14px 14px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
          cursor: pointer;
          text-align: left;
        }
        .orderHead:hover { background: #fcfcfc; }

        .headLeft { display:flex; flex-direction:column; gap:4px; }
        .orderTitle { font-weight: 700; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

        .headRight {
          display: grid;
          grid-auto-flow: column;
          align-items: center;
          gap: 10px;
        }
        .chev { transform: rotate(0deg); transition: transform .15s ease; color:#777; }
        .chev.up { transform: rotate(180deg); }

        .badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }
        .badge.paid { background: #e8f9ef; color: #0a7a3b; border: 1px solid #b9eccf; }
        .badge.failed { background: #ffecec; color: #b40000; border: 1px solid #ffb6b6; }
        .badge.pending { background: #f2f2f2; color: #555; border: 1px solid #e5e5e5; }

        .total { font-weight: 700; }

        .orderBody { border-top: 1px solid #f0f0f0; padding: 10px 14px 14px; display: grid; gap: 12px; }

        .items { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
        .row { display: grid; grid-template-columns: 56px 1fr; gap: 10px; align-items: center; }
        .thumb { width:56px; height:56px; border-radius:10px; overflow:hidden; background:#f4f4f4; display:flex; align-items:center; justify-content:center; border:1px solid #eee; }
        .thumb img { width:100%; height:100%; object-fit:cover; }
        .ph { width:100%; height:100%; background: linear-gradient(180deg,#f7f7f7,#ececec); }

        .info .name { font-weight: 600; }
        .muted { color:#777; }
        .smallText { font-size: 12px; }

        .meta { border-top: 1px dashed #eee; padding-top: 8px; display: grid; gap: 6px; }
        .metaRow { display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center; }
        .strong { font-weight: 700; }
      `}</style>
    </div>
  );
}
