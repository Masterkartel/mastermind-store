// pages/orders.tsx
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

type PaymentStatus = "PENDING" | "PAID" | "FAILED";
type OrderStatus = "PENDING" | "COMPLETED" | "FAILED";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  img?: string;
};

type Order = {
  id: string;              // our local order id: e.g. T<timestamp>
  reference: string;       // Paystack reference
  createdAt?: string;      // ISO date string
  total: number;
  items: OrderItem[];
  // statuses shown in UI
  paymentStatus: PaymentStatus; // PAID/FAILED/PENDING (inner “Status” row)
  status: OrderStatus;          // COMPLETED/FAILED/PENDING (top-right pill)
};

const LS_KEY = "mm_orders";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // which cards are open
  const [busy, setBusy] = useState<string | null>(null);

  // ---- load saved orders ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Order[];
      if (Array.isArray(parsed)) {
        setOrders(parsed);
      }
    } catch {}
  }, []);

  // convenience
  const fmt = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;
  const fmtDateTime = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
      const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      return `${date}, ${time}`;
    } catch {
      return "";
    }
  };

  const persist = (next: Order[]) => {
    setOrders(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {}
  };

  // ---- verify one order (by reference) with your /api/paystack-verify endpoint ----
  async function reverify(ord: Order) {
    try {
      setBusy(ord.reference);
      const res = await fetch(`/api/paystack-verify?reference=${encodeURIComponent(ord.reference)}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });

      if (!res.ok) throw new Error("verify failed");
      const data = await res.json();

      // Expecting something like: { ok: true, status: 'success'|'failed'|'abandoned', reference: string }
      // Normalize -> PaymentStatus + OrderStatus
      const statusRaw = (data?.status || "").toString().toLowerCase();
      let newPayment: PaymentStatus = "PENDING";
      if (statusRaw === "success") newPayment = "PAID";
      else if (statusRaw === "failed") newPayment = "FAILED";
      else newPayment = "PENDING";

      const newStatus: OrderStatus =
        newPayment === "PAID" ? "COMPLETED" : newPayment === "FAILED" ? "FAILED" : "PENDING";

      const updated: Order[] = orders.map((o) =>
        o.id === ord.id
          ? { ...o, paymentStatus: newPayment as PaymentStatus, status: newStatus as OrderStatus }
          : o
      );
      persist(updated);
    } catch (e) {
      alert("Could not verify right now. Try again later.");
    } finally {
      setBusy(null);
    }
  }

  // sort newest first
  const ordered = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const ta = Number(a.id.replace(/\D/g, "")) || 0;
        const tb = Number(b.id.replace(/\D/g, "")) || 0;
        return tb - ta;
      }),
    [orders]
  );

  const toggle = (id: string) =>
    setExpanded((m) => ({ ...m, [id]: !m[id] }));

  const copy = (t: string) => {
    try {
      navigator.clipboard.writeText(t);
      alert("Copied!");
    } catch {}
  };

  // helpers for classnames
  const pillClass = (kind: "green" | "red" | "grey") =>
    `pill ${kind === "green" ? "pill--green" : kind === "red" ? "pill--red" : "pill--grey"}`;

  const statusToPill = (s: OrderStatus) =>
    s === "COMPLETED" ? pillClass("green") : s === "FAILED" ? pillClass("red") : pillClass("grey");

  const payToPill = (p: PaymentStatus) =>
    p === "PAID" ? pillClass("green") : p === "FAILED" ? pillClass("red") : pillClass("grey");

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#f7f7f7" }}>
      <Head>
        <title>My Orders • Mastermind</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <img src="/favicon.ico" alt="" className="brandIcon" aria-hidden />
            My Orders
          </div>
          <a href="/" className="backBtn">← Back to Shop</a>
        </div>
      </header>

      <main className="wrap">
        {ordered.length === 0 ? (
          <div className="empty">No orders yet.</div>
        ) : (
          ordered.map((o) => {
            const isOpen = !!expanded[o.id];
            return (
              <article key={o.id} className="orderCard">
                {/* Summary row (clickable) */}
                <button className="summary" onClick={() => toggle(o.id)} aria-expanded={isOpen}>
                  <div className="sumLeft">
                    <div className="orderId">
                      <span className="muted">Order&nbsp;</span>
                      <strong>#{o.id}</strong>
                    </div>
                    {o.createdAt && (
                      <div className="date">{fmtDateTime(o.createdAt)}</div>
                    )}
                  </div>
                  <div className="sumRight">
                    <span className={statusToPill(o.status)}>
                      {o.status}
                    </span>
                    <span className="amount">{fmt(o.total)}</span>
                  </div>
                </button>

                {/* Details */}
                {isOpen && (
                  <div className="details">
                    {/* items */}
                    {o.items.map((it) => (
                      <div key={it.id} className="line">
                        <div className="thumb">
                          {/* image from public path written at checkout time */}
                          {it.img ? (
                            <img src={it.img} alt="" />
                          ) : (
                            <div className="ph" />
                          )}
                        </div>
                        <div className="info">
                          <div className="name">{it.name}</div>
                          <div className="muted">
                            {fmt(it.price)} × {it.qty} = <strong>{fmt(it.price * it.qty)}</strong>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* meta */}
                    <div className="meta">
                      <div className="row">
                        <div className="lab">Reference</div>
                        <div className="val">
                          <span className="ref">{o.reference}</span>
                          <button className="copy" onClick={() => copy(o.reference)}>Copy</button>
                        </div>
                      </div>

                      <div className="row">
                        <div className="lab">Status</div>
                        <div className="val">
                          <span className={payToPill(o.paymentStatus)}>{o.paymentStatus}</span>
                          <button
                            className="reverify"
                            onClick={() => reverify(o)}
                            disabled={busy === o.reference}
                            title="Verify with Paystack"
                          >
                            {busy === o.reference ? "Checking..." : "Re-verify"}
                          </button>
                        </div>
                      </div>

                      <div className="row">
                        <div className="lab">Total</div>
                        <div className="val strong">{fmt(o.total)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>

      <style jsx>{`
        .wrap { max-width: 900px; margin: 16px auto; padding: 0 12px 24px; }
        .empty { background:#fff; border:1px solid #eee; border-radius:14px; padding:18px; text-align:center; color:#666; }

        .topbar { position: sticky; top: 0; z-index: 40; background:#111; color:#fff; border-bottom:1px solid rgba(255,255,255,.08); }
        .topbar__inner { max-width: 1100px; margin: 0 auto; display:flex; align-items:center; justify-content:space-between; padding:10px 16px; }
        .brand { font-weight:800; letter-spacing:.2px; display:flex; gap:8px; align-items:center; }
        .brandIcon { width:22px; height:22px; border-radius:4px; }
        .backBtn { background:#fff; color:#111; text-decoration:none; padding:8px 12px; border-radius:12px; border:1px solid #eee; font-weight:800; }

        .orderCard { background:#fff; border:1px solid #eee; border-radius:16px; margin-bottom:14px; overflow:hidden; box-shadow:0 1px 0 rgba(0,0,0,.03); }
        .summary { width:100%; background:#fff; border:none; padding:12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; }
        .summary:hover { background:#fcfcfc; }
        .sumLeft { display:flex; flex-direction:column; gap:4px; text-align:left; }
        .orderId { font-size:14px; }
        .date { font-size:12px; color:#888; }
        .sumRight { display:flex; align-items:center; gap:10px; }
        .amount { font-weight:800; }

        .details { border-top:1px dashed #eee; padding:12px; display:grid; gap:12px; }
        .line { display:grid; grid-template-columns:48px 1fr; gap:10px; align-items:center; }
        .thumb { width:48px; height:48px; border-radius:10px; overflow:hidden; background:#f3f3f3; display:flex; align-items:center; justify-content:center; }
        .thumb img { width:100%; height:100%; object-fit:cover; }
        .ph { width:100%; height:100%; background:linear-gradient(90deg,#eee,#f6f6f6,#eee); }

        .info .name { font-weight:800; }
        .muted { color:#777; }

        .meta { display:grid; gap:10px; }
        .row { display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .lab { color:#777; }
        .val { display:flex; align-items:center; gap:8px; }
        .val.strong, .strong { font-weight:800; }
        .ref { background:#f5f5f5; border:1px solid #eee; padding:6px 10px; border-radius:10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

        .copy { background:#ffd24d; border:1px solid #f2c944; padding:6px 10px; border-radius:12px; font-weight:800; cursor:pointer; }
        .reverify { background:#fff; border:1px solid #ddd; padding:6px 10px; border-radius:12px; font-weight:800; cursor:pointer; }

        .pill { padding:4px 10px; border-radius:9999px; font-weight:800; font-size:12px; border:1px solid transparent; }
        .pill--green { background:#e8f7ee; color:#0a7a39; border-color:#bdebd1; }
        .pill--red { background:#fdeaea; color:#b42525; border-color:#f3c1c1; }
        .pill--grey { background:#f1f1f1; color:#555; border-color:#e3e3e3; }
      `}</style>
    </div>
  );
}
