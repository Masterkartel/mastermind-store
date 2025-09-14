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
  paidAt?: string;    // ISO timestamp if present
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

/** If id contains digits (epoch ms), use it to form a display */
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

/* ---------- Pills (smaller text) ---------- */
const Pill = ({ bg, text, label }: { bg: string; text: string; label: string }) => (
  <span
    style={{
      background: bg,
      color: text,
      fontSize: 10,          // smaller pill text
      fontWeight: 800,
      padding: "3px 7px",
      borderRadius: 999,
      whiteSpace: "nowrap",
    }}
  >
    {label}
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
  if (status === "SUCCESS")
    return <Pill bg="rgba(34,197,94,0.18)" text="#0a5b2a" label="Paid" />;
  if (status === "FAILED")
    return <Pill bg="rgba(248,113,113,0.18)" text="#7f1d1d" label="Failed" />;
  return <Pill bg="rgba(148,163,184,0.18)" text="#334155" label="Pending" />;
};

/* ---------- Time helpers (sorting + reliable display) ---------- */
const toMsSafe = (v?: string): number | undefined => {
  if (!v || typeof v !== "string") return;
  // Accept only ISO-ish strings to avoid parsing “09/12/2025” wrongly.
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

        // Compute a reliable timestamp (id → paidAt ISO → createdAt ISO)
        const ts =
          idMs(o.id) ??
          toMsSafe(o.paidAt) ??
          toMsSafe(o.createdAt);

        // Always show DD/MM/YYYY using the reliable ts if available,
        // otherwise fall back to: existing createdAt → derived from id → now
        let display =
          (ts !== undefined ? formatDateTime(new Date(ts)) : undefined) ||
          o.createdAt ||
          createdFromId(o.id) ||
          formatDateTime(new Date());

        return { ...o, createdAt: display, items };
      });

    // Sort: realistic dates first; inside each bucket newest → oldest
    normalized.sort((a, b) => {
      const aBad = isUnrealisticDisplayDate(a.createdAt);
      const bBad = isUnrealisticDisplayDate(b.createdAt);
      if (aBad !== bBad) return aBad ? 1 : -1;

      const aTs = idMs(a.id) ?? toMsSafe(a.paidAt) ?? toMsSafe(a.createdAt) ?? 0;
      const bTs = idMs(b.id) ?? toMsSafe(b.paidAt) ?? toMsSafe(b.createdAt) ?? 0;
      return bTs - aTs;
    });

    // Save canonical + remove old keys
    try {
      localStorage.setItem(CANONICAL_KEY, JSON.stringify(normalized));
      for (const key of POSSIBLE_KEYS) {
        if (key !== CANONICAL_KEY) localStorage.removeItem(key);
      }
    } catch {}

    // ALWAYS collapsed on refresh
    const collapsed: Record<string, boolean> = {};
    normalized.forEach((o) => (collapsed[o.id] = false));

    setOrders(normalized);
    setExpanded(collapsed);
  }, []);

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const statusFrom = (o: Order): "SUCCESS" | "FAILED" | "PENDING" => {
    if (o.reference) return "SUCCESS";
    return "PENDING";
  };

  if (orders === null) {
    return <div style={{ background: "#f6f6f6", minHeight: "100vh" }} />;
  }

  return (
    <div style={{ background: "#f6f6f6", minHeight: "100vh" }}>
      {/* Header (kept larger) */}
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
                fontSize: 16,
              }}
              aria-hidden
            >
              🧾
            </span>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              My Orders
            </div>
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
              fontSize: 14,
            }}
          >
            ← Back to Shop
          </a>
        </div>
      </div>

      {/* Page content wrapper with smaller base font */}
      <div style={{ maxWidth: 1200, margin: "12px auto", padding: "0 12px", fontSize: 12 }}>
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
              const status = statusFrom(order);

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
                  {/* Header row (toggle) */}
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
                        padding: "10px 12px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: "#666" }}>Order</span>
                          <span style={{ fontWeight: 800 }}>{`#${order.id}`}</span>
                        </div>
                        {order.createdAt ? (
                          <span style={{ color: "#9aa3af", fontSize: 11, marginTop: 3 }}>
                            {order.createdAt}
                          </span>
                        ) : null}
                      </div>

                      {/* Center the pill + amount cell within the grid */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "nowrap",
                          justifyContent: "center",
                          justifySelf: "center",     // <-- centers the whole right cell
                          textAlign: "center",
                        }}
                      >
                        <HeaderPill status={status} />
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 12,            // smaller amount in header
                            whiteSpace: "nowrap",
                          }}
                        >
                          KES {Math.round(order.total).toLocaleString("en-KE")}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Body */}
                  {isOpen && (
                    <div style={{ padding: 12, display: "grid", gap: 10 }}>
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
                              gap: 8,
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
                                width: 50,
                                height: 50,
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

                      {/* Reference + copy */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginTop: 2,
                        }}
                      >
                        <span style={{ color: "#777" }}>Reference</span>
                        <span
                          style={{
                            background: "#f5f6f8",
                            border: "1px solid #eee",
                            borderRadius: 10,
                            padding: "5px 8px",
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 11,
                          }}
                        >
                          {order.reference || "—"}
                        </span>
                        {order.reference ? (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(order.reference!);
                                  setCopiedFor(order.id);
                                  setTimeout(
                                    () =>
                                      setCopiedFor((v) => (v === order.id ? null : v)),
                                    1200
                                  );
                                } catch {}
                              }}
                              style={{
                                background: "#fde68a",
                                color: "#111",
                                fontWeight: 800,
                                border: "none",
                                padding: "5px 8px",
                                borderRadius: 10,
                                cursor: "pointer",
                                fontSize: 11,
                              }}
                            >
                              Copy
                            </button>
                            {copiedFor === order.id && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  background: "rgba(34,197,94,0.18)",
                                  color: "#0a5b2a",
                                  padding: "3px 6px",
                                  borderRadius: 8,
                                }}
                              >
                                Copied!
                              </span>
                            )}
                          </>
                        ) : null}
                      </div>

                      {/* Status pill */}
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
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 12,            // smaller amount in expanded
                            whiteSpace: "nowrap",
                            textAlign: "right",
                          }}
                        >
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
