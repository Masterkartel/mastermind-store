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
  id: string;               // display id (e.g. T... or timestamp id)
  reference: string;        // Paystack reference
  createdAt?: string;       // ISO string
  total: number;
  items: OrderItem[];
  // Status at the “header” level
  status: "PENDING" | "COMPLETED" | "FAILED";
  // Payment status line
  paymentStatus: "PENDING" | "PAID" | "FAILED";
};

const load = (): Order[] => {
  try {
    const raw = localStorage.getItem("mm_orders");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persist = (orders: Order[]) => {
  try {
    localStorage.setItem("mm_orders", JSON.stringify(orders));
  } catch {}
};

const currency = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

const Pill = ({ text, tone }: { text: string; tone: "green" | "red" | "gray" }) => (
  <span
    className={`pill pill--${tone}`}
    role="status"
    aria-label={`${text} status`}
  >
    {text}
  </span>
);

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  // Load once
  useEffect(() => {
    const o = load();
    setOrders(o);
  }, []);

  // Auto-verify any PENDING orders once after mount (and if orders list changes later)
  useEffect(() => {
    const pending = orders.filter((o) => o.paymentStatus === "PENDING");
    if (!pending.length) return;

    let cancelled = false;

    (async () => {
      // Verify one by one to keep it simple
      for (const ord of pending) {
        try {
          const res = await fetch(
            `/api/paystack-verify?reference=${encodeURIComponent(ord.reference)}`
          );

          // If function errored or non-200, just skip without alert
          if (!res.ok) continue;

          // Our function returns: { status: "success" | "failed" | "pending", raw: ... }
          const data: any = await res.json().catch(() => ({}));
          const s: string = (data?.status || "").toLowerCase();

          let newPayment: Order["paymentStatus"] = ord.paymentStatus;
          let newStatus: Order["status"] = ord.status;

          if (s === "success") {
            newPayment = "PAID";
            newStatus = "COMPLETED";
          } else if (s === "failed") {
            newPayment = "FAILED";
            newStatus = "FAILED";
          } else {
            // keep pending
          }

          if (newPayment !== ord.paymentStatus || newStatus !== ord.status) {
            const next: Order[] = orders.map((o) =>
              o.id === ord.id
                ? {
                    ...o,
                    paymentStatus: newPayment,
                    status: newStatus,
                  }
                : o
            );
            if (!cancelled) {
              setOrders(next);
              persist(next);
            }
          }
        } catch {
          // swallow – we’ll stay pending and user can refresh later
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orders]);

  const view = useMemo(() => orders.slice().reverse(), [orders]);

  const statusPill = (o: Order) => {
    if (o.status === "COMPLETED") return <Pill text="COMPLETED" tone="green" />;
    if (o.status === "FAILED") return <Pill text="FAILED" tone="red" />;
    return <Pill text="PENDING" tone="gray" />;
  };

  const payPill = (o: Order) => {
    if (o.paymentStatus === "PAID") return <Pill text="PAID" tone="green" />;
    if (o.paymentStatus === "FAILED") return <Pill text="FAILED" tone="red" />;
    return <Pill text="PENDING" tone="gray" />;
    // If you prefer “PAID/FAILED” only here and keep “COMPLETED/FAILED/PENDING” up top, this matches that.
  };

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>My Orders • Mastermind</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bar">
        <div className="bar__inner">
          <div className="brand">
            <img src="/favicon.ico" alt="" className="brandIcon" aria-hidden />
            My Orders
          </div>
          <a href="/" className="backBtn">← Back to Shop</a>
        </div>
      </header>

      <main className="container" style={{ padding: "12px 12px 24px" }}>
        {view.length === 0 ? (
          <div className="emptyCard">No orders yet.</div>
        ) : (
          view.map((o) => {
            const open = openId === o.id;
            const created = o.createdAt
              ? new Date(o.createdAt)
              : null;

            return (
              <article
                key={o.id}
                className="orderCard"
                onClick={() => setOpenId(open ? null : o.id)}
              >
                {/* Header row */}
                <div className="orderCard__top">
                  <div className="orderId">
                    Order <span className="mono">#{o.id}</span>
                  </div>
                  <div className="topRight">
                    {statusPill(o)}
                    <div className="amount">{currency(o.total)}</div>
                  </div>
                </div>

                {/* Datetime */}
                {created && (
                  <div className="dt">
                    {created.toLocaleDateString()}{" "}
                    {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}

                {/* Collapsible details */}
                {open && (
                  <div className="details" onClick={(e) => e.stopPropagation()}>
                    {/* First item preview (with image) */}
                    {o.items[0] && (
                      <div className="line">
                        <div className="thumb">
                          {o.items[0].img ? (
                            <img
                              src={o.items[0].img}
                              alt={o.items[0].name}
                              className="thumbImg"
                              loading="lazy"
                            />
                          ) : (
                            <div className="thumbPh" />
                          )}
                        </div>
                        <div className="lineText">
                          <div className="name">{o.items[0].name}</div>
                          <div className="muted">
                            {currency(o.items[0].price)} × {o.items[0].qty} ={" "}
                            <strong>{currency(o.items[0].price * o.items[0].qty)}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reference */}
                    <div className="row">
                      <div className="label">Reference</div>
                      <div className="refWrap">
                        <code className="ref mono">{o.reference}</code>
                        <button
                          className="copyBtn"
                          onClick={() => {
                            navigator.clipboard?.writeText(o.reference);
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* Payment Status */}
                    <div className="row">
                      <div className="label">Status</div>
                      <div>{payPill(o)}</div>
                    </div>

                    {/* Total */}
                    <div className="row">
                      <div className="label">Total</div>
                      <div className="totalVal">{currency(o.total)}</div>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>

      <style jsx>{`
        .container { max-width: 900px; margin: 0 auto; }

        .bar { background:#111; color:#fff; position:sticky; top:0; z-index:50; }
        .bar__inner { max-width: 900px; margin: 0 auto; display:flex; align-items:center; justify-content:space-between; padding:10px 12px; }
        .brand { font-weight:800; display:flex; align-items:center; gap:8px; }
        .brandIcon { width:22px; height:22px; border-radius:4px; }
        .backBtn { background:#fff; color:#111; padding:8px 12px; border-radius:12px; text-decoration:none; font-weight:800; }

        .orderCard { background:#fff; border:1px solid #eee; border-radius:16px; padding:12px; margin:12px 0; box-shadow:0 1px 0 rgba(0,0,0,.03); cursor:pointer; }
        .orderCard__top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .orderId { font-weight:800; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
        .topRight { display:flex; align-items:center; gap:8px; }
        .amount { font-weight:800; }

        .dt { color:#888; margin:6px 0 10px; }

        .details { border-top:1px dashed #eee; padding-top:10px; cursor:default; }
        .line { display:flex; gap:10px; align-items:center; }
        .thumb { width:56px; height:56px; border-radius:12px; background:#f3f3f3; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .thumbImg { width:100%; height:100%; object-fit:contain; }
        .thumbPh { width:100%; height:100%; background:#f0f0f0; border-radius:12px; }
        .lineText .name { font-weight:800; }
        .muted { color:#777; }

        .row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:10px; }
        .label { color:#666; min-width:96px; }

        .refWrap { display:flex; align-items:center; gap:8px; }
        .ref { background:#f6f6f6; padding:6px 10px; border-radius:10px; display:inline-block; }
        .copyBtn { background:#ffd24d; border:none; padding:6px 10px; border-radius:10px; font-weight:800; cursor:pointer; }

        .totalVal { font-weight:800; }

        .pill { display:inline-flex; align-items:center; justify-content:center; padding:4px 10px; border-radius:9999px; font-size:12px; font-weight:800; letter-spacing:.4px; text-transform:uppercase; }
        .pill--green { background:#e7f6ec; color:#167e3d; }
        .pill--red { background:#fdecec; color:#b42318; }
        .pill--gray { background:#eee; color:#555; }
      `}</style>
    </div>
  );
}
