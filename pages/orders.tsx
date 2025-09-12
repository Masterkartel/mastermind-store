// pages/orders.tsx
import { useEffect, useState } from "react";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type Order = {
  id: string;
  reference?: string;
  createdAt?: string;
  total: number;
  items: OrderItem[];
};

const COPY = "#f4d03f";

// soft shades (match Status row)
const STATUS_BG_GREEN = "#e9fbf2";
const STATUS_TXT_GREEN = "#0b7a43";
const STATUS_BG_RED = "#fdeaea";
const STATUS_TXT_RED = "#a33a3a";
const STATUS_BG_GREY = "#f1f3f5";
const STATUS_TXT_GREY = "#495057";

const fmtDateTime = (v?: string) => {
  const d = v ? new Date(v) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Guess image by name (files stored under /public)
const guessImageFromName = (name?: string): string | undefined => {
  if (!name) return undefined;
  const n = name.toLowerCase();
  if (n.includes("torch")) return "/torch.png";
  if (n.includes("6kg") || n.includes("6 kg")) return "/6kg.png";
  if (n.includes("13kg") || n.includes("13 kg")) return "/13kg.png";
  if (n.includes("bulb")) return "/bulb.png";
  if (n.includes("tv")) return "/tv.png";
  if (n.includes("woofer") || n.includes("speaker")) return "/woofer.png";
  return undefined;
};

// Ensure absolute URL for local files (prevents edge routing issues)
const resolveImg = (src?: string) => {
  if (!src) return undefined;
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  if (src.startsWith("//")) return window.location.protocol + src;
  const base = (typeof window !== "undefined" && window.location.origin) || "";
  if (src.startsWith("/")) return base + src;
  return `${base}/${src.replace(/^\.?\//, "")}`;
};

const HeaderPill = ({ reference }: { reference?: string }) => {
  // New rule: if status row = FAILED, header also shows FAILED (red).
  // We treat “no reference” as FAILED for header now.
  const paid = !!reference;
  const failed = !reference;

  const bg = paid ? STATUS_BG_GREEN : failed ? STATUS_BG_RED : STATUS_BG_GREY;
  const fg = paid ? STATUS_TXT_GREEN : failed ? STATUS_TXT_RED : STATUS_TXT_GREY;
  const text = paid ? "COMPLETED" : failed ? "FAILED" : "PENDING";

  return (
    <span
      style={{
        background: bg,
        color: fg,
        fontSize: 12,
        fontWeight: 800,
        padding: "4px 10px",
        borderRadius: 999,
      }}
    >
      {text}
    </span>
  );
};

const StatusPill = ({ reference }: { reference?: string }) => {
  const paid = !!reference;
  const bg = paid ? STATUS_BG_GREEN : STATUS_BG_RED;
  const fg = paid ? STATUS_TXT_GREEN : STATUS_TXT_RED;
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
      }}
    >
      {text}
    </span>
  );
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [openId, setOpenId] = useState<string | null>(null); // collapsed by default
  const [copiedFor, setCopiedFor] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("orders");
    let parsed: Order[] = [];
    try {
      parsed = raw ? JSON.parse(raw) : [];
    } catch {
      parsed = [];
    }
    const normalized = parsed.map((o) => ({
      ...o,
      createdAt: fmtDateTime(o.createdAt),
    }));
    setOrders(normalized);
  }, []);

  return (
    <div style={{ background: "#f6f6f6", minHeight: "100vh" }}>
      {/* Header */}
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
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                background: COPY,
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
            }}
          >
            ← Back to Shop
          </a>
        </div>
      </div>

      {/* Orders */}
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
              const isOpen = openId === order.id;
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
                  <div
                    onClick={() => setOpenId(isOpen ? null : order.id)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      padding: "12px 14px",
                      borderBottom: isOpen ? "1px solid #f0f0f0" : "none",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "baseline",
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ color: "#666" }}>Order</span>
                        <span style={{ fontWeight: 800 }}>#{order.id}</span>
                      </div>
                      <div style={{ width: "100%" }}>
                        <span style={{ color: "#999", fontSize: 12 }}>
                          {order.createdAt}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <HeaderPill reference={order.reference} />
                      <span style={{ fontWeight: 800 }}>
                        KES {Math.round(order.total).toLocaleString("en-KE")}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  {isOpen && (
                    <div style={{ padding: 14, display: "grid", gap: 10 }}>
                      {order.items.map((it, i) => {
                        const price = Number(it.price) || 0;
                        const qty =
                          Number((it.quantity ?? 1) === 0 ? 1 : it.quantity ?? 1) ||
                          1;
                        const chosen =
                          it.image ||
                          guessImageFromName(it.name) ||
                          "/torch.png";
                        const initial = resolveImg(chosen);
                        const namedFallback = resolveImg(
                          guessImageFromName(it.name) || "/torch.png"
                        );
                        const remoteFallback =
                          "https://via.placeholder.com/56x56.png?text=%20";

                        const lineTotal = Math.round(price * qty);

                        return (
                          <div
                            key={`${i}-${chosen}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "auto 1fr",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <img
                              key={initial} // force refresh when source changes
                              src={initial || remoteFallback}
                              alt={it.name}
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: 10,
                                objectFit: "cover",
                                background: "#f4f4f4",
                                border: "1px solid #eee",
                              }}
                              loading="lazy"
                              decoding="async"
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const el = e.currentTarget as HTMLImageElement;
                                if (el.src !== namedFallback && namedFallback) {
                                  el.src = namedFallback;
                                } else if (!el.src.includes("placeholder.com")) {
                                  el.src = `${remoteFallback}?v=${Date.now()}`;
                                }
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 800 }}>{it.name}</div>
                              <div style={{ color: "#666" }}>
                                KES {Math.round(price)} × {qty} ={" "}
                                <span style={{ fontWeight: 700, color: "#111" }}>
                                  KES {lineTotal}
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
                        {order.reference && (
                          <>
                            <button
                              onClick={async (ev) => {
                                ev.stopPropagation();
                                try {
                                  await navigator.clipboard.writeText(
                                    order.reference!
                                  );
                                  setCopiedFor(order.id);
                                  window.setTimeout(() => setCopiedFor(null), 1500);
                                } catch {
                                  /* no-op */
                                }
                              }}
                              style={{
                                background: COPY,
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
                            {copiedFor === order.id && (
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: STATUS_TXT_GREEN,
                                  background: STATUS_BG_GREEN,
                                  padding: "4px 8px",
                                  borderRadius: 999,
                                }}
                              >
                                Copied
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Status */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#777" }}>Status</span>
                        <StatusPill reference={order.reference} />
                      </div>

                      {/* Total */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
