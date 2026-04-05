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
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => `${p.name} ${p.product_code || ""} ${p.sku || ""}`.toLowerCase().includes(q));
  }, [products, query]);

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
    if (!customer.name || !customer.phone) return setNotice("Enter your name and phone number.");
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
      setNotice(`Order ${data.id} placed successfully. Our team will contact you.`);
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
      </Head>

      <main className="shop-page">
        <section className="hero card">
          <h1>Mastermind Electricals & Electronics</h1>
          <p>Quality electronics and accessories delivered fast.</p>
          <input
            className="input"
            placeholder="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </section>

        <section className="catalog-grid">
          {filtered.map((p) => (
            <article key={p.id} className="card product-card">
              {p.img ? <img src={p.img} alt={p.name} className="product-img" /> : <div className="img-fallback" />}
              <h3>{p.name}</h3>
              <p className="price">KES {Math.round(Number(p.retail_price ?? p.price ?? 0)).toLocaleString("en-KE")}</p>
              <small>In stock: {Number(p.stock || 0)}</small>
              <button className="btn" onClick={() => add(p.id)} disabled={Number(p.stock || 0) <= 0}>
                Add to cart
              </button>
            </article>
          ))}
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
          <input className="input" placeholder="Delivery address" value={customer.address} onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))} />
          <textarea className="input" placeholder="Notes (optional)" value={customer.notes} onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))} rows={3} />

          <button className="btn" onClick={placeOrder} disabled={submitting || !cartLines.length}>
            {submitting ? "Placing order..." : "Place Order"}
          </button>
          <p style={{ color: "#475569" }}>{notice}</p>
        </aside>
      </main>
    </>
  );
}
