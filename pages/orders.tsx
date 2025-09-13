// pages/orders.tsx
import { useEffect, useMemo, useState } from "react";

/** ------------ Types ------------ */
type OrderItem = {
  name: string;
  price: number;
  quantity?: number;
  qty?: number;
  image?: string;
  img?: string;
  imageUrl?: string;
  [k: string]: any;
};

type Order = {
  id: string;
  reference?: string;          // exists when paid (same as order number in your flow)
  createdAt?: string;          // human-friendly date/time
  paidAt?: string;             // optional; if present we prefer for sorting
  total: number;
  items: OrderItem[];
  _ts?: number;                // computed timestamp (ms) used for reliable sorting
};

/** ------------ Storage keys ------------ */
const CANONICAL_KEY = "orders";
const POSSIBLE_KEYS = ["orders", "mm_orders", "mastermind_orders", "cart_orders"];

/** ------------ Helpers ------------ */
const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/** Parse a date/time string like:
 *  "12/09/2025, 17:59" | "12/09/2025, 17:59:00" | ISO | anything Date can parse
 *  Returns ms or undefined if invalid.
 */
const parseToMs = (v?: string): number | undefined => {
  if (!v) return;
  // If already ISO or generic, try Date
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.getTime();

  // Try "DD/MM/YYYY, HH:MM[:SS]"
  const m = v.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (m) {
    const [_, dd, mm, yyyy, HH, MM, SS] = m;
    const dt = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(HH),
      Number(MM),
      Number(SS || 0),
    );
    if (!isNaN(dt.getTime())) return dt.getTime();
  }
  return;
};

// Derive a sensible createdAt if missing by reading a number from the id
const createdFromId = (id: string): string | undefined => {
  const ts = Number(id?.replace(/^\D+/, ""));
  if (!Number.isFinite(ts)) return;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return;
  return fmt(d);
};

// Clamp clearly bad future years (e.g., 2952) to "now"
const clampWeirdFuture = (ms?: number): number | undefined => {
  if (ms == null) return;
  const d = new Date(ms);
  const y = d.getFullYear();
  const thisYear = new Date().getFullYear();
  if (y > thisYear + 1) return Date.now();
  return ms;
};

const PLACEHOLDER = "https://via.placeholder.com/56x56.png?text=%20";

const slugify = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const resolveItemImage = (it: OrderItem) => {
  const direct = it.image || it.img || it.imageUrl || it.photo || it.picture;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  // Local map from product name to URL (if you ever save it)
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("productImages");
      if (raw) {
        const map = JSON.parse(raw);
        if (map && typeof map === "object" && map[it.name]) {
          return String(map[it.name]);
        }
      }
    } catch {}
  }

  // Fallback guess by slug — your catalog uses /products/<slug>.jpg
  const slug = slugify(it.name);
  if (slug) return `/products/${slug}.jpg`;

  return PLACEHOLDER;
};

/** ------------ UI atoms ------------ */
const Pill = ({
  bg,
  text,
  textColor,
}: {
  bg: string;
  textColor: string;
  text: string;
}) => (
  <span
    style={{
      background: bg,
      color: textColor,
      fontSize: 12,
      fontWeight: 800,
      padding: "4px 10px",
      borderRadius: 999,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </span>
);

// Extremely light “mobile-finance” style shades
const shades = {
  greenBg: "rgba(16, 185, 129, 0.15)",
  greenFg: "#16a34a", // used for "Successful" / "Paid"
  redBg: "rgba(239, 68, 68, 0.14)",
  redFg: "#b91c1c",   // used for "Failed"
  grayBg: "rgba(148, 163, 184, 0.18)",
  grayFg: "#334155",  // used for "Pending"
};

/** ------------ Page ------------ */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null); // which order was just copied (to show tiny badge)

  // Load, normalize, compute `_ts`, sort (DESC)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const merged: Order[] = [];
    for (const key of POSSIBLE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) merged.push(...(arr as Order[]));
      } catch {}
    }

    const normalized: Order[] = (merged || [])
      .filter((o) => o && typeof (o as any).id === "string")
      .map((o: any) => {
        const display =
          o.createdAt || createdFromId(o.id) || fmt(new Date());

        // compute ms preference: paidAt > createdAt > display > numeric id
        const msPref =
          parseToMs(o.paidAt) ??
          parseToMs(o.createdAt) ??
          parseToMs(display) ??
          (() => {
            const n = Number(String(o.id || "").replace(/^\D+/, ""));
            return Number.isFinite(n) ? n : undefined;
          })();

        const ts = clampWeirdFuture(msPref) ?? Date.now();

        const items: OrderItem[] = Array.isArray(o.items) ? o.items : [];
        return { ...o, createdAt: display, items, _ts: ts };
      });

    // NEW: always sort newest first by computed `_ts`
    normalized.sort((a, b) => (b._ts || 0) - (a._ts || 0));

    try {
      localStorage.setItem(CANONICAL_KEY, JSON.stringify(normalized));
      for (const key of POSSIBLE_KEYS) {
        if (key !== CANONICAL_KEY) localStorage.removeItem(key);
      }
    } catch {}

    // Default collapsed (auto-collapse on refresh)
    const collapsed: Record<string, boolean> = {};
    normalized.forEach((o) => (collapsed[o.id] = false));

    setOrders(normalized);
    setExpanded(collapsed);
  }, []);

  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const onCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1200);
    } catch {}
  };

  const headerPill = (order: Order) => {
    if (order.reference) {
      return (
        <Pill
          bg={shades.greenBg}
          textColor={shades.greenFg}
          text="Successful"
        />
      );
    }
    // You asked: when FAILED in status row, also FAILED in header
    return <Pill bg={shades.redBg} textColor={shades.redFg} text="Failed" />;
  };

  const statusPill = (order: Order) => {
    if (order.reference) {
      return <Pill bg={shades.greenBg} textColor={shades.greenFg} text="Paid" />;
    }
    return <Pill bg={shades.redBg} textColor={shades.redFg} text="Failed" />;
  };

  const money = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

  const list = useMemo(() => orders ?? [], [orders]);

  if (orders === null) {
    return <div style={{ background: "#f6f6f6", minHeight: "100vh" }} />;
  }

  return (
    <div style={{ background: "#f6f6f6", minHeight: "100vh" }}>
      {/* Top bar */}
      <div
        style={{
          background: "#111",
          color: "#fff",
          padding: "14px 16px",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                background: "#f4d03f",
                color: "#111",
                fontWeight: 800,
                padding: 2,
                borderRadius: 6,
                width: 22,
                height: 22,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-hidden
            >
              🧾
            </span>
            <div style={{ fontWeight: 800 }}>My Orders</div>
          </div>

          <a
            href="/"
            style={{
              textDecoration: "none",
              background: "#fff",
              color: "#111",
              fontWeight: 800,
              padding: "8px 14px",
              borderRadius: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← Back to Shop
          </a>
        </div>
      </div>

      {/* Orders list */}
      <div style={{ maxWidth: 1200, margin: "12px auto", padding: "0 12px" }}>
        {list.length === 0 ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 16,
              textAlign: "center",
              color: "#666",
            }}
          >
            No orders yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {list.map((order) => {
              const isOpen = !!expanded[order.id];
              return (
                <div
                  key={order.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #eee",
                    borderRadius: 16,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {/* Header (tap to toggle) */}
                  <button
                    onClick={() => toggle(order.id)}
                    style={{ all: "unset", cursor: "pointer", width: "100%" }}
                    aria-expanded={isOpen}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 14px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {/* Left: order id + date BELOW */}
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#666" }}>Order</span>
                          <span style={{ fontWeight: 800 }}>#{order.id}</span>
                        </div>
                        {order.createdAt ? (
                          <span style={{ color: "#9aa3af", fontSize: 12, marginTop: 4 }}>
                            {order.createdAt}
                          </span>
                        ) : null}
                      </div>

                      {/* Right: pill + total */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "nowrap",
                        }}
                      >
                        {headerPill(order)}
                        <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                          {money(order.total)}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Body */}
                  {isOpen && (
                    <div style={{ padding: 14, display: "grid", gap: 10 }}>
                      {order.items.map((it, i) => {
                        const qty = Number(it.quantity ?? it.qty ?? 1);
                        const price = Number(it.price) || 0;
                        const src = resolveItemImage(it);
                        return (
                          <div
                            key={i}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "auto 1fr",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <img
                              src={src}
                              alt={it.name}
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                              }}
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: 10,
                                objectFit: "cover",
                                background: "#f4f4f4",
                                border: "1px solid #eee",
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 800 }}>{it.name}</div>
                              <div style={{ color: "#666" }}>
                                KES {Math.round(price)} × {qty} ={" "}
                                <span style={{ fontWeight: 700, color: "#111" }}>
                                  KES {Math.round(price * qty)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Reference */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginTop: 4,
                          position: "relative",
                        }}
                      >
                        <span style={{ color: "#777" }}>Reference</span>
                        <span
                          style={{
                            background: "#f5f6f8",
                            border: "1px solid #eee",
                            borderRadius: 10,
                            padding: "6px 10px",
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 13,
                          }}
                        >
                          {order.reference || "—"}
                        </span>
                        {order.reference ? (
                          <button
                            onClick={() => onCopy(order.reference!, order.id)}
                            style={{
                              background: "rgba(168, 85, 247, 0.15)",
                              color: "#6d28d9",
                              fontWeight: 800,
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: 10,
                              cursor: "pointer",
                              position: "relative",
                            }}
                          >
                            Copy
                            {/* tiny ephemeral badge */}
                            {copiedId === order.id && (
                              <span
                                style={{
                                  position: "absolute",
                                  top: -18,
                                  right: -6,
                                  background: "rgba(16,185,129,0.18)",
                                  color: "#16a34a",
                                  borderRadius: 8,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  padding: "2px 6px",
                                }}
                              >
                                Copied!
                              </span>
                            )}
                          </button>
                        ) : null}
                      </div>

                      {/* Status */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#777" }}>Status</span>
                        {statusPill(order)}
                      </div>

                      {/* Total */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          alignItems: "center",
                          marginTop: 2,
                        }}
                      >
                        <span style={{ color: "#777" }}>Total</span>
                        <span style={{ fontWeight: 800 }}>{money(order.total)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
