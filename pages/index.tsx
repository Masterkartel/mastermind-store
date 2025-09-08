// pages/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import {
  ShoppingCart,
  Search,
  Phone,
  MapPin,
  Mail,
  Trash2,
  Plus,
  Minus,
  Wallet,
  Fuel,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku?: string;
  price: number | string;
  stock?: number;
  img?: string;
  desc?: string;
};

const BRAND = {
  name: "Mastermind Electricals & Electronics",
  primary: "#F2C300", // Tibet Yellow
  dark: "#111111",
};

const CONTACT = {
  phone: "+254715151010",
  phoneDisplay: "0715 151 010",
  email: "sales@mastermindelectricals.com",
  maps: "https://maps.app.goo.gl/7P2okRB5ssLFMkUT8",
  hours: "Open Mon–Sun • 8:00am – 9:00pm",
};

function currencyKES(v: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(v);
}

const ctaBtn = (bg: string, fg: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: 999,
  background: bg,
  color: fg,
  textDecoration: "none",
  fontWeight: 700,
  border: "1px solid rgba(0,0,0,0.05)",
  boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
});

const pill = (solid = false): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  background: solid ? BRAND.primary : "transparent",
  color: solid ? "#111" : "#111",
  border: solid ? "1px solid rgba(0,0,0,0.05)" : "1px solid #eee",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.2,
});

export default function Home() {
  // PRODUCTS
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/products.json")
      .then((r) => r.json())
      .then((data: Product[]) => {
        // normalize price/stock types
        const clean = data.map((p) => ({
          ...p,
          price: Number(p.price) || 0,
          stock: p.stock === undefined ? 0 : Number(p.stock),
        }));
        setAllProducts(clean);
      })
      .catch(() => setAllProducts([]));
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = allProducts;
    if (query) {
      list = list.filter((p) =>
        `${p.name} ${p.sku || ""}`.toLowerCase().includes(query)
      );
    }
    return list;
  }, [allProducts, q]);

  // CART
  const [items, setItems] = useState<Record<string, number>>({});
  const totalQty = useMemo(
    () => Object.values(items).reduce((a, b) => a + (b || 0), 0),
    [items]
  );
  const lines = useMemo(
    () =>
      Object.entries(items)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({
          product: allProducts.find((p) => p.id === id),
          qty,
        }))
        .filter((l) => l.product),
    [items, allProducts]
  );
  const totalKES = useMemo(
    () =>
      lines.reduce((s, l) => s + (Number(l.product!.price) || 0) * l.qty, 0),
    [lines]
  );

  const add = (id: string, qty = 1) =>
    setItems((s) => ({ ...s, [id]: (s[id] || 0) + qty }));
  const dec = (id: string, qty = 1) =>
    setItems((s) => ({ ...s, [id]: Math.max(0, (s[id] || 0) - qty) }));
  const remove = (id: string) =>
    setItems((s) => {
      const { [id]: _, ...rest } = s;
      return rest;
    });
  const clearAll = () => setItems({});

  const [cartOpen, setCartOpen] = useState(false);
  const [showGas, setShowGas] = useState(false);

  // CONTACT FORM (dummy submit)
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  function submitContact(e: React.FormEvent) {
    e.preventDefault();
    // You can hook this to an email service later
    alert("Thanks! We received your message.");
    setForm({ name: "", email: "", phone: "", message: "" });
  }

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>Mastermind Electricals & Electronics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Favicon: put your logo in /public/logo.png */}
        <link rel="icon" href="/logo.png" />
      </Head>

      {/* TOP BAR */}
      <header
        style={{
          background: BRAND.dark,
          color: "#fff",
          padding: "10px 16px",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* logo dot */}
            <div
              style={{
                height: 34,
                width: 34,
                borderRadius: 10,
                background: BRAND.primary,
                boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.06)",
              }}
            />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Welcome to</div>
              <div style={{ fontWeight: 800 }}>{BRAND.name}</div>
            </div>
          </div>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 520, position: "relative" }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 10, top: 12, color: "#aaa" }}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Search products, e.g. "43 TV" or "bulb"'
              style={{
                width: "100%",
                padding: "10px 12px 10px 32px",
                borderRadius: 10,
                border: "1px solid #2a2a2a",
                background: "#0f0f0f",
                color: "#eee",
                outline: "none",
              }}
            />
          </div>

          {/* Cart Button (smaller) */}
          <button
            onClick={() => setCartOpen((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              color: "#111",
              padding: "7px 12px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              fontWeight: 700,
              position: "relative",
            }}
          >
            <ShoppingCart size={16} />
            Cart
            {totalQty > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  minWidth: 18,
                  height: 18,
                  fontSize: 11,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: BRAND.primary,
                  color: "#111",
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.05)",
                  padding: "0 4px",
                }}
              >
                {totalQty}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* HERO + VISIT — side-by-side on desktop */}
      <section
        style={{
          maxWidth: 1200,
          margin: "14px auto 8px",
          padding: "0 16px",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1fr",
          }}
        >
          {/* Wrap in a 2-col grid on wider screens */}
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "1fr",
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "1fr",
              }}
            >
              {/* Make 2 cols when wide */}
              <style>{`
                @media (min-width: 900px) {
                  .heroGrid2 {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 16px;
                  }
                }
              `}</style>
              <div className="heroGrid2">
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
                  {/* bg circles UNDER content */}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      width: 360,
                      height: 360,
                      left: -90,
                      top: -90,
                      borderRadius: "9999px",
                      background: "#fde58a",
                      opacity: 0.6,
                      filter: "blur(0.5px)",
                      zIndex: 0,
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      width: 36,
                      height: 36,
                      right: 16,
                      top: 16,
                      borderRadius: "9999px",
                      background: "#f0b90b",
                      opacity: 0.35,
                      zIndex: 0,
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      width: 18,
                      height: 18,
                      right: 58,
                      top: 32,
                      borderRadius: "9999px",
                      background: "#f0b90b",
                      opacity: 0.25,
                      zIndex: 0,
                      pointerEvents: "none",
                    }}
                  />

                  {/* content above */}
                  <div style={{ position: "relative", zIndex: 1 }}>
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
                      Shop TVs, woofers, LED bulbs, and 6kg/13kg gas refills.
                      Pay via M-Pesa. Pickup or same-day delivery.
                    </p>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={pill(true)}>
                        <Wallet size={14} />
                        M-Pesa Available
                      </span>
                      <button
                        style={pill(true)}
                        onClick={() => setShowGas(true)}
                        aria-label="Show gas refill options"
                      >
                        <Fuel size={14} />
                        Gas Refill Available
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Visit card */}
                <div
                  style={{
                    position: "relative",
                    background: "#0f0f0f",
                    color: "#fff",
                    borderRadius: 18,
                    padding: 18,
                    overflow: "hidden",
                  }}
                >
                  {/* bg circle UNDER content */}
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
                      zIndex: 0,
                      pointerEvents: "none",
                    }}
                  />

                  {/* content above */}
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: 18, display: "flex", gap: 8 }}>
                      🏬 Visit Our Shop
                    </h2>
                    <div style={{ opacity: 0.9, marginTop: 6 }}>
                      {BRAND.name}, Sotik Town
                    </div>
                    <div style={{ opacity: 0.8, marginTop: 2 }}>{CONTACT.hours}</div>

                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        marginTop: 14,
                      }}
                    >
                      {/* Tibet Yellow buttons */}
                      <a
                        href={CONTACT.maps}
                        target="_blank"
                        rel="noreferrer"
                        style={ctaBtn(BRAND.primary, "#111")}
                      >
                        <MapPin size={16} />
                        View on Maps
                      </a>
                      <a href={`tel:${CONTACT.phone}`} style={ctaBtn(BRAND.primary, "#111")}>
                        <Phone size={16} />
                        {CONTACT.phoneDisplay}
                      </a>
                      <a
                        href={`mailto:${CONTACT.email}`}
                        style={ctaBtn(BRAND.primary, "#111")}
                      >
                        <Mail size={16} />
                        {CONTACT.email}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              {/* end heroGrid2 */}
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT GRID */}
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
            const inStock = (p.stock ?? 0) > 0;
            return (
              <div
                key={p.id}
                style={{
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "relative" }}>
                  {/* bg pattern dot */}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      width: 90,
                      height: 90,
                      right: -20,
                      top: -20,
                      borderRadius: 999,
                      background: "#f7f7f7",
                      zIndex: 0,
                    }}
                  />
                  <img
                    src={
                      p.img && p.img.trim()
                        ? p.img
                        : "https://via.placeholder.com/600x360?text=Product"
                    }
                    alt={p.name}
                    style={{
                      width: "100%",
                      height: 140,
                      objectFit: "cover",
                      position: "relative",
                      zIndex: 1,
                    }}
                  />
                </div>

                <div style={{ padding: 10, position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{p.sku || ""}</div>
                  <div style={{ fontWeight: 700, color: "#111827" }}>{p.name}</div>
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {currencyKES(price)}
                    </div>
                    <button
                      onClick={() => add(p.id, 1)}
                      disabled={!inStock}
                      style={{
                        background: BRAND.primary,
                        color: "#111",
                        border: "1px solid rgba(0,0,0,0.06)",
                        padding: "6px 10px",
                        borderRadius: 10,
                        fontWeight: 800,
                        opacity: inStock ? 1 : 0.5,
                      }}
                    >
                      {inStock ? "Add" : "Out"}
                    </button>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                    Stock: {p.stock ?? 0}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CONTACT FORM */}
      <section
        style={{
          maxWidth: 900,
          margin: "10px auto 30px",
          padding: "0 16px",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18 }}>Leave us a message</h3>
          <p style={{ marginTop: 6, color: "#4b5563" }}>
            Tell us what you need and how to reach you. We’ll get back shortly.
          </p>

          <form onSubmit={submitContact} style={{ marginTop: 10 }}>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "1fr",
              }}
            >
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                style={inputStyle}
              />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email address"
                style={inputStyle}
              />
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Phone (optional)"
                style={inputStyle}
              />
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Your message"
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <button
                type="submit"
                style={{
                  ...ctaBtn(BRAND.primary, "#111"),
                  justifyContent: "center",
                }}
              >
                Send Message
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 24px" }}>
        <div
          style={{
            borderTop: "1px solid #eee",
            paddingTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            fontSize: 14,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: "#111" }}>{BRAND.name}</div>
            <div style={{ marginTop: 8, color: "#4b5563" }}>
              Genuine stock. Fair prices. Friendly support.
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>Contact</div>
            <ul style={ulStyle}>
              <li>
                <a href={`tel:${CONTACT.phone}`} style={aLite}>
                  <Phone size={14} /> {CONTACT.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT.email}`} style={aLite}>
                  <Mail size={14} /> {CONTACT.email}
                </a>
              </li>
              <li>
                <a href={CONTACT.maps} target="_blank" rel="noreferrer" style={aLite}>
                  <MapPin size={14} /> View on Maps
                </a>
              </li>
              <li style={{ color: "#6b7280" }}>{CONTACT.hours}</li>
            </ul>
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>Payments</div>
            <ul style={ulStyle}>
              <li>M-Pesa (Till & in-store)</li>
              <li>Cash on Delivery (local)</li>
              <li>In-store M-Pesa Agent</li>
            </ul>
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 12,
            paddingTop: 16,
          }}
        >
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </div>
      </footer>

      {/* CART PANEL */}
      {cartOpen && (
        <div
          style={{
            position: "fixed",
            right: 12,
            top: 72,
            width: 340,
            maxHeight: "70vh",
            overflow: "auto",
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: "1px solid #f1f1f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontWeight: 800, display: "flex", gap: 8 }}>
              <ShoppingCart size={18} /> Cart
            </div>
            <button
              onClick={() => setCartOpen(false)}
              style={{
                border: "1px solid #eee",
                background: "#fff",
                borderRadius: 8,
                padding: "4px 8px",
              }}
            >
              Close
            </button>
          </div>

          <div style={{ padding: 12 }}>
            {lines.length === 0 ? (
              <div style={{ color: "#6b7280" }}>Your cart is empty.</div>
            ) : (
              <>
                {lines.map((l) => (
                  <div
                    key={l.product!.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 6,
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid #f6f6f6",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{l.product!.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {l.product!.sku || ""} • {currencyKES(Number(l.product!.price))}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <button style={qtyBtn} onClick={() => dec(l.product!.id, 1)}>
                          <Minus size={14} />
                        </button>
                        <div style={{ minWidth: 24, textAlign: "center" }}>{l.qty}</div>
                        <button style={qtyBtn} onClick={() => add(l.product!.id, 1)}>
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800 }}>
                        {currencyKES(Number(l.product!.price) * l.qty)}
                      </div>
                      <button
                        onClick={() => remove(l.product!.id)}
                        style={{
                          ...miniDanger,
                          marginTop: 6,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 10,
                  }}
                >
                  <div style={{ color: "#6b7280" }}>Total</div>
                  <div style={{ fontWeight: 900 }}>{currencyKES(totalKES)}</div>
                </div>

                {/* Clear all only if more than one product line */}
                {lines.length > 1 && (
                  <div style={{ marginTop: 8 }}>
                    <button onClick={clearAll} style={miniDanger}>
                      Clear all
                    </button>
                  </div>
                )}

                <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                  <button
                    onClick={() => alert("Proceeding to M-Pesa checkout soon")}
                    style={{
                      ...ctaBtn(BRAND.primary, "#111"),
                      width: "100%",
                      justifyContent: "center",
                    }}
                  >
                    Pay with M-Pesa
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* GAS MODAL */}
      {showGas && (
        <div
          onClick={() => setShowGas(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #eee",
              padding: 16,
            }}
          >
            <h3 style={{ margin: 0 }}>Gas Refill</h3>
            <p style={{ color: "#4b5563" }}>
              Choose your refill size and we’ll add it to your cart.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              <button
                onClick={() => {
                  add("gas-6kg", 1);
                  setShowGas(false);
                  setCartOpen(true);
                }}
                style={ctaBtn(BRAND.primary, "#111")}
              >
                6KG — KES 1,150
              </button>
              <button
                onClick={() => {
                  add("gas-13kg", 1);
                  setShowGas(false);
                  setCartOpen(true);
                }}
                style={ctaBtn(BRAND.primary, "#111")}
              >
                13KG — KES 2,550
              </button>
            </div>
            <div style={{ textAlign: "right", marginTop: 10 }}>
              <button
                onClick={() => setShowGas(false)}
                style={{
                  border: "1px solid #eee",
                  background: "#fff",
                  borderRadius: 8,
                  padding: "6px 10px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* styles */
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  outline: "none",
  background: "#fff",
};

const ulStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#4b5563",
  paddingLeft: 16,
  listStyle: "disc",
};

const aLite: React.CSSProperties = {
  color: "#374151",
  textDecoration: "none",
  display: "inline-flex",
  gap: 6,
  alignItems: "center",
};

const qtyBtn: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 8,
  padding: "4px 8px",
};

const miniDanger: React.CSSProperties = {
  border: "1px solid #fee2e2",
  background: "#fff",
  color: "#b91c1c",
  borderRadius: 8,
  padding: "6px 10px",
  fontWeight: 700,
};
