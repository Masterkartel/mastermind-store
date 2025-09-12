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
  const [cartMap, setCartMap] = useState<Record<string, number>>({});

  // NEW: customer fields
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");

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
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("mm_cart", JSON.stringify(cartMap));
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

  // --- Helpers for validation/format ---
  const emailOk = /\S+@\S+\.\S+/.test(custEmail);
  const phoneOk = custPhone.replace(/\D/g, "").length >= 9; // light check
  const nameOk = custName.trim().length >= 2;

  const formatPhoneKE = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("254")) return `+${digits}`;
    if (digits.startsWith("0") && digits.length >= 10)
      return `+254${digits.slice(1)}`;
    if (digits.startsWith("7") || digits.startsWith("1"))
      return `+254${digits}`;
    return raw; // fallback untouched
  };

  // ---- Paystack handler ----
  const handlePaystack = () => {
    const PaystackPop =
      typeof window !== "undefined" ? (window as any)?.PaystackPop : undefined;

    if (!PaystackPop) {
      alert("Couldn't start Paystack. Please refresh and try again.");
      return;
    }
    if (!emailOk || !phoneOk || !nameOk) {
      alert("Please fill Name, Phone and a valid Email to continue.");
      return;
    }

    const handler = PaystackPop.setup({
      key: "pk_live_10bc141ee6ae2ae48edcd102c06540ffe1cb3ae6",
      email: custEmail,
      amount: Math.round(cartTotal) * 100,
      currency: "KES",
      metadata: {
        customer_name: custName,
        customer_phone: formatPhoneKE(custPhone),
        // Optional: include cart snapshot
        cart: cartLines.map((l) => ({
          id: l.product.id,
          name: l.product.name,
          qty: l.qty,
          unit_price: Number(l.product.price) || 0,
        })),
      },
      callback: function (response: any) {
        alert("Payment complete! Reference: " + response.reference);
        clear();
        setShowCart(false);
      },
      onClose: function () {
        // silent close
      },
    });

    handler.openIframe();
  };

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>Mastermind Electricals & Electronics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
        <script src="https://js.paystack.co/v1/inline.js" async></script>
      </Head>

      {/* ===== Top Bar ===== */}
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <img src="/favicon.ico" alt="" className="brandIcon" aria-hidden />
            Mastermind Electricals & Electronics
          </div>
          <button onClick={() => setShowCart(true)} className="cartBtn" aria-label="Open cart">
            🛒 Cart: {cartCount}
          </button>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="container" style={{ marginTop: 12 }}>
        <div className="hero">
          <div className="hero__bubble" aria-hidden />
          <div className="eyebrow">TRUSTED IN SOTIK</div>
          <h1 className="h1">Quality Electronics, Lighting & Gas — Fast Delivery</h1>
          <p className="lead">
            Shop TVs, woofers, LED bulbs, and 6kg/13kg gas refills. Pay with Paystack. Pickup or same-day delivery.
          </p>
        </div>

        {/* ===== Two cards side-by-side on desktop ===== */}
        <div className="twoCol">
          {/* Left: Visit shop */}
          <div className="shopCard">
            <div className="shopCard__bubble" aria-hidden />
            <div className="shopCard__title">Visit Our Shop</div>
            <div className="muted center">Mastermind Electricals & Electronics, Sotik Town</div>
            <div className="muted center">Open Mon–Sun • 8:00am – 9:00pm</div>

            <div className="actions actions--center">
              <a href="https://maps.app.goo.gl/7P2okRB5ssLFMkUT8" target="_blank" rel="noreferrer" className="btn btn--accent">
                View on Maps
              </a>
              <a href="tel:+254715151010" className="btn btn--light">📞 0715151010</a>
              <a href="mailto:sales@mastermindelectricals.com" className="btn btn--light">✉️ sales@mastermindelectricals.com</a>
            </div>
          </div>

          {/* Right: SERVICES */}
          <div className="infoCard">
            <div className="infoCard__bubble" aria-hidden />
            <div className="eyebrow">SERVICES</div>

            <div className="servicesHeader">
              <img src="/mpesa.png" alt="M-Pesa" className="mpesaLogo" loading="lazy" />
              <span className="amp">&nbsp;&amp;&nbsp;</span>
              <span className="servicesText">Gas Refill</span>
            </div>

            <div className="cylinders">
              <div className="cylCard">
                <img src="/gas-6kg.png" alt="6KG Gas" className="cylImg cylImg--tight" loading="lazy" />
                <button className="btn btn--ghost" onClick={() => add("gas-6kg")}>
                  6KG — KES 1,110
                </button>
              </div>
              <div className="cylCard">
                <img src="/gas-13kg.png" alt="13KG Gas" className="cylImg" loading="lazy" />
                <button className="btn btn--ghost" onClick={() => add("gas-13kg")}>
                  13KG — KES 2,355
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

      {/* ===== Footer ===== */}
      <footer className="footer">
        <div className="container footerGrid">
          <div>
            <div className="footTitle">Mastermind Electricals & Electronics</div>
            <div className="footText">Genuine stock • Fair prices • Friendly support.</div>
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

      {/* ===== Cart Drawer ===== */}
      {showCart && (
        <div className="overlay" onClick={() => setShowCart(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()} aria-label="Cart">
            <div className="drawer__top">
              <div className="h4">Your Cart</div>
              <div style={{ display: "flex", gap: 8 }}>
                {cartCount > 1 && (
                  <button className="chip chip--light" onClick={clear} aria-label="Remove all items">
                    Remove all
                  </button>
                )}
                <button className="chip chip--dark" onClick={() => setShowCart(false)}>
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
                  const id = l.product.id;
                  return (
                    <div key={id} className="line">
                      <div className="line__info">
                        <div className="line__name">{l.product.name}</div>
                        <div className="line__sub">
                          KES {Math.round(price).toLocaleString("en-KE")} × {l.qty}
                        </div>
                      </div>

                      <div className="line__actions">
                        <button className="pill" onClick={() => sub(id)} aria-label="Decrease">−</button>
                        <button className="pill" onClick={() => add(id)} aria-label="Increase">+</button>
                        <button className="pill pill--danger" onClick={() => remove(id)} aria-label="Remove">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Customer fields */}
            {cartLines.length > 0 && (
              <div className="cust">
                <div className="field">
                  <label className="label">Name</label>
                  <input
                    className="input"
                    placeholder="e.g. Jane Doe"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="label">Phone</label>
                  <input
                    className="input"
                    placeholder="e.g. 0712 345 678"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="e.g. jane@example.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="totals">
              <div className="row">
                <span className="totalLabel">Total</span>
                <span className="totalValue">{currency(cartTotal)}</span>
              </div>

              <button
                disabled={cartLines.length === 0 || !emailOk || !phoneOk || !nameOk}
                className={`payBtn ${cartLines.length && emailOk && phoneOk && nameOk ? "" : "payBtn--disabled"}`}
                onClick={handlePaystack}
              >
                Pay with M-Pesa (Paystack)
              </button>

              <p className="note">You’ll be redirected to complete payment securely via Paystack.</p>
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

        .topbar { position: sticky; top: 0; z-index: 50; background: #111; color: #fff; border-bottom: 1px solid rgba(255,255,255,.08); }
        .topbar__inner { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 10px 12px; }
        .brand { font-weight: 800; letter-spacing: .3px; display:flex; align-items:center; gap:8px; }
        .brandIcon { width: 22px; height: 22px; border-radius: 4px; }
        .cartBtn { background:#f4d03f; color:#111; border:none; padding:8px 12px; border-radius:12px; font-weight:800; cursor:pointer; white-space:nowrap; }

        .hero { position: relative; background:#fff; border:1px solid #eee; border-radius:16px; padding:16px; overflow:hidden; }
        .hero__bubble { position:absolute; right:-60px; top:-40px; width:240px; height:240px; background:#f4d03f; opacity:.28; border-radius:9999px; z-index:0; }
        .eyebrow { color:#666; font-weight:700; font-size:12px; position:relative; z-index:1; }
        .h1 { margin:6px 0 8px; font-size:28px; line-height:1.15; letter-spacing:-.2px; position:relative; z-index:1; }
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
        @media (min-width: 900px) { .footerGrid { grid-template-columns: 2fr 1fr 1fr; } }
        .footTitle { font-weight:800; margin-bottom:6px; }
        .footText, .footList { color:#555; }
        .footList { list-style:none; padding:0; margin:0; display:grid; gap:4px; }

        /* === Cart Drawer === */
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; justify-content:flex-end; z-index:60; }
        .drawer {
          background:#fff; width:min(92vw, 420px);
          height: min(88vh, 760px);
          margin: 20px;
          border-radius:18px;
          box-shadow:0 20px 60px rgba(0,0,0,.25);
          display:flex; flex-direction:column; overflow:hidden;
        }
        @media (min-width: 900px) { .drawer { width: 380px; } }

        .drawer__top { display:flex; align-items:center; justify-content:space-between; padding:16px 18px; border-bottom:1px solid #eee; }
        .chip { border-radius:12px; padding:8px 12px; font-weight:800; cursor:pointer; border:1px solid #ddd; }
        .chip--light { background:#fff; color:#111; }
        .chip--dark { background:#111; color:#fff; border:none; }

        .empty { padding:18px; color:#666; }

        .lines { padding:10px 18px 0; overflow:auto; flex:1; }
        .line { display:grid; grid-template-columns: 1fr auto; align-items:center; padding:14px 0; border-bottom:1px dashed #e5e7eb; gap:10px; }
        .line:last-child { border-bottom:none; }
        .line__name { font-weight:800; color:#0b1220; }
        .line__sub { color:#718096; font-size:14px; margin-top:2px; }
        .line__actions { display:flex; gap:10px; }
        .pill { width:44px; height:38px; border-radius:10px; border:1px solid #e5e7eb; background:#f8fafc; font-weight:800; cursor:pointer; }
        .pill:hover { background:#eef2f7; }
        .pill--danger { background:#ffe8e8; border-color:#ffd5d5; color:#b42323; width:48px; }
        .pill--danger:hover { background:#ffdede; }

        /* Customer fields */
        .cust { padding: 6px 18px 0; }
        .field { display:flex; flex-direction:column; gap:6px; margin-top:10px; }
        .label { font-weight:700; font-size:12px; color:#374151; }
        .input {
          height: 42px; border-radius: 10px; border:1px solid #e5e7eb;
          padding: 0 12px; outline: none; font-size:14px; background:#fff;
        }
        .input:focus { border-color:#c7d2fe; box-shadow:0 0 0 3px rgba(59,130,246,.15); }

        .totals { padding:14px 18px 18px; border-top:1px solid #f0f0f0; }
        .row { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
        .totalLabel { font-weight:800; font-size:20px; }
        .totalValue { font-weight:800; font-size:22px; }

        /* Lighter Paystack green */
        .payBtn {
          width:100%; border:none; border-radius:12px; padding:14px 16px;
          font-weight:800; font-size:16px; color:#fff; background:#21C97A;
          cursor:pointer; transition:transform .02s ease-in-out;
        }
        .payBtn:active { transform: translateY(1px); }
        .payBtn--disabled { background:#b9e9d0; cursor:not-allowed; }

        .note { margin:10px 2px 0; color:#8a97a8; font-size:14px; line-height:1.3; }

        /* WhatsApp FAB */
        .waFab { position:fixed; right:16px; bottom:20px; z-index:55; background:#25D366; border-radius:9999px; padding:10px; box-shadow:0 6px 18px rgba(0,0,0,.25); }
        .waIcon { width:32px; height:32px; display:block; }
      `}</style>
    </div>
  );
}
