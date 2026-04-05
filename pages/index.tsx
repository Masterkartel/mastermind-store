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

const SERVICES = [
  "Satellite Installation Support (Zuku, StarTimes, DStv, GOtv, Azam)",
  "CCTV Installation",
  "Electrical Wiring Installation",
  "M-Pesa Services",
  "Gas Refill Services",
  "Electrical Accessories Supply",
  "Socket & Switch Installation",
  "Lighting Installation",
  "Cooker & Appliance Connection Support",
  "Power Backup & Basic Troubleshooting",
  "Home & Shop Electrical Maintenance",
  "Emergency Electrical Assistance",
];

const GAS_BRANDS = [
  "Pro Gas",
  "Total Gas",
  "Hashi Gas",
  "Ola Gas",
  "Sea Gas",
  "Supa Gas (National)",
  "K-Gas",
  "Top Gas",
];

const isGas6 = (name = "") => /(gas.*6|6kg)/i.test(name);
const isGas13 = (name = "") => /(gas.*13|13kg)/i.test(name);
const isGas = (name = "") => /(gas|6kg|13kg|refill|cylinder)/i.test(name);

const gasDisplayPrice = (name = "", normal = 0) => {
  if (isGas6(name)) return 1250;
  if (isGas13(name)) return 2850;
  return normal;
};

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [seedProducts, setSeedProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paying, setPaying] = useState(false);

  const fireToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 1700);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
        (category === "Gas Refills" && isGas(text)) ||
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

  const total = useMemo(() => {
    return cartLines.reduce((sum, line) => {
      const base = Number(line.product.retail_price ?? line.product.price ?? 0) || 0;
      const finalUnit = gasDisplayPrice(line.product.name || "", base);
      return sum + finalUnit * line.qty;
    }, 0);
  }, [cartLines]);

  const cartCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

  function addToCart(id: string) {
    const found = productById.get(id);
    if (!found) {
      setNotice("Product not found in catalog.");
      return;
    }

    const stock = Number(found.stock || 0);
    if (!isGas(found.name) && stock <= 0) {
      setNotice("Product out of stock.");
      return;
    }

    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setNotice("");
    fireToast("Added to cart");
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

  function clearCart() {
    setCart({});
    fireToast("Cart cleared");
  }

  function addGasByType(type: "6KG" | "13KG") {
    const matcher = type === "6KG" ? /(gas.*6|6kg)/i : /(gas.*13|13kg)/i;
    const source = [...seedProducts, ...products];
    const found = source.find((p) => matcher.test(p.name || ""));
    if (!found) {
      setNotice("Product not found in catalog.");
      return;
    }

    setCart((prev) => ({ ...prev, [String(found.id)]: (prev[String(found.id)] || 0) + 1 }));
    setNotice("");
    fireToast(`${type} gas added`);
  }

  async function copyTill() {
    try {
      await navigator.clipboard.writeText(TILL);
      fireToast("Copied!");
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
      const itemsText = cartLines
        .map((line) => {
          const base = Number(line.product.retail_price ?? line.product.price ?? 0) || 0;
          const unit = gasDisplayPrice(line.product.name || "", base);
          return `• ${line.product.name} x${line.qty} - KES ${(unit * line.qty).toLocaleString("en-KE")}`;
        })
        .join("\n");

      const message = `Hello Mastermind Electricals, I would like to place an order.

Name: ${customer.name}
Phone: ${customer.phone}
Email: ${customer.email || "-"}
Address: ${customer.address || "-"}
Notes: ${customer.notes || "-"}

Items:
${itemsText}

Total: KES ${total.toLocaleString("en-KE")}`;

      const waLink = `https://wa.me/${SHOP_PHONE_INTL}?text=${encodeURIComponent(message)}`;
      window.open(waLink, "_blank", "noopener,noreferrer");

      setNotice("Redirecting to WhatsApp...");
      setShowCheckout(false);
    } catch {
      setNotice("Could not open WhatsApp.");
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

      window.open(
        authUrl,
        "paystackPopup",
        "width=520,height=760,left=100,top=60,scrollbars=yes,resizable=yes"
      );
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
      </Head>

      <main className="shop-shell">
        <div className="page-orb orb-a" />
        <div className="page-orb orb-b" />
        <div className="page-orb orb-c" />

        <section className="hero-card card">
          <div className="hero-deco hero-deco-top" />
          <div className="hero-deco hero-deco-bottom" />

          <div className="hero-left">
            <h1>Mastermind Electricals & Electronics</h1>
            <p>
              Electricals, appliances, M-Pesa services and gas refills in Sotik along Sotik-Kisii Highway.
            </p>

            <div className="info-row">
              <a href={`tel:${SHOP_PHONE}`} className="pill">
                📞 {SHOP_PHONE}
              </a>

              <a href={MAPS_LINK} target="_blank" rel="noreferrer" className="pill location-pill">
                <svg viewBox="0 0 24 24" className="map-icon" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
                  />
                </svg>
                Location
              </a>

              <button className="pill pill-btn" onClick={copyTill}>
                ⧉ Till No: {TILL}
              </button>

              <a href={`mailto:${EMAIL}`} className="pill">
                ✉️ {EMAIL}
              </a>
            </div>

            <small className="hours">Open Mon-Sat 8:00am–9:00pm • Sun 10:00am–9:00pm</small>
          </div>

          <div className="hero-right">
            <div className="hero-right-grid">
              <button className="gas-card inner-card" onClick={() => addGasByType("6KG")}>
                <img src="/gas-6kg.png" alt="6KG gas refill" />
                <div>
                  <b>6KG</b>
                  <span>KES 1,250</span>
                </div>
              </button>

              <button className="gas-card inner-card" onClick={() => addGasByType("13KG")}>
                <img src="/gas-13kg.png" alt="13KG gas refill" />
                <div>
                  <b>13KG</b>
                  <span>KES 2,850</span>
                </div>
              </button>

              <small className="gas-note">✅ Free gas delivery in Sotik environs.</small>
            </div>
          </div>
        </section>

        <section className="toolbar card">
          <div className="toolbar-deco toolbar-deco-left" />
          <div className="toolbar-deco toolbar-deco-right" />

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

        <section className="services-card card">
          <div className="services-deco services-deco-left" />
          <div className="services-deco services-deco-right" />

          <div className="services-split">
            <div className="services-pane services-pane-left">
              <img src="/mpesa.png" alt="M-Pesa services" className="service-img-large" />
              <h3>M-Pesa Services</h3>
              <ul className="services-list">
                {SERVICES.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
              <div className="id-warning wide-warning">NO TRANSACTION WITHOUT ORIGINAL ID.</div>
            </div>

            <div className="divider-vertical" />

            <div className="services-pane services-pane-right">
              <h3>Gas Brands Available</h3>
              <ul className="gas-brand-list">
                {GAS_BRANDS.map((brand) => (
                  <li key={brand}>{brand}</li>
                ))}
              </ul>
              <p className="many-more">And many more</p>
            </div>
          </div>
        </section>

        <section className="layout">
          <div className="catalog">
            {catalog.map((p) => {
              const stock = Number(p.stock || 0);
              const gas = isGas(p.name || "");
              const lowStock = !gas && stock > 0 && stock <= 3;
              const canBuy = gas || stock > 0;
              const base = Number(p.retail_price ?? p.price ?? 0) || 0;
              const shown = gasDisplayPrice(p.name || "", base);

              return (
                <article key={p.id} className="product-card card">
                  <div className="product-deco product-deco-top" />
                  <div className="product-deco product-deco-bottom" />

                  {p.img ? (
                    <img src={p.img} alt={p.name} className="product-img" />
                  ) : (
                    <div className="product-placeholder" />
                  )}
                  <h3>{p.name}</h3>
                  <p className="price">KES {Math.round(shown).toLocaleString("en-KE")}</p>
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
        </section>

        <footer className="card footer-note">
          <div className="footer-deco footer-deco-left" />
          <div className="footer-deco footer-deco-right" />
          <b>Mastermind Electricals & Electronics</b>
          <br />
          Phone: <a href={`tel:${SHOP_PHONE}`}>{SHOP_PHONE}</a>
          <br />
          Email: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          <br />
          Location:{" "}
          <a href={MAPS_LINK} target="_blank" rel="noreferrer">
            Sotik, along Sotik-Kisii Highway
          </a>
          <br />
          Till Number: {TILL}
        </footer>

        <section className="card about-bottom">
          <div className="about-deco about-deco-left" />
          <div className="about-deco about-deco-right" />
          <h3>About Our Shop</h3>
          <p>
            Mastermind Electricals & Electronics is a trusted local shop serving Sotik and nearby areas with
            electrical materials, household appliances, gas refill services, convenient M-Pesa services,
            electrical installations, satellite support, and CCTV solutions.
          </p>
        </section>
      </main>

      <button className="cart-fab" onClick={() => setShowCheckout(true)} aria-label="Open cart">
        <span className="cart-fab-icon">🛒</span>
        <span className="cart-fab-text">
          <b>{cartCount}</b> item(s)
        </span>
        <span className="cart-fab-total">KES {total.toLocaleString("en-KE")}</span>
      </button>

      {showCheckout ? (
        <button className="checkout-overlay" onClick={() => setShowCheckout(false)} aria-label="Close checkout" />
      ) : null}

      {showCheckout && (
        <aside className="checkout-popup card">
          <div className="checkout-popup-deco checkout-popup-deco-top" />
          <div className="checkout-popup-deco checkout-popup-deco-bottom" />

          <div className="checkout-head">
            <h2>Checkout ({cartCount})</h2>
            <button className="close-checkout" onClick={() => setShowCheckout(false)}>
              ✕
            </button>
          </div>

          {cartLines.length === 0 ? (
            <p className="muted">No items yet.</p>
          ) : (
            <>
              {cartLines.map((line) => {
                const base = Number(line.product.retail_price ?? line.product.price ?? 0) || 0;
                const unit = gasDisplayPrice(line.product.name || "", base);
                return (
                  <div key={line.product.id} className="cart-line">
                    <div className="cart-line-info">
                      <span>{line.product.name}</span>
                      <small className="cart-line-price">KES {unit.toLocaleString("en-KE")} each</small>
                    </div>

                    <div className="qty-wrap">
                      <button className="qty-btn qty-minus" onClick={() => reduceFromCart(String(line.product.id))}>
                        -
                      </button>
                      <b className="qty-value">{line.qty}</b>
                      <button className="qty-btn qty-plus" onClick={() => addToCart(String(line.product.id))}>
                        +
                      </button>
                    </div>
                  </div>
                );
              })}

              {cartLines.length >= 2 && (
                <button className="clear-btn" onClick={clearCart}>
                  Remove All
                </button>
              )}
            </>
          )}

          <p className="total">Total: KES {total.toLocaleString("en-KE")}</p>

          <input
            className="input"
            placeholder="Customer full name"
            value={customer.name}
            onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Phone number"
            value={customer.phone}
            onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Email (required for pay)"
            value={customer.email}
            onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Delivery address / landmark"
            value={customer.address}
            onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
          />
          <textarea
            className="input"
            rows={3}
            placeholder="Order notes"
            value={customer.notes}
            onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))}
          />

          <div className="checkout-actions">
            <button className="btn-primary" disabled={placingOrder || !cartLines.length} onClick={placeOrder}>
              {placingOrder ? "Redirecting..." : "Place Order"}
            </button>

            <button className="btn-mpesa" disabled={paying || !cartLines.length} onClick={checkoutPaystack}>
              {paying ? "Initializing..." : "Pay with M-pesa (Via Paystack)"}
            </button>
          </div>

          {!!notice && <p className="notice">{notice}</p>}
        </aside>
      )}

      {toast ? <div className="toast">{toast}</div> : null}

      <a className="wa-float" href={WHATSAPP_LINK} target="_blank" rel="noreferrer" aria-label="WhatsApp chat">
        <img src="/whatsapp.svg" alt="WhatsApp" />
      </a>

      <style jsx>{`
        .shop-shell {
          max-width: 1240px;
          margin: 0 auto;
          padding: 16px;
          background:
            radial-gradient(circle at top left, rgba(250, 204, 21, 0.12), transparent 22%),
            radial-gradient(circle at bottom right, rgba(22, 163, 74, 0.1), transparent 24%),
            #f8fafc;
          color: #111;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .page-orb {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          z-index: 0;
        }

        .orb-a {
          width: 220px;
          height: 220px;
          background: rgba(250, 204, 21, 0.12);
          top: -70px;
          left: -80px;
        }

        .orb-b {
          width: 260px;
          height: 260px;
          background: rgba(22, 163, 74, 0.08);
          right: -100px;
          top: 320px;
        }

        .orb-c {
          width: 180px;
          height: 180px;
          background: rgba(15, 23, 42, 0.05);
          left: 40%;
          bottom: -60px;
        }

        .shop-shell > * {
          position: relative;
          z-index: 1;
        }

        .card {
          background: linear-gradient(180deg, #ffffff 0%, #fffdf5 100%);
          border: 1px solid rgba(250, 204, 21, 0.22);
          border-radius: 24px;
          padding: 16px;
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
          position: relative;
          overflow: hidden;
        }

        .inner-card {
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
        }

        .hero-card {
          display: grid;
          grid-template-columns: 2fr 1.1fr;
          gap: 18px;
          margin-bottom: 14px;
          background: linear-gradient(135deg, #fffdf4 0%, #ffffff 58%, #f0fdf4 100%);
        }

        .hero-deco,
        .toolbar-deco,
        .services-deco,
        .product-deco,
        .footer-deco,
        .about-deco,
        .checkout-popup-deco {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
        }

        .hero-deco-top {
          width: 180px;
          height: 180px;
          background: rgba(250, 204, 21, 0.12);
          top: -80px;
          right: -50px;
        }

        .hero-deco-bottom {
          width: 140px;
          height: 140px;
          background: rgba(22, 163, 74, 0.08);
          bottom: -60px;
          left: -30px;
        }

        .hero-left h1 {
          margin: 0 0 8px;
          font-size: 30px;
          line-height: 1.15;
          color: #0f172a;
        }

        .hero-left p {
          margin: 0;
          color: #475569;
          line-height: 1.6;
        }

        .info-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0 10px;
        }

        .pill {
          text-decoration: none;
          color: #111827;
          background: linear-gradient(180deg, #fde047 0%, #facc15 100%);
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 800;
          border: none;
          box-shadow: 0 6px 14px rgba(250, 204, 21, 0.2);
        }

        .pill-btn {
          cursor: pointer;
        }

        .location-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .map-icon {
          width: 16px;
          height: 16px;
          color: #dc2626;
        }

        .hours {
          color: #64748b;
          font-weight: 600;
        }

        .hero-right {
          display: grid;
          align-content: start;
        }

        .hero-right-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .gas-card {
          display: grid;
          grid-template-columns: 60px 1fr;
          gap: 8px;
          align-items: center;
          border: 1px solid #e5e7eb;
          background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%);
          border-radius: 18px;
          padding: 10px;
          cursor: pointer;
          text-align: left;
        }

        .gas-card img {
          width: 58px;
          height: 58px;
          object-fit: contain;
        }

        .gas-card span {
          display: block;
          color: #b45309;
          font-weight: 900;
          margin-top: 2px;
          font-size: 12px;
        }

        .gas-note {
          color: #166534;
          font-size: 12px;
          font-weight: 800;
          padding-left: 2px;
        }

        .toolbar {
          margin-bottom: 14px;
          background: linear-gradient(135deg, #ffffff 0%, #fffdf4 100%);
        }

        .toolbar-deco-left {
          width: 120px;
          height: 120px;
          background: rgba(250, 204, 21, 0.12);
          left: -40px;
          top: -35px;
        }

        .toolbar-deco-right {
          width: 100px;
          height: 100px;
          background: rgba(22, 163, 74, 0.08);
          right: -25px;
          bottom: -30px;
        }

        .input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 12px 13px;
          margin-bottom: 8px;
          font: inherit;
          background: #fff;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          padding: 7px 11px;
          cursor: pointer;
          font-weight: 800;
          color: #334155;
        }

        .chip-active {
          background: linear-gradient(180deg, #fde047 0%, #facc15 100%);
          border-color: #facc15;
          color: #111827;
        }

        .services-card {
          margin-bottom: 14px;
          background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 52%, #fff7ed 100%);
        }

        .services-deco-left {
          width: 180px;
          height: 180px;
          background: rgba(22, 163, 74, 0.08);
          left: -70px;
          top: -70px;
        }

        .services-deco-right {
          width: 150px;
          height: 150px;
          background: rgba(250, 204, 21, 0.1);
          right: -50px;
          bottom: -50px;
        }

        .services-split {
          display: grid;
          grid-template-columns: 1.2fr 1px 0.8fr;
          gap: 18px;
          align-items: start;
        }

        .services-pane h3 {
          margin: 0 0 10px;
          color: #0f172a;
        }

        .service-img-large {
          width: 100%;
          max-width: 180px;
          max-height: 95px;
          object-fit: contain;
          margin-bottom: 12px;
          display: block;
        }

        .services-list,
        .gas-brand-list {
          margin: 0;
          padding-left: 18px;
          color: #334155;
        }

        .services-list li,
        .gas-brand-list li {
          margin-bottom: 8px;
          line-height: 1.45;
        }

        .divider-vertical {
          width: 1px;
          background: linear-gradient(180deg, transparent, #e2e8f0, transparent);
          min-height: 100%;
        }

        .many-more {
          margin: 12px 0 0;
          font-weight: 800;
          color: #0f172a;
        }

        .id-warning {
          margin-top: 10px;
          background: #111827;
          color: #facc15;
          border-radius: 12px;
          padding: 8px;
          font-size: 10px;
          font-weight: 900;
          text-align: center;
        }

        .wide-warning {
          max-width: 320px;
        }

        .layout {
          display: block;
        }

        .catalog {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 14px;
        }

        .product-card {
          display: grid;
          gap: 8px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          background: linear-gradient(180deg, #ffffff 0%, #fffef8 100%);
        }

        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 34px rgba(15, 23, 42, 0.11);
        }

        .product-deco-top {
          width: 110px;
          height: 110px;
          background: rgba(250, 204, 21, 0.1);
          top: -42px;
          right: -38px;
        }

        .product-deco-bottom {
          width: 78px;
          height: 78px;
          background: rgba(22, 163, 74, 0.08);
          left: -24px;
          bottom: -24px;
        }

        .product-img,
        .product-placeholder {
          width: 100%;
          height: 140px;
          border-radius: 16px;
          object-fit: contain;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .product-placeholder {
          display: block;
        }

        .product-card h3 {
          margin: 0;
          font-size: 16px;
          color: #0f172a;
        }

        .price {
          margin: 0;
          font-weight: 900;
          font-size: 18px;
          color: #111827;
        }

        .in-stock {
          color: #166534;
          font-weight: 700;
        }

        .out-stock {
          color: #b91c1c;
          font-weight: 700;
        }

        .low-tag {
          display: inline-block;
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          padding: 3px 9px;
          width: fit-content;
        }

        .btn-primary,
        .btn-mpesa,
        .clear-btn,
        .close-checkout {
          border: none;
          border-radius: 14px;
          padding: 11px 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .btn-primary {
          background: linear-gradient(180deg, #fde047 0%, #facc15 100%);
          color: #111827;
          box-shadow: 0 8px 18px rgba(250, 204, 21, 0.22);
        }

        .btn-mpesa {
          background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
          color: #fff;
          box-shadow: 0 8px 18px rgba(34, 197, 94, 0.18);
        }

        .clear-btn {
          background: #ef4444;
          color: #fff;
          width: 100%;
          margin-top: 8px;
        }

        .btn-primary:disabled,
        .btn-mpesa:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .footer-note {
          margin-top: 14px;
          color: #334155;
          font-size: 14px;
          background: linear-gradient(135deg, #fffdf4 0%, #ffffff 100%);
        }

        .footer-deco-left {
          width: 100px;
          height: 100px;
          background: rgba(250, 204, 21, 0.12);
          left: -30px;
          top: -30px;
        }

        .footer-deco-right {
          width: 90px;
          height: 90px;
          background: rgba(22, 163, 74, 0.08);
          right: -25px;
          bottom: -30px;
        }

        .about-bottom {
          margin-top: 14px;
          color: #334155;
          background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
        }

        .about-deco-left {
          width: 110px;
          height: 110px;
          background: rgba(22, 163, 74, 0.08);
          left: -35px;
          bottom: -35px;
        }

        .about-deco-right {
          width: 110px;
          height: 110px;
          background: rgba(250, 204, 21, 0.1);
          right: -40px;
          top: -30px;
        }

        .cart-fab {
          position: fixed;
          top: 90px;
          right: 16px;
          z-index: 1100;
          border: none;
          background: linear-gradient(180deg, #111827 0%, #1f2937 100%);
          color: #fff;
          border-radius: 18px;
          padding: 12px 14px;
          display: grid;
          gap: 3px;
          min-width: 130px;
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.22);
          cursor: pointer;
          text-align: left;
        }

        .cart-fab-icon {
          font-size: 18px;
        }

        .cart-fab-text,
        .cart-fab-total {
          font-size: 13px;
        }

        .cart-fab-total {
          color: #facc15;
          font-weight: 900;
        }

        .checkout-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.38);
          border: none;
          z-index: 1190;
        }

        .checkout-popup {
          position: fixed;
          top: 84px;
          right: 16px;
          width: min(410px, calc(100vw - 24px));
          max-height: calc(100vh - 100px);
          overflow: auto;
          z-index: 1200;
          border-radius: 22px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.22);
          background: linear-gradient(180deg, #ffffff 0%, #fffef8 100%);
        }

        .checkout-popup-deco-top {
          width: 120px;
          height: 120px;
          background: rgba(250, 204, 21, 0.1);
          right: -30px;
          top: -30px;
        }

        .checkout-popup-deco-bottom {
          width: 100px;
          height: 100px;
          background: rgba(22, 163, 74, 0.08);
          left: -20px;
          bottom: -20px;
        }

        .checkout-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }

        .checkout-head h2 {
          margin: 0;
          color: #0f172a;
        }

        .close-checkout {
          background: #111827;
          color: #fff;
          width: 42px;
          min-width: 42px;
          padding: 10px 0;
        }

        .cart-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-bottom: 1px dashed #e2e8f0;
          padding: 10px 0;
        }

        .cart-line-info {
          flex: 1;
          min-width: 0;
        }

        .cart-line-info span {
          display: block;
          color: #0f172a;
          font-weight: 700;
        }

        .cart-line-price {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-top: 3px;
        }

        .qty-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qty-btn {
          border: 1px solid #cbd5e1;
          background: #fff;
          border-radius: 10px;
          width: 30px;
          height: 30px;
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
          font-weight: 900;
          display: grid;
          place-items: center;
        }

        .qty-minus {
          color: #dc2626;
          font-weight: 900;
        }

        .qty-plus {
          color: #16a34a;
          font-weight: 900;
        }

        .qty-value {
          min-width: 18px;
          text-align: center;
          color: #111827;
        }

        .total {
          font-size: 18px;
          font-weight: 900;
          margin: 10px 0 8px;
          color: #0f172a;
        }

        .checkout-actions {
          display: grid;
          gap: 12px;
          margin-top: 8px;
        }

        .muted {
          color: #64748b;
        }

        .notice {
          color: #1e293b;
          font-weight: 700;
          margin-top: 10px;
        }

        .toast {
          position: fixed;
          top: 16px;
          right: 16px;
          background: #111827;
          color: #fff;
          padding: 10px 12px;
          border-radius: 12px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
          z-index: 1300;
          font-weight: 800;
        }

        .wa-float {
          position: fixed;
          right: 16px;
          bottom: 16px;
          width: 58px;
          height: 58px;
          border-radius: 999px;
          background: #25d366;
          display: grid;
          place-items: center;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
          z-index: 1100;
        }

        .wa-float img {
          width: 28px;
          height: 28px;
        }

        @media (max-width: 980px) {
          .hero-card {
            grid-template-columns: 1fr;
          }

          .services-split {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .divider-vertical {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .shop-shell {
            padding: 12px;
          }

          .cart-fab {
            top: auto;
            bottom: 86px;
            right: 12px;
            min-width: 118px;
          }

          .checkout-popup {
            top: auto;
            right: 12px;
            bottom: 12px;
            max-height: calc(100vh - 24px);
          }

          .service-img-large {
            max-width: 150px;
          }
        }
      `}</style>
    </>
  );
}
