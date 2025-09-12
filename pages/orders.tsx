// pages/orders.tsx
import { useEffect, useState } from "react";

/** -------- Types -------- */
type OrderItem = {
  name: string;
  price: number;
  quantity?: number; // accept quantity or qty (legacy)
  qty?: number;
  image?: string;
  [key: string]: any;
};

type Order = {
  id: string;
  reference?: string;   // exists when paid
  createdAt?: string;   // human-friendly date/time
  total: number;
  items: OrderItem[];
};

/** -------- Storage keys -------- */
const CANONICAL_KEY = "orders";
const POSSIBLE_KEYS = ["orders", "mm_orders", "mastermind_orders", "cart_orders"];

/** -------- Helpers -------- */
const pad = (n: number) => String(n).padStart(2, "0");
const formatDateTime = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

// Turn anything we might already have in storage into the exact format above
const normalizeCreatedAt = (value: unknown, id: string): string => {
  // If ISO-like string -> parse and format
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return formatDateTime(d);
  }
  // If already close to target but missing seconds -> add :00
  if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/.test(value)) {
    return `${value}:00`;
  }
  // If already in target format, keep it
  if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/.test(value)) {
    return value;
  }
  // Try deriving from the order id if it encodes a timestamp
  const ts = Number(id?.replace(/^\D+/, ""));
  if (Number.isFinite(ts)) {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return formatDateTime(d);
  }
  // Fallback to "now"
  return formatDateTime(new Date());
};

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

/** -------- Pills (extra-light shades) -------- */
const HeaderPill = ({ reference }: { reference?: string }) => {
  const paid = !!reference;
  const bg = paid ? "#ECFDF5" : "#FEE2E2"; // very light green / very light red
  const fg = paid ? "#065F46" : "#7F1D1D";
  const text = paid ? "COMPLETED" : "FAILED";
  return (
    <span
      style={{
        background: bg,
        color: fg,
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
};

const StatusPill = ({ reference }: { reference?: string }) => {
  const paid = !!reference;
  const bg = paid ? "#DCFCE7" : "#FEE2E2"; // light green / light red
  const fg = paid ? "#166534" : "#7F1D1D";
  const text = paid ? "PAID" : "FAILED";
  return (
    <span
      style={{
        background: bg,
        color: fg,
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
};

/** -------- Page -------- */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // per-order toggle

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

    let changed = false;
    const normalized: Order[] = (merged || [])
      .filter((o) => o && typeof (o as any).id === "string")
      .map((o: any) => {
        const created = normalizeCreatedAt(o.createdAt, o.id);
        if (o.createdAt !== created) changed = true;
        const items: OrderItem[] = Array.isArray(o.items) ? o.items : [];
        return { ...o, createdAt: created, items };
      });

    // newest first (if ids are timestamp-like)
    normalized.sort((a, b) => {
      const na = Number(a.id.replace(/^\D+/, ""));
      const nb = Number(b.id.replace(/^\D+/, ""));
      if (Number.isFinite(na) && Number.isFinite(nb)) return nb - na;
      return 0;
    });

    // Persist back (also migrate to canonical key)
    try {
      localStorage.setItem(CANONICAL_KEY, JSON.stringify(normalized));
      for (const key of POSSIBLE_KEYS) {
        if (key !== CANONICAL_KEY) localStorage.removeItem(key);
      }
    } catch {}

    // default collapsed
    const initialExpanded: Record<string, boolean> = {};
    normalized.forEach((o) => (initialExpanded[o.id] = false));

    setOrders(normalized);
    setExpanded(initialExpanded);
  }, []);

  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

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
                      {/* Left: order id + date */}
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
                            background: "#F8FAFC",
                            border: "1px solid #E2E8F0",
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
                            onClick={() =>
                              navigator.clipboard.writeText(order.reference!)
                            }
                            style={{
                              background: "#FDE68A",
                              color: "#111",
                              fontWeight: 800,
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: 10,
                              cursor: "pointer",
                            }}
                          >
                            Copy
                          </button>
                        ) : null}
                      </div>

                      {/* Status */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#777" }}>Status</span>
                        <StatusPill reference={order.reference} />
                      </div>

                      {/* Total — amount sits close to the label */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8, // keep it tight
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
