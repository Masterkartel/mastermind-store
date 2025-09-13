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
  createdAt?: string;      // human-friendly date/time
  paidAt?: string;         // optional (from gateway)
  items: OrderItem[];
  // display is computed here
};

/** ---------------- Storage keys ---------------- */
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
  if (slug) return `/products/${slug}.jpg`; // your convention

  // 4) final fallback
  return PLACEHOLDER;
};

/** ---------------- Pills (very light shades) ---------------- */
const pill = (bg: string, text: string, color: string) => ({
  background: bg,
  color,
  fontSize: 12,
  fontWeight: 800 as const,
  padding: "4px 10px",
  borderRadius: 999,
  whiteSpace: "nowrap" as const,
});
const SUCCESS_BG = "#E8F8EF";  // very light green
const SUCCESS_TX = "#16A34A";  // same calibre as Copied!
const FAIL_BG = "#FDEBEC";     // very light red
const FAIL_TX = "#B91C1C";
const PEND_BG = "#EEF2F6";     // very light grey/blue
const PEND_TX = "#334155";

const HeaderPill = ({ reference }: { reference?: string }) => {
  const paid = !!reference;
  return (
    <span style={paid ? pill(SUCCESS_BG, "Successful", SUCCESS_TX) : pill(PEND_BG, "Pending", PEND_TX)}>
      {paid ? "Successful" : "Pending"}
    </span>
  );
};

const StatusPill = ({ reference }: { reference?: string }) => {
  const paid = !!reference;
  return (
    <span style={paid ? pill(SUCCESS_BG, "Paid", SUCCESS_TX) : pill(FAIL_BG, "Failed", FAIL_TX)}>
      {paid ? "Paid" : "Failed"}
    </span>
  );
};

/** ---------------- Page ---------------- */
export default function OrdersPage() {
  const [orders, setOrders] = useState<(Order & { display?: string; _ts?: number })[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // per-order toggle
  const [copied, setCopied] = useState<string | null>(null); // order.id for the 1.2s "Copied!"

  // Load orders, normalize, migrate to canonical key, sort newest → oldest
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

    const normalized = (merged || [])
      .filter((o) => o && typeof (o as any).id === "string")
      .map((o: any) => {
        // prefer paidAt for display if present, else createdAt, else derive from id
        const rawDisplay =
          o.paidAt || o.createdAt || createdFromId(o.id) || new Date().toISOString();

        // ✅ FIX: wrap the ?? chain before using || 0 (Cloudflare build complained)
        const ts =
          (parseToMs(o.paidAt) ??
            parseToMs(o.createdAt) ??
            parseToMs(rawDisplay) ??
            Number(String(o.id).replace(/^\D+/, ""))) || 0;

        return {
          ...o,
          display: rawDisplay,
          _ts: ts,
          items: Array.isArray(o.items) ? o.items : [],
        } as Order & { display: string; _ts: number };
      });

    // newest first
    normalized.sort((a, b) => (b._ts ?? 0) - (a._ts ?? 0));

    try {
      localStorage.setItem(CANONICAL_KEY, JSON.stringify(normalized));
      for (const key of POSSIBLE_KEYS) if (key !== CANONICAL_KEY) localStorage.removeItem(key);
    } catch {}

    // default collapsed on load
    const initialExpanded: Record<string, boolean> = {};
    normalized.forEach((o) => (initialExpanded[o.id] = false));

    setOrders(normalized);
    setExpanded(initialExpanded);
  }, []);

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

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
      {/* Header bar (edge-to-edge black) */}
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
                        {order.display ? (
                          <span style={{ color: "#9aa3af", fontSize: 12, marginTop: 4 }}>
                            {formatDateTime(order.display)}
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
