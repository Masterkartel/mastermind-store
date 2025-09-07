import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import {
  ShoppingCart,
  Search,
  Phone,
  MapPin,
  Truck,
  Check,
  Store,
  ExternalLink,
  Plus,
  Minus,
  X,
} from "lucide-react";

const BRAND = {
  name: "Mastermind Electricals & Electronics",
  primary: "#F2C300",
  dark: "#111111",
};

const CONTACT = {
  domain: process.env.NEXT_PUBLIC_BRAND_DOMAIN || "www.mastermindelectricals.com",
  email: process.env.NEXT_PUBLIC_BRAND_EMAIL || "sales@mastermindelectricals.com",
  phone: "0715151010",
  till: process.env.NEXT_PUBLIC_TILL || "8636720",
  mapsUrl: "https://maps.app.goo.gl/7P2okRB5ssLFMkUT8",
  hours: "Open Mon–Sun • 8:00am – 9:00pm",
};

function currency(n: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);
}
const num = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

function useCart() {
  const [items, setItems] = useState<Record<string, number>>({});
  const add = (id: string, q = 1) => setItems((s) => ({ ...s, [id]: (s[id] || 0) + q }));
  const sub = (id: string, q = 1) =>
    setItems((s) => ({ ...s, [id]: Math.max(0, (s[id] || 0) - q) }));
  const remove = (id: string) =>
    setItems((s) => {
      const { [id]: _, ...rest } = s;
      return rest;
    });
  const clear = () => setItems({});
  return { items, add, sub, remove, clear };
}

export default function Home() {
  const cart = useCart();
  const [showCart, setShowCart] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("popular");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [delivery, setDelivery] = useState("pickup");

  useEffect(() => {
    fetch("/products.json")
      .then((r) => r.json())
      .then((list) =>
        setProducts(
          (Array.isArray(list) ? list : []).map((p: any) => ({
            ...p,
            stock: p?.stock ?? 1,
          }))
        )
      )
      .catch(() => {});
  }, []);

  const lines = useMemo(
    () =>
      Object.entries(cart.items)
        .filter(([_, q]) => (q as number) > 0)
        .map(([id, qty]) => ({
          product: products.find((p) => String(p.id) === String(id)),
          qty: qty as number,
        }))
        .filter((l) => !!l.product),
    [cart.items, products]
  );

  const total = useMemo(
    () => lines.reduce((s, l) => s + num(l.product?.price) * l.qty, 0),
    [lines]
  );

  const filtered = useMemo(() => {
    let list = products;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p: any) =>
        `${p.name || ""} ${p.sku || ""}`.toLowerCase().includes(q)
      );
    }
    if (sort === "price-asc") list = list.slice().sort((a, b) => num(a.price) - num(b.price));
    if (sort === "price-desc") list = list.slice().sort((a, b) => num(b.price) - num(a.price));
    return list;
  }, [products, query, sort]);

  async function requestStkPush() {
    if (!/^0?7\d{8}$/.test(mpesaPhone)) {
      alert("Enter valid Safaricom number, e.g., 07XXXXXXXX");
      return;
    }
    if (total <= 0) {
      alert("Your cart is empty.");
      return;
    }
    const resp = await fetch("/api/mpesa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: mpesaPhone,
        amount: Math.round(total),
        items: lines.map((l) => ({ id: l.product.id, qty: l.qty })),
        delivery,
      }),
    });
    const data = await resp.json();
    if (data?.ok) {
      alert(`STK Push sent (Till ${CONTACT.till}). Enter your M-Pesa PIN.`);
      cart.clear();
      setShowCart(false);
    } else {
      alert("Payment error: " + (data?.error || "unknown"));
    }
  }

  const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='360'>
        <rect width='100%' height='100%' fill='#f4f4f5'/>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
              font-family='Arial' font-size='14' fill='#9ca3af'>No Image</text>
      </svg>`
    );

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>Mastermind Electricals & Electronics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Top bar (email + cart) */}
      <div
        style={{
          background: BRAND.dark,
          color: "white",
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ height: 28, width: 8, borderRadius: 4, background: BRAND.primary }} />
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Welcome to</div>
            <div style={{ fontWeight: 600 }}>{BRAND.name}</div>
          </div>
        </div>
        <a
          href={`mailto:${CONTACT.email}`}
          style={{ color: "#fff", textDecoration: "none", display: "flex", alignItems: "center" }}
        >
          {CONTACT.email}
        </a>
        <button
          onClick={() => setShowCart(true)}
          style={{
            background: "white",
            color: "#111",
            padding: "6px 10px",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "none",
            cursor: "pointer",
          }}
          title="Cart"
        >
          <ShoppingCart size={16} />
          Cart: {lines.length}
        </button>
      </div>

      {/* Hero + Visit card */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e5e5",
              borderRadius: 16,
              padding: 16,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                right: -40,
                top: -40,
                height: 160,
                width: 160,
                borderRadius: 80,
                background: BRAND.primary,
                opacity: 0.15,
              }}
            />
            <div style={{ textTransform: "uppercase", fontSize: 12, letterSpacing: 1, color: "#111" }}>
              Trusted in Sotik
            </div>
            <h1 style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 800, color: "#111", lineHeight: 1.2 }}>
              Quality Electronics, Lighting & Gas — Fast Delivery
            </h1>
            <p style={{ marginTop: 8, color: "#555" }}>
              Shop TVs, woofers, LED bulbs, and 6kg/13kg gas refills. Pay via M-Pesa. Pickup or same-day delivery.
            </p>
            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div
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
              </div>
              <div
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
              </div>
              <div
                style={{
                  background: "#22c55e",
                  color: "#0a0a0a",
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 700,
                }}
              >
                M-Pesa Available
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#111",
              color: "white",
              borderRadius: 16,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Store size={18} />
              <span style={{ fontWeight: 600 }}>Visit Our Shop</span>
            </div>
            <div style={{ opacity: 0.9, fontSize: 14 }}>
              Mastermind Electricals & Electronics, Sotik Town
            </div>
            <div style={{ opacity: 0.85, fontSize: 14 }}>{CONTACT.hours}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <a
                href={CONTACT.mapsUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  background: BRAND.primary,
                  color: "#111",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                <MapPin size={16} />
                View on Maps <ExternalLink size={14} />
              </a>
              <a
                href={`tel:+254715151010`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  background: "#fff",
                  color: "#111",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                <Phone size={16} /> {CONTACT.phone}
              </a>
            </div>
            <div style={{ marginTop: 6 }}>
              <a href={`mailto:${CONTACT.email}`} style={{ color: "#fff", textDecoration: "none" }}>
                {CONTACT.email}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Search + sort */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 8px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", left: 10, top: 10, color: "#999" }} />
            <input
              placeholder='Search "43 TV" or "bulb"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                border: "1px solid #ddd",
                borderRadius: 8,
                background: "#fff",
              }}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, background: "#fff" }}
          >
            <option value="popular">Popular</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>
        </div>
      </div>

      {/* Product grid */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 16px 20px" }}>
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          }}
        >
          {filtered.map((p: any) => {
            const price = num(p.price);
            const stock = num(p.stock, 0);
            const img = p.img || PLACEHOLDER;
            return (
              <article
                key={String(p.id)}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "relative", width: "100%", height: 160, background: "#f6f6f6" }}>
                  <img
                    src={img}
                    alt={p.name || "Product"}
                    loading="lazy"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).src = PLACEHOLDER)}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      background: "#f6f6f6",
                    }}
                  />
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 12, color: "#777" }}>{p.sku ? String(p.sku) : ""}</div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#111",
                      lineHeight: 1.2,
                      minHeight: 32,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as any,
                      overflow: "hidden",
                    }}
                    title={p.name}
                  >
                    {p.name}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{currency(price)}</div>
                    <button
                      onClick={() => cart.add(String(p.id))}
                      disabled={stock <= 0}
                      style={{
                        background: BRAND.primary,
                        color: "#111",
                        padding: "6px 10px",
                        borderRadius: 10,
                        opacity: stock <= 0 ? 0.6 : 1,
                        border: "none",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {stock > 0 ? "Add" : "Out of stock"}
                    </button>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>Stock: {stock}</div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 24px" }}>
        <div
          style={{
            borderTop: "1px solid #eee",
            paddingTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            fontSize: 14,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: "#111" }}>{BRAND.name}</div>
            <div style={{ marginTop: 8, color: "#555" }}>Genuine stock, fair prices, friendly support.</div>
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>Contact</div>
            <ul style={{ marginTop: 8, color: "#555", paddingLeft: 16 }}>
              <li>
                Email:{" "}
                <a href={`mailto:${CONTACT.email}`} style={{ color: "#111" }}>
                  {CONTACT.email}
                </a>
              </li>
              <li>Website: {CONTACT.domain}</li>
              <li>
                <a href={CONTACT.mapsUrl} target="_blank" rel="noreferrer" style={{ color: "#111" }}>
                  Sotik Town (View on Maps)
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>Payments</div>
            <ul style={{ marginTop: 8, color: "#555", paddingLeft: 16 }}>
              <li>M-Pesa Till {CONTACT.till}</li>
              <li>Cash on Delivery (local)</li>
              <li>In-store M-Pesa Agent</li>
            </ul>
          </div>
        </div>
        <div style={{ textAlign: "center", color: "#999", fontSize: 12, padding: "16px 0" }}>
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </div>
      </div>

      {/* Cart modal */}
      {showCart && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setShowCart(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              background: "#fff",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 16,
              maxHeight: "85vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Your Cart</div>
              <button
                onClick={() => setShowCart(false)}
                style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer" }}
                aria-label="Close cart"
              >
                <X />
              </button>
            </div>

            {lines.length === 0 ? (
              <div style={{ padding: "24px 0", color: "#666" }}>Your cart is empty.</div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  {lines.map((l) => (
                    <div
                      key={String(l.product.id)}
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
                          {currency(num(l.product.price))}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          onClick={() => cart.sub(String(l.product.id))}
                          style={{ border: "1px solid #ddd", borderRadius: 8, padding: "4px 6px", background: "#fff", cursor: "pointer" }}
                          aria-label="Decrease"
                        >
                          <Minus size={16} />
                        </button>
                        <div style={{ minWidth: 20, textAlign: "center" }}>{l.qty}</div>
                        <button
          
