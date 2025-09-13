// pages/orders.tsx
import { useEffect, useMemo, useState } from "react";

/** ---------------- Types ---------------- */
type OrderItem = {
  name: string;
  price: number;
  quantity?: number; // accept quantity or qty (legacy)
  qty?: number;
  image?: string;
  // we may also see: img, imageUrl, photo, picture
  [key: string]: any;
};

type Order = {
  id: string;
  reference?: string; // exists when paid (same as order number in your flow)
  createdAt?: string; // may exist, but we will also attach _ts for reliable sorting
  paidAt?: string;
  total: number;
  items: OrderItem[];
  _ts?: number; // internal numeric timestamp we derive for sorting/formatting
};

/** ---------------- Storage keys ---------------- */
const CANONICAL_KEY = "orders";
const POSSIBLE_KEYS = ["orders", "mm_orders", "mastermind_orders", "cart_orders"];

/** ---------------- Helpers ---------------- */
const pad = (n: number) => String(n).padStart(2, "0");

/** Format a numeric timestamp (ms) to DD/MM/YYYY, HH:mm:ss */
const formatDateTime = (ts?: number) => {
  if (!ts) return "";
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** Parse many date string shapes to ms (or undefined) */
const parseToMs = (v: any): number | undefined => {
  if (!v) return;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    // 1) ISO or any Date-parsable format
    const d1 = new Date(v);
    if (!isNaN(d1.getTime())) return d1.getTime();

    // 2) Our pretty format: DD/MM/YYYY, HH:mm(:ss optional)
    const m = v.match(
      /^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}):(\d{2})(?::(\d{2}))?$/
    );
    if (m) {
      const [, dd, mm, yyyy, HH, MM, SS] = m;
      const d = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
        Number(HH),
        Number(MM),
        SS ? Number(SS) : 0
      );
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }
  return;
};

/** If id begins with digits that look like a timestamp, derive ms from it */
const msFromIdStart = (id: string): number | undefined => {
  const ts = Number(String(id).replace(/^\D+/, ""));
  if (Number.isFinite(ts)) {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return;
};

const PLACEHOLDER = "https://via.placeholder.com/56x56.png?text=%20";
const slugify = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Resolve an item's image from known fields, a localStorage map, or /images/<slug>.webp */
const resolveItemImage = (it: OrderItem) => {
  // 1) direct fields
  const direct = it.image || it.img || it.imageUrl || it.photo || it.picture;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  // 2) localStorage map (optional): { "<item name>": "url" }
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

  // 3) public images by slug
  const slug = slugify(it.name);
  if (slug) return `/images/${slug}.webp`;

  // 4) final fallback
  return PLACEHOLDER;
};

/** ---------------- Pills (very light shades, text colored for contrast) ---------------- */
const HeaderPill = ({ status }: { status: "SUCCESS" | "FAILED" | "PENDING" }) => {
  const styleMap: Record<
    typeof status,
    { bg: string; fg: string; label: string }
  > = {
    SUCCESS: { bg: "rgba(16,185,129,0.15)", fg: "#059669", label: "Successful" },
    FAILED: { bg: "rgba(239,68,68,0.12)", fg: "#b91c1c", label: "Failed" },
    PENDING: { bg: "rgba(100,116,139,0.15)", fg: "#334155", label: "Pending" },
  };
  const s = styleMap[status];

  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        fontSize: 12,
        fontWeight: 800,
        padding: "6px 12px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
};

const StatusPill = ({ status }: { status: "SUCCESS" | "FAILED" | "PENDING" }) => {
  const styleMap: Record<
    typeof status,
    { bg: string; fg: string; label: string }
  > = {
    SUCCESS: { bg: "rgba(16,185,129,0.15)", fg: "#059669", label: "Paid" },
    FAILED: { bg: "rgba(239,68,68,0.12)", fg: "#b91c1c", label: "Failed" },
    PENDING: { bg: "rgba(100,116,139,0.15)", fg: "#334155", label: "Pending" },
  };
  const s = styleMap[status];

  return
    <span
      style={{
        background: s.bg,
        color: s.fg,
        fontSize: 12,
        fontWeight: 800,
        padding: "6px 12px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>;
};

/** ---------------- Small "Copied!" bubble ---------------- */
const CopiedBubble = ({ show }: { show: boolean }) => {
  if (!show) return null;
  return (
    <span
      style={{
        marginLeft: 8,
        fontSize: 12,
        fontWeight: 800,
        padding: "2px 8px",
        borderRadius: 999,
        background: "rgba(16,185,129,0.15)",
        color: "#059669",
      }}
    >
      Copied!
    </span>
  );
};

/** ---------------- Page ---------------- */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // per-order toggle (default collapsed)
  const [copiedId, setCopiedId] = useState<string | null>(null); // for the small "Copied!" bubble

  // Load orders, normalize (attach _ts), sort by _ts desc, migrate to canonical key
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

    const now = Date.now();
    const normalized: Order[] = (merged || [])
      .filter((o) => o && typeof (o as any).id === "string")
      .map((o: any) => {
        // derive a reliable numeric timestamp
        let ts: number | undefined = undefined;

        const paidMs = parseToMs(o.paidAt);
        if (paidMs !== undefined) ts = paidMs;

        if (ts === undefined) {
          const createdMs = parseToMs(o.createdAt);
          if (createdMs !== undefined) ts = createdMs;
        }

        if (ts === undefined) {
          const fromId = msFromIdStart(o.id);
          if (fromId !== undefined) ts = fromId;
        }

        if (ts === undefined) ts = now;

        // clamp absurd future timestamps (> +30 days from now)
        const MAX_FUTURE = now + 30 * 24 * 60 * 60 * 1000;
        if (ts > MAX_FUTURE) {
          const idMs = msFromIdStart(o.id);
          ts = idMs && idMs <= MAX_FUTURE ? idMs : now;
        }

        const items: OrderItem[] = Array.isArray(o.items) ? o.items : [];
        return { ...o, _ts: ts, items };
      })
      .sort((a, b) => (b._ts ?? 0) - (a._ts ?? 0)); // newest first

    // Persist to canonical key and clean others
    try {
      localStorage.setItem(CANONICAL_KEY, JSON.stringify(normalized));
      for (const key of POSSIBLE_KEYS) {
        if (key !== CANONICAL_KEY) localStorage.removeItem(key);
      }
    } catch {}

    // default: all collapsed (tap header to expand)
    const initialExpanded: Record<string, boolean> = {};
    normalized.forEach((o) => (initialExpanded[o.id] = false));

    setOrders(normalized);
    setExpanded(initialExpanded);
  }, []);

  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  // Determine pill status per order
  const statusOf = (o: Order): "SUCCESS" | "FAILED" | "PENDING" =>
    o.reference ? "SUCCESS" : "PENDING"; // if you later store a failure flag, map it here

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1200);
    } catch {}
  };

  // Avoid recomputing locale totals etc.
  const asKES = (n: number) =>
    `KES ${Math.round(n).toLocaleString("en-KE")}`;

  if (orders === null) {
    return <div style={{ background: "#f6f6f6", minHeight: "100vh" }} />;
  }

  return (
    <div style={{ background: "#f6f6f6", minHeight: "100vh" }}>
      {/* Header bar */}
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
        {orders.length === 0 ? (
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
            {orders.map((order) => {
              const isOpen = !!expanded[order.id];
              const status = statusOf(order);

              return (
                <div
                  key={order.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #eee",
                    borderRadius: 16,
                    overflow: "hidden",
                  }}
                >
                  {/* Header row (tap to toggle) */}
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
                      {/* Left: order id + date BELOW so pill never gets pushed off */}
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#666" }}>Order</span>
                          <span style={{ fontWeight: 800 }}>#{order.id}</span>
                        </div>
                        {order._ts ? (
                          <span style={{ color: "#9aa3af", fontSize: 12, marginTop: 4 }}>
                            {formatDateTime(order._ts)}
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
                        <HeaderPill status={status} />
                        <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                          {asKES(order.total)}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Body */}
                  {isOpen && (
                    <div style={{ padding: 14, display: "grid", gap: 10 }}>
                      {/* items */}
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
                                (e.currentTarget as HTMLImageElement).src =
                                  PLACEHOLDER;
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
                          <span style={{ display: "inline-flex", alignItems: "center" }}>
                            <button
                              onClick={() =>
                                handleCopy(order.reference as string, order.id)
                              }
                              style={{
                                background: "#fde68a",
                                color: "#111",
                                fontWeight: 800,
                                border: "none",
                                padding: "6px 10px",
                                borderRadius: 10,
                                cursor: "pointer",
                                marginLeft: 6,
                              }}
                            >
                              Copy
                            </button>
                            <CopiedBubble show={copiedId === order.id} />
                          </span>
                        ) : null}
                      </div>

                      {/* Status */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#777" }}>Status</span>
                        <StatusPill status={status} />
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
                        <span style={{ fontWeight: 800 }}>{asKES(order.total)}</span>
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
