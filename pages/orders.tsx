// pages/orders.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/** ---------- Types ---------- */
type OrderItem = {
  name: string;
  price: number;
  quantity?: number; // accept quantity or qty
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
  reference?: string;   // exists when paid (same as order number in your flow)
  createdAt?: string;   // human-friendly date/time
  total: number;
  items: OrderItem[];
};

/** ---------- Storage keys ---------- */
const CANONICAL_KEY = "orders";
const POSSIBLE_KEYS = ["orders", "mm_orders", "mastermind_orders", "cart_orders"];

/** ---------- Helpers ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
const formatDateTime = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const createdFromId = (id: string): string | undefined => {
  const ts = Number(id?.replace(/^\D+/, ""));
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

/** ---------- Pill styles (very light, readable) ---------- */
const shades = {
  greenBg: "#E6F7ED", // very light green
  greenText: "#0E7C66",
  redBg: "#FDECEC",   // very light red
  redText: "#8A1C1C",
  grayBg: "#EEF2F6",  // very light gray
  grayText: "#475569",
};

const Pill = ({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) => (
  <span
    style={{
      background: bg,
      color,
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

const HeaderPill = ({ reference, failed }: { reference?: string; failed?: boolean }) => {
  if (failed) return <Pill bg={shades.redBg} color={shades.redText}>Successful</Pill>; // text will be replaced below
  if (!!reference) return <Pill bg={shades.greenBg} color={shades.greenText}>Successful</Pill>;
  return <Pill bg={shades.grayBg} color={shades.grayText}>Pending</Pill>;
};

const StatusPill = ({ reference }: { reference?: string }) => {
  if (!!reference) return <Pill bg={shades.greenBg} color={shades.greenText}>Paid</Pill>;
  return <Pill bg={shades.redBg} color={shades.redText}>Failed</Pill>;
};

/** ---------- Tiny toast (silent “Copied!”) ---------- */
const useToast = () => {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (m: string) => {
    if (t.current) clearTimeout(t.current);
    setMsg(m);
    t.current = setTimeout(() => setMsg(null), 1200);
  };
  const node = (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#111",
        color: "#fff",
        borderRadius: 999,
        padding: "8px 14px",
        fontWeight: 700,
        fontSize: 12,
        opacity: msg ? 0.95 : 0,
        transition: "opacity .2s ease",
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      {msg}
    </div>
  );
  return { show, node };
};

/** ---------- Page ---------- */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // collapsed by default
  const { show, node: toast } = useToast();

  const loadOrders = useMemo(
    () =>
      function load() {
        if (typeof window === "undefined") return [] as Order[];
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
            const created =
              o.createdAt || createdFromId(o.id) || formatDateTime(new Date());
            const items: OrderItem[] = Array.isArray(o.items) ? o.items : [];
            return { ...o, createdAt: created, items };
          });

        normalized.sort((a, b) => {
          const na = Number(a.id.replace(/^\D+/, ""));
          const nb = Number(b.id.replace(/^\D+/, ""));
          if (Number.isFinite(na) && Number.isFinite(nb)) return nb - na;
          return 0;
        });

        try {
          localStorage.setItem(CANONICAL_KEY, JSON.stringify(normalized));
          for (const key of POSSIBLE_KEYS) {
            if (key !== CANONICAL_KEY) localStorage.removeItem(key);
          }
        } catch {}

        return normalized;
      },
    []
  );

  // initial load + gentle delayed reloads (capture late writes after redirect)
  useEffect(() => {
    const first = loadOrders();
    setOrders(first);

    // default: all collapsed on page load
    const collapsed: Record<string, boolean> = {};
    first.forEach((o) => (collapsed[o.id] = false));
    setExpanded(collapsed);

    const t1 = setTimeout(() => setOrders(loadOrders()), 600);
    const t2 = setTimeout(() => setOrders(loadOrders()), 1500);

    const onStorage = (e: StorageEvent) => {
      if (e.key && !POSSIBLE_KEYS.includes(e.key) && e.key !== CANONICAL_KEY) return;
      setOrders(loadOrders());
    };
    const onFocusLike = () => setOrders(loadOrders());

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onFocusLike);
    window.addEventListener("focus", onFocusLike);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onFocusLike);
      window.removeEventListener("focus", onFocusLike);
    };
  }, [loadOrders]);

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
              const failed = !order.reference; // header shows Pending if no reference; when expanded status shows Failed
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
                      {/* Left: order id + date (date under id) */}
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
                        {/* header pill logic: Successful if paid, Pending if not */}
                        {order.reference ? (
                          <Pill bg={shades.greenBg} color={shades.greenText}>Successful</Pill>
                        ) : (
                          <Pill bg={shades.grayBg} color={shades.grayText}>Pending</Pill>
                        )}
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
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(order.reference!);
                              show("Copied!");
                            }}
                            style={{
                              background: "#F6F0FD", // soft purple capsule (toast uses black)
                              color: "#6B21A8",
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

                      {/* Total (label + value right-aligned) */}
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

      {toast}
    </div>
  );
                      }
