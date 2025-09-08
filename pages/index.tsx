import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import {
  ShoppingCart,
  Search,
  Phone,
  MapPin,
  Truck,
  Check,
  Wallet,
  Flame,
  X,
  Plus,
  Minus,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: number | string;
  sku?: string;   // Units from your Excel
  stock?: number; // optional; default to 10 if missing
  img?: string;
};

const BRAND = {
  name: "Mastermind Electricals & Electronics",
  primary: "#F2C300",
  dark: "#111111",
};

const CONTACT = {
  domain: process.env.NEXT_PUBLIC_BRAND_DOMAIN || "www.mastermindelectricals.com",
  email: process.env.NEXT_PUBLIC_BRAND_EMAIL || "sales@mastermindelectricals.com",
  phone: "0715151010",
  maps: "https://maps.app.goo.gl/7P2okRB5ssLFMkUT8",
  hours: "Open Mon–Sun • 8:00am – 9:00pm",
};

const currency = (kes: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(kes);

export default function Home() {
  // ---------- State ----------
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showGasMenu, setShowGasMenu] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const gasBtnRef = useRef<HTMLButtonElement | null>(null);
  const gasMenuRef = useRef<HTMLDivElement | null>(null);

  // Cart as id -> qty
  const [cart, setCart] = useState<Record<string, number>>({});

  // ---------- Effects ----------
  useEffect(() => {
    fetch("/products.json")
      .then((r) => r.json())
      .then((list: any[]) => {
        const normalized = (list || []).map((p: any) => ({
          ...p,
          price: Number(p.price) || 0,
          stock:
            typeof p.stock === "number"
              ? p.stock
              : Number(p.Stock) || 10, // support "Stock" key; else default 10
        }));
        setProducts(normalized);
      })
      .catch(() => {});
  }, []);

  // Close gas menu on outside click / ESC
  useEffect(() => {
    if (!showGasMenu) return;
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (
        gasMenuRef.current &&
        !gasMenuRef.current.contains(t) &&
        gasBtnRef.current &&
        !gasBtnRef.current.contains(t)
      ) {
        setShowGasMenu(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowGasMenu(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [showGasMenu]);

  // ---------- Cart helpers ----------
  const add = (id: string) =>
    setCart((s) => ({ ...s, [id]: Math.min((s[id] || 0) + 1, 999) }));
  const sub = (id: string) =>
    setCart((s) => {
      const next = Math.max((s[id] || 0) - 1, 0);
      const copy = { ...s };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  const remove = (id: string) =>
    setCart((s) => {
      const { [id]: _, ...rest } = s;
      return rest;
    });
  const clear = () => setCart({});

  // Quick-add gas
  function addGas(id: "gas-6kg" | "gas-13kg") {
    const exists = products.some((p) => String(p.id) === id);
    if (!exists) {
      alert(`Product ${id} not found in products.json. Please add it (id must be "${id}")`);
      return;
    }
    add(id);
    setShowGasMenu(false);
    setShowCart(true);
  }

  // ---------- Derived ----------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => `${p.name} ${p.sku || ""}`.toLowerCase().includes(q));
  }, [products, query]);

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([_, qty]) => qty > 0)
        .map(([id, qty]) => ({
          product: products.find((p) => String(p.id) === String(id)),
          qty,
        }))
        .filter((l) => !!l.product),
    [cart, products]
  );

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.product!.price) || 0) * l.qty, 0),
    [lines]
  );

  // ---------- Actions ----------
  async function stkPush() {
    if (!/^0?7\d{8}$/.test(mpesaPhone)) {
      alert("Enter valid Safaricom number, e.g., 07XXXXXXXX");
      return;
    }
    if (total <= 0) {
      alert("Your cart is empty.");
      return;
    }
    try {
      const resp = await fetch("/api/mpesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: mpesaPhone,
          amount: Math.round(total),
          items: lines.map((l) => ({
            id: l.product!.id,
            name: l.product!.name,
            price: Number(l.product!.price) || 0,
            qty: l.qty,
          })),
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        alert("STK Push sent. Check your phone and enter your M-Pesa PIN to pay.");
      } else {
        alert("Payment error: " + (data.error || "unknown"));
      }
    } catch (e: any) {
      alert("Network error: " + e?.message);
    }
  }

  // ---------- UI ----------
  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>Mastermind Electricals & Electronics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Top Bar */}
      <header
        style={{
          background: BRAND.dark,
          color: "#fff",
          padding: "12px 16px",
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                height: 28,
                width: 8,
                borderRadius: 4,
                background: BRAND.primary,
              }}
            />
            <div style={{ fontWeight: 700 }}>{BRAND.name}</div>
          </div>

          <button
            onClick={() => setShowCart(true)}
            style={{
              background: "#fff",
              color: "#111",
              borderRadius: 14,
              padding: "8px 12px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "none",
              cursor: "pointer",
            }}
            aria-label="Open cart"
          >
            <ShoppingCart size={16} />
            Cart: {lines.length}
          </button>
        </div>
      </header>

      {/* Hero + Shop Info (two columns) */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        <style jsx>{`
          .twoCol {
            display: grid;
            gap: 16px;
            grid-template-columns: 1fr; /* phone */
            align-items: stretch;
          }
          @media (min-width: 920px) {
            .twoCol {
              grid-template-columns: 2fr 1fr; /* desktop: two columns */
            }
          }
          .badges {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
            position: relative; /* popover anchor */
          }
          .gasMenu {
            position: absolute;
            top: 42px;
            left: 0;
            background: #fff;
            border: 1px solid #eee;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,.18);
            padding: 10px;
            width: 260px;
            z-index: 1000; /* bring above everything */
          }
          .gasMenu button {
            width: 100%;
            background: #111;
            color: #fff;
            border: none;
            border-radius: 10px;
            padding: 10px 12px;
            cursor: pointer;
            margin-top: 6px;
            font-weight: 700;
          }
        `}</style>

        <div className="twoCol">
          {/* Hero (left) */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 16,
              padding: 16,
              position: "relative",
              overflow: "visible", // IMPORTANT: allow gas menu to show
            }}
          >
            {/* light decorative blob */}
            <div
              style={{
                position: "absolute",
                right: -50,
                top: -50,
                height: 180,
                width: 180,
                borderRadius: 90,
                background: BRAND.primary,
                opacity: 0.15,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                textTransform: "uppercase",
                fontSize: 12,
                letterSpacing: 1,
                color: "#111",
              }}
            >
              Trusted in Sotik
            </div>
            <h1
              style={{
                margin: "8px 0 0",
                fontSize: 28,
                fontWeight: 800,
                color: "#111",
                lineHeight: 1.15,
              }}
            >
              Quality Electronics, Lighting & Gas — Fast Delivery
            </h1>
            <p style={{ marginTop: 8, color: "#555" }}>
              Shop TVs, woofers, LED bulbs, and 6kg/13kg gas refills. Pay via M-Pesa. Pickup or same-day delivery.
            </p>

            {/* badges + gas quick add */}
            <div className="badges">
              <span
                style={{
                  background: BRAND.primary,
                  color: "#111",
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Truck size={12} />
                Same-day delivery
              </span>

              <span
                style={{
                  border: "1px solid #e5e5e5",
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Check size={12} />
                1-Year TV Warranty
              </span>

              <span
                style={{
                  border: "1px solid #e5e5e5",
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Wallet size={12} />
                M-Pesa Available
              </span>

              <button
                ref={gasBtnRef}
                onClick={() => setShowGasMenu((v) => !v)}
                style={{
                  border: "1px solid #e5e5e5",
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#fff",
                  cursor: "pointer",
                }}
                aria-haspopup="menu"
                aria-expanded={showGasMenu}
              >
                <Flame size={12} />
                Gas Refills Available
              </button>

              {showGasMenu && (
                <div ref={gasMenuRef} className="gasMenu">
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Quick Add (Gas)</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <button onClick={() => addGas("gas-6kg")}>Add 6KG — KES 1,150</button>
                    <button onClick={() => addGas("gas-13kg")}>Add 13KG — KES 2,550</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visit Our Shop (right, black with yellow accent) */}
          <div
            style={{
              background: BRAND.dark,
              color: "#fff",
              borderRadius: 16,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* yellow circular accent */}
            <div
              style={{
                position: "absolute",
                left: -60,
                bottom: -60,
                height: 220,
                width: 220,
                borderRadius: 120,
                background: BRAND.primary,
                opacity: 0.13,
                pointerEvents: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <MapPin size={18} />
              <span style={{ fontWeight: 600 }}>Visit Our Shop</span>
            </div>
            <div style={{ opacity: 0.9, fontSize: 14 }}>
              Mastermind Electricals & Electronics, Sotik Town
            </div>
            <div style={{ opacity: 0.85, fontSize: 14 }}>{CONTACT.hours}</div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
              <a
                href={CONTACT.maps}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: BRAND.primary,
                  color: "#111",
                  fontWeight: 700,
                  padding: "10px 12px",
                  borderRadius: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                }}
              >
                <MapPin size={16} />
                View on Maps
              </a>
              <a
                href={`tel:${CONTACT.phone}`}
                style={{
                  background: "white",
                  color: "#111",
                  fontWeight: 700,
                  padding: "10px 12px",
                  borderRadius: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                }}
              >
                <Phone size={16} />
                {CONTACT.phone}
              </a>
            </div>

            <div style={{ marginTop: 6, fontSize: 14, opacity: 0.9 }}>
              Email:{" "}
              <a href={`mailto:${CONTACT.email}`} style={{ color: BRAND.primary }}>
                {CONTACT.email}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#999" }} />
          <input
            placeholder={`Search products, e.g., "43 TV" or "bulb"`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 36px",
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fff",
            }}
          />
        </div>
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
            const soldOut = (p.stock ?? 0) <= 0;
            return (
              <div
                key={String(p.id)}
                style={{
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    height: 160,
                    background: "#f3f3f3",
                    display: "grid",
                    placeItems: "center",
                    color: "#9a9a9a",
                    fontSize: 12,
                  }}
                >
                  {p.img ? (
                    <img
                      src={p.img}
                      alt={p.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                  ) : (
                    "No Image"
                  )}
                </div>

                <div style={{ padding: 12 }}>
                  {p.sku ? <div style={{ fontSize: 12, color: "#777" }}>{p.sku}</div> : null}
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>
                      {currency(price)}
                    </div>
                    <button
                      onClick={() => add(String(p.id))}
                      disabled={soldOut}
                      style={{
                        minWidth: 68,
                        padding: "6px 10px",
                        borderRadius: 10,
                        background: soldOut ? "#ddd" : BRAND.primary,
                        color: "#111",
                        border: "none",
                        cursor: soldOut ? "not-allowed" : "pointer",
                      }}
                    >
                      {soldOut ? "Out" : "Add"}
                    </button>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                    Stock: {p.stock ?? 0}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contact Form (Phone + Email + Message) */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>
          Contact Us
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const phone = (e.currentTarget.elements.namedItem("phone") as HTMLInputElement).value;
            const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
            const msg = (e.currentTarget.elements.namedItem("message") as HTMLTextAreaElement).value;
            alert(`Thank you! We will reach out.\nPhone: ${phone}\nEmail: ${email}\nMessage: ${msg}`);
          }}
          style={{
            display: "grid",
            gap: 12,
            background: "#fff",
            padding: 20,
            borderRadius: 16,
            border: "1px solid #eee",
          }}
        >
          <input
            name="phone"
            type="tel"
            placeholder="Your Phone (07XXXXXXXX)"
            required
            style={{ padding: "12px", border: "1px solid #ddd", borderRadius: 8 }}
          />
          <input
            name="email"
            type="email"
            placeholder="Your Email"
            required
            style={{ padding: "12px", border: "1px solid #ddd", borderRadius: 8 }}
          />
          <textarea
            name="message"
            rows={4}
            placeholder="Your Message"
            required
            style={{ padding: "12px", border: "1px solid #ddd", borderRadius: 8 }}
          />
          <button
            type="submit"
            style={{
              background: BRAND.primary,
              color: "#111",
              padding: "12px",
              borderRadius: 10,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
            }}
          >
            Send Message
          </button>
        </form>
      </section>

      {/* Footer */}
      <footer style={{ background: "#fff", borderTop: "1px solid #eee" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "16px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            fontSize: 14,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: "#111" }}>{BRAND.name}</div>
            <div style={{ marginTop: 8, color: "#555" }}>
              Genuine stock, fair prices, friendly support.
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600 }}>Shop</div>
            <ul style={{ marginTop: 8, color: "#555", paddingLeft: 16 }}>
              <li>TVs & Screens</li>
              <li>Woofers & Audio</li>
              <li>Bulbs & Lighting</li>
              <li>Gas Refills</li>
            </ul>
          </div>

          <div>
            <div style={{ fontWeight: 600 }}>Contact</div>
            <ul style={{ marginTop: 8, color: "#555", paddingLeft: 16 }}>
              <li>Email: {CONTACT.email}</li>
              <li>Website: {CONTACT.domain}</li>
              <li>M-Pesa Till: 8636720</li>
              <li>Sotik Town, Bomet County</li>
            </ul>
          </div>

          <div>
            <div style={{ fontWeight: 600 }}>Payments</div>
            <ul style={{ marginTop: 8, color: "#555", paddingLeft: 16 }}>
              <li>M-Pesa Till 8636720</li>
              <li>Cash on Delivery (local)</li>
              <li>In-store M-Pesa Agent</li>
            </ul>
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            color: "#999",
            fontSize: 12,
            padding: "16px 0",
          }}
        >
          © {new Date().getFullYear()} Mastermind Electricals & Electronics. All rights reserved.
        </div>
      </footer>

      {/* CART OVERLAY (dim) */}
      {showCart && (
        <div
          onClick={() => setShowCart(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 900,
          }}
        />
      )}

      {/* COMPACT FLOATING CART (right, mid-height) */}
      <aside
        style={{
          position: "fixed",
          top: "14vh",
          right: 0,
          height: "72vh",
          width: "92vw",
          maxWidth: 410,
          background: "#fff",
          border: "1px solid #ddd",
          borderRight: "none",
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04) inset",
          zIndex: 1000,
          transform: showCart ? "translateX(0)" : "translateX(100%)",
          transition: "transform .28s ease",
          display: "flex",
          flexDirection: "column",
        }}
        aria-hidden={!showCart}
      >
        {/* header */}
        <div
          style={{
            padding: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #eee",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18 }}>Your Cart</div>
          <button
            onClick={() => setShowCart(false)}
            aria-label="Close cart"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div style={{ padding: "10px 12px", overflowY: "auto", flex: 1 }}>
          {lines.length === 0 ? (
            <div style={{ padding: "24px 0", color: "#666" }}>Your cart is empty.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {lines.map((l) => {
                const p = l.product!;
                return (
                  <div
                    key={String(p.id)}
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
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ color: "#666", fontSize: 12 }}>
                        {currency(Number(p.price) || 0)}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        onClick={() => sub(String(p.id))}
                        aria-label="Decrease"
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: 8,
                          padding: "4px 6px",
                          background: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <Minus size={16} />
                      </button>
                      <div style={{ minWidth: 20, textAlign: "center" }}>{l.qty}</div>
                      <button
                        onClick={() => add(String(p.id))}
                        aria-label="Increase"
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: 8,
                          padding: "4px 6px",
                          background: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        onClick={() => remove(String(p.id))}
                        aria-label="Remove item"
                        style={{
                          marginLeft: 6,
                          border: "1px solid #f3d",
                          borderRadius: 8,
                          padding: "4px 6px",
                          background: "#fff0f7",
                          color: "#b00",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* footer */}
        <div
          style={{
            padding: 12,
            borderTop: "1px solid #eee",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
            <span>Total</span>
            <span>{currency(Math.round(total))}</span>
          </div>

          <label style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
            M-Pesa Phone (07XXXXXXXX)
          </label>
          <input
            value={mpesaPhone}
            onChange={(e) => setMpesaPhone(e.target.value)}
            placeholder="07XXXXXXXX"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: 10,
              outline: "none",
            }}
          />

          <button
            onClick={stkPush}
            disabled={total <= 0}
            style={{
              marginTop: 6,
              width: "100%",
              background: total > 0 ? BRAND.primary : "#ddd",
              color: "#111",
              padding: "12px",
              borderRadius: 12,
              fontWeight: 800,
              border: "none",
              cursor: total > 0 ? "pointer" : "not-allowed",
            }}
          >
            Pay with M-Pesa
          </button>

          <button
            onClick={clear}
            style={{
              background: "#fff",
              color: "#333",
              border: "1px solid #ddd",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Clear cart
          </button>
        </div>
      </aside>
    </div>
  );
}
