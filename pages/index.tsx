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
  description?: string;
};

const SHOP_PHONE = "+254712345678";
const SHOP_WHATSAPP = "254712345678";
const SHOP_MAPS = "https://maps.google.com/?q=Mastermind+Electricals+%26+Electronics";
const SHOP_ADDRESS = "Mastermind Electricals & Electronics, Nairobi, Kenya";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

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

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    products.forEach((p) => set.add((p.category || "General").trim()));
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const inCategory = category === "All" || (p.category || "General") === category;
      const inSearch = !q || `${p.name} ${p.product_code || ""} ${p.sku || ""}`.toLowerCase().includes(q);
      return inCategory && inSearch;
    });
  }, [products, query, category]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ product: products.find((p) => p.id === id), qty }))
        .filter((x) => x.product) as { product: Product; qty: number }[],
    [cart, products]
  );

  const total = useMemo(
    () => cartLines.reduce((sum, line) => sum + (Number(line.product.retail_price ?? line.product.price ?? 0) || 0) * line.qty, 0),
    [cartLines]
  );

  const featured = useMemo(() => filtered.slice(0, 8), [filtered]);

  function add(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }

  function reduce(id: string) {
    setCart((prev) => {
      const next = { ...prev };
      const qty = (next[id] || 0) - 1;
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  async function placeOrder() {
    setNotice("");
    if (!customer.name || !customer.phone) return setNotice("Please enter your full name and phone number.");
    if (!cartLines.length) return setNotice("Cart is empty.");

    setSubmitting(true);
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
      if (!res.ok) return setNotice(data.error || "Could not place order");

      setCart({});
      setCustomer({ name: "", phone: "", email: "", address: "", notes: "" });
      setNotice(`Order ${data.id} placed successfully. Our team will contact you shortly.`);
    } catch {
      setNotice("Network error while placing order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Mastermind Electricals & Electronics</title>
        <meta name="description" content="Trusted electronics, electrical accessories and appliances with fast order support and POS operations." />
      </Head>

      <main className="shop-page">
        <section className="page-head hero">
          <h1 style={{ margin: 0 }}>Mastermind Electricals & Electronics</h1>
          <p style={{ margin: "8px 0 10px" }}>
            Trusted electronics store for homes, businesses and retail buyers. Order online, call us directly, or chat with us on WhatsApp.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="btn" href={`tel:${SHOP_PHONE}`}>📞 Call {SHOP_PHONE}</a>
            <a className="btn btn-soft" href={SHOP_MAPS} target="_blank" rel="noreferrer">📍 Open Map Location</a>
            <a className="btn btn-soft" href="/admin">Admin</a>
            <a className="btn btn-soft" href="/pos">Clerk POS</a>
          </div>
        </section>

        <section className="hero card">
          <div style={{ display: "grid", gap: 8 }}>
            <input className="input" placeholder="Search products, code, SKU..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {categories.map((c) => (
                <button key={c} className={`btn ${category === c ? "btn-dark" : "btn-soft"}`} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="catalog-grid">
          {featured.map((p) => {
            const stock = Number(p.stock || 0);
            const low = stock > 0 && stock <= 3;
            return (
              <article key={p.id} className="card product-card">
                {p.img ? <img src={p.img} alt={p.name} className="product-img" /> : <div className="img-fallback" />}
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                <p className="price">KES {Math.round(Number(p.retail_price ?? p.price ?? 0)).toLocaleString("en-KE")}</p>
                <small style={{ color: stock > 0 ? "#166534" : "#b91c1c" }}>
                  {stock > 0 ? `In stock: ${stock}` : "Out of stock"}
                </small>
                {low ? <span className="tag-low">Low stock</span> : null}
                <button className="btn" onClick={() => add(p.id)} disabled={stock <= 0}>Add to cart</button>
              </article>
            );
          })}
        </section>

        <aside className="card checkout">
          <h2>Your Order</h2>
          {cartLines.length === 0 ? <p>No items yet.</p> : cartLines.map((line) => (
            <div key={line.product.id} className="line">
              <span>{line.product.name}</span>
              <div>
                <button className="btn mini" onClick={() => reduce(line.product.id)}>-</button>
                <b style={{ margin: "0 8px" }}>{line.qty}</b>
                <button className="btn mini" onClick={() => add(line.product.id)}>+</button>
              </div>
            </div>
          ))}

          <p className="total">Total: KES {total.toLocaleString("en-KE")}</p>

          <input className="input" placeholder="Full name" value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} />
          <input className="input" placeholder="Phone number" value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} />
          <input className="input" placeholder="Email (optional)" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} />
          <input className="input" placeholder="Delivery address / area" value={customer.address} onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))} />
          <textarea className="input" placeholder="Notes (brand preference, color, etc.)" value={customer.notes} onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))} rows={3} />

          <button className="btn" onClick={placeOrder} disabled={submitting || !cartLines.length}>
            {submitting ? "Placing order..." : "Place Order"}
          </button>
          <p style={{ color: "#475569" }}>{notice}</p>

          <div className="contact-box">
            <b>Need help fast?</b>
            <a href={`tel:${SHOP_PHONE}`}>📞 {SHOP_PHONE}</a>
            <a href={`https://wa.me/${SHOP_WHATSAPP}?text=Hello%20Mastermind%20store`} target="_blank" rel="noreferrer">💬 Chat on WhatsApp</a>
            <a href={SHOP_MAPS} target="_blank" rel="noreferrer">📍 {SHOP_ADDRESS}</a>
          </div>
        </aside>

        <section className="hero card">
          <h2 style={{ marginTop: 0 }}>Why Customers Choose Us</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#334155" }}>
            <li>Wide selection of electronics and electrical accessories.</li>
            <li>Fast support through phone and WhatsApp.</li>
            <li>Professional admin/POS workflow for accurate order handling.</li>
            <li>Receipt and quotation generation for retail and wholesale buyers.</li>
          </ul>
        </section>

        <footer className="hero card" style={{ fontSize: 14, color: "#475569" }}>
          <b>Mastermind Electricals & Electronics</b><br />
          Phone: <a href={`tel:${SHOP_PHONE}`}>{SHOP_PHONE}</a><br />
          Address: <a href={SHOP_MAPS} target="_blank" rel="noreferrer">{SHOP_ADDRESS}</a><br />
          Open: Mon-Sat, 8:00 AM - 7:00 PM
        </footer>
      </main>

      <a
        href={`https://wa.me/${SHOP_WHATSAPP}?text=Hello%20Mastermind%20store`}
        target="_blank"
        rel="noreferrer"
        className="wa-float"
        aria-label="Chat on WhatsApp"
      >
        💬
      </a>
    </>
  );
}
