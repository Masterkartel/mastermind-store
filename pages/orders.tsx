// pages/orders.tsx
import { useEffect, useMemo, useState } from "react";

/** -------- Types -------- */
type OrderItem = {
  name: string;
  price: number;
  quantity?: number; // accept quantity or qty (legacy)
  qty?: number;
  image?: string;
  // sometimes: img, imageUrl, photo, picture
  [key: string]: any;
};

type Order = {
  id: string;
  reference?: string;     // exists when paid (same as order number in your flow)
  createdAt?: string;     // human-friendly date/time (we fill if missing)
  paidAt?: string;        // optional paid timestamp if present
  total: number;
  items: OrderItem[];
};

/** -------- Storage keys -------- */
const CANONICAL_KEY = "orders";
const POSSIBLE_KEYS = ["orders", "mm_orders", "mastermind_orders", "cart_orders"];

/** -------- Helpers -------- */
const pad = (n: number) => String(n).padStart(2, "0");
const formatDateTime = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const PLACEHOLDER = "https://via.placeholder.com/56x56.png?text=%20";
const slugify = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

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

const parseToMs = (v?: string) => {
  if (!v) return undefined;
  const d = new Date(v);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : undefined;
};

/** -------- Pills (ultra-light shades & colored text) -------- */
const Pill = ({
  bg,
  fg,
  children,
}: {
  bg: string;
  fg: string;
  children: React.ReactNode;
}) => (
  <span
    style={{
      background: bg,
      color: fg,
      fontSize: 12,
      fontWeight: 800,
      padding: "6px 12px",
      borderRadius: 999,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

const HeaderPill = ({ reference }: { reference?: string }) => {
  const paid = !!reference;
  // Very light shades
  const bg = paid ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.12)"; // green / gray
  const fg = paid ? "#059669" : "#334155";
  return <Pill bg={bg} fg={fg}>{paid ? "Successful" : "Pending"}</Pill>;
};

const StatusPill = ({ reference }: { reference?: string }) => {
  const paid = !!reference;
  const bg = paid ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)"; // green / red
  const fg = paid ? "#059669" : "#b91c1c";
  return <Pill bg={bg} fg={fg}>{paid ? "Paid" : "Failed"}</Pill>;
};

/** -------- Page -------- */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // per-order toggle
  const [copiedId, setCopiedId] = useState<string | null>(null); // for 1.2s inline toast

  // Load orders, normalize, migrate to canonical key
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
    const currentYear = new Date().getFullYear();

    const normalized: (Order & { _ts: number })[] = (merged || [])
      .filter((o) => o && typeof (o as any).id === "string")
      .map((o: any) => {
        // pick the best timestamp we can, then correct silly years
        let display =
          o.createdAt ||
          o.paidAt ||
          formatDateTime(new Date(now));

        // ---- FIX: choose timestamp with only ??, no mixing with || ----
        const numericIdOrUndef = (): number | undefined => {
          const n = Number(String(o.id).replace(/^\D+/, ""));
          return Number.isFinite(n) ? n : undefined;
        };

        let ts =
          parseToMs(o.paidAt) ??
          parseToMs(o.createdAt) ??
          parseToMs(display) ??
          numericIdOrUndef();

        // Guard against future/ancient years (e.g., 2952)
        if (ts) {
          const y = new Date(ts).getFullYear();
          if (y < 2000 || y > currentYear + 1) {
            const fallback = numericIdOrUndef();
            ts = fallback ?? now;
            display = formatDateTime(new Date(ts));
          }
        } else {
          ts = now;
          display = formatDateTime(new Date(ts));
        }
        // ----------------------------------------------------------------

        const items: OrderItem[] = Array.isArray(o.items) ? o.items : [];
        return { ...o, createdAt: display, items, _ts: ts as number };
      });

    // Sort newest first by computed timestamp
    normalized.sort((a, b) => b._ts - a._ts);

    // Save canonical & clear old keys
    try {
      localStorage.setItem(
        CANONICAL_KEY,
        JSON.stringify(normalized.map(({ _ts, ...rest }) => rest))
      );
      for (const key of POSSIBLE_KEYS) {
        if (key !== CANONICAL_KEY) localStorage.removeItem(key);
      }
    } catch {}

    // default: all **collapsed** (tap header to open)
    const initialExpanded: Record<string, boolean> = {};
    normalized.forEach((o) => (initialExpanded[o.id] = false));

    setOrders(normalized.map(({ _ts, ...rest }) => rest));
    setExpanded(initialExpanded);
  }, []);

  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  // ephemeral "Copied!" badge beside the button
  useEffect(() => {
    if (!copiedId) return;
    const t = setTimeout(() => setCopiedId(null), 1200);
    return () => clearTimeout(t);
  }, [copiedId]);

  const empty = useMemo(() => orders !== null && orders.length === 0, [orders]);

  if (orders === null) {
    return <div style={{ background: "#f6f6f6", minHeight: "100vh" }} />;
  }

  return (
    <div style={{ background: "#f6f6f6", minHeight: "100vh" }}>
      {/* Header bar (unchanged) */}
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
        {empty ? (
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
                        {/* Header shows Pending/Successful; Failed in header mirrors Failed status (no reference) */}
                        <HeaderPill reference={order.reference} />
                        <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                          KES {Math.round(order.total).toLocaleString("en-KE")}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Body (collapsible) */}
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
                          <span style={{ position: "relative", display: "inline-flex" }}>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(order.reference!);
                                setCopiedId(order.id);
                              }}
                              style={{
                                background: "#ede9fe",
                                color: "#6d28d9",
                                fontWeight: 800,
                                border: "none",
                                padding: "6px 10px",
                                borderRadius: 10,
                                cursor: "pointer",
                              }}
                            >
                              Copy
                            </button>
                            {copiedId === order.id && (
                              <span
                                style={{
                                  position: "absolute",
                                  right: -72,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  background: "rgba(16,185,129,0.12)",
                                  color: "#059669",
                                  fontWeight: 800,
                                  borderRadius: 8,
                                  padding: "4px 8px",
                                  fontSize: 12,
                                  pointerEvents: "none",
                                }}
                              >
                                Copied!
                              </span>
                            )}
                          </span>
                        ) : null}
                      </div>

                      {/* Status */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#777" }}>Status</span>
                        <StatusPill reference={order.reference} />
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
                        <span style={{ fontWeight: 800 }}>
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
    </div>
  );
}
