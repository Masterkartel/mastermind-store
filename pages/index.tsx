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

  // ---- Paystack handler ----
  const handlePaystack = () => {
    const publicKey =
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
      "pk_test_xxxxxxxxxxxxxxxxxxxxxxxxx";

    const PaystackPop =
      typeof window !== "undefined"
        ? (window as any)?.PaystackPop
        : undefined;

    if (!PaystackPop) {
      alert("Couldn't start Paystack. Please refresh and try again.");
      return;
    }

    const handler = PaystackPop.setup({
      key: publicKey,
      email: "customer@example.com", // replace with customer email if available
      amount: cartTotal * 100, // amount in kobo
      currency: "KES",
      callback: function (response: any) {
        alert("Payment complete! Reference: " + response.reference);
        clear();
        setShowCart(false);
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
          <button
            onClick={() => setShowCart(true)}
            className="cartBtn"
            aria-label="Open cart"
          >
            🛒 Cart: {cartCount}
          </button>
        </div>
      </header>

      {/* ===== Hero & Services (same as before) ===== */}
      {/* ... keep your existing hero and services cards ... */}

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

      {/* ===== Footer (same as before) ===== */}
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

      {/* ===== Cart Drawer ===== */}
      {showCart && (
        <div className="overlay" onClick={() => setShowCart(false)}>
          <aside
            className="drawer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Cart"
          >
            <div className="drawer__top">
              <div className="h4">Your Cart</div>
              <div style={{ display: "flex", gap: 8 }}>
                {cartCount > 1 && (
                  <button
                    className="btn btn--light small"
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
                        <button
                          className="qtyBtn"
                          onClick={() => sub(l.product.id)}
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <div className="qtyNum">{l.qty}</div>
                        <button
                          className="qtyBtn"
                          onClick={() => add(l.product.id)}
                          aria-label="Increase"
                        >
                          +
                        </button>
                        <button
                          className="qtyBtn"
                          onClick={() => remove(l.product.id)}
                        >
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

              <button
                disabled={cartLines.length === 0}
                className={`btn ${
                  cartLines.length ? "btn--paystack" : "btn--disabled"
                }`}
                onClick={handlePaystack}
              >
                Pay with Paystack
              </button>
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

      <style jsx>{`
        /* Keep all your previous CSS here */
        .btn--paystack {
          background: #3bb75e;
          color: #fff;
          border: none;
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}
