// pages/orders.tsx
import { useEffect, useState } from "react";

/** -------- Types -------- */
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
  reference?: string; // exists when paid
  createdAt?: string; // human-friendly date/time we display
  paidAt?: string;    // if you ever save it
  total: number;
  items: OrderItem[];
};

/** -------- Storage keys -------- */
const CANONICAL_KEY = "orders";
const POSSIBLE_KEYS = ["orders", "mm_orders", "mastermind_orders", "cart_orders"];
const FIXED_DATES_KEY = "orderFixedDates"; // id -> number (ms) frozen once

/** -------- Helpers -------- */
const pad = (n: number) => String(n).padStart(2, "0");
const formatDateTime = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const parseToMs = (v: unknown): number | undefined => {
  if (!v) return;
  // If it's already a number-like string
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const ms = Date.parse(v);
    if (!Number.isNaN(ms)) return ms;
  }
  return;
};

const createdFromId = (id: string): string | undefined => {
  const tsNum = Number((id || "").replace(/^\D+/, ""));
  if (!Number.isFinite(tsNum)) return;
  const d = new Date(tsNum);
  if (Number.isNaN(d.getTime())) return;
  return formatDateTime(d);
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
  if (slug) return `/images/${slug}.webp`;

  return PLACEHOLDER;
};

/** -------- Pills (same styles you locked) -------- */
const HeaderPill = ({ status }: { status: "SUCCESS" | "FAILED" | "PENDING" }) => {
  const isSuccess = status === "SUCCESS";
  const isFailed = status === "FAILED";
  const bg = isSuccess ? "rgba(16,185,129,0.18)" : isFailed ? "rgba(239,68,68,0.18)" : "rgba(148,163,184,0.18)";
  const fg = isSuccess ? "#10b981" : isFailed ? "#ef4444" : "#64748b";
  const text = isSuccess ? "Successful" : isFailed ? "Failed" : "Pending";
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

const StatusPill = ({ status }: { status: "SUCCESS" | "FAILED" | "PENDING" }) => {
  const isSuccess = status === "SUCCESS";
  const isFailed = status === "FAILED";
  const bg = isSuccess ? "rgba(16,185,129,0.18)" : isFailed ? "rgba(239,68,68,0.18)" : "rgba(148,163,184,0.18)";
  const fg = isSuccess ? "#10b981" : isFailed ? "#ef4444" : "#64748b";
  const text = isSuccess ? "Paid" : isFailed ? "Failed" : "Pending";
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // tiny floating "Copied!" for 1.2s
  const showCopied = (id: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId((v) => (v === id ? null : v)), 1200);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1) Read any previously frozen fallback dates
    let fixedDates: Record<string, number> = {};
    try {
      const rawFixed = localStorage.getItem(FIXED_DATES_KEY);
      if (rawFixed) fixedDates = JSON.parse(rawFixed) || {};
    } catch {}

    // 2) Merge any legacy keys
    const merged: Order[] = [];
    for (const key of POSSIBLE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) merged.push(...arr);
      } catch {}
    }

    // 3) Normalize & compute display/sort times
    const normalized: (Order & { __sortMs: number; __status: "SUCCESS" | "FAILED" | "PENDING" })[] = (merged || [])
      .filter((o) => o && typeof (o as any).id === "string")
      .map((o: any) => {
        const paidMs = parseToMs(o.paidAt);
        const createdMsRaw = parseToMs(o.createdAt);
        const idNum = Number(String(o.id || "").replace(/^\D+/, ""));
        const idMs = Number.isFinite(idNum) ? idNum : undefined;

        // choose display date string (what you show under the order number)
        let displayMs =
          (typeof paidMs === "number" ? paidMs : undefined) ??
          (typeof createdMsRaw === "number" ? createdMsRaw : undefined) ??
          (typeof idMs === "number" ? idMs : undefined);

        // If still invalid, freeze a fallback once and re-use forever
        if (typeof displayMs !== "number") {
          if (typeof fixedDates[o.id] !== "number") {
            fixedDates[o.id] = Date.now();
          }
          displayMs = fixedDates[o.id];
        }

        const createdAt = formatDateTime(new Date(displayMs));

        // consistent sort key (same as displayMs so the card and order are aligned)
        const sortMs = displayMs;

        const items: OrderItem[] = Array.isArray(o.items) ? o.items : [];
        const status: "SUCCESS" | "FAILED" | "PENDING" =
          o.reference ? "SUCCESS" : o.status === "FAILED" ? "FAILED" : "PENDING";

        return { ...o, createdAt, items, __sortMs: sortMs, __status: status };
      });

    // 4) Save back the frozen fallback map (only when it changed / existed)
    try {
      localStorage.setItem(FIXED_DATES_KEY, JSON.stringify(fixedDates));
    } catch {}

    // 5) Sort newest first (bigger ms on top)
    normalized.sort((a, b) => b.__sortMs - a.__sortMs);

    // 6) Persist to canonical key and clean legacy keys
    try {
      const toSave: Order[] = normalized.map(({ __sortMs, __status, ...rest }) => rest);
      localStorage.setItem(CANONICAL_KEY, JSON.stringify(toSave));
      for (const key of POSSIBLE_KEYS) {
        if (key !== CANONICAL_KEY) localStorage.removeItem(key);
      }
    } catch {}

    // expand all by default (kept from your flow)
    const initialExpanded: Record<string, boolean> = {};
    normalized.forEach((o) => (initialExpanded[o.id] = true));

    setOrders(normalized);
    setExpanded(initialExpanded);
  }, []);

  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  if (orders === null) {
    return <div style={{ background: "#f6f6f6", minHeight: "100vh" }} />;
  }

  return (
    <div style={{ background: "#f6f6f6", minHeight: "100vh", position: "relative" }}>
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
            {orders.map((orderAny) => {
              // carry through helper fields
              const order = orderAny as Order & { __status: "SUCCESS" | "FAILED" | "PENDING" };
              const isOpen = !!expanded[order.id];
              const status = order.__status;

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
                        <HeaderPill status={status} />
                        <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                          KES {Math.round(order.total).toLocaleString("en-KE")}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Body */}
                  {isOpen && (
                    <div style={{ padding: 14, display: "grid", gap: 10 }}>
                      {Array.isArray(order.items) &&
                        order.items.map((it, i) => {
                          const qty = Number(it.quantity ?? it.qty ?? 1) || 1;
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
                            onClick={() => {
                              navigator.clipboard.writeText(order.reference!);
                              showCopied(order.id);
                            }}
                            style={{
                              background: "rgba(250,204,21,0.35)",
                              color: "#111",
                              fontWeight: 800,
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: 10,
                              cursor: "pointer",
                              position: "relative",
                            }}
                          >
                            Copy
                          </button>
                        ) : null}

                        {/* silent copied bubble */}
                        {copiedId === order.id && (
                          <span
                            style={{
                              position: "absolute",
                              right: 0,
                              top: -22,
                              background: "rgba(16,185,129,0.18)",
                              color: "#10b981",
                              fontSize: 12,
                              fontWeight: 800,
                              borderRadius: 999,
                              padding: "2px 8px",
                            }}
                          >
                            Copied!
                          </span>
                        )}
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
