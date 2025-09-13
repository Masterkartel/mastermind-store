// pages/orders.tsx
import { useEffect, useState } from "react";

/** ---------------- Types ---------------- */
type OrderItem = {
  name: string;
  price: number;
  quantity?: number; // accept quantity or qty (legacy)
  qty?: number;
  image?: string;
  img?: string;
  imageUrl?: string;
  photo?: string;
  picture?: string;
  [key: string]: any;
};

type Order = {
  id: string;
  total: number;
  reference?: string;      // exists when paid
  createdAt?: string;      // ISO if available
  paidAt?: string;         // ISO if available
  items: OrderItem[];
};

const CANONICAL_KEY = "orders";
const POSSIBLE_KEYS = ["orders", "mm_orders", "mastermind_orders", "cart_orders"];

/** ---------------- Helpers ---------------- */
const pad = (n: number) => String(n).padStart(2, "0");
const formatDateTime = (isoOrLike?: string) => {
  if (!isoOrLike) return "";
  const d = new Date(isoOrLike);
  if (isNaN(d.getTime())) return isoOrLike;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const createdFromId = (id: string): string | undefined => {
  const ts = Number(id?.replace(/^\D+/, ""));
  if (!Number.isFinite(ts)) return;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
};

const parseToMs = (s?: string) => {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d.getTime();
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
  const slug = slugify(it.name);
  if (slug) return `/products/${slug}.jpg`;
  return PLACEHOLDER;
};

/** ---------------- Pills ---------------- */
const pill = (bg: string, color: string) => ({
  background: bg,
  color,
  fontSize: 12,
  fontWeight: 800 as const,
  padding: "4px 10px",
  borderRadius: 999,
  whiteSpace: "nowrap" as const,
});
const SUCCESS_BG = "#E8F8EF";
const SUCCESS_TX = "#16A34A";
const FAIL_BG = "#FDEBEC";
const FAIL_TX = "#B91C1C";
const PEND_BG = "#EEF2F6";
const PEND_TX = "#334155";

const HeaderPill = ({ reference }: { reference?: string }) => {
  const paid = !!reference;
  return (
    <span style={paid ? pill(SUCCESS_BG, SUCCESS_TX) : pill(PEND_BG, PEND_TX)}>
      {paid ? "Successful" : "Pending"}
    </span>
  );
};

const StatusPill = ({ reference }: { reference?: string }) => {
  const paid = !!reference;
  return (
    <span style={paid ? pill(SUCCESS_BG, SUCCESS_TX) : pill(FAIL_BG, FAIL_TX)}>
      {paid ? "Paid" : "Failed"}
    </span>
  );
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<
    (Order & { display?: string; _ts?: number })[] | null
  >(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

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
    const monthAhead = now + 30 * 24 * 60 * 60 * 1000;

    const normalized = (merged || [])
      .filter((o) => o && typeof (o as any).id === "string")
      .map((o: any) => {
        // Only use true timestamps for sorting; NEVER the pretty display string.
        const idTs = Number(String(o.id).replace(/^\D+/, ""));
        let ts =
          (parseToMs(o.paidAt) ??
            parseToMs(o.createdAt) ??
            (Number.isFinite(idTs) ? idTs : undefined)) || now;

        // Clamp impossible future dates (e.g., year 2952)
        if (ts > monthAhead) ts = Number.isFinite(idTs) ? idTs : now;
        if (!Number.isFinite(ts) || ts < 0) ts = now;

        // Compute a clean ISO for rendering
        const displayISO =
          o.paidAt || o.createdAt || (Number.isFinite(idTs) ? new Date(idTs).toISOString() : new Date(ts).toISOString());

        return {
          ...o,
          display: displayISO,
          _ts: ts,
          items: Array.isArray(o.items) ? o.items : [],
        } as Order & { display: string; _ts: number };
      });

    // newest → oldest by numeric timestamp
    normalized.sort((a, b) => (b._ts ?? 0) - (a._ts ?? 0));

    try {
      localStorage.setItem(CANONICAL_KEY, JSON.stringify(normalized));
      for (const key of POSSIBLE_KEYS)
        if (key !== CANONICAL_KEY) localStorage.removeItem(key);
    } catch {}

    const initialExpanded: Record<string, boolean> = {};
    normalized.forEach((o) => (initialExpanded[o.id] = false));
    setOrders(normalized);
    setExpanded(initialExpanded);
  }, []);

  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const handleCopy = (text: string, orderId: string) => {
    navigator.clipboard.writeText(text);
    setCopied(orderId);
    setTimeout(() => setCopied((v) => (v === orderId ? null : v)), 1200);
  };

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
                  {/* Header row */}
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
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#666" }}>Order</span>
                          <span style={{ fontWeight: 800 }}>#{order.id}</span>
                        </div>
                        {order.display ? (
                          <span style={{ color: "#9aa3af", fontSize: 12, marginTop: 4 }}>
                            {formatDateTime(order.display)}
                          </span>
                        ) : null}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "nowrap",
                        }}
                      >
                        <HeaderPill reference={order.reference} />
                        <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                          KES {Math.round(order.total).toLocaleString("en-KE")}
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
                          <>
                            <button
                              onClick={() => handleCopy(order.reference!, order.id)}
                              style={{
                                background: "#F3E8FF",
                                color: "#6D28D9",
                                fontWeight: 800,
                                border: "none",
                                padding: "6px 10px",
                                borderRadius: 10,
                                cursor: "pointer",
                              }}
                            >
                              Copy
                            </button>
                            {copied === order.id && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: SUCCESS_TX,
                                }}
                              >
                                Copied!
                              </span>
                            )}
                          </>
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
