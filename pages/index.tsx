// pages/index.tsx
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

type Product = {
  id: string;
  name: string;
  sku?: string;
  price: number | string;
  stock?: number | string;
  img?: string;
};

type CartLine = { product: Product; qty: number };

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [cartMap, setCartMap] = useState<Record<string, number>>({});

  // ---- Load products.json ----
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/products.json", { cache: "no-store" });
        const data: Product[] = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load products.json", e);
        setProducts([]);
      }
    })();
  }, []);

  // ---- Cart persistence ----
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mm_cart");
      if (saved) setCartMap(JSON.parse(saved));
      const phone = localStorage.getItem("mm_mpesa_phone");
      if (phone) setMpesaPhone(phone);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("mm_cart", JSON.stringify(cartMap));
    } catch {}
  }, [cartMap]);
  useEffect(() => {
    try {
      localStorage.setItem("mm_mpesa_phone", mpesaPhone);
    } catch {}
  }, [mpesaPhone]);

  // ---- Cart helpers ----
  const add = (id: string) =>
    setCartMap((m) => ({ ...m, [id]: (m[id] ?? 0) + 1 }));
  const sub = (id: string) =>
    setCartMap((m) => {
      const q = (m[id] ?? 0) - 1;
      const next = { ...m };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });
  const remove = (id: string) =>
    setCartMap((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    });
  const clear = () => setCartMap({});

  const cartLines: CartLine[] = useMemo(() => {
    const byId: Record<string, Product> = {};
    products.forEach((p) => (byId[p.id] = p));
    return Object.entries(cartMap)
      .map(([id, qty]) => (byId[id] ? { product: byId[id], qty } : null))
      .filter(Boolean) as CartLine[];
  }, [cartMap, products]);

  const cartCount = useMemo(
    () => Object.values(cartMap).reduce((a, b) => a + b, 0),
    [cartMap]
  );
  const cartTotal = useMemo(
    () =>
      cartLines.reduce(
        (sum, l) => sum + (Number(l.product.price) || 0) * l.qty,
        0
      ),
    [cartLines]
  );

  // ---- Search filter ----
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const hay =
        `${p.name} ${p.sku ?? ""} ${p.id}`.toLowerCase().replace(/\s+/g, " ");
      return hay.includes(q);
    });
  }, [products, query]);

  const currency = (n: number) =>
    `KES ${Math.round(n).toLocaleString("en-KE")}`;

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>Mastermind Electricals & Electronics</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        {/* Favicon you uploaded to /public */}
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* ===== Top Bar (no overlap on mobile) ===== */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#111",
          color: "#fff",
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 8,
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>
            Mastermind Electricals & Electronics
          </div>

          <button
            onClick={() => setShowCart(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#f4d03f",
              color: "#111",
              border: "none",
              padding: "8px 12px",
              borderRadius: 12,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            aria-label="Open cart"
          >
            🛒 Cart: {cartCount}
          </button>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section
        style={{
          maxWidth: 1200,
          margin: "12px auto 8px",
          padding: "0 12px",
        }}
      >
        <div
          style={{
            position: "relative",
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 16,
            padding: 16,
            overflow: "hidden",
          }}
        >
          {/* decorative circle tucked behind text */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: -60,
              top: -40,
              width: 240,
              height: 240,
              background: "#f4d03f",
              opacity: 0.35,
              borderRadius: "9999px",
              filter: "blur(0.5px)",
            }}
          />
          <div style={{ color: "#666", fontWeight: 700, fontSize: 12 }}>
            TRUSTED IN SOTIK
          </div>
          <h1
            style={{
              margin: "6px 0 8px",
              fontSize: 28,
              lineHeight: 1.15,
              letterSpacing: -0.2,
            }}
          >
            Quality Electronics, Lighting & Gas — Fast Delivery
          </h1>
          <p style={{ color: "#444", fontSize: 15 }}>
            Shop TVs, woofers, LED bulbs, and 6kg/13kg gas refills. Pay via
            M-Pesa. Pickup or same-day delivery.
          </p>

          {/* badges row */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 10,
            }}
          >
            <span
              style={{
                background: "#ffe9a3",
                color: "#1a1a1a",
                border: "1px solid #f3d97b",
                padding: "6px 10px",
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              💳 M-Pesa Available
            </span>
            <span
              style={{
                background: "#eef7ff",
                color: "#0a2533",
                border: "1px solid #d5eaff",
                padding: "6px 10px",
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              🔥 Gas Refill Available
            </span>
          </div>
        </div>

        {/* Visit our shop card */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 12,
            marginTop: 12,
          }}
        >
          <div
            style={{
              background: "#111",
              color: "#fff",
              borderRadius: 16,
              padding: 16,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* subtle yellow circle */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: -50,
                bottom: -70,
                width: 180,
                height: 180,
                background: "#f4d03f",
                opacity: 0.25,
                borderRadius: "9999px",
              }}
            />
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Visit Our Shop</div>
            <div style={{ opacity: 0.9 }}>
              Mastermind Electricals & Electronics, Sotik Town
            </div>
            <div style={{ marginTop: 4, opacity: 0.9 }}>
              Open Mon–Sun • 8:00am – 9:00pm
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 12,
              }}
            >
              <a
                href="https://maps.app.goo.gl/7P2okRB5ssLFMkUT8"
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#f4d03f",
                  color: "#111",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                View on Maps
              </a>
              <a
                href="tel:+254715151010"
                style={{
                  background: "#fff",
                  color: "#111",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                📞 0715151010
              </a>
              <a
                href="mailto:sales@mastermindelectricals.com"
                style={{
                  background: "#fff",
                  color: "#111",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                ✉️ sales@mastermindelectricals.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Search (now below hero) ===== */}
      <div style={{ maxWidth: 1200, margin: "10px auto 6px", padding: "0 12px" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search products, e.g., "43 TV" or "bulb"'
          style={{
            width: "100%",
            height: 44,
            padding: "0 14px",
            borderRadius: 12,
            border: "1px solid #ddd",
            outline: "none",
            fontSize: 15,
            background: "#fff",
            boxShadow: "0 1px 0 rgba(0,0,0,.02)",
          }}
        />
      </div>

      {/* ===== Product Grid ===== */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 12px 24px" }}>
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
            const stock = Number(p.stock) || 0;
            return (
              <article
                key={p.id}
                style={{
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 16,
                  padding: 12,
                  display: "grid",
                  gap: 10,
                  boxShadow: "0 1px 0 rgba(0,0,0,.03)",
                }}
              >
                {/* Image (clean placeholder, no text) */}
                <div
                  style={{
                    height: 160,
                    background: "#f3f3f3",
                    borderRadius: 14,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {p.img ? (
                    <img
                      src={p.img}
                      alt={p.name}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                      loading="lazy"
                    />
                  ) : null}
                </div>

                {/* Text */}
                <div style={{ color: "#777", fontSize: 12 }}>{p.sku || ""}</div>
                <div style={{ fontWeight: 800 }}>{p.name}</div>
                <div style={{ color: "#111", fontWeight: 800 }}>
                  {currency(price)}
                </div>
                <div style={{ color: "#666", fontSize: 12 }}>
                  Stock: {stock}
                </div>

                {/* CTA */}
                {stock > 0 ? (
                  <button
                    onClick={() => add(p.id)}
                    style={{
                      justifySelf: "end",
                      border: "none",
                      background: "#f4d03f",
                      color: "#111",
                      borderRadius: 12,
                      padding: "8px 14px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                    aria-label={`Add ${p.name}`}
                  >
                    Add
                  </button>
                ) : (
                  <div
                    style={{
                      justifySelf: "end",
                      padding: "8px 14px",
                      borderRadius: 12,
                      background: "#eee",
                      color: "#888",
                      fontWeight: 800,
                    }}
                  >
                    Out of stock
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* ===== Cart Drawer ===== */}
      {showCart && (
        <div
          onClick={() => setShowCart(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            zIndex: 60,
          }}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              right: 10,
              top: "12vh",
              width: "min(440px, 92vw)",
              maxHeight: "76vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #eee",
              boxShadow: "0 20px 40px rgba(0,0,0,.25)",
              padding: 12,
            }}
            aria-label="Cart"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 18 }}>Your Cart</div>
              <div style={{ display: "flex", gap: 8 }}>
                {cartCount > 1 && (
                  <button
                    onClick={clear}
                    style={{
                      background: "#f1f1f1",
                      border: "1px solid #e5e5e5",
                      borderRadius: 10,
                      padding: "6px 10px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    aria-label="Remove all items"
                  >
                    Remove all
                  </button>
                )}
                <button
                  onClick={() => setShowCart(false)}
                  style={{
                    background: "#111",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "6px 10px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  aria-label="Close cart"
                >
                  Close
                </button>
              </div>
            </div>

            {cartLines.length === 0 ? (
              <div style={{ padding: "22px 0", color: "#666" }}>
                Your cart is empty.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {cartLines.map((l) => {
                  const price = Number(l.product.price) || 0;
                  return (
                    <div
                      key={l.product.id}
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
                          {currency(price)}
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
                          onClick={() => sub(l.product.id)}
                          aria-label="Decrease"
                          style={{
                            border: "1px solid #ddd",
                            background: "#fff",
                            padding: "6px 10px",
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                        >
                          −
                        </button>
                        <div style={{ minWidth: 20, textAlign: "center" }}>
                          {l.qty}
                        </div>
                        <button
                          onClick={() => add(l.product.id)}
                          aria-label="Increase"
                          style={{
                            border: "1px solid #ddd",
                            background: "#fff",
                            padding: "6px 10px",
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                        >
                          +
                        </button>
                        <button
                          onClick={() => remove(l.product.id)}
                          aria-label="Remove line"
                          style={{
                            border: "1px solid #ddd",
                            background: "#fff",
                            padding: "6px 10px",
                            borderRadius: 8,
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

            {/* Totals + M-Pesa phone */}
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gap: 8,
                alignItems: "center",
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
                <span>{currency(cartTotal)}</span>
              </div>

              <label
                htmlFor="mpesa"
                style={{ fontSize: 12, color: "#555", marginTop: 4 }}
              >
                M-Pesa Phone (07XXXXXXXX)
              </label>
              <input
                id="mpesa"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                style={{
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  padding: "0 12px",
                  outline: "none",
                }}
                inputMode="tel"
              />

              <button
                disabled={cartLines.length === 0}
                style={{
                  marginTop: 6,
                  height: 44,
                  borderRadius: 12,
                  border: "none",
                  background: cartLines.length ? "#16a34a" : "#9ca3af",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: cartLines.length ? "pointer" : "not-allowed",
                }}
                onClick={() => alert("Checkout coming soon")}
              >
                Pay with M-Pesa
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
