// pages/orders.tsx
import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  img?: string;
};

type Order = {
  id: string;
  reference: string;
  createdAt?: string;
  total: number;
  items: OrderItem[];
  status: "PENDING" | "COMPLETED" | "FAILED";
  paymentStatus: "PENDING" | "PAID" | "FAILED";
};

const currency = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

// localStorage helpers
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

// interpret verify response -> literal verdict
type GatewayVerdict = "success" | "failed" | "pending" | "unknown";
function interpretVerify(json: any): GatewayVerdict {
  try {
    const s1 = (json?.status ?? "").toString().toLowerCase();
    if (s1 === "success" || s1 === "failed" || s1 === "pending") return s1 as GatewayVerdict;
    const s2 = (json?.data?.status ?? "").toString().toLowerCase();
    if (s2 === "success" || s2 === "failed" || s2 === "pending") return s2 as GatewayVerdict;
    const s3 = (json?.data?.gateway_response ?? "").toString().toLowerCase();
    if (s3.includes("success")) return "success";
    if (s3.includes("fail")) return "failed";
  } catch {}
  return "unknown";
}

const Pill = ({ text, tone }: { text: string; tone: "green" | "red" | "gray" }) => (
  <span className={`pill pill--${tone}`}>{text}</span>
);

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  // allow many open at once
  const [openIds, setOpenIds] = useState<string[]>([]);
  const verifyingRef = useRef(false);

  useEffect(() => setOrders(loadOrders()), []);

  // Background auto-verify for pending orders
  useEffect(() => {
    if (verifyingRef.current) return;
    const pending = orders.some((o) => o.paymentStatus === "PENDING");
    if (!pending) return;

    verifyingRef.current = true;
    let cancelled = false;

    const mark = (ordId: string, verdict: GatewayVerdict) => {
      let newStatus: Order["status"] = "PENDING";
      let newPayment: Order["paymentStatus"] = "PENDING";
      if (verdict === "success") {
        newStatus = "COMPLETED";
        newPayment = "PAID";
      } else if (verdict === "failed") {
        newStatus = "FAILED";
        newPayment = "FAILED";
      }
      const current = loadOrders();
      const next: Order[] = current.map((o) =>
        o.id === ordId ? { ...o, status: newStatus, paymentStatus: newPayment } : o
      );
      if (!cancelled) {
        setOrders(next);
        saveOrders(next);
      }
    };

    const verifyOnce = async (ord: Order) => {
      try {
        const res = await fetch(`/api/paystack-verify?reference=${encodeURIComponent(ord.reference)}`).catch(
          () => null as any
        );
        if (!res?.ok) return false;
        const json = await res.json().catch(() => ({}));
        const verdict = interpretVerify(json);
        if (verdict === "success" || verdict === "failed") {
          mark(ord.id, verdict);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    (async () => {
      const maxTries = 6;
      for (let t = 0; t < maxTries && !cancelled; t++) {
        let progressed = false;
        const snapshot = loadOrders();
        for (const ord of snapshot) {
          if (ord.paymentStatus !== "PENDING") continue;
          const ok = await verifyOnce(ord);
          if (ok) progressed = true;
        }
        if (!progressed) await new Promise((r) => setTimeout(r, 10000));
      }
      verifyingRef.current = false;
    })();

    return () => {
      cancelled = true;
      verifyingRef.current = false;
    };
  }, [orders.length]);

  const sorted = useMemo(() => orders.slice().reverse(), [orders]);

  const toggleOpen = (id: string) =>
    setOpenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const headerPill = (o: Order) =>
    o.status === "COMPLETED" ? (
      <Pill text="COMPLETED" tone="green" />
    ) : o.status === "FAILED" ? (
      <Pill text="FAILED" tone="red" />
    ) : (
      <Pill text="PENDING" tone="gray" />
    );

  const paymentPill = (o: Order) =>
    o.paymentStatus === "PAID" ? (
      <Pill text="PAID" tone="green" />
    ) : o.paymentStatus === "FAILED" ? (
      <Pill text="FAILED" tone="red" />
    ) : (
      <Pill text="PENDING" tone="gray" />
    );

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>My Orders • Mastermind</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Topbar */}
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
            const open = openIds.includes(o.id);
            const created = o.createdAt ? new Date(o.createdAt) : null;

            return (
              <article key={o.id} className="orderCard">
                <button className="orderCard__top" onClick={() => toggleOpen(o.id)}>
                  <div className="orderTitle">
                    Order <span className="mono">#{o.id}</span>
                  </div>
                  <div className="right">
                    {headerPill(o)}
                    <div className="amount">{currency(o.total)}</div>
                  </div>
                </button>

                {created && (
                  <div className="dt">
                    {created.toLocaleDateString()}{" "}
                    {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}

                {open && (
                  <div className="details">
                    {o.items[0] && (
                      <div className="line">
                        <div className="thumb">
                          {o.items[0].img ? (
                            <img src={o.items[0].img} alt={o.items[0].name} className="thumbImg" loading="lazy" />
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

                    <div className="row">
                      <div className="label">Reference</div>
                      <div className="refWrap">
                        <code className="ref mono">{o.reference}</code>
                        <button
                          className="copyBtn"
                          onClick={() => navigator.clipboard?.writeText(o.reference)}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="row">
                      <div className="label">Status</div>
                      <div>{paymentPill(o)}</div>
                    </div>

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

        .orderCard { background:#fff; border:1px solid #eee; border-radius:16px; padding:10px 12px; margin:12px 0; box-shadow:0 1px 0 rgba(0,0,0,.03); }
        .orderCard__top { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; background:transparent; border:none; padding:0; text-align:left; cursor:pointer; }
        .orderTitle { font-weight:800; }
        .right { display:flex; align-items:center; gap:8px; }
        .amount { font-weight:800; }
        .dt { color:#777; margin:6px 0 8px; }

        .details { border-top:1px dashed #eee; padding-top:10px; }
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
