// pages/orders.tsx
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

type PaymentStatus = "PENDING" | "PAID" | "FAILED";
type OrderStatus = "PENDING" | "COMPLETED" | "FAILED";

type OrderItem = {
  name: string;
  qty: number;
  price: number;
  img?: string;
};

type Order = {
  id: string;                 // "Txxxxxxxxxxxxxxx"
  reference: string;          // usually same as id after payment
  createdAt?: string;
  total: number;
  items: OrderItem[];
  paymentStatus: PaymentStatus;
  status: OrderStatus;
};

const LS_KEY = "mm_orders";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // currency helper
  const currency = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

  // load orders from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed: Order[] = JSON.parse(raw);
        if (Array.isArray(parsed)) setOrders(parsed);
      }
    } catch {}
  }, []);

  // save orders to localStorage when they change
  const saveOrders = (list: Order[]) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(list));
    } catch {}
  };

  // Attempt background verify (optional).
  // If Paystack verification succeeds for an order, we mark it PAID/COMPLETED and persist.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Only verify those still pending
      const pendings = orders.filter((o) => o.paymentStatus === "PENDING");
      if (pendings.length === 0) return;

      const next = [...orders];
      for (let i = 0; i < next.length; i++) {
        const o = next[i];
        if (o.paymentStatus !== "PENDING") continue;
        try {
          const res = await fetch(`/api/paystack-verify?reference=${encodeURIComponent(o.reference)}`);
          if (!res.ok) continue;
          const data = await res.json();
          // You can adapt these keys to your verify function response
          const isPaid =
            data?.status === true &&
            (data?.data?.status === "success" || data?.data?.gateway_response === "Successful");

          if (isPaid) {
            next[i] = {
              ...o,
              paymentStatus: "PAID",
              status: "COMPLETED",
            } as Order;
          } else if (data?.status === true && data?.data?.status === "failed") {
            next[i] = {
              ...o,
              paymentStatus: "FAILED",
              status: "FAILED",
            } as Order;
          }
        } catch {
          // ignore network errors; user can refresh later
        }
      }
      if (!cancelled) {
        setOrders(next);
        saveOrders(next);
      }
    })();
    return () => {
      cancelled = true;
    };
    // run once on mount and whenever the list changes length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.length]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const headerPill = (st: OrderStatus) => {
    const cls =
      st === "COMPLETED" ? "pill pill--green" : st === "FAILED" ? "pill pill--red" : "pill pill--gray";
    const text = st === "COMPLETED" ? "COMPLETED" : st;
    return <span className={cls}>{text}</span>;
  };

  const paymentPill = (ps: PaymentStatus) => {
    const cls =
      ps === "PAID" ? "pill pill--green" : ps === "FAILED" ? "pill pill--red" : "pill pill--gray";
    return <span className={cls}>{ps}</span>;
  };

  const list = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const da = a.createdAt ? Date.parse(a.createdAt) : 0;
        const db = b.createdAt ? Date.parse(b.createdAt) : 0;
        return db - da;
      }),
    [orders]
  );

  return (
    <div>
      <Head>
        <title>My Orders • Mastermind</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <img src="/favicon.ico" alt="" className="brandIcon" aria-hidden />
            My Orders
          </div>
          <a href="/" className="backBtn">← Back to Shop</a>
        </div>
      </header>

      <main className="container">
        {list.length === 0 ? (
          <div className="empty">No orders yet.</div>
        ) : (
          <div className="stack">
            {list.map((o) => {
              // VISUAL header override: if payment is PAID but status hasn't flipped yet, show COMPLETED at top
              const headerStatus: OrderStatus =
                o.paymentStatus === "PAID" && o.status === "PENDING" ? "COMPLETED" : o.status;

              const isOpen = expanded.has(o.id);
              const first = o.items[0];
              const lineTotal = Math.round((first?.price || 0) * (first?.qty || 0));

              return (
                <article key={o.id} className="card">
                  <button className="card__head" onClick={() => toggle(o.id)}>
                    <div className="left">
                      <div className="orderId">
                        <span className="muted">Order </span>
                        <strong>#{o.id}</strong>
                      </div>
                    </div>
                    <div className="right">
                      {headerPill(headerStatus)}
                      <div className="amount">{currency(o.total)}</div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="details">
                      {!!o.createdAt && (
                        <div className="date">{new Date(o.createdAt).toLocaleString()}</div>
                      )}

                      <div className="itemRow">
                        <div className="thumb">
                          {first?.img ? (
                            <img src={first.img} alt="" />
                          ) : (
                            <div className="thumbPh" />
                          )}
                        </div>
                        <div className="itemBody">
                          <div className="name">{first?.name || "—"}</div>
                          <div className="line">
                            {`KES ${Math.round(first?.price || 0).toLocaleString("en-KE")} × ${
                              first?.qty || 0
                            } = `}
                            <strong>{`KES ${lineTotal.toLocaleString("en-KE")}`}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="row">
                        <div className="label">Reference</div>
                        <div className="refWrap">
                          <div className="ref">{o.reference}</div>
                          <button
                            className="chip"
                            onClick={() => {
                              navigator.clipboard?.writeText(o.reference);
                              // optional toast could go here
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      <div className="row">
                        <div className="label">Status</div>
                        <div className="statusWrap">{paymentPill(o.paymentStatus)}</div>
                      </div>

                      <div className="row totalRow">
                        <div className="label">Total</div>
                        <div className="total">{currency(o.total)}</div>
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
        :root { color-scheme: light; }
        .container { max-width: 900px; margin: 0 auto; padding: 12px; }
        .empty { margin: 36px 0; text-align: center; color:#666; }

        /* Top bar */
        .topbar { position: sticky; top: 0; z-index: 30; background:#111; color:#fff; border-bottom:1px solid rgba(255,255,255,.08); }
        .topbar__inner { max-width: 900px; margin: 0 auto; display:flex; align-items:center; justify-content:space-between; padding: 10px 14px; }
        .brand { display:flex; align-items:center; gap:8px; font-weight:800; letter-spacing:.3px; }
        .brandIcon { width:20px; height:20px; border-radius:4px; }
        .backBtn { background:#fff; color:#111; text-decoration:none; border:1px solid #eee; padding:8px 12px; border-radius:12px; font-weight:800; }

        /* Cards */
        .stack { display:grid; gap:12px; }
        .card { background:#fff; border:1px solid #eee; border-radius:16px; overflow:hidden; }
        .card__head { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:12px; background:#fff; border:none; cursor:pointer; }
        .orderId { font-size:14px; }
        .muted { color:#777; }
        .right { display:flex; align-items:center; gap:8px; }
        .amount { font-weight:800; }

        .details { padding: 0 12px 12px; }
        .date { color:#888; font-size:12px; padding: 0 0 10px; border-bottom:1px dashed #eee; margin-bottom:10px; }

        .itemRow { display:flex; gap:10px; align-items:center; padding:4px 0 10px; }
        .thumb { width:56px; height:56px; border-radius:12px; overflow:hidden; background:#f6f6f6; display:flex; align-items:center; justify-content:center; }
        .thumb img { width:100%; height:100%; object-fit:cover; display:block; }
        .thumbPh { width:100%; height:100%; background:#f0f0f0; border-radius:12px; }
        .itemBody .name { font-weight:800; }
        .itemBody .line { color:#666; }

        .row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 0; }
        .label { color:#666; min-width:88px; }
        .refWrap { display:flex; align-items:center; gap:8px; }
        .ref { background:#f6f6f6; border:1px solid #eee; border-radius:12px; padding:6px 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .chip { background:#f7e69a; color:#111; border:none; border-radius:10px; padding:6px 10px; font-weight:800; cursor:pointer; }
        .statusWrap { display:inline-flex; align-items:center; }

        .totalRow .total { font-weight:800; }

        /* Pills */
        .pill { display:inline-flex; align-items:center; justify-content:center; padding:4px 10px; border-radius:9999px; font-size:12px; font-weight:800; letter-spacing:.4px; text-transform:uppercase; }
        .pill--green { background:#e7f6ec; color:#167e3d; }
        .pill--red { background:#fdecec; color:#b42318; }
        .pill--gray { background:#eee; color:#555; }
      `}</style>
    </div>
  );
}
