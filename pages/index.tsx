// pages/index.tsx
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  price?: number;
  retail_price?: number;
  stock?: number;
  img?: string;
  product_code?: string;
  sku?: string;
  category?: string;
};

const SHOP_PHONE = "0715151010";
const SHOP_PHONE_INTL = "254715151010";
const WHATSAPP_LINK = `https://wa.me/${SHOP_PHONE_INTL}?text=${encodeURIComponent(
  "Hello Mastermind Electricals, I would like to order."
)}`;
const MAPS_LINK = "https://maps.app.goo.gl/4Yz77X84Yd26nzv56";
const EMAIL = "sales@mastermindelectricals.com";
const TILL = "8636720";

const FIXED_CATEGORIES = [
  "All",
  "Cables & Wiring",
  "Lighting",
  "Switches & Sockets",
  "Audio & Entertainment",
  "Kitchen Appliances",
  "Chargers & Cables",
  "Gas Refills",
];

const isGasProduct = (name = "") => /(gas|6kg|13kg|refill|cylinder)/i.test(name);

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [seedProducts, setSeedProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [notice, setNotice] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paying, setPaying] = useState(false);

  // Load visible catalog
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/catalog", { cache: "no-store" });
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch {
        setProducts([]);
      }
    })();
  }, []);

  // Load raw seed list as fallback for gas IDs (service should still be orderable)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/products.json", { cache: "no-store" });
        const data = await res.json();
        setSeedProducts(Array.isArray(data) ? data : []);
      } catch {
        setSeedProducts([]);
      }
    })();
  }, []);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    [...seedProducts, ...products].forEach((p) => map.set(String(p.id), p));
    return map;
  }, [products, seedProducts]);

  const categories = useMemo(() => {
    const set = new Set<string>(FIXED_CATEGORIES);
    products.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const text = `${p.name} ${p.product_code || ""} ${p.sku || ""}`.toLowerCase();
      const inSearch = !q || text.includes(q);

      const inCategory =
        category === "All" ||
        (category === "Cables & Wiring" && /(cable|wire|single|conduit|adaptor)/i.test(text)) ||
        (category === "Lighting" && /(bulb|light|flood|bulkhead|holder|fixture)/i.test(text)) ||
        (category === "Switches & Sockets" && /(switch|socket|mcb|consumer|ccu)/i.test(text)) ||
        (category === "Audio & Entertainment" && /(woofer|speaker|sound|mouse|xlr|audio)/i.test(text)) ||
        (category === "Kitchen Appliances" && /(kettle|iron|cooker|appliance)/i.test(text)) ||
        (category === "Chargers & Cables" && /(charger|type-c|usb|adapter|pd)/i.test(text)) ||
        (category === "Gas Refills" && isGasProduct(text)) ||
        (p.category || "").toLowerCase() === category.toLowerCase();

      return inSearch && inCategory;
    });
  }, [products, query, category]);

  const catalog = useMemo(() => filtered.slice(0, 80), [filtered]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ product: productById.get(id), qty }))
        .filter((l) => l.product) as { product: Product; qty: number }[],
    [cart, productById]
  );

  const total = useMemo(
    () =>
      cartLines.reduce(
        (sum, line) => sum + (Number(line.product.retail_price ?? line.product.price ?? 0) || 0) * line.qty,
        0
      ),
    [cartLines]
  );

  const cartCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

  function addToCart(id: string) {
    const found = productById.get(id);
    if (!found) {
      setNotice("Product not found in catalog.");
      return;
    }

    const stock = Number(found.stock || 0);
    if (!isGasProduct(found.name) && stock <= 0) {
      setNotice("Product out of stock.");
      return;
    }

    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setNotice("");
  }

  function reduceFromCart(id: string) {
    setCart((prev) => {
      const next = { ...prev };
      const n = (next[id] || 0) - 1;
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  }

  function addGasByType(type: "6KG" | "13KG") {
    const matcher = type === "6KG" ? /(gas.*6|6kg)/i : /(gas.*13|13kg)/i;
    const source = [...seedProducts, ...products];
    const found = source.find((p) => matcher.test(p.name || ""));

    if (!found) {
      setNotice("Product not found in catalog.");
      return;
    }

    // Gas service is always orderable
    setCart((prev) => ({ ...prev, [String(found.id)]: (prev[String(found.id)] || 0) + 1 }));
    setNotice("");
  }

  async function copyTill() {
    try {
      await navigator.clipboard.writeText(TILL);
      setNotice("Till number copied.");
    } catch {
      setNotice("Could not copy till number.");
    }
  }

  async function placeOrder() {
    setNotice("");
    if (!customer.name || !customer.phone) {
      setNotice("Please enter customer name and phone number.");
      return;
    }
    if (!cartLines.length) {
      setNotice("Your cart is empty.");
      return;
    }

    setPlacingOrder(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          deliveryAddress: customer.address,
          notes: customer.notes,
          items: cartLines.map((l) => ({ productId: l.product.id, qty: l.qty })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setNotice(data?.error || "Could not place order.");
        return;
      }

      setNotice(`Order ${data.id} placed successfully. We will contact you shortly.`);
      setCart({});
      setCustomer({ name: "", phone: "", email: "", address: "", notes: "" });
    } catch {
      setNotice("Network error while placing order.");
    } finally {
      setPlacingOrder(false);
    }
  }

  async function checkoutPaystack() {
    setNotice("");
    if (!customer.email) {
      setNotice("Enter customer email to pay via Paystack.");
      return;
    }
    if (!cartLines.length) {
      setNotice("Your cart is empty.");
      return;
    }

    setPaying(true);
    try {
      const ref = `MM-${Date.now()}`;
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          email: customer.email,
          reference: ref,
        }),
      });

      const data = await res.json();
      const authUrl = data?.data?.authorization_url;

      if (!res.ok || !authUrl) {
        setNotice(data?.error || data?.message || "Paystack initialization failed.");
        return;
      }

      window.location.href = authUrl;
    } catch {
      setNotice("Could not initialize Paystack payment.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <Head>
        <title>Mastermind Electricals & Electronics</title>
        <meta
          name="description"
          content="Electrical supplies, appliances, gas refills and M-Pesa services in Sotik along Sotik-Kisii highway."
        />
      </Head>

      <main className="shop-shell">
        {/* TOP CART */}
        <section className="top-cart-bar">
          <b>🛒 Cart:</b> {cartCount} item(s) • <b>KES {total.toLocaleString("en-KE")}</b>
        </section>

        {/* HERO */}
        <section className="hero">
          <div className="hero-left">
            <h1>Mastermind Electricals & Electronics</h1>
            <p>
              Electricals, appliances, M-Pesa services and gas refills in Sotik along Sotik-Kisii Highway.
            </p>

            <div className="info-row">
              <a href={`tel:${SHOP_PHONE}`} className="pill">📞 {SHOP_PHONE}</a>

              <a href={MAPS_LINK} target="_blank" rel="noreferrer" className="pill location-pill">
                <span className="red-pin">📍</span> Location
              </a>

              <button className="pill pill-btn" onClick={copyTill}>
                🏪 Till No: {TILL} (Copy)
              </button>

              <a href={`mailto:${EMAIL}`} className="pill">✉️ {EMAIL}</a>
            </div>

            <small className="hours">Open Mon-Sat 8:00am–9:00pm • Sun 10:00am–9:00pm</small>
          </div>

          <div className="hero-right">
            <div className="mpesa-card">
              <img src="/mpesa.png" alt="M-Pesa services" className="service-img" />
              {/* required layout */}
              <div className="mpesa-services-grid">
                <span className="service-chip">Deposit Cash</span>
                <span className="service-chip">Withdraw Cash</span>
                <span className="service-chip">SIM Replacement</span>
                <span className="service-chip">SIM Registration</span>
              </div>
              <div className="id-warning">NO TRANSACTION WITHOUT ORIGINAL ID.</div>
            </div>

            <div className="gas-pricing">
              <button className="gas-card" onClick={() => addGasByType("6KG")} title="Add 6KG gas to cart">
                <img src="/gas-6kg.png" alt="6KG gas refill" />
                <div>
                  <b>6KG Gas Refill</b>
                  <span>KES 1,250</span>
                </div>
              </button>

              <button className="gas-card" onClick={() => addGasByType("13KG")} title="Add 13KG gas to cart">
                <img src="/gas-13kg.png" alt="13KG gas refill" />
                <div>
                  <b>13KG Gas Refill</b>
                  <span>KES 2,850</span>
                </div>
              </button>

              <small className="gas-note">✅ Free gas delivery in Sotik environs.</small>
            </div>
          </div>
        </section>

        {/* TOOLBAR */}
        <section className="toolbar card">
          <input
            className="input"
            placeholder="Search by product name, code or SKU..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="chips">
            {categories.map((c) => (
              <button
                key={c}
                className={`chip ${category === c ? "chip-active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* CONTENT */}
        <section className="layout">
          <div className="catalog">
            {catalog.map((p) => {
              const stock = Number(p.stock || 0);
              const gas = isGasProduct(p.name || "");
              const lowStock = !gas && stock > 0 && stock <= 3;
              const canBuy = gas || stock > 0;

              return (
                <article key={p.id} className="product-card">
                  {p.img ? <img src={p.img} alt={p.name} className="product-img" /> : <div className="product-placeholder" />}
                  <h3>{p.name}</h3>
                  <p className="price">KES {Math.round(Number(p.retail_price ?? p.price ?? 0)).toLocaleString("en-KE")}</p>
                  <small className={canBuy ? "in-stock" : "out-stock"}>
                    {gas ? "Service available" : stock > 0 ? `In stock: ${stock}` : "Out of stock"}
                  </small>
                  {lowStock ? <span className="low-tag">Low stock</span> : null}
                  <button className="btn-primary" onClick={() => addToCart(String(p.id))} disabled={!canBuy}>
                    Add to cart
                  </button>
                </article>
              );
            })}
          </div>

          <aside className="checkout card">
            <h2>Checkout ({cartCount})</h2>

            {cartLines.length === 0 ? (
              <p className="muted">No items yet.</p>
            ) : (
              cartLines.map((line) => (
                <div key={line.product.id} className="cart-line">
                  <span>{line.product.name}</span>
                  <div>
                    <button className="qty-btn" onClick={() => reduceFromCart(String(line.product.id))}>-</button>
                    <b style={{ margin: "0 8px" }}>{line.qty}</b>
                    <button className="qty-btn" onClick={() => addToCart(String(line.product.id))}>+</button>
                  </div>
                </div>
              ))
            )}

            <p className="total">Total: KES {total.toLocaleString("en-KE")}</p>

            <input className="input" placeholder="Customer full name" value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} />
            <input className="input" placeholder="Phone number" value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} />
            <input className="input" placeholder="Email (required for pay)" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} />
            <input className="input" placeholder="Delivery address / landmark" value={customer.address} onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))} />
            <textarea className="input" rows={3} placeholder="Order notes" value={customer.notes} onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))} />

            <button className="btn-primary" disabled={placingOrder || !cartLines.length} onClick={placeOrder}>
              {placingOrder ? "Placing order..." : "Place Order"}
            </button>

            <button className="btn-dark" disabled={paying || !cartLines.length} onClick={checkoutPaystack}>
              {paying ? "Initializing..." : "Pay with M-pesa (Via Paystack)"}
            </button>

            {!!notice && <p className="notice">{notice}</p>}
          </aside>
        </section>

        <footer className="card footer-note">
          <b>Mastermind Electricals & Electronics</b><br />
          Phone: <a href={`tel:${SHOP_PHONE}`}>{SHOP_PHONE}</a><br />
          Email: <a href={`mailto:${EMAIL}`}>{EMAIL}</a><br />
          Location: <a href={MAPS_LINK} target="_blank" rel="noreferrer">Sotik, along Sotik-Kisii Highway</a><br />
          Till Number: {TILL}
        </footer>

        {/* About moved below page */}
        <section className="card about-bottom">
          <h3>About Our Shop</h3>
          <p>
            Mastermind Electricals & Electronics is a trusted local shop serving Sotik and nearby areas with
            electrical materials, household appliances, gas refill services, and convenient M-Pesa services.
            We focus on practical products, fair pricing, and reliable service.
          </p>
        </section>
      </main>

      <a className="wa-float" href={WHATSAPP_LINK} target="_blank" rel="noreferrer" aria-label="WhatsApp chat">
        <img src="/whatsapp.svg" alt="WhatsApp" />
      </a>

      <style jsx>{`
        .shop-shell { max-width: 1240px; margin: 0 auto; padding: 16px; background: #f8fafc; color: #111; min-height: 100vh; }
        .top-cart-bar { background: #111; color: #fff; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; }

        .hero { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; background: #111; color: #fff; border-radius: 14px; padding: 16px; margin-bottom: 12px; }
        .hero p { color: #e2e8f0; line-height: 1.5; }
        .info-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
        .pill { text-decoration: none; color: #111; background: #facc15; padding: 6px 10px; border-radius: 999px; font-size: 13px; font-weight: 700; border: none; }
        .pill-btn { cursor: pointer; }
        .location-pill { display: inline-flex; align-items: center; gap: 5px; }
        .red-pin { color: #dc2626; }
        .hours { color: #cbd5e1; }
        .hero-right { display: grid; gap: 10px; align-content: start; }

        .mpesa-card { background: #fff; border-radius: 10px; padding: 8px; }
        .service-img { width: 100%; max-height: 110px; object-fit: contain; }

        .mpesa-services-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 8px;
        }

        .service-chip {
          background: #22c55e;
          color: #fff;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
        }

        .id-warning {
          margin-top: 8px;
          background: #111;
          color: #facc15;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 800;
          text-align: center;
        }

        .gas-pricing { display: grid; gap: 8px; }
        .gas-card { display: grid; grid-template-columns: 84px 1fr; gap: 8px; align-items: center; border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; padding: 8px; cursor: pointer; text-align: left; }
        .gas-card img { width: 80px; height: 80px; object-fit: contain; }
        .gas-card span { display: block; color: #b45309; font-weight: 800; margin-top: 2px; }
        .gas-note { color: #fde68a; }

        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; }
        .toolbar { margin-bottom: 12px; }
        .input { width: 100%; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; margin-bottom: 8px; font: inherit; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip { background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 10px; cursor: pointer; font-weight: 700; }
        .chip-active { background: #facc15; border-color: #facc15; color: #111; }

        .layout { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
        .catalog { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
        .product-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; display: grid; gap: 6px; }
        .product-img, .product-placeholder { width: 100%; height: 130px; border-radius: 10px; object-fit: contain; background: #f8fafc; border: 1px solid #e2e8f0; }
        .product-placeholder { display: block; }
        .price { margin: 0; font-weight: 800; }
        .in-stock { color: #166534; }
        .out-stock { color: #b91c1c; }
        .low-tag { display: inline-block; background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 999px; font-size: 12px; font-weight: 700; padding: 2px 8px; width: fit-content; }

        .btn-primary, .btn-dark { border: none; border-radius: 10px; padding: 10px; font-weight: 800; cursor: pointer; margin-top: 6px; }
        .btn-primary { background: #facc15; color: #111; }
        .btn-dark { background: #111; color: #fff; }
        .btn-primary:disabled, .btn-dark:disabled { opacity: .6; cursor: not-allowed; }

        .checkout { position: sticky; top: 10px; height: fit-content; }
        .cart-line { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px; margin-bottom: 6px; }
        .qty-btn { border: 1px solid #cbd5e1; background: #fff; border-radius: 8px; width: 26px; height: 26px; cursor: pointer; }
        .total { font-size: 18px; font-weight: 800; margin: 8px 0; }
        .muted { color: #64748b; }
        .notice { color: #1e293b; font-weight: 600; }

        .footer-note { margin-top: 12px; color: #334155; font-size: 14px; }
        .about-bottom { margin-top: 12px; color: #334155; }

        .wa-float { position: fixed; right: 16px; bottom: 16px; width: 56px; height: 56px; border-radius: 999px; background: #25d366; display: grid; place-items: center; box-shadow: 0 10px 24px rgba(0,0,0,.25); z-index: 999; }
        .wa-float img { width: 28px; height: 28px; }

        @media (max-width: 980px) {
          .hero { grid-template-columns: 1fr; }
          .layout { grid-template-columns: 1fr; }
          .checkout { position: static; }
        }
      `}</style>
    </>
  );
}
