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
      } catch {
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

        {/* Favicon: keep .ico as the primary; browsers will scale correctly */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111111" />
      </Head>

      {/* ===== Top Bar ===== */}
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brandWrap">
            <img src="/favicon.ico" alt="" className="brandIcon" />
            <div className="brand">Mastermind Electricals & Electronics</div>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="cartBtn"
            aria-label="Open cart"
          >
            🛒 Cart: {cartCount}
          </button>
        </div>
      </header>

      {/* ===== Hero + Two Cards ===== */}
      <section className="container" style={{ marginTop: 12 }}>
        <div className="hero">
          <div className="hero__bubble" aria-hidden />
          <div className="eyebrow">TRUSTED IN SOTIK</div>
          <h1 className="h1">
            Quality Electronics, Lighting & Gas — Fast Delivery
          </h1>
          <p className="lead">
            Shop TVs, woofers, LED bulbs, and 6kg/13kg gas refills. Pay via
            M-Pesa. Pickup or same-day delivery.
          </p>
        </div>

        {/* Two cards side-by-side on desktop */}
        <div className="twoCol">
          {/* Left: Visit shop (dark) */}
          <div className="shopCard">
            {/* Bubble moved to the RIGHT as requested */}
            <div className="shopCard__bubbleRight" aria-hidden />
            <div className="shopCard__title">Visit Our Shop</div>
            <div className="muted">Mastermind Electricals & Electronics, Sotik Town</div>
            <div className="muted">Open Mon–Sun • 8:00am – 9:00pm</div>

            <div className="actions">
              <a
                href="https://maps.app.goo.gl/7P2okRB5ssLFMkUT8"
                target="_blank"
                rel="noreferrer"
                className="btn btn--accent"
              >
                View on Maps
              </a>
              <a href="tel:+254715151010" className="btn btn--light">
                📞 0715151010
              </a>
              <a
                href="mailto:sales@mastermindelectricals.com"
                className="btn btn--light"
              >
                ✉️ sales@mastermindelectricals.com
              </a>
            </div>
          </div>

          {/* Right: Services (light) */}
          <div className="infoCard">
            <div className="infoCard__bubble" aria-hidden />
            <div className="eyebrow">SERVICES</div>
            <h3 className="h3">M-Pesa & Gas Refill</h3>

            {/* M-Pesa logo only (sized bigger) */}
            <div className="mpesaRow">
              <img
                src="/mpesa.png"
                alt="M-Pesa"
                className="mpesaLogo"
                height={64}
              />
            </div>

            {/* Gas refill badge back */}
            <div className="badgeRow">
              <span className="badge badge--gas">🔥 Gas Refill Available</span>
            </div>

            {/* Quick add gas buttons */}
            <div className="quickAdd">
              <div className="muted">Quick add gas refill to cart:</div>
              <div className="quickAdd__row">
                <button
                  className="btn btn--ghost"
                  onClick={() => add("gas-6kg")}
                >
                  6KG — KES 1,150
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => add("gas-13kg")}
                >
                  13KG — KES 2,550
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Search (kept below the two cards) ===== */}
      <div className="container" style={{ marginTop: 10, marginBottom: 6 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search products, e.g., "43 TV" or "bulb"'
          className="search"
        />
      </div>

      {/* ===== Product Grid ===== */}
      <section className="container" style={{ paddingBottom: 24 }}>
        <div className="productGrid">
          {filtered.map((p) => {
            const price = Number(p.price) || 0;
            const stock = Number(p.stock) || 0;
            return (
              <article key={p.id} className="card">
                <div className="card__img">
                  {p.img ? (
                    <img
                      src={p.img}
                      alt={p.name}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="sku">{p.sku || ""}</div>
                <div className="name">{p.name}</div>
                <div className="price">KES {Math.round(price).toLocaleString("en-KE")}</div>
                <div className="stock">Stock: {stock}</div>

                {stock > 0 ? (
                  <button className="btn btn--accent small" onClick={() => add(p.id)}>
                    Add to Cart
                  </button>
                ) : (
                  <div className="btn btn--disabled small">Out of stock</div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* ===== Info Section below website (Shop / Contact / Payments) ===== */}
      <section className="container" style={{ padding: "8px 0 0" }}>
        <div className="infoBlocks">
          <div>
            <div className="infoTitle">Mastermind Electricals & Electronics</div>
            <div className="muted" style={{ marginTop: 8 }}>
              Genuine stock, fair prices, friendly support.
            </div>
          </div>
          <div>
            <div className="infoTitle">Shop</div>
            <ul className="infoList">
              <li>TVs & Screens</li>
              <li>Woofers & Audio</li>
              <li>Bulbs & Lighting</li>
              <li>Gas Refills</li>
            </ul>
          </div>
          <div>
            <div className="infoTitle">Contact</div>
            <ul className="infoList">
              <li>Email: sales@mastermindelectricals.com</li>
              <li>Website: www.mastermindelectricals.com</li>
              <li>M-Pesa Till: 8636720</li>
              <li>Sotik Town, Bomet County</li>
            </ul>
          </div>
          <div>
            <div className="infoTitle">Payments</div>
            <ul className="infoList">
              <li>M-Pesa Till 8636720</li>
              <li>Cash on Delivery (local)</li>
              <li>In-store M-Pesa Agent</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="footer">
        <div className="container" style={{ padding: "10px 12px" }}>
          <div className="muted" style={{ textAlign: "center" }}>
            © {new Date().getFullYear()} Mastermind Electricals & Electronics. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ===== Cart Drawer ===== */}
      {showCart && (
        <div className="overlay" onClick={() => setShowCart(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()} aria-label="Cart">
            <div className="drawer__top">
              <div className="h4">Your Cart</div>
              <div style={{ display: "flex", gap: 8 }}>
                {cartCount > 1 && (
                  <button className="btn btn--light small" onClick={clear} aria-label="Remove all items">
                    Remove all
                  </button>
                )}
                <button className="btn btn--dark small" onClick={() => setShowCart(false)}>
                  Close
                </button>
              </div>
            </div>

            {cartLines.length === 0 ? (
              <div className="empty">Your cart is empty.</div>
            ) : (
              <div className="lines">
                {cartLines.map((l) => {
                  const price = Number(l.product.price) || 0;
                  return (
                    <div key={l.product.id} className="line">
                      <div>
                        <div className="line__name">{l.product.name}</div>
                        <div className="line__price">{currency(price)}</div>
                      </div>
                      <div className="qty">
                        <button className="qtyBtn" onClick={() => sub(l.product.id)} aria-label="Decrease">
                          −
                        </button>
                        <div className="qtyNum">{l.qty}</div>
                        <button className="qtyBtn" onClick={() => add(l.product.id)} aria-label="Increase">
                          +
                        </button>
                        <button className="qtyBtn" onClick={() => remove(l.product.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="totals">
              <div className="row">
                <span>Total</span>
                <span className="strong">{currency(cartTotal)}</span>
              </div>

              <label className="label" style={{ marginTop: 6 }}>
                M-Pesa Phone (07XXXXXXXX)
              </label>
              <input
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="input"
                inputMode="tel"
              />

              <button
                disabled={cartLines.length === 0}
                className={`btn ${cartLines.length ? "btn--pay" : "btn--disabled"}`}
                onClick={() => alert("Checkout coming soon")}
              >
                Pay with M-Pesa
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ===== Floating WhatsApp ===== */}
      <a
        className="whats"
        href="https://wa.me/254715151010?text=Hello%20Mastermind%2C%20I%27d%20like%20to%20order%20or%20enquire."
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
      >
        <img src="/whatsapp.svg" alt="" className="whats__icon" />
      </a>

      {/* ===== Styles ===== */}
      <style jsx>{`
        .container { max-width: 1200px; margin: 0 auto; padding: 0 12px; }

        .topbar { position: sticky; top: 0; z-index: 50; background: #111; color: #fff; border-bottom: 1px solid rgba(255,255,255,.08); }
        .topbar__inner { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 10px 12px; }
        .brandWrap { display:flex; align-items:center; gap:8px; min-width:0; }
        .brandIcon { width: 18px; height: 18px; border-radius: 4px; }
        .brand { font-weight: 800; letter-spacing: .3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cartBtn { background:#f4d03f; color:#111; border:none; padding:8px 12px; border-radius:12px; font-weight:800; cursor:pointer; white-space:nowrap; }

        .hero { position: relative; background:#fff; border:1px solid #eee; border-radius:16px; padding:16px; overflow:hidden; }
        .hero__bubble { position:absolute; right:-60px; top:-40px; width:240px; height:240px; background:#f4d03f; opacity:.35; border-radius:9999px; }
        .eyebrow { color:#666; font-weight:700; font-size:12px; }
        .h1 { margin:6px 0 8px; font-size:28px; line-height:1.15; letter-spacing:-.2px; }
        .h3 { margin:4px 0 8px; font-size:20px; font-weight:800; }
        .h4 { font-weight:800; font-size:18px; }
        .lead { color:#444; font-size:15px; }
        .muted { color:#888; }

        .twoCol { display:grid; grid-template-columns:1fr; gap:12px; margin-top:12px; }
        @media (min-width: 900px) {
          .twoCol { grid-template-columns: 1fr 1fr; }
        }

        .shopCard { position:relative; background:#111; color:#fff; border-radius:16px; padding:16px; overflow:hidden; }
        .shopCard__bubbleRight { position:absolute; right:-50px; bottom:-70px; width:180px; height:180px; background:#f4d03f; opacity:.25; border-radius:9999px; }
        .shopCard__title { font-weight:800; margin-bottom:6px; }

        .infoCard { position:relative; background:#fff; border:1px solid #eee; border-radius:16px; padding:16px; overflow:hidden; }
        .infoCard__bubble { position:absolute; right:-40px; bottom:-60px; width:160px; height:160px; background:#f4d03f; opacity:.2; border-radius:9999px; }

        .actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; }
        .btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; border-radius:12px; font-weight:800; text-decoration:none; cursor:pointer; }
        .btn--accent { background:#f4d03f; color:#111; padding:10px 14px; border:none; }
        .btn--light { background:#fff; color:#111; padding:10px 14px; border:1px solid #eee; }
        .btn--dark { background:#111; color:#fff; padding:10px 16px; border:none; }
        .btn--ghost { background:#fff; color:#111; border:1px solid #ddd; padding:8px 12px; border-radius:10px; }
        .btn--disabled { background:#eee; color:#888; }
        .btn--pay { background:#16a34a; color:#fff; border:none; padding:12px 16px; border-radius:12px; }
        .small { padding:8px 14px; }

        .badgeRow { display:flex; gap:10px; flex-wrap:wrap; margin:8px 0 12px; }
        .badge { padding:6px 10px; border-radius:999px; font-weight:800; font-size:13px; }
        .badge--gas { background:#eef7ff; border:1px solid #d5eaff; color:#0a2533; }

        .mpesaRow { display:flex; align-items:center; gap:10px; margin:6px 0 8px; }
        .mpesaLogo { height: 64px; width:auto; display:block; }

        .quickAdd { display:grid; gap:8px; }
        .quickAdd__row { display:flex; gap:10px; flex-wrap:wrap; }

        .search { width:100%; height:44px; padding:0 14px; border-radius:12px; border:1px solid #ddd; background:#fff; font-size:15px; outline:none; }

        .productGrid { display:grid; gap:16px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
        .card { background:#fff; border:1px solid #eee; border-radius:16px; padding:12px; display:grid; gap:10px; box-shadow:0 1px 0 rgba(0,0,0,.03); }
        .card__img { height:160px; background:#f3f3f3; border-radius:14px; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .sku { color:#777; font-size:12px; }
        .name { font-weight:800; }
        .price { color:#111; font-weight:800; }
        .stock { color:#666; font-size:12px; }

        .infoBlocks { border-top:1px solid #eee; padding-top:16px; display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px; font-size:14px; }
        .infoTitle { font-weight:800; color:#111; }
        .infoList { margin-top:8px; color:#555; padding-left:16px; }

        .footer { border-top:1px solid #eaeaea; padding:12px 0 18px; background:#fafafa; }

        /* Drawer */
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:60; }
        .drawer { position:fixed; right:10px; top:12vh; width:min(440px, 92vw); max-height:76vh; overflow:auto; background:#fff; border-radius:16px; border:1px solid #eee; box-shadow:0 20px 40px rgba(0,0,0,.25); padding:12px; }
        .drawer__top { display:flex; justify-content:space-between; align-items:center; }
        .empty { padding:22px 0; color:#666; }
        .lines { display:grid; gap:10px; margin-top:10px; }
        .line { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; border-bottom:1px solid #eee; padding-bottom:8px; }
        .line__name { font-weight:700; }
        .line__price { color:#666; font-size:12px; }
        .qty { display:flex; align-items:center; gap:8px; }
        .qtyBtn { border:1px solid #ddd; background:#fff; padding:6px 10px; border-radius:8px; cursor:pointer; }
        .qtyNum { min-width:20px; text-align:center; }

        .totals { margin-top:12px; display:grid; gap:8px; }
        .row { display:flex; justify-content:space-between; }
        .strong { font-weight:800; }
        .label { font-size:12px; color:#555; margin-top:4px; }
        .input { width:100%; height:42px; border-radius:10px; border:1px solid #ddd; padding:0 12px; outline:none; background:#fff; }
        textarea.input { height:auto; padding:10px 12px; }

        /* Floating WhatsApp */
        .whats { position:fixed; right:14px; bottom:14px; width:56px; height:56px; border-radius:50%; background:#25D366; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(0,0,0,.25); z-index:70; }
        .whats__icon { width:28px; height:28px; filter: invert(1); }
      `}</style>
    </div>
  );
}
