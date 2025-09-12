// pages/orders.tsx
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

type OrderItem = {
  name: string;
  price: number;
  qty: number;
  img?: string;
};

type Order = {
  id: string;                 // internal id
  reference: string;          // Paystack reference (T0…)
  status: "paid" | "failed" | "pending" | "completed";
  total: number;
  createdAt?: string;         // ISO
  items: OrderItem[];
};

function currency(n: number) {
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}

// Fallback name→image mapper for items missing an image
function imageForName(name: string) {
  const n = name.toLowerCase();
  if (n.includes("6kg")) return "/6kg.png";
  if (n.includes("13kg")) return "/13kg.png";
  if (n.includes("torch")) return "/torch.png";
  return "/placeholder.png";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Load orders from localStorage (created at checkout callback)
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

  // If URL has ?r=<reference>, highlight / open that order
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const r = url.searchParams.get("r");
    if (!r) return;
    const found = orders.find((o) => o.reference === r);
    if (found) setOpenId(found.id);
  }, [orders]);

  const labelFor = (s: Order["status"]) => {
    switch (s) {
      case "paid":
      case "completed":
        return { text: s.toUpperCase(), className: "pill pill--ok" };
      case "failed":
        return { text: "FAILED", className: "pill pill--bad" };
      default:
        return { text: "PENDING", className: "pill pill--pending" };
    }
  };

  const list = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const at = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bt - at;
      }),
    [orders]
  );

  const copyRef = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopiedRef(ref);
      setTimeout(() => setCopiedRef(null), 900);
    } catch {
      // no-op
    }
  };

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>My Orders • Mastermind</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Header bar */}
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <img src="/favicon.ico" alt="" className="brandIcon" aria-hidden />
            My Orders
          </div>

          <a href="/" className="backBtn">← Back to Shop</a>
        </div>
      </header>

      <main className="container" style={{ padding: "12px 12px 36px" }}>
        {list.length === 0 ? (
          <div className="empty">No orders yet.</div>
        ) : (
          <div className="stack">
            {list.map((o) => {
              const lab = labelFor(o.status);
              const created =
                o.createdAt && !isNaN(Date.parse(o.createdAt))
                  ? new Date(o.createdAt).toLocaleString()
                  : undefined;

              const opened = openId === o.id;

              return (
                <article key={o.id} className="orderCard">
                  {/* Card header: clickable */}
                  <button
                    className="orderHead"
                    onClick={() => setOpenId(opened ? null : o.id)}
                    aria-expanded={opened}
                  >
                    <div className="orderHead__left">
                      <div className="orderTitle">
                        <span className="muted">Order</span>
                        <span className="mono">#{o.reference}</span>
                      </div>
                      {created ? (
                        <div className="muted small">{created}</div>
                      ) : null}
                    </div>
                    <div className="orderHead__right">
                      <span className={lab.className}>{lab.text}</span>
                      <span className="totalBadge">{currency(o.total)}</span>
                    </div>
                  </button>

                  {/* Details */}
                  {opened && (
                    <div className="orderBody">
                      {o.items.map((it, idx) => {
                        const img = it.img || imageForName(it.name);
                        return (
                          <div key={idx} className="line">
                            <img src={img} alt="" className="thumb" />
                            <div className="grow">
                              <div className="lineName">{it.name}</div>
                              <div className="linePrice">
                                {currency(it.price)} × {it.qty} ={" "}
                                <b>{currency(it.price * it.qty)}</b>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <div className="kv">
                        <div className="k">Reference</div>
                        <div className="v">
                          <span className="mono">{o.reference}</span>
                          <button
                            className="copyBtn"
                            onClick={() => copyRef(o.reference)}
                            title="Copy reference"
                          >
                            {copiedRef === o.reference ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>

                      <div className="kv">
                        <div className="k">Status</div>
                        <div className="v"><span className={lab.className}>{lab.text}</span></div>
                      </div>

                      <div className="kv">
                        <div className="k">Total</div>
                        <div className="v strong">{currency(o.total)}</div>
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
        .container { max-width: 980px; margin: 0 auto; }

        .topbar { position: sticky; top: 0; z-index: 20; background: #111; color: #fff; border-bottom: 1px solid rgba(255,255,255,.08); }
        .topbar__inner { max-width: 980px; margin: 0 auto; padding: 10px 12px; display: grid; grid-template-columns: 1fr auto; align-items: center; }
        .brand { display:flex; gap:8px; align-items:center; font-weight:800; }
        .brandIcon { width:22px; height:22px; border-radius:4px; }
        .backBtn { background:#fff; color:#111; text-decoration:none; padding:10px 14px; border-radius:12px; font-weight:800; }

        .empty { color:#666; background:#fff; border:1px solid #eee; border-radius:14px; padding:18px; text-align:center; }

        .stack { display:grid; gap:12px; }

        .orderCard { background:#fff; border:1px solid #eee; border-radius:16px; overflow:hidden; }
        .orderHead { width:100%; display:flex; justify-content:space-between; align-items:center; gap:10px; padding:12px 14px; background:#fff; border:none; cursor:pointer; }
        .orderHead:hover { background:#fafafa; }
        .orderHead__left { display:grid; gap:4px; }
        .orderTitle { display:flex; gap:8px; align-items:center; font-weight:800; }
        .muted { color:#6b7280; }
        .small { font-size:12px; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .orderHead__right { display:flex; gap:10px; align-items:center; }
        .totalBadge { font-weight:800; color:#111; }

        .orderBody { padding: 0 14px 14px; border-top:1px solid #f0f0f0; display:grid; gap:10px; }
        .line { display:flex; gap:10px; padding-top:10px; }
        .thumb { width:56px; height:56px; border-radius:12px; object-fit:cover; background:#f3f3f3; border:1px solid #eee; }
        .grow { flex:1; }
        .lineName { font-weight:700; }
        .linePrice { color:#6b7280; font-size:13px; }

        .kv { display:grid; grid-template-columns: 120px 1fr; gap:10px; align-items:center; }
        .k { color:#6b7280; }
        .v { display:flex; align-items:center; gap:8px; }
        .strong { font-weight:800; }

        .pill { padding:6px 12px; border-radius:999px; font-weight:800; font-size:12px; display:inline-flex; align-items:center; }
        .pill--ok { background: #d1fae5; color: #065f46; }
        .pill--bad { background: #fee2e2; color: #991b1b; }
        .pill--pending { background: #e5e7eb; color: #111; }

        .copyBtn {
          border:1px solid #e5e7eb; background:#fff; border-radius:999px;
          padding:4px 10px; font-weight:700; font-size:12px; cursor:pointer;
        }
        .copyBtn:hover { background:#f9fafb; }
      `}</style>
    </div>
  );
}
