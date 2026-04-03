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

// ---- LocalStorage keys ----
const CART_KEY = "mm_cart";
const ORDERS_KEY = "mm_orders";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [cartMap, setCartMap] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

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
      const saved = localStorage.getItem(CART_KEY);
      if (saved) setCartMap(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cartMap));
    } catch {}
  }, [cartMap]);

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

  // ---- Paystack handler ----
  const handlePaystack = () => {
    const PaystackPop =
      typeof window !== "undefined"
        ? (window as any)?.PaystackPop
        : undefined;

    if (!PaystackPop) {
      alert("Couldn't start Paystack. Please refresh and try again.");
      return;
    }
    if (!customerName || !customerPhone || !customerEmail) {
      alert("Please enter your name, phone and email to continue.");
      return;
    }
    if (cartLines.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    const amountKES = Math.round(cartTotal);
    const itemsPayload = cartLines.map((l) => ({
      id: l.product.id,
      name: l.product.name,
      price: Number(l.product.price) || 0,
      qty: l.qty,
      img: l.product.img || "",
    }));

    const handler = PaystackPop.setup({
      key: "pk_live_10bc141ee6ae2ae48edcd102c06540ffe1cb3ae6", // LIVE public key
      email: customerEmail,
      amount: amountKES * 100, // amount in kobo (KES × 100)
      currency: "KES",
      metadata: {
        custom_fields: [
          { display_name: "Customer Name", variable_name: "customer_name", value: customerName },
          { display_name: "Phone", variable_name: "phone", value: customerPhone },
          { display_name: "Cart Items", variable_name: "cart_items", value: JSON.stringify(itemsPayload) },
        ],
      },
      callback: function (response: any) {
        // Save order (PENDING) with reference so /orders page can verify & update it
        const now = new Date();
        const newOrder = {
          id: `T${now.getTime()}`, // simple unique id
          reference: response.reference as string,
          createdAt: now.toISOString(),
          total: amountKES,
          status: "PENDING",
          paymentStatus: "PENDING",
          items: itemsPayload,
        };

        try {
          const raw = localStorage.getItem(ORDERS_KEY);
          const arr = raw ? JSON.parse(raw) : [];
          const next = Array.isArray(arr) ? [...arr, newOrder] : [newOrder];
          localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
        } catch {}

        clear();
        setShowCart(false);
        // Send customer to orders page (it will auto-verify)
        window.location.href = `/orders?ref=${encodeURIComponent(
          response.reference
        )}`;
      },
      onClose: function () {
        alert("Transaction was not completed, window closed.");
      },
    });

    handler.openIframe();
  };

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>Mastermind Electricals & Electronics</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="icon" href="/favicon.ico" />
        {/* Paystack script */}
        <script src="https://js.paystack.co/v1/inline.js" async></script>
      </Head>

      {/* ===== Top Bar ===== */}
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <img src="/favicon.ico" alt="" className="brandIcon" aria-hidden />
            Mastermind Electricals & Electronics
          </div>
          <div className="topbar__actions">
            <a href="/orders" className="pillBtn">
              📑 My Orders
            </a>
            <button
              onClick={() => setShowCart(true)}
              className="pillBtn"
              aria-label="Open cart"
            >
              🛒 Cart: {cartCount}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="container" style={{ marginTop: 12 }}>
        <div className="hero">
          <div className="hero__bubble" aria-hidden />
          <div className="eyebrow">TRUSTED IN SOTIK</div>
          <h1 className="h1">
            Quality Electronics, Lighting & Gas — Fast Delivery
          </h1>
          <p className="lead">
            Shop TVs, woofers, LED bulbs, and 6kg/13kg gas refills. Pay with
            Paystack. Pickup or same-day delivery.
          </p>
        </div>

        {/* ===== Two cards side-by-side on desktop ===== */}
        <div className="twoCol">
          {/* Left: Visit shop (dark, centered) */}
          <div className="shopCard">
            <div className="shopCard__bubble" aria-hidden />
            <div className="shopCard__title">Visit Our Shop</div>
            <div className="muted center">
              Mastermind Electricals & Electronics, Sotik Town
            </div>
            <div className="muted center">Open Mon–Sun • 8:00am – 9:00pm</div>

            <div className="actions actions--center">
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

          {/* Right: SERVICES with M-Pesa logo image + Gas mini-cards */}
          <div className="infoCard">
            <div className="infoCard__bubble" aria-hidden />
            <div className="eyebrow">SERVICES</div>

            <div className="servicesHeader">
              <img
                src="/mpesa.png"
                alt="M-Pesa"
                className="mpesaLogo"
                loading="lazy"
              />
              <span className="amp">&nbsp;&amp;&nbsp;</span>
              <span className="servicesText">Gas Refill</span>
            </div>

            {/* Gas semi-cards, centered */}
            <div className="cylinders">
              <div className="cylCard">
                <img
                  src="/gas-6kg.png"
                  alt="6KG Gas"
                  className="cylImg cylImg--tight"
                  loading="lazy"
                />
                <button className="btn btn--ghost" onClick={() => add("gas-6kg")}>
                  6KG — KES 1,100
                </button>
              </div>
              <div className="cylCard">
                <img
                  src="/gas-13kg.png"
                  alt="13KG Gas"
                  className="cylImg"
                  loading="lazy"
                />
                <button className="btn btn--ghost" onClick={() => add("gas-13kg")}>
                  13KG — KES 2,400
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Search ===== */}
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
                <div className="sku">{p.sku || ""}</div>
                <div className="name">{p.name}</div>
                <div className="price">
                  KES {Math.round(price).toLocaleString("en-KE")}
                </div>
                <div className="stock">Stock: {stock}</div>

                {stock > 0 ? (
                  <button
                    className="btn btn--accent small"
                    onClick={() => add(p.id)}
                  >
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

      {/* ===== Footer ===== */}
      <footer className="footer">
        <div className="container footerGrid">
          <div>
            <div className="footTitle">Mastermind Electricals & Electronics</div>
            <div className="footText">
              Genuine stock • Fair prices • Friendly support.
            </div>
          </div>
          <div>
            <div className="footTitle">Contact</div>
            <ul className="footList">
              <li>Email: sales@mastermindelectricals.com</li>
              <li>Website: www.mastermindelectricals.com</li>
              <li>Phone: 0715 151 010</li>
              <li>Sotik Town, Bomet County</li>
            </ul>
          </div>
          <div>
            <div className="footTitle">Payments</div>
            <ul className="footList">
              <li>Paystack</li>
              <li>M-Pesa Till 8636720</li>
              <li>Cash on Delivery (local)</li>
            </ul>
          </div>
        </div>
        <div className="container" style={{ padding: "10px 12px" }}>
          <div className="muted" style={{ textAlign: "center" }}>
            © {new Date().getFullYear()} Mastermind Electricals & Electronics. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ===== Cart Drawer (right, self-scroll) ===== */}
      {showCart && (
        <div className="overlay" onClick={() => setShowCart(false)}>
          <aside
            className="drawer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Cart"
          >
            {/* Header row */}
            <div className="drawer__top">
              <div className="h4">Your Cart</div>
              <div style={{ display: "flex", gap: 8 }}>
                {cartCount > 1 && (
                  <button
                    className="btn btn--removeAll small"
                    onClick={clear}
                    aria-label="Remove all items"
                  >
                    Remove all
                  </button>
                )}
                <button
                  className="btn btn--dark small"
                  onClick={() => setShowCart(false)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="drawer__scroll">
              {/* Lines */}
              {cartLines.length === 0 ? (
                <div className="empty">Your cart is empty.</div>
              ) : (
                <div className="lines">
                  {cartLines.map((l) => {
                    const price = Number(l.product.price) || 0;
                    return (
                      <div key={l.product.id} className="line">
                        <div className="lineLeft">
                          <div className="thumbWrap">
                            {l.product.img ? (
                              <img
                                src={l.product.img}
                                alt={l.product.name}
                                className="thumb"
                                loading="lazy"
                              />
                            ) : (
                              <div className="thumb thumb--empty" />
                            )}
                          </div>
                          <div>
                            <div className="line__name">{l.product.name}</div>
                            <div className="line__price muted">
                              {currency(price)} × {l.qty}
                            </div>
                          </div>
                        </div>

                        <div className="qty">
                          <button
                            className="qtyBtn"
                            onClick={() => sub(l.product.id)}
                            aria-label="Decrease"
                          >
                            −
                          </button>
                          <button
                            className="qtyBtn"
                            onClick={() => add(l.product.id)}
                            aria-label="Increase"
                          >
                            +
                          </button>
                          <button
                            className="qtyBtn qtyBtn--danger"
                            onClick={() => remove(l.product.id)}
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Totals & Pay */}
              <div className="totals">
                <div className="row">
                  <span>Total</span>
                  <span className="strong">{currency(cartTotal)}</span>
                </div>

                {/* Customer details */}
                <input
                  type="text"
                  placeholder="Your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="input"
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="input"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="input"
                />

                <button
                  disabled={
                    cartLines.length === 0 ||
                    !customerName ||
                    !customerPhone ||
                    !customerEmail
                  }
                  className={`btn ${
                    cartLines.length &&
                    customerName &&
                    customerPhone &&
                    customerEmail
                      ? "btn--paystack"
                      : "btn--disabled"
                  }`}
                  onClick={handlePaystack}
                >
                  Pay with M-Pesa (Paystack)
                </button>

                <div className="note">
                  You’ll be redirected to complete payment securely via
                  Paystack.
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ===== Floating WhatsApp ===== */}
      <a
        href="https://wa.me/254715151010"
        target="_blank"
        rel="noreferrer"
        className="waFab"
        aria-label="Chat on WhatsApp"
      >
        <img src="/whatsapp.svg" alt="WhatsApp" className="waIcon" />
      </a>

      {/* ===== Styles ===== */}
      <style jsx>{`
        .container { max-width: 1200px; margin: 0 auto; padding: 0 12px; }

        /* Topbar full-width black with pill buttons */
        .topbar { position: sticky; top: 0; z-index: 50; background: #111; color: #fff; border-bottom: 1px solid rgba(255,255,255,.08); width: 100%; }
        .topbar__inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 10px 16px; }
        .brand { font-weight: 800; letter-spacing: .3px; display:flex; align-items:center; gap:8px; }
        .brandIcon { width: 22px; height: 22px; border-radius: 4px; }
        .topbar__actions { display:flex; gap:10px; }
        .pillBtn { background:#f4d03f; color:#111; border:none; padding:8px 12px; border-radius:12px; font-weight:800; cursor:pointer; white-space:nowrap; text-decoration:none; display:inline-flex; align-items:center; }

        .hero { position: relative; background:#fff; border:1px solid #eee; border-radius:16px; padding:16px; overflow:hidden; }
        .hero__bubble { position:absolute; right:-60px; top:-40px; width:240px; height:240px; background:#f4d03f; opacity:.28; border-radius:9999px; z-index:0; }
        .eyebrow { color:#666; font-weight:700; font-size:12px; position:relative; z-index:1; }
        .h1 { margin:6px 0 8px; font-size:28px; line-height:1.15; letter-spacing:-.2px; position:relative; z-index:1; }
        .h3 { margin:4px 0 8px; font-size:20px; font-weight:800; }
        .h4 { font-weight:800; font-size:18px; }
        .lead { color:#444; font-size:15px; position:relative; z-index:1; }
        .muted { color:#888; }
        .center { text-align:center; }

        .twoCol { display:grid; grid-template-columns:1fr; gap:12px; margin-top:12px; }
        @media (min-width: 900px) { .twoCol { grid-template-columns: 1fr 1fr; } }

        .shopCard { position:relative; background:#111; color:#fff; border-radius:16px; padding:16px; overflow:hidden; text-align:center; }
        .shopCard__bubble { position:absolute; right:-50px; bottom:-70px; width:180px; height:180px; background:#f4d03f; opacity:.25; border-radius:9999px; }
        .shopCard__title { font-weight:800; margin-bottom:6px; }
        .actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; }
        .actions--center { justify-content:center; }

        .infoCard { position:relative; background:#fff; border:1px solid #eee; border-radius:16px; padding:16px; overflow:hidden; }
        .infoCard__bubble { position:absolute; right:-40px; bottom:-60px; width:160px; height:160px; background:#f4d03f; opacity:.25; border-radius:9999px; }

        .servicesHeader { display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-weight:800; font-size:20px; margin:4px 0 12px; justify-content:center; }
        .mpesaLogo { height:60px; width:auto; display:block; }
        .amp { font-size:20px; color:#222; line-height:1; }
        .servicesText { font-size:20px; font-weight:800; color:#111; }

        .cylinders { display:flex; justify-content:center; gap:14px; flex-wrap:wrap; }
        .cylCard { background:#fff; border:1px solid #eee; border-radius:12px; padding:12px; width:min(220px, 46%); display:flex; flex-direction:column; align-items:center; gap:8px; }
        .cylImg { height:74px; width:auto; object-fit:contain; }
        .cylImg--tight { margin-bottom:-8px; }

        .btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; border-radius:12px; font-weight:800; text-decoration:none; cursor:pointer; }
        .btn--accent { background:#f4d03f; color:#111; padding:10px 14px; border:none; }
        .btn--light { background:#fff; color:#111; padding:10px 14px; border:1px solid #eee; }
        .btn--dark { background:#111; color:#fff; padding:10px 16px; border:none; }
        .btn--ghost { background:#fff; color:#111; border:1px solid #ddd; padding:8px 12px; border-radius:10px; }
        .btn--disabled { background:#eee; color:#888; pointer-events:none; }
        .btn--paystack { background:#34c38f; color:#fff; border:none; padding:12px 16px; border-radius:12px; font-weight:800; } /* lighter green */
        .btn--removeAll { background:#fde8e8; color:#8a1f1f; border:1px solid #f6caca; }
        .small { padding:8px 14px; }

        .search { width:100%; height:44px; padding:0 14px; border-radius:12px; border:1px solid #ddd; background:#fff; font-size:15px; outline:none; }

        .productGrid { display:grid; gap:16px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
        .card { background:#fff; border:1px solid #eee; border-radius:16px; padding:12px; display:grid; gap:10px; box-shadow:0 1px 0 rgba(0,0,0,.03); }
        .card__img { height:160px; background:#f3f3f3; border-radius:14px; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .sku { color:#777; font-size:12px; }
        .name { font-weight:800; }
        .price { color:#111; font-weight:800; }
        .stock { color:#666; font-size:12px; }

        .footer { border-top:1px solid #eaeaea; padding:18px 0 12px; background:#fafafa; }
        .footerGrid { display:grid; grid-template-columns:1fr; gap:16px; padding:14px 12px; }
        @media (min-width: 900px) {
          .footerGrid { grid-template-columns:1fr 1fr 1fr; }
        }
        .footTitle { font-weight:800; margin-bottom:6px; }
        .footText, .footList { color:#666; }
        .footList { margin:0; padding-left:18px; }

        /* Overlay & Drawer (RIGHT aligned, self-scroll content) */
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:60; display:flex; justify-content:flex-end; align-items:flex-start; padding:12px; }
        .drawer { width:min(520px, 96vw); background:#fff; border:1px solid #eee; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.25); display:flex; flex-direction:column; max-height:calc(100vh - 24px); }
        .drawer__top { display:flex; align-items:center; justify-content:space-between; padding:12px; gap:8px; border-bottom:1px solid #f0f0f0; position:sticky; top:0; background:#fff; border-top-left-radius:16px; border-top-right-radius:16px; }
        .drawer__scroll { overflow:auto; padding:0 12px 12px; }

        .empty { padding:12px; color:#666; }
        .lines { display:grid; gap:12px; padding-top:8px; }
        .line { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 0; border-bottom:1px dashed #eee; }
        .lineLeft { display:flex; gap:10px; align-items:center; min-width:0; }
        .thumbWrap { width:28px; height:28px; border-radius:8px; background:#f4f4f4; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .thumb { width:100%; height:100%; object-fit:cover; display:block; }
        .thumb--empty { width:28px; height:28px; border-radius:8px; background:#ececec; }
        .line__name { font-weight:800; }
        .line__price { font-size:13px; }

        .qty { display:flex; gap:8px; }
        .qtyBtn { width:40px; height:36px; border-radius:10px; border:1px solid #eee; background:#f7f7f7; font-weight:900; cursor:pointer; }
        .qtyBtn--danger { background:#fee; color:#b12424; border-color:#f6caca; }

        .totals { padding:12px 0 6px; display:grid; gap:8px; }
        .row { display:flex; justify-content:space-between; font-weight:800; }
        .input { width:100%; height:44px; border-radius:12px; border:1px solid #ddd; background:#f7f9ff; padding:0 12px; outline:none; }
        .note { color:#7a7a7a; font-size:12px; line-height:1.3; }

        /* WhatsApp FAB */
        .waFab { position:fixed; right:16px; bottom:16px; width:56px; height:56px; background:#25d366; border-radius:999px; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 20px rgba(0,0,0,.25); z-index:40; }
        .waIcon { width:28px; height:28px; display:block; }
      `}</style>
    </div>
  );
}
