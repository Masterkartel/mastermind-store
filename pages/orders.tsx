// pages/orders.tsx
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  img?: string;
};

type PaymentStatus = "PENDING" | "PAID" | "FAILED";
type OrderStatus   = "PENDING" | "COMPLETED" | "FAILED";

type Order = {
  id: string;
  reference: string;
  createdAt?: string;
  total: number;
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
};

const LS_KEY = "mm_orders";

const loadOrders = (): Order[] => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Order[]) : [];
  } catch {
    return [];
  }
};
const saveOrders = (orders: Order[]) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(orders)); } catch {}
};

const fmtKES = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;
const fmtDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (x: number) => x.toString().padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

export default function OrdersPage() {
  const router = useRouter();
  const paystackRef =
    (router.query.ref as string) || (router.query.reference as string) || "";

  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => { setOrders(loadOrders()); }, []);

  // Attach Paystack reference to the newest pending order when landing with ?ref=
  useEffect(() => {
    if (!paystackRef) return;
    setOrders(prev => {
      if (!prev.length || prev.some(o => o.reference === paystackRef)) return prev;
      const next = [...prev];
      const idx = [...next]
        .map((o, i) => ({ o, i }))
        .filter(({ o }) => o.paymentStatus === "PENDING")
        .sort((a, b) => {
          const ta = a.o.createdAt ? new Date(a.o.createdAt).getTime() : 0;
          const tb = b.o.createdAt ? new Date(b.o.createdAt).getTime() : 0;
          return tb - ta;
        })[0]?.i;
      if (idx !== undefined) {
        next[idx] = { ...next[idx], reference: paystackRef };
        saveOrders(next);
      }
      return next ?? prev;
    });
  }, [paystackRef]);

  async function reverify(reference: string) {
    try {
      const res = await fetch(`/api/paystack-verify?reference=${encodeURIComponent(reference)}`);
      const data = await res.json();

      const paid =
        data?.status === "success" ||
        data?.data?.status === "success" ||
        data?.data?.status === "completed" ||
        data?.paid === true;

      setOrders(prev => {
        const next: Order[] = prev.map(o => {
          if (o.reference !== reference) return o;
          return paid
            ? { ...o, paymentStatus: "PAID", status: "COMPLETED" }
            : { ...o, paymentStatus: "FAILED", status: "FAILED" };
        });
        saveOrders(next);
        return next;
      });
    } catch {
      alert("Could not verify at the moment. Please try again.");
    }
  }

  const list = useMemo(() => orders, [orders]);

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>My Orders — Mastermind</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      {/* Top bar */}
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <img src="/favicon.ico" alt="" className="brandIcon" aria-hidden />
            My Orders
          </div>
          <a href="/" className="backBtn">← Back to Shop</a>
        </div>
      </header>

      <main className="container" style={{ padding: "14px 0 28px" }}>
        {!list.length ? (
          <div className="empty">No orders yet.</div>
        ) : (
          <div className="stack">
            {list.map((o) => {
              const created = fmtDate(o.createdAt);
              const sum = o.total ?? o.items.reduce((s, it) => s + it.price * it.qty, 0);
              return (
                <a key={o.id} href={`/?ref=${encodeURIComponent(o.reference)}`} className="orderLink">
                  <article className="orderCard">
                    <div className="orderCard__head">
                      <div className="orderNum">
                        <div>
                          <span className="muted">Order</span>{" "}
                          <strong>#{o.reference || o.id}</strong>
                        </div>
                        {created ? <div className="created">{created}</div> : null}
                      </div>

                      <div className="headRight">
                        {/* TOP RIGHT: business status as pill (COMPLETED/FAILED/PENDING) */}
                        <span
                          className={`chip ${
                            o.status === "COMPLETED"
                              ? "chip--green"
                              : o.status === "FAILED"
                              ? "chip--red"
                              : "chip--grey"
                          }`}
                        >
                          {o.status}
                        </span>
                        <span className="amount">{fmtKES(sum)}</span>
                      </div>
                    </div>

                    <div className="itemRow">
                      <div className="thumb">
                        {o.items[0]?.img ? (
                          <img src={o.items[0].img} alt={o.items[0].name} />
                        ) : (
                          <div className="thumbPh" />
                        )}
                      </div>
                      <div className="itemMain">
                        <div className="itemName">{o.items[0]?.name}</div>
                        <div className="muted">
                          {fmtKES(o.items[0]?.price || 0)} × {o.items[0]?.qty || 1} ={" "}
                          <strong>{fmtKES((o.items[0]?.price || 0) * (o.items[0]?.qty || 1))}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="metaGrid" onClick={(e)=>e.preventDefault()}>
                      <div className="meta">
                        <div className="label">Reference</div>
                        <div className="row">
                          <code className="code">{o.reference}</code>
                          <button
                            className="miniBtn"
                            onClick={(ev) => {
                              ev.preventDefault();
                              navigator.clipboard.writeText(o.reference);
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      <div className="meta">
                        <div className="label">Status</div>
                        <div className="row">
                          {/* STATUS ROW: payment status as pill (PAID/FAILED/PENDING) */}
                          <span
                            className={`chip ${
                              o.paymentStatus === "PAID"
                                ? "chip--green"
                                : o.paymentStatus === "FAILED"
                                ? "chip--red"
                                : "chip--grey"
                            }`}
                          >
                            {o.paymentStatus}
                          </span>
                          {o.paymentStatus === "PENDING" && (
                            <button
                              className="miniBtn outline"
                              onClick={(ev) => {
                                ev.preventDefault();
                                reverify(o.reference);
                              }}
                            >
                              Re-verify
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="meta">
                        <div className="label">Total</div>
                        <div className="strong">{fmtKES(sum)}</div>
                      </div>
                    </div>
                  </article>
                </a>
              );
            })}
          </div>
        )}
      </main>

      <style jsx>{`
        .container { max-width: 900px; margin: 0 auto; padding: 0 12px; }
        .topbar { background:#111; color:#fff; position: sticky; top:0; z-index:50; }
        .topbar__inner { max-width: 900px; margin: 0 auto; padding: 12px; display:flex; align-items:center; justify-content:space-between; }
        .brand { display:flex; align-items:center; gap:8px; font-weight:800; }
        .brandIcon { width:22px; height:22px; border-radius:4px; }
        .backBtn { background:#fff; color:#111; text-decoration:none; padding:8px 12px; border-radius:12px; font-weight:800; border:1px solid #eee; }

        .stack { display:grid; gap:14px; }
        .orderLink { text-decoration:none; color:inherit; }
        .orderCard { background:#fff; border:1px solid #eee; border-radius:16px; padding:12px; transition: box-shadow .15s ease, transform .05s ease; }
        .orderCard:hover { box-shadow:0 6px 24px rgba(0,0,0,.06); }
        .orderCard__head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
        .orderNum { font-weight:700; }
        .created { color:#888; font-weight:600; font-size:12px; }
        .headRight { display:flex; align-items:center; gap:10px; }
        .amount { font-weight:800; color:#111; }

        .itemRow { display:flex; gap:12px; padding:10px 0; border-top:1px dashed #eee; border-bottom:1px dashed #eee; margin:10px 0; }
        .thumb { width:60px; height:60px; border-radius:12px; background:#f5f5f5; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .thumb img { max-width:100%; max-height:100%; object-fit:contain; display:block; }
        .thumbPh { width:60px; height:60px; background:#f0f0f0; border-radius:12px; }
        .itemMain { display:grid; gap:4px; }
        .itemName { font-weight:800; }

        .metaGrid { display:grid; grid-template-columns:1fr; gap:10px; margin-top:8px; }
        @media (min-width: 640px) { .metaGrid { grid-template-columns: 1fr 1fr 1fr; } }
        .meta .label { color:#666; font-weight:700; font-size:12px; margin-bottom:4px; }
        .code { background:#fafafa; border:1px solid #eee; padding:4px 8px; border-radius:8px; }
        .row { display:flex; align-items:center; gap:8px; }
        .strong { font-weight:800; }

        .chip { padding:4px 10px; border-radius:999px; font-weight:800; font-size:12px; display:inline-flex; align-items:center; }
        .chip--grey  { background:#efefef; color:#333; }
        .chip--green { background:#d9f5e5; color:#1f7a47; }
        .chip--red   { background:#fde2e2; color:#8f1d1d; }

        .miniBtn { background:#ffd44d; color:#111; border:none; padding:6px 10px; border-radius:10px; font-weight:800; cursor:pointer; }
        .miniBtn.outline { background:#fff; border:1px solid #ddd; }

        .empty { text-align:center; color:#666; padding:24px 0; }
        .muted { color:#666; }
      `}</style>
    </div>
  );
}
