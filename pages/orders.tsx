// pages/orders.tsx
import { useEffect, useState } from "react";

/* ---------- Types ---------- */
type OrderItem = {
  name: string;
  price: number;
  quantity?: number;
  qty?: number;
  image?: string;
  [key: string]: any;
};

type Order = {
  id: string;
  reference?: string;
  createdAt?: string; // human display
  paidAt?: string; // ISO timestamp if present
  total: number;
  items: OrderItem[];
};

/* ---------- LocalStorage keys ---------- */
const CANONICAL_KEY = "orders";
const POSSIBLE_KEYS = ["orders", "mm_orders", "mastermind_orders", "cart_orders"];

/* ---------- Display helpers ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
const formatDateTime = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const createdFromId = (id: string): string | undefined => {
  const m = id.match(/\d+/);
  if (!m) return;
  const ts = Number(m[0]);
  if (!Number.isFinite(ts)) return;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? undefined : formatDateTime(d);
};

const PLACEHOLDER = "https://via.placeholder.com/56x56.png?text=%20";
const slugify = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const resolveItemImage = (it: OrderItem) => {
  const direct =
    it.image || (it as any).img || (it as any).imageUrl || (it as any).photo || (it as any).picture;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("productImages");
      if (raw) {
        const map = JSON.parse(raw);
        if (map && typeof map === "object" && map[it.name]) return String(map[it.name]);
      }
    } catch {}
  }
  const slug = slugify(it.name);
  if (slug) return `/images/${slug}.webp`;
  return PLACEHOLDER;
};

/* ---------- Pills ---------- */
const Pill = ({ bg, text, label }: { bg: string; text: string; label: string }) => (
  <span className="pill" style={{ background: bg, color: text }}>
    {label}
    <style jsx>{`
      .pill {
        font-size: 12px;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 999px;
        white-space: nowrap;
      }
    `}</style>
  </span>
);

const HeaderPill = ({ status }: { status: "SUCCESS" | "FAILED" | "PENDING" }) => {
  if (status === "SUCCESS")
    return <Pill bg="rgba(34,197,94,0.18)" text="#0a5b2a" label="Successful" />;
  if (status === "FAILED")
    return <Pill bg="rgba(248,113,113,0.18)" text="#7f1d1d" label="Failed" />;
  return <Pill bg="rgba(148,163,184,0.18)" text="#334155" label="Pending" />;
};

const StatusPill = ({ status }: { status: "SUCCESS" | "FAILED" | "PENDING" }) => {
  if (status === "SUCCESS") return <Pill bg="rgba(34,197,94,0.18)" text="#0a5b2a" label="Paid" />;
  if (status === "FAILED") return <Pill bg="rgba(248,113,113,0.18)" text="#7f1d1d" label="Failed" />;
  return <Pill bg="rgba(148,163,184,0.18)" text="#334155" label="Pending" />;
};

/* ---------- Time helpers ---------- */
const toMsSafe = (v?: string): number | undefined => {
  if (!v || typeof v !== "string") return;
  const isoLike =
    /\d{4}-\d{2}-\d{2}T/.test(v) || /\d{4}-\d{2}-\d{2}\s/.test(v) || /Z$/.test(v);
  if (!isoLike) return;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : undefined;
};
const idMs = (id: string): number | undefined => {
  const m = id.match(/\d+/);
  if (!m) return;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : undefined;
};
const isUnrealisticDisplayDate = (display?: string): boolean => {
  if (!display) return false;
  const m = display.match(/(\d{4})/);
  if (!m) return false;
  const year = Number(m[1]);
  const now = new Date();
  const max = now.getFullYear() + 1;
  return year < 2000 || year > max;
};

/* ---------- Page ---------- */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copiedFor, setCopiedFor] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const merged: Order[] = [];
    for (const key of POSSIBLE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) merged.push(...arr);
      } catch {}
    }

    const normalized: Order[] = (merged || [])
      .filter((o) => o && typeof (o as any).id === "string")
      .map((o: any) => {
        const items: OrderItem[] = Array.isArray(o.items) ? o.items : [];
        const ts = idMs(o.id) ?? toMsSafe(o.paidAt) ?? toMsSafe(o.createdAt);

        let display =
          (ts !== undefined ? formatDateTime(new Date(ts)) : undefined) ||
          o.createdAt ||
          createdFromId(o.id) ||
          formatDateTime(new Date());

        return { ...o, createdAt: display, items };
      });

    // Sort: realistic first, newest → oldest inside bucket
    normalized.sort((a, b) => {
      const aBad = isUnrealisticDisplayDate(a.createdAt);
      const bBad = isUnrealisticDisplayDate(b.createdAt);
      if (aBad !== bBad) return aBad ? 1 : -1;
      const aTs = idMs(a.id) ?? toMsSafe(a.paidAt) ?? toMsSafe(a.createdAt) ?? 0;
      const bTs = idMs(b.id) ?? toMsSafe(b.paidAt) ?? toMsSafe(b.createdAt) ?? 0;
      return bTs - aTs;
    });

    try {
      localStorage.setItem(CANONICAL_KEY, JSON.stringify(normalized));
      for (const key of POSSIBLE_KEYS) {
        if (key !== CANONICAL_KEY) localStorage.removeItem(key);
      }
    } catch {}

    const collapsed: Record<string, boolean> = {};
    normalized.forEach((o) => (collapsed[o.id] = false));

    setOrders(normalized);
    setExpanded(collapsed);
  }, []);

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const statusFrom = (o: Order): "SUCCESS" | "FAILED" | "PENDING" =>
    o.reference ? "SUCCESS" : "PENDING";

  if (orders === null) return <div style={{ background: "#f6f6f6", minHeight: "100vh" }} />;

  return (
    <div style={{ background: "#f6f6f6", minHeight: "100vh" }}>
      {/* Header */}
      <div className="top">
        <div className="topInner">
          <div className="title">
            <span className="emoji" aria-hidden>
              🧾
            </span>
            <div className="titleText">My Orders</div>
          </div>
          <a href="/" className="backBtn">
            ← Back to Shop
          </a>
        </div>
      </div>

      {/* List */}
      <div className="wrap">
        {orders.length === 0 ? (
          <div className="empty">No orders yet.</div>
        ) : (
          <div className="list">
            {orders.map((order) => {
              const isOpen = !!expanded[order.id];
              const status = statusFrom(order);

              return (
                <div key={order.id} className="card">
                  {/* Header row (toggle) */}
                  <button onClick={() => toggle(order.id)} className="cardBtn" aria-expanded={isOpen}>
                    <div className="rowHead">
                      <div className="idCol">
                        <div className="orderLine">
                          <span className="orderLbl">Order</span>
                          <span className="orderId">#{order.id}</span>
                        </div>
                        {order.createdAt ? (
                          <span className="date">{order.createdAt}</span>
                        ) : null}
                      </div>

                      {/* Pill + amount group */}
                      <div className="headRight">
                        <HeaderPill status={status} />
                        <span className="headAmt">
                          KES {Math.round(order.total).toLocaleString("en-KE")}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Body */}
                  {isOpen && (
                    <div className="body">
                      {/* items */}
                      {order.items.map((it, i) => {
                        const qty = Number(it.quantity ?? it.qty ?? 1);
                        const price = Number(it.price) || 0;
                        const src = resolveItemImage(it);
                        return (
                          <div key={i} className="item">
                            <img
                              src={src}
                              alt={it.name}
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                              }}
                              className="thumb"
                            />
                            <div>
                              <div className="itemName">{it.name}</div>
                              <div className="itemMeta">
                                KES {Math.round(price)} × {qty} ={" "}
                                <span className="itemTotal">KES {Math.round(price * qty)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Reference + copy */}
                      <div className="refRow">
                        <span className="muted">Reference</span>
                        <span className="refBox">{order.reference || "—"}</span>
                        {order.reference ? (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(order.reference!);
                                  setCopiedFor(order.id);
                                  setTimeout(
                                    () => setCopiedFor((v) => (v === order.id ? null : v)),
                                    1200
                                  );
                                } catch {}
                              }}
                              className="copyBtn"
                            >
                              Copy
                            </button>
                            {copiedFor === order.id && <span className="copied">Copied!</span>}
                          </>
                        ) : null}
                      </div>

                      {/* Status row (centered) */}
                      <div className="statusRow">
                        <span className="muted">Status</span>
                        <StatusPill status={status} />
                      </div>

                      {/* Total row (centered & small amount) */}
                      <div className="totalRow">
                        <span className="totalLbl">Total</span>
                        <span className="totalAmt">
                          KES {Math.round(order.total).toLocaleString("en-KE")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .top {
          background: #111;
          color: #fff;
          padding: 14px 16px;
          position: sticky;
          top: 0;
          z-index: 5;
        }
        .topInner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
        }
        .title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .emoji {
          background: #f4d03f;
          color: #111;
          font-weight: 800;
          padding: 2px;
          border-radius: 6px;
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .titleText {
          font-weight: 800;
        }
        .backBtn {
          text-decoration: none;
          background: #fff;
          color: #111;
          font-weight: 800;
          padding: 8px 14px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .wrap {
          max-width: 1200px;
          margin: 12px auto;
          padding: 0 12px;
        }
        .empty {
          background: #fff;
          border: 1px solid #eee;
          border-radius: 14px;
          padding: 16px;
          text-align: center;
          color: #666;
        }
        .list {
          display: grid;
          gap: 12px;
        }
        .card {
          background: #fff;
          border: 1px solid #eee;
          border-radius: 16px;
          overflow: hidden;
        }
        .cardBtn {
          all: unset;
          cursor: pointer;
          width: 100%;
        }
        .rowHead {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-bottom: 1px solid #f0f0f0;
        }
        .idCol {
          display: flex;
          flex-direction: column;
        }
        .orderLine {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .orderLbl {
          color: #666;
          font-size: 12px;
        }
        .orderId {
          font-weight: 800;
          font-size: 13px;
        }
        .date {
          color: #9aa3af;
          font-size: 12px;
          margin-top: 4px;
        }

        /* pill + amount group in header */
        .headRight {
          display: inline-grid;
          grid-auto-flow: column;
          align-items: center;
          gap: clamp(10px, 2.5vw, 24px);
        }
        .headAmt {
          font-weight: 800;
          white-space: nowrap;
          font-size: 12px;
        }

        .body {
          padding: 14px;
          display: grid;
          gap: 10px;
        }
        .item {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 10px;
          align-items: center;
        }
        .thumb {
          width: 56px;
          height: 56px;
          border-radius: 10px;
          object-fit: cover;
          background: #f4f4f4;
          border: 1px solid #eee;
        }
        .itemName {
          font-weight: 800;
        }
        .itemMeta {
          color: #666;
        }
        .itemTotal {
          font-weight: 700;
          color: #111;
        }

        .refRow {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .muted {
          color: #777;
        }
        .refBox {
          background: #f5f6f8;
          border: 1px solid #eee;
          border-radius: 10px;
          padding: 6px 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 13px;
        }
        .copyBtn {
          background: #fde68a;
          color: #111;
          font-weight: 800;
          border: none;
          padding: 6px 10px;
          border-radius: 10px;
          cursor: pointer;
        }
        .copied {
          font-size: 12px;
          font-weight: 800;
          background: rgba(34, 197, 94, 0.18);
          color: #0a5b2a;
          padding: 4px 8px;
          border-radius: 8px;
        }

        /* Centered status row */
        .statusRow {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        /* Centered total row with smaller amount */
        .totalRow {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
        }
        .totalLbl {
          color: #777;
          font-size: 11px;
        }
        .totalAmt {
          font-weight: 800;
          font-size: 12px;
          white-space: nowrap;
        }

        /* --------- Responsive tweaks --------- */
        @media (min-width: 768px) {
          /* Desktop: keep header pill+amount near the order line, not edge */
          .headRight {
            gap: 20px;
            margin-right: 10px;
          }
          .orderId {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
