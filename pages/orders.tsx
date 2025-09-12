// pages/orders.tsx
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type OrderItem = {
  id: string;          // product id
  name: string;
  price: number;
  qty: number;
  img?: string;        // public path (e.g. /torch.png)
};

type PaymentStatus = "PENDING" | "PAID" | "FAILED";
type OrderStatus   = "PENDING" | "COMPLETED" | "FAILED";

type Order = {
  id: string;                 // our local order id (can equal reference)
  reference: string;          // SHOULD be Paystack reference after payment
  createdAt?: string;         // ISO
  total: number;
  items: OrderItem[];
  status: OrderStatus;        // business status for display
  paymentStatus: PaymentStatus;
};

const LS_KEY = "mm_orders";

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as Order[];
  } catch {
    return [];
  }
}

function saveOrders(orders: Order[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(orders));
  } catch {}
}

function fmtKES(n: number) {
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // dd/MM/yyyy, HH:mm:ss
  const pad = (x: number) => x.toString().padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function OrdersPage() {
  const router = useRouter();
  const paystackRef = (router.query.ref as string) || (router.query.reference as string) || "";
  const [orders, setOrders] = useState<Order[]>([]);

  // Load orders on mount
  useEffect(() => {
    setOrders(loadOrders());
  }, []);

  // If we arrive with ?ref= from Paystack, attach that reference to the newest
  // pending order that doesn't already have a Paystack-looking reference.
  useEffect(() => {
    if (!paystackRef) return;
    setOrders(prev => {
      if (!prev.length) return prev;
      // If any order already has this reference, nothing to do.
      if (prev.some(o => o.reference === paystackRef)) return prev;

      const next = [...prev];
      // Find most recent PENDING order (by createdAt) that still looks like a local ref.
      const idx = [...next]
        .map((o, i) => ({ o, i }))
        .filter(({ o }) => o.paymentStatus === "PENDING")
        .sort((a, b) => {
          const ta = a.o.createdAt ? new Date(a.o.createdAt).getTime() : 0;
          const tb = b.o.createdAt ? new Date(b.o.createdAt).getTime() : 0;
          return tb - ta;
        })[0]?.i;

      if (idx !== undefined) {
        next[idx] = {
          ...next[idx],
          reference: paystackRef, // attach Paystack reference
        };
        saveOrders(next);
      }
      return next ?? prev;
    });
  }, [paystackRef]);

  const totalCount = useMemo(() => orders.length, [orders]);

  async function reverify(reference: string) {
    try {
      const res = await fetch(`/api/paystack-verify?reference=${encodeURIComponent(reference)}`);
      const data = await res.json(); // { status: "success" | "failed", raw?: any }

      const paid =
        (data?.status === "success") ||
        (data?.data?.status === "success") ||
        (data?.data?.status === "completed") ||
        (data?.paid === true);

      setOrders(prev => {
        const next: Order[] = prev.map(o => {
          if (o.reference !== reference) return o;
          if (paid) {
            return {
              ...o,
              paymentStatus: "PAID",
              status: "COMPLETED",
            };
          } else {
            return {
              ...o,
              paymentStatus: "FAILED",
              status: "FAILED",
            };
          }
        });
        saveOrders(next);
        return next;
      });
    } catch (e) {
      // network / API error -> no mutation
      console.warn("verify failed", e);
      alert("Could not verify at the moment. Please try again.");
    }
  }

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
        {orders.length === 0 ? (
          <div className="empty">No orders yet.</div>
        ) : (
          <div className="stack">
            {orders.map((o) => {
              const created = fmtDate(o.createdAt);
              const sum = o.total ?? o.items.reduce((s, it) => s + it.price * it.qty, 0);
              return (
                <article className="orderCard" key={o.id}>
                  <div className="orderCard__head">
                    <div className="orderNum">
                      <span className="muted">Order</span>{" "}
                      <strong>#{o.reference || o.id}</strong>
                      {created ? <div className="created">{created}</div> : null}
                    </div>

                    <div className="headRight">
                      <span className={`chip ${o.status === "PENDING" ? "chip--grey" : o.status === "COMPLETED" ? "chip--green" : "chip--red"}`}>
                        {o.status}
                      </span>
                      <span className="amount">{fmtKES(sum)}</span>
                    </div>
                  </div>

                  {/* Items (clickable block navigates nowhere—visual only) */}
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

                  <div className="metaGrid">
                    <div className="meta">
                      <div className="label">Reference</div>
                      <div className="row">
                        <code className="code">{o.reference}</code>
                        <button
                          className="miniBtn"
                          onClick={() => navigator.clipboard.writeText(o.reference)}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="meta">
                      <div className="label">Status</div>
                      <div className="row">
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
                          <button className="miniBtn outline" onClick={() => reverify(o.reference)}>
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
        .orderCard { background:#fff; border:1px solid #eee; border-radius:16px; padding:12px; }
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
        @media (min-width: 640px) {
          .metaGrid { grid-template-columns: 1fr 1fr 1fr; }
        }
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
      `}</style>
    </div>
  );
}
