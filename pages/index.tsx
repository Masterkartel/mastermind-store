import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";

/** ---------- Types ---------- */
type Product = {
  id: string;
  name: string;
  price: number | string;
  sku?: string;
  stock?: number;
  img?: string;
};

type CartLine = {
  product: Product;
  qty: number;
};

/** ---------- Helpers ---------- */
const currency = (n: number) =>
  `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

const clampName = (s: string) => s?.trim();

/** ---------- Page ---------- */
export default function Home() {
  const [all, setAll] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [showGas, setShowGas] = useState(false);

  // Contact form state
  const [cfMessage, setCfMessage] = useState("");
  const [cfName, setCfName] = useState("");
  const [cfPhone, setCfPhone] = useState("");
  const [cfEmail, setCfEmail] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Load products.json
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/products.json", { cache: "no-cache" });
        const data: Product[] = await r.json();
        setAll(data);
      } catch (e) {
        console.error("Failed to load products.json", e);
      }
    };
    load();
  }, []);

  // Persist cart
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mm_cart_v2");
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("mm_cart_v2", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Search
  const filtered = useMemo(() => {
    if (!q.trim()) return all;
    const t = q.toLowerCase();
    return all.filter(
      (p) =>
        p.name?.toLowerCase().includes(t) ||
        p.sku?.toLowerCase().includes(t) ||
        p.id?.toLowerCase().includes(t)
    );
  }, [all, q]);

  // Cart ops
  const add = (p: Product) =>
    setCart((c) => {
      const cur = c[p.id]?.qty ?? 0;
      return { ...c, [p.id]: { product: p, qty: cur + 1 } };
    });

  const sub = (id: string) =>
    setCart((c) => {
      const line = c[id];
      if (!line) return c;
      const next = { ...c };
      if (line.qty <= 1) delete next[id];
      else next[id] = { ...line, qty: line.qty - 1 };
      return next;
    });

  const count = useMemo(
    () => Object.values(cart).reduce((n, l) => n + l.qty, 0),
    [cart]
  );

  const total = useMemo(
    () =>
      Object.values(cart).reduce(
        (n, l) => n + (Number(l.product.price) || 0) * l.qty,
        0
      ),
    [cart]
  );

  /** ---------- Quick add gas ---------- */
  const quickAddGas = () => setShowGas(true);
  const addGas = (id: "gas-6kg" | "gas-13kg") => {
    const p = all.find((x) => x.id === id);
    if (!p) {
      alert(
        `Product ${id} not found in products.json. Please add it (id must be "${id}").`
      );
      return;
    }
    add(p);
    setShowGas(false);
    setCartOpen(true);
  };

  /** ---------- Contact submit (mailto) ---------- */
  const submitContact = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = [
      `Message: ${cfMessage}`,
      "",
      `Name: ${cfName}`,
      `Phone: ${cfPhone}`,
      `Email: ${cfEmail}`,
    ].join("\n");
    const mailto = `mailto:sales@mastermindelectricals.com?subject=${encodeURIComponent(
      "Website Enquiry"
    )}&body=${encodeURIComponent(msg)}`;
    window.location.href = mailto;
    formRef.current?.reset();
    setCfMessage("");
    setCfName("");
    setCfPhone("");
    setCfEmail("");
    alert("Thanks! Your email app will open with your message.");
  };

  /** ---------- UI ---------- */
  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>Mastermind Electricals & Electronics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Favicon: place /public/favicon.ico (use your logo) */}
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header
        style={{
          position: "relative",
          background: "#0f0f0f",
          color: "#fff",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        {/* subtle circles */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              width: 170,
              height: 170,
              right: -40,
              top: -40,
              borderRadius: "9999px",
              background: "#f4c84d",
              opacity: 0.15,
              filter: "blur(2px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 90,
              height: 90,
              left: -20,
              bottom: -20,
              borderRadius: "9999px",
              background: "#f4c84d",
              opacity: 0.12,
            }}
          />
        </div>

        <div style={{ fontWeight: 900, fontSize: 19 }}>
          Mastermind Electricals & Electronics
        </div>

        <button
          onClick={() => setCartOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#f0b90b",
            color: "#1a1a1a",
            border: "1px solid #e2b009",
            borderRadius: 14,
            padding: "6px 10px",
            fontWeight: 800,
            boxShadow: "inset 0 -1px 0 rgba(0,0,0,.12)",
          }}
          aria-label="Open cart"
        >
          🛒 Cart
          <span
            style={{
              marginLeft: 6,
              background: "#fff",
              borderRadius: 999,
              padding: "1px 6px",
              fontSize: 12,
              fontWeight: 800,
              border: "1px solid rgba(0,0,0,.12)",
            }}
          >
            {count}
          </span>
        </button>
      </header>

      {/* Top section: two cards side-by-side on wide screens */}
      <section
        style={{
          position: "relative",
          maxWidth: 1200,
          margin: "0 auto",
          padding: 16,
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1fr",
          }}
        >
          {/* CSS for responsive columns (no Tailwind) */}
          <style jsx>{`
            @media (min-width: 900px) {
              section > div.grid-2 {
                display: grid !important;
                grid-template-columns: 1.1fr 0.9fr !important;
                gap: 16px !important;
              }
            }
          `}</style>

          <div className="grid-2" style={{ display: "block" }}>
            {/* Left: Hero */}
            <div
              style={{
                position: "relative",
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 18,
                padding: 18,
                overflow: "hidden",
              }}
            >
              {/* large soft circle */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  width: 360,
                  height: 360,
                  right: -90,
                  top: -90,
                  borderRadius: "9999px",
                  background: "#fde58a",
                  opacity: 0.6,
                  filter: "blur(0.5px)",
                }}
              />
              {/* tiny accents */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  width: 36,
                  height: 36,
                  left: 16,
                  top: 16,
                  borderRadius: "9999px",
                  background: "#f0b90b",
                  opacity: 0.35,
                }}
              />
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  width: 18,
                  height: 18,
                  left: 58,
                  top: 32,
                  borderRadius: "9999px",
                  background: "#f0b90b",
                  opacity: 0.25,
                }}
              />

              <div
                style={{
                  color: "#6b7280",
                  fontWeight: 700,
                  letterSpacing: 1,
                  fontSize: 12,
                  marginBottom: 10,
                }}
              >
                TRUSTED IN SOTIK
              </div>

              <h1
                style={{
                  fontSize: 28,
                  lineHeight: 1.15,
                  margin: 0,
                  fontWeight: 800,
                  color: "#111827",
                }}
              >
                Quality Electronics, Lighting & Gas — Fast Delivery
              </h1>

              <p style={{ marginTop: 10, color: "#4b5563" }}>
                Shop TVs, woofers, LED bulbs, and 6kg/13kg gas refills. Pay via
                M-Pesa. Pickup or same-day delivery.
              </p>

              {/* Pills (only two requested; wallet icon for M-Pesa) */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  style={pill(true)}
                  onClick={() =>
                    alert("M-Pesa available in-store & online.")
                  }
                >
                  💼 M-Pesa Available
                </button>
                <button style={pill(true)} onClick={quickAddGas}>
                  ⛽ Gas Refill Available
                </button>
              </div>
            </div>

            {/* Right: Visit card */}
            <div
              style={{
                position: "relative",
                marginTop: 16,
                background: "#0f0f0f",
                color: "#fff",
                borderRadius: 18,
                padding: 18,
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  width: 220,
                  height: 220,
                  right: -60,
                  top: -60,
                  borderRadius: "9999px",
                  background: "#f4c84d",
                  opacity: 0.18,
                  filter: "blur(1px)",
                }}
              />
              <h2 style={{ margin: 0, fontSize: 18, display: "flex", gap: 8 }}>
                🏬 Visit Our Shop
              </h2>
              <div style={{ opacity: 0.9, marginTop: 6 }}>
                Mastermind Electricals & Electronics, Sotik Town
              </div>
              <div style={{ opacity: 0.8, marginTop: 2 }}>
                Open Mon–Sun • 8:00am – 9:00pm
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 14,
                }}
              >
                <a
                  href="https://maps.app.goo.gl/7P2okRB5ssLFMkUT8"
                  target="_blank"
                  rel="noreferrer"
                  style={ctaBtn()}
                >
                  View on Maps ↗
                </a>
                <a href="tel:+254715151010" style={ctaBtn("#fff", "#111")}>
                  📞 0715151010
                </a>
                <a
                  href="mailto:sales@mastermindelectricals.com"
                  style={ctaBtn("#fff", "#111")}
                >
                  ✉️ sales@mastermindelectricals.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Search products, e.g., "43 TV" or "bulb"'
          style={{
            width: "100%",
            border: "1px solid #e5e7eb",
            background: "#fff",
            borderRadius: 12,
            padding: "12px 14px",
            outlineOffset: 2,
          }}
        />
      </section>

      {/* Product Grid */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 16px 20px" }}>
        <div
          className="grid"
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          }}
        >
          {filtered.map((p) => {
            const price = Number(p.price) || 0;
            return (
              <article
                key={p.id}
                style={{
                  position: "relative",
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                {/* small decorative circles */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    width: 38,
                    height: 38,
                    right: -12,
                    top: -12,
                    borderRadius: "9999px",
                    background: "#fde58a",
                    opacity: 0.5,
                  }}
                />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    width: 16,
                    height: 16,
                    left: -6,
                    bottom: 56,
                    borderRadius: "9999px",
                    background: "#f0b90b",
                    opacity: 0.35,
                  }}
                />

                {/* Image placeholder */}
                <div
                  style={{
                    height: 160,
                    background:
                      p.img ? `url(${p.img}) center/cover` : "#f8fafc",
                    display: "grid",
                    placeItems: "center",
                    color: "#9ca3af",
                    fontSize: 12,
                  }}
                >
                  {!p.img && "No Image"}
                </div>

                <div style={{ padding: 12 }}>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>{p.sku}</div>
                  <div
                    title={p.name}
                    style={{
                      fontWeight: 700,
                      lineHeight: 1.25,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      minHeight: 40,
                    }}
                  >
                    {clampName(p.name)}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{currency(price)}</div>
                    <button
                      onClick={() => add(p)}
                      style={{
                        background: "#f0b90b",
                        border: "1px solid #e2b009",
                        color: "#111",
                        borderRadius: 12,
                        padding: "6px 12px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Add
                    </button>
                  </div>

                  <div style={{ marginTop: 6, color: "#6b7280", fontSize: 12 }}>
                    Stock: {p.stock ?? 0}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Contact Form */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 16px 48px",
        }}
      >
        <div
          style={{
            position: "relative",
            background: "#ffffff",
            border: "1px solid #eee",
            borderRadius: 16,
            padding: 16,
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              width: 180,
              height: 180,
              right: -50,
              bottom: -50,
              background: "#fde58a",
              opacity: 0.4,
              borderRadius: "9999px",
            }}
          />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
            Send us a message
          </h3>

          <form ref={formRef} onSubmit={submitContact} style={{ marginTop: 12 }}>
            {/* Message FIRST */}
            <label style={label()}>Message</label>
            <textarea
              required
              value={cfMessage}
              onChange={(e) => setCfMessage(e.target.value)}
              placeholder="How can we help?"
              rows={4}
              style={input(true)}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 10,
              }}
            >
              <div>
                <label style={label()}>Full Name</label>
                <input
                  required
                  value={cfName}
                  onChange={(e) => setCfName(e.target.value)}
                  placeholder="Your name"
                  style={input()}
                />
              </div>

              <div>
                <label style={label()}>Phone</label>
                <input
                  value={cfPhone}
                  onChange={(e) => setCfPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="07XXXXXXXX"
                  style={input()}
                />
              </div>

              <div>
                <label style={label()}>Email</label>
                <input
                  value={cfEmail}
                  onChange={(e) => setCfEmail(e.target.value)}
                  inputMode="email"
                  type="email"
                  placeholder="you@email.com"
                  style={input()}
                />
              </div>
            </div>

            <button type="submit" style={{ ...ctaBtn(), marginTop: 12 }}>
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Cart Drawer (mid height) */}
      {cartOpen && (
        <div
          onClick={() => setCartOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            zIndex: 50,
            display: "grid",
            placeItems: "center",
            padding: 12,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(640px, 96vw)",
              maxHeight: "70vh",
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #eee",
              overflow: "hidden auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                borderBottom: "1px solid #eee",
                position: "sticky",
                top: 0,
                background: "#fff",
                zIndex: 1,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 18 }}>Your Cart</div>
              <button
                onClick={() => setCartOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 6,
                  cursor: "pointer",
                  fontSize: 18,
                }}
                aria-label="Close cart"
              >
                ✕
              </button>
            </div>

            {Object.values(cart).length === 0 ? (
              <div style={{ padding: "20px 12px", color: "#666" }}>
                Your cart is empty.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12, padding: 12 }}>
                {Object.values(cart).map((l) => (
                  <div
                    key={String(l.product.id)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 8,
                      alignItems: "center",
                      borderBottom: "1px solid #eee",
                      paddingBottom: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{l.product.name}</div>
                      <div style={{ color: "#666", fontSize: 12 }}>
                        {currency(Number(l.product.price))}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <button
                        onClick={() => sub(String(l.product.id))}
                        style={qtyBtn()}
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <div style={{ minWidth: 28, textAlign: "center" }}>
                        {l.qty}
                      </div>
                      <button
                        onClick={() => add(l.product)}
                        style={qtyBtn()}
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    marginTop: 6,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 800,
                    }}
                  >
                    <span>Total</span>
                    <span>{currency(Math.round(total))}</span>
                  </div>

                  <label style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
                    M-Pesa Phone (07XXXXXXXX)
                  </label>
                  <input
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    style={input()}
                  />

                  <button
                    onClick={() => alert("M-Pesa STK push will be added next.")}
                    style={{ ...ctaBtn(), width: "100%" }}
                  >
                    Pay with M-Pesa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gas Quick Add */}
      {showGas && (
        <div
          onClick={() => setShowGas(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            zIndex: 60,
            display: "grid",
            placeItems: "center",
            padding: 12,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 94vw)",
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #eee",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 12,
                borderBottom: "1px solid #eee",
                fontWeight: 800,
              }}
            >
              Quick Add (Gas)
            </div>
            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              <button style={ctaBtn()} onClick={() => addGas("gas-6kg")}>
                Add 6KG — KES 1,150
              </button>
              <button style={ctaBtn()} onClick={() => addGas("gas-13kg")}>
                Add 13KG — KES 2,550
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #eee",
          padding: "18px 16px",
          color: "#6b7280",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        © {new Date().getFullYear()} Mastermind Electricals & Electronics.
        All rights reserved.
      </footer>
    </div>
  );
}

/** ---------- Tiny style helpers ---------- */
const pill = (button = false): React.CSSProperties =>
  button
    ? {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "#111827",
        color: "#fff",
        borderRadius: 999,
        padding: "8px 12px",
        border: "1px solid #111",
        cursor: "pointer",
        fontWeight: 700,
      }
    : {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "#fef3c7",
        color: "#92400e",
        borderRadius: 999,
        padding: "8px 12px",
        border: "1px solid #fde68a",
        fontWeight: 700,
      };

const ctaBtn = (bg = "#111", fg = "#fff"): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: bg,
  color: fg,
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,.1)",
  fontWeight: 800,
  textDecoration: "none",
});

const qtyBtn = (): React.CSSProperties => ({
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: "6px 10px",
  background: "#fff",
  cursor: "pointer",
});

const label = (): React.CSSProperties => ({
  display: "block",
  fontSize: 12,
  color: "#374151",
  marginBottom: 6,
  fontWeight: 700,
});

const input = (textarea = false): React.CSSProperties => ({
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: textarea ? "10px 12px" : "10px 12px",
  background: "#fff",
  outlineOffset: 2,
});
