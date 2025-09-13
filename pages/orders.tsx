// pages/orders.tsx
import { useEffect, useState } from "react";

/** -------- Types -------- */
type OrderItem = {
  name: string;
  price: number;
  quantity?: number; // allow quantity or qty (legacy)
  qty?: number;
  image?: string;
  [key: string]: any;
};

type Order = {
  id: string;
  reference?: string;     // exists when paid (same as order number in your flow)
  createdAt?: string;     // human-friendly date/time
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

const createdFromId = (id: string): string | undefined => {
  const ts = Number(id?.replace(/^\D+/, ""));
  if (!Number.isFinite(ts)) return;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? undefined : formatDateTime(d);
};

// Try to pretty-print an already-present date string into our desired format if it parses.
const formatMaybeDate = (value?: string): string | undefined => {
  if (!value) return;
  const ms = Date.parse(value);
  if (!Number.isNaN(ms)) return formatDateTime(new Date(ms));
  return;
};

// parse many date shapes into ms for sorting
const parseToMs = (value?: string): number | undefined => {
  if (!value) return undefined;

  // ISO / “YYYY-MM-DDTHH:mm:ssZ”
  const iso = Date.parse(value);
  if (!Number.isNaN(iso)) return iso;

  // “DD/MM/YYYY, HH:MM[:SS]”
  const m = value.match(
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
      Number(SS || "0")
    );
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return undefined;
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

  // 3) public images by slug (you’ve been uploading like /public/images/<slug>.webp)
  const slug = slugify(it.name);
  if (slug) return `/images/${slug}.webp`;

  // 4) final fallback
  return PLACEHOLDER;
};

/** -------- Colors (ultra-light pills + readable text) -------- */
const GREEN_BG = "rgba(16,185,129,0.15)"; // light emerald
const GREEN_TX = "#065f46";
const RED_BG   = "rgba(239,68,68,0.14)";  // light red
const RED_TX   = "#7f1d1d";
const GRAY_BG  = "rgba(100,116,139,0.14)"; // light slate
const GRAY_TX  = "#334155";

/** -------- Pills -------- */
const HeaderPill = ({ reference }: { reference?: string }) => {
  const paid = !!reference;
  const bg = paid ? GREEN_BG : GRAY_BG;
  const tx = paid ? GREEN_TX : GRAY_TX;
  // If you ever need FAILED mirror in header: when !reference it will show Pending via GRAY
  return (
    <span
      style={{
        background: bg,
        color: tx,
        fontSize: 12,
        fontWeight: 800,
        padding: "6px 12px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {paid ? "Successful" : "Pending"}
    </span>
  );
};

const StatusPill = ({ reference }: { reference?: string }) => {
  const paid = !!reference;
  const bg = paid ? GREEN_BG : RED_BG;
  const tx = paid ? GREEN_TX : RED_TX;
  return (
    <span
      style={{
        background: bg,
        color: tx,
        fontSize: 12,
        fontWeight: 800,
        padding: "6px 12px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {paid ? "Paid" : "Failed"}
    </span>
  );
};

/** -------- Page -------- */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // per-order toggle
  const [copiedRef, setCopiedRef] = useState<string | null>(null); // ephemeral "Copied!" bubble

  // Load orders, normalize, migrate to canonical key, and sort newest first with date sanity
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadOrders = (): Order[] => {
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
          // Choose best display date
          const rawBest = o.paidAt || o.createdAt || createdFromId(o.id);
          let display =
            formatMaybeDate(rawBest) || rawBest || formatDateTime(new Date());

          // Compute timestamp for sorting
          let ts =
            parseToMs(o.paidAt) ??
            parseToMs(o.createdAt) ??
            parseToMs(display) ??
            Number(o.id.replace(/^\D+/, "")) ||
            undefined;

          // Guard against silly years (e.g., 2952)
          if (ts) {
            const y = new Date(ts).getFullYear();
            if (y < 2000 || y > currentYear + 1) {
              const fallback = Number(o.id.replace(/^\D+/, ""));
              ts = Number.isFinite(fallback) ? fallback : now;
              display = formatDateTime(new Date(ts));
            }
          } else {
            ts = now;
            display = formatDateTime(new Date(ts));
          }

          const items: OrderItem[] = Array.isArray(o.items) ? o.items : [];
          return { ...o, createdAt: display, items, _ts: ts };
        });

      // Sort newest first
      normalized.sort((a, b) => b._ts - a._ts);

      // Persist canonical key & clean others
      try {
        localStorage.setItem(CANONICAL_KEY, JSON.stringify(normalized));
        for (const key of POSSIBLE_KEYS) {
          if (key !== CANONICAL_KEY) localStorage.removeItem(key);
        }
      } catch {}

      return normalized as Order[];
    };

    const data = loadOrders();

    // default on load: all collapsed
    const initialExpanded: Record<string, boolean> = {};
    data.forEach((o) => (initialExpanded[o.id] = false));

    setOrders(data);
    setExpanded(initialExpanded);
  }, []);

  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const copyRef = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRef(text);
      setTimeout(() => setCopiedRef(null), 1200);
    } catch {
      // fallback: do nothing (we purposely avoid alert())
    }
  };

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
                      {/* Left: order id + date BELOW so pill never gets pushed off */}
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
                          <div style={{ position: "relative", display: "inline-block" }}>
                            <button
                              onClick={() => copyRef(order.reference!)}
                              style={{
                                background: "rgba(168,85,247,0.12)", // soft purple bg
                                color: "#6b21a8",
                                fontWeight: 800,
                                border: "none",
                                padding: "6px 10px",
                                borderRadius: 10,
                                cursor: "pointer",
                              }}
                            >
                              Copy
                            </button>
                            {copiedRef === order.reference && (
                              <span
                                style={{
                                  position: "absolute",
                                  left: "100%",
                                  marginLeft: 8,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  fontSize: 12,
                                  background: "rgba(0,0,0,0.06)",
                                  color: "#111",
                                  borderRadius: 8,
                                  padding: "4px 8px",
                                  pointerEvents: "none",
                                }}
                              >
                                Copied!
                              </span>
                            )}
                          </div>
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
