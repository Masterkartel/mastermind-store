import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  img?: string;
};

type Order = {
  id: string; // display id like T...
  reference: string; // paystack reference
  createdAt?: string; // ISO
  total: number;
  items: OrderItem[];

  // header status
  status: "PENDING" | "COMPLETED" | "FAILED";

  // detail payment pill
  paymentStatus: "PENDING" | "PAID" | "FAILED";
};

const currency = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

const loadOrders = (): Order[] => {
  try {
    const raw = localStorage.getItem("mm_orders");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};
const saveOrders = (orders: Order[]) => {
  try {
    localStorage.setItem("mm_orders", JSON.stringify(orders));
  } catch {}
};

const Pill = ({
  text,
  tone,
}: {
  text: string;
  tone: "green" | "red" | "gray";
}) => <span className={`pill pill--${tone}`}>{text}</span>;

// Robust interpreter for different verify payloads
function interpretVerify(json: any): "success" | "failed" | "pending" | "unknown" {
  try {
    // Cloudflare function shape: { status: "success" | "failed" | "pending" }
    const s1 = (json?.status ?? "").toString().toLowerCase();
    if (["success", "failed", "pending"].includes(s1)) return s1 as any;

    // Paystack native: {status:true/false, data:{status:"success"|"failed"|"pending"}}
    const s2 = (json?.data?.status ?? "").toString().toLowerCase();
    if (["success", "failed", "pending"].includes(s2)) return s2 as any;

    // Some gateways return gateway_response / message
    const s3 = (json?.data?.gateway_response ?? "").toString().toLowerCase();
    if (s3.includes("success")) return "success";
    if (s3.includes("fail")) return "failed";
  } catch {}
  return "unknown";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const verifyingRef = useRef(false);

  // Load once
  useEffect(() => {
    setOrders(loadOrders());
  }, []);

  // Auto-verify any PENDING orders, with a few retries in the background
  useEffect(() => {
    if (verifyingRef.current) return;
    const pending = orders.filter((o) => o.paymentStatus === "PENDING");
    if (pending.length === 0) return;

    verifyingRef.current = true;
    let cancelled = false;

    const verifyOnce = async (ord: Order) => {
      try {
        const res = await fetch(
          `/api/paystack-verify?reference=${encodeURIComponent(ord.reference)}`
        ).catch(() => null as any);
        if (!res?.ok) return false;
        const json = await res.json().catch(() => ({}));
        const verdict = interpretVerify(json);

        if (verdict === "success") {
          const next = orders.map((o) =>
            o.id === ord.id
              ? { ...o, status: "COMPLETED", paymentStatus: "PAID" }
              : o
          );
          if (!cancelled) {
            setOrders(next);
            saveOrders(next);
          }
          return true;
        } else if (verdict === "failed") {
          const next = orders.map((o) =>
            o.id === ord.id
              ? { ...o, status: "FAILED", paymentStatus: "FAILED" }
              : o
          );
          if (!cancelled) {
            setOrders(next);
            saveOrders(next);
          }
          return true;
        }
        // pending or unknown — let retry handle it
        return false;
      } catch {
        return false;
      }
    };

    (async () => {
      // retry each pending order up to 6 times (about 60s)
      const maxTries = 6;
      for (let t = 0; t < maxTries && !cancelled; t++) {
        let anyProgress = false;
        for (const ord of pending) {
          // Skip if already updated by a previous loop
          const fresh = (id: string) => orders.find((o) => o.id === id);
          const current = fresh(ord.id);
          if (!current || current.paymentStatus !== "PENDING") continue;
          const ok = await verifyOnce(current);
          if (ok) anyProgress = true;
        }
        if (!anyProgress) {
          // wait 10s before next attempt
          await new Promise((r) => setTimeout(r, 10000));
        } else {
          // reload latest for next loop round
          if (!cancelled) {
            const latest = loadOrders();
            setOrders(latest);
          }
        }
      }
      verifyingRef.current = false;
    })();

    return () => {
      cancelled = true;
      verifyingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.length]); // trigger when list size changes (initial load or new order added)

  const sorted = useMemo(() => orders.slice().reverse(), [orders]);

  const headerPill = (o: Order) => {
    if (o.status === "COMPLETED") return <Pill text="COMPLETED" tone="green" />;
    if (o.status === "FAILED") return <Pill text="FAILED" tone="red" />;
    return <Pill text="PENDING" tone="gray" />;
  };

  const paymentPill = (o: Order) => {
    if (o.paymentStatus === "PAID") return <Pill text="PAID" tone="green" />;
    if (o.paymentStatus === "FAILED") return <Pill text="FAILED" tone="red" />;
    return <Pill text="PENDING" tone="gray" />;
  };

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>My Orders • Mastermind</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
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

      <main className="container" style={{ padding: "12px 12px 24px" }}>
        {sorted.length === 0 ? (
          <div className="emptyCard">No orders yet.</div>
        ) : (
          sorted.map((o) => {
            const open = openId === o.id;
            const created = o.createdAt ? new Date(o.createdAt) : null;

            return (
              <article
                key={o.id}
                className="orderCard"
                onClick={() => setOpenId(open ? null : o.id)}
              >
                <div className="orderCard__top">
                  <div className="orderTitle">
                    Order <span className="mono">#{o.id}</span>
                  </div>
                  <div className="right">
                    {headerPill(o)}
                    <div className="amount">{currency(o.total)}</div>
                  </div>
                </div>

                {created && (
                  <div className="dt">
                    {created.toLocaleDateString()}{" "}
                    {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}

                {open && (
                  <div className="details" onClick={(e) => e.stopPropagation()}>
                    {/* First line preview with image */}
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

                    {/* Reference row */}
                    <div className="row">
                      <div className="label">Reference</div>
                      <div className="refWrap">
                        <code className="ref mono">{o.reference}</code>
                        <button
                          className="copyBtn"
                          onClick={() =>
                            navigator.clipboard?.writeText(o.reference)
                          }
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* Payment Status row */}
                    <div className="row">
                      <div className="label">Status</div>
                      <div>{paymentPill(o)}</div>
                    </div>

                    {/* Total row */}
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

        .topbar { background:#111; color:#fff; position:sticky; top:0; z-index:50; }
        .topbar__inner { max-width:900px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; padding:10px 12px; }
        .brand { font-weight:800; display:flex; align-items:center; gap:8px; }
        .brandIcon { width:22px; height:22px; border-radius:4px; }
        .backBtn { background:#fff; color:#111; padding:8px 12px; border-radius:12px; font-weight:800; text-decoration:none; }

        .orderCard { background:#fff; border:1px solid #eee; border-radius:16px; padding:12px; margin:12px 0; box-shadow:0 1px 0 rgba(0,0,0,.03); cursor:pointer; }
        .orderCard__top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .orderTitle { font-weight:800; }
        .right { display:flex; align-items:center; gap:8px; }
        .amount { font-weight:800; }
        .dt { color:#777; margin:6px 0 8px; }

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
        
        .emptyCard { background:#fff; border:1px dashed #ddd; color:#666; padding:16px; border-radius:16px; text-align:center; margin-top:16px; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
      `}</style>
    </div>
  );
}
