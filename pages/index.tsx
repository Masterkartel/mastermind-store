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

type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

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

  // ---- Simple cart like your example ----
  const addToCart = (p: Product) => {
    const price = Number(p.price) || 0;
    setCart((prev) => [
      ...prev,
      { id: p.id, name: p.name, price, image: typeof p.img === "string" ? p.img : "" },
    ]);
  };

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);

  // ---- Search filter ----
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const hay = `${p.name} ${p.sku ?? ""} ${p.id}`.toLowerCase().replace(/\s+/g, " ");
      return hay.includes(q);
    });
  }, [products, query]);

  // ---- Paystack handler (exact pattern) ----
  const payWithPaystack = () => {
    // @ts-ignore Paystack injected by script
    const PaystackPop = (typeof window !== "undefined" ? (window as any).PaystackPop : undefined);
    if (!PaystackPop) {
      alert("Couldn't start Paystack. Please refresh and try again.");
      return;
    }

    const handler = PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_KEY,
      email: "customer@mastermindelectricals.com",
      amount: total * 100, // kobo/cents
      currency: "KES",
      callback: function (response: any) {
        window.location.href = `/payment-status?reference=${response.reference}`;
      },
      onClose: function () {
        alert("Payment window closed.");
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
        {/* Paystack inline script (required for the button) */}
        <script src="https://js.paystack.co/v1/inline.js"></script>
      </Head>

      {/* ===== Top Bar ===== */}
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <img src="/favicon.ico" alt="" className="brandIcon" aria-hidden />
            Mastermind Electricals & Electronics
          </div>
          <div className="muted" aria-hidden>
            Open Mon–Sun • 8:00am – 9:00pm
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="container" style={{ marginTop: 12 }}>
        <div className="hero">
          <div className="hero__bubble" aria-hidden />
          <div className="eyebrow">TRUSTED IN SOTIK</div>
          <h1 className="h1">Quality Electronics, Lighting & Gas — Fast Delivery</h1>
          <p className="lead">
            Shop TVs, woofers, LED bulbs, and 6kg/13kg gas refills. Pay via M-Pesa. Pickup or
            same-day delivery.
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
              <a href="mailto:sales@mastermindelectricals.com" className="btn btn--light">
                ✉️ sales@mastermindelectricals.com
              </a>
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
                <button className="btn btn--ghost">6KG — KES 1,110</button>
              </div>
              <div className="cylCard">
                <img src="/gas-13kg.png" alt="13KG Gas" className="cylImg" loading="lazy" />
                <button className="btn btn--ghost">13KG — KES 2,355</button>
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
                  <button className="btn btn--accent small" onClick={() => addToCart(p)}>
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

      {/* ===== Cart (EXACT style/structure of your example) ===== */}
      <div className="container">
        <div className="cart">
          <h2>Cart</h2>
          {cart.length === 0 ? (
            <p>No items yet.</p>
          ) : (
            <ul>
              {cart.map((item, i) => (
                <li key={`${item.id}-${i}`}>
                  {item.name} – KES {item.price}
                </li>
              ))}
            </ul>
          )}
          <p className="total">Total: KES {total}</p>
          {cart.length > 0 && (
            <button className="paystack-btn" onClick={payWithPaystack}>
              Pay with M-Pesa (Paystack)
            </button>
          )}
        </div>
      </div>

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
        .muted { color:#888; }
        .center { text-align:center; }

        .hero { position: relative; background:#fff; border:1px solid #eee; border-radius:16px; padding:16px; overflow:hidden; }
        .hero__bubble { position:absolute; right:-60px; top:-40px; width:240px; height:240px; background:#f4d03f; opacity:.28; border-radius:9999px; z-index:0; }
        .eyebrow { color:#666; font-weight:700; font-size:12px; position:relative; z-index:1; }
        .h1 { margin:6px 0 8px; font-size:28px; line-height:1.15; letter-spacing:-.2px; position:relative; z-index:1; }
        .lead { color:#444; font-size:15px; position:relative; z-index:1; }

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

        /* ===== Cart styles EXACT as your snippet ===== */
        .cart { margin-top: 30px; padding: 15px; border: 1px solid #d1d5db; border-radius: 8px; background: #f9fafb; }
        .total { font-weight: bold; margin-top: 10px; }
        .paystack-btn {
          background: #08a05c; /* Paystack official green */
          color: white;
          padding: 10px 20px;
          border-radius: 6px;
          margin-top: 15px;
          font-size: 16px;
          border: none;
          cursor: pointer;
        }
        .paystack-btn:hover { background: #05944f; }

        .footer { border-top:1px solid #eaeaea; padding:18px 0 12px; background:#fafafa; }
        .footerGrid { display:grid; grid-template-columns:1fr; gap:16px; padding:14px 12px; }
        @media (min-width: 900px) { .footerGrid { grid-template-columns: 2fr 1fr 1fr; } }
        .footTitle { font-weight:800; color:#111; margin-bottom:6px; }
        .footText { color:#555; }
        .footList { margin: 6px 0 0; color:#555; padding-left:18px; }

        /* Floating WhatsApp */
        .waFab {
          position: fixed; bottom: 22px; right: 22px; background: #25d366; border-radius: 50%;
          width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 100;
        }
        .waIcon { width: 26px; height: 26px; }
      `}</style>
    </div>
  );
}
