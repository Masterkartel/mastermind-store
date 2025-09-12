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
  reference?: string;     // when paid, this exists (same as order number in your flow)
  createdAt?: string;     // human-friendly date/time string
  total: number;
  items: OrderItem[];
};

const EXPANDED_KEY = "orders_expanded";

const formatDateTime = (d: Date) => {
  // DD/MM/YYYY, HH:MM
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Pills (kept as before, just slightly light colors)
const HeaderPill = ({ reference }: { reference?: string }) => {
  const paid = !!reference;
  const bg = paid ? "#36c06a" : "#dde1e7";
  const color = paid ? "#0b4d27" : "#3b3f46";
  const text = paid ? "COMPLETED" : "PENDING";
  return (
    <span
      style={{
        background: bg,
        color,
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
  const bg = paid ? "#dff7e8" : "#fde2e2";
  const color = paid ? "#117a39" : "#b02a2a";
  const text = paid ? "PAID" : "FAILED";
  return (
    <span
      style={{
        background: bg,
        color,
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // per-order open/closed

  // Load & normalize orders + restore expansion state
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Orders
    let parsed: Order[] = [];
    try {
      parsed = JSON.parse(localStorage.getItem("orders") || "[]");
    } catch {
      parsed = [];
    }

    // Ensure createdAt exists
    let changed = false;
    const normalized = parsed.map((o) => {
      if (!o.createdAt) {
        changed = true;
        return { ...o, createdAt: formatDateTime(new Date()) };
      }
      return o;
    });
    if (changed) {
      try {
        localStorage.setItem("orders", JSON.stringify(normalized));
      } catch {}
    }
    setOrders(normalized);

    // Expansion: default collapsed; restore saved state if we have it
    let saved: Record<string, boolean> | null = null;
    try {
      const raw = localStorage.getItem(EXPANDED_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {}

    const initial: Record<string, boolean> = {};
    normalized.forEach((o) => {
      initial[o.id] = saved?.[o.id] ?? false; // false => collapsed by default
    });
    setExpanded(initial);
  }, []);

  // Toggle + persist per order
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(EXPANDED_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

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
                  {/* Header row (tap to open/close) */}
                  <button
                    onClick={() => toggle(order.id)}
                    style={{
                      all: "unset",
                      width: "100%",
                      cursor: "pointer",
                    }}
                    aria-expanded={isOpen}
                    aria-controls={`order-body-${order.id}`}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        alignItems: "center",
                        gap: 8,
                        padding: "12px 14px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ color: "#666" }}>Order</span>
                          <span style={{ fontWeight: 800 }}>#{order.id}</span>
                        </div>
                        {/* date under the order number on mobile so pill doesn't wrap */}
                        {order.createdAt ? (
                          <span style={{ color: "#999", fontSize: 12 }}>{order.createdAt}</span>
                        ) : null}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <HeaderPill reference={order.reference} />
                        <span style={{ fontWeight: 800 }}>
                          KES {Math.round(order.total).toLocaleString("en-KE")}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Body (collapsible) */}
                  {isOpen && (
                    <div
                      id={`order-body-${order.id}`}
                      style={{ padding: 14, display: "grid", gap: 10 }}
                    >
                      {/* items */}
                      {order.items.map((it, i) => (
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
                            src={it.image || "https://via.placeholder.com/56x56.png?text=%20"}
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
                          />
                          <div>
                            <div style={{ fontWeight: 800 }}>{it.name}</div>
                            <div style={{ color: "#666" }}>
                              KES {Math.round(it.price)} × {it.quantity} ={" "}
                              <span style={{ fontWeight: 700, color: "#111" }}>
                                KES {Math.round(it.price * it.quantity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

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
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(order.reference!)
                            }
                            style={{
                              background: "#f4d03f",
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
                        {/* Rule: if reference exists => PAID (green); otherwise FAILED (red) */}
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
