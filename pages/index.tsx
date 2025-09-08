import React, { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import {
  ShoppingCart,
  Search,
  Phone,
  MapPin,
  Truck,
  Check,
  Store,
} from "lucide-react";

const BRAND = {
  name: "Mastermind Electricals & Electronics",
  primary: "#F2C300",
  dark: "#111111",
};
const CONTACT = {
  phone: "0715151010",
  email: "sales@mastermindelectricals.com",
  till: "8636720",
};

function currency(kes: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(kes);
}

function useCart() {
  const [items, setItems] = useState<Record<string, number>>({});
  const add = (id: string, qty = 1) =>
    setItems((s) => ({ ...s, [id]: (s[id] || 0) + qty }));
  const sub = (id: string) =>
    setItems((s) => {
      const q = (s[id] || 0) - 1;
      if (q <= 0) {
        const { [id]: _, ...rest } = s;
        return rest;
      }
      return { ...s, [id]: q };
    });
  const removeAll = () => setItems({});
  return { items, add, sub, removeAll };
}

export default function Home() {
  const cart = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    fetch("/products.json")
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => {});
  }, []);

  const lines = useMemo(
    () =>
      Object.entries(cart.items)
        .filter(([_, q]: any) => q > 0)
        .map(([id, qty]: any) => ({
          product: products.find((p) => p.id === id),
          qty,
        })),
    [cart.items, products]
  );

  const total = useMemo(
    () =>
      lines.reduce((s, l) => s + (l.product?.price || 0) * l.qty, 0),
    [lines]
  );

  const filtered = useMemo(() => {
    let list = products;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p: any) =>
        `${p.name} ${p.sku}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, query]);

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fafafa" }}>
      <Head>
        <title>{BRAND.name}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* ===== Header ===== */}
      <header
        style={{
          background: BRAND.dark,
          color: "white",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            style={{
              height: 14,
              width: 14,
              borderRadius: "50%",
              background: BRAND.primary,
            }}
          />
          <div style={{ fontWeight: 600 }}>{BRAND.name}</div>
        </div>
        <button
          onClick={() => setShowCart(true)}
          style={{
            background: BRAND.primary,
            color: "#111",
            padding: "6px 12px",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ShoppingCart size={16} /> Cart: {lines.length}
        </button>
      </header>

      {/* ===== Hero Section ===== */}
      <section
        className="container"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "24px 16px",
          display: "grid",
          gap: 16,
          gridTemplateColumns: "2fr 1fr",
        }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid #e5e5e5",
            borderRadius: 16,
            padding: 16,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
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
          <div
            style={{
              textTransform: "uppercase",
              fontSize: 12,
              letterSpacing: 1,
              color: "#111",
            }}
          >
            Trusted in Sotik
          </div>
          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 28,
              fontWeight: 800,
              color: "#111",
            }}
          >
            Quality Electronics, Lighting & Gas — Fast Delivery
          </h1>
          <p style={{ marginTop: 8, color: "#555" }}>
            Shop TVs, woofers, LED bulbs, and 6kg/13kg gas refills. Pay via
            M-Pesa. Pickup or same-day delivery.
          </p>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
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
              <Check size={12} /> M-Pesa Available
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
              <Check size={12} /> Gas Refills Available
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
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -40,
              bottom: -40,
              height: 160,
              width: 160,
              borderRadius: 80,
              background: BRAND.primary,
              opacity: 0.25,
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Store size={18} />
            <span style={{ fontWeight: 600 }}>Visit Our Shop</span>
          </div>
          <div style={{ marginTop: 8, opacity: 0.9, fontSize: 14 }}>
            Mastermind Electricals & Electronics, Sotik Town
          </div>
          <div style={{ marginTop: 8, opacity: 0.75, fontSize: 14 }}>
            Open Mon-Sun • 8:00am – 9:00pm
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <a
              href="https://maps.app.goo.gl/7P2okRB5ssLFMkUT8"
              target="_blank"
              rel="noreferrer"
              style={{
                background: BRAND.primary,
                color: "#111",
                padding: "6px 10px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              View on Maps
            </a>
            <a
              href={`tel:${CONTACT.phone}`}
              style={{
                background: BRAND.primary,
                color: "#111",
                padding: "6px 10px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {CONTACT.phone}
            </a>
          </div>
          <div style={{ marginTop: 8, fontSize: 14 }}>
            {CONTACT.email}
          </div>
        </div>
      </section>

      {/* ===== Search ===== */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 16px",
        }}
      >
        <div style={{ position: "relative" }}>
          <Search
            size={16}
            style={{ position: "absolute", left: 10, top: 10, color: "#999" }}
          />
          <input
            placeholder='Search products, e.g., "43 TV" or "bulb"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          />
        </div>
      </div>

      {/* ===== Product Grid ===== */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "16px",
        }}
      >
        <div
          className="grid"
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          }}
        >
          {filtered.map((p: any) => (
            <div
              key={p.id}
              style={{
                background: "white",
                border: "1px solid #e5e5e5",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <div style={{ position: "relative" }}>
                <img
                  src={p.img || "https://via.placeholder.com/600x360?text=Product+Image"}
                  alt={p.name}
                  style={{
                    height: 160,
                    width: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 12, color: "#777" }}>{p.sku}</div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#111",
                    }}
                  >
                    {currency(p.price)}
                  </div>
                  <button
                    onClick={() => cart.add(p.id)}
                    disabled={p.stock <= 0}
                    style={{
                      background: BRAND.primary,
                      color: "#111",
                      padding: "6px 10px",
                      borderRadius: 10,
                      opacity: p.stock <= 0 ? 0.6 : 1,
                    }}
                  >
                    {p.stock > 0 ? "Add" : "Out of stock"}
                  </button>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                  Stock: {p.stock}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== WhatsApp Contact ===== */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "28px 16px",
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>Chat with us on WhatsApp</h3>
        <p style={{ marginTop: 6, color: "#555" }}>
          Quick questions, price checks, or orders—message us anytime.
        </p>
        <a
          href="https://wa.me/254715151010?text=Hi%20Mastermind%2C%20I%20have%20a%20question%20about..."
          target="_blank"
          rel="noreferrer"
          style={{
            marginTop: 12,
            display: "inline-flex",
            background: "#25D366",
            color: "#111",
            padding: "10px 16px",
            borderRadius: 12,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          💬 WhatsApp 0715 151 010
        </a>
      </section>

      {/* ===== Footer ===== */}
      <footer
        style={{
          textAlign: "center",
          color: "#999",
          fontSize: 12,
          padding: "16px 0",
        }}
      >
        © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
      </footer>
    </div>
  );
}
