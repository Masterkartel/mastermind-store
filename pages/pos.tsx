import { useEffect, useMemo, useState } from "react";

type Role = "admin" | "clerk";

type User = {
  id: string;
  name: string;
  pin: string;
  role: Role;
  active: boolean;
};

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  img?: string;
  sku?: string;
  product_code?: string;
};

type CustomerOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: "new" | "processing" | "completed";
  createdAt: string;
};

type SaleItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
};

type Sale = {
  id: string;
  createdAt: string;
  soldBy: string;
  customerName?: string;
  customerPhone?: string;
  total: number;
  type: "sale" | "quotation";
  status: string;
  items: SaleItem[];
};

type CartMap = Record<string, number>;

const LS_USERS = "mastermind_users_v1";
const LS_PRODUCTS = "mastermind_products_v1";
const LS_SALES = "mastermind_sales_v1";
const LS_ORDERS = "mastermind_orders_v1";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export default function PosPage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<Role | "">("");

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartMap>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setProducts(safeRead<Product[]>(LS_PRODUCTS, []));
    setOrders(safeRead<CustomerOrder[]>(LS_ORDERS, []));
    setSales(safeRead<Sale[]>(LS_SALES, []));

    const onStorage = () => {
      setProducts(safeRead<Product[]>(LS_PRODUCTS, []));
      setOrders(safeRead<CustomerOrder[]>(LS_ORDERS, []));
      setSales(safeRead<Sale[]>(LS_SALES, []));
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      `${p.name} ${p.sku || ""} ${p.product_code || ""}`.toLowerCase().includes(q)
    );
  }, [products, search]);

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ product: products.find((p) => p.id === id), qty }))
        .filter((l) => l.product) as { product: Product; qty: number }[],
    [cart, products]
  );

  const total = useMemo(() => lines.reduce((s, l) => s + Number(l.product.price) * l.qty, 0), [lines]);

  function persistProducts(next: Product[]) {
    setProducts(next);
    safeWrite(LS_PRODUCTS, next);
  }

  function persistSales(next: Sale[]) {
    setSales(next);
    safeWrite(LS_SALES, next);
  }

  function persistOrders(next: CustomerOrder[]) {
    setOrders(next);
    safeWrite(LS_ORDERS, next);
  }

  function login() {
    setMsg("");
    const users = safeRead<User[]>(LS_USERS, []);
    const match = users.find((u) => u.name === name && u.pin === pin && u.active);

    if (!match) {
      setMsg("Invalid login credentials");
      return;
    }

    setLoggedIn(true);
    setRole(match.role);
    setMsg(`Welcome ${match.name}`);
  }

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));

  const minus = (id: string) =>
    setCart((c) => {
      const next = { ...c };
      const n = (next[id] || 0) - 1;
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });

  function submit(type: "sale" | "quotation") {
    if (!lines.length) return;

    const updatedProducts = [...products];

    if (type === "sale") {
      for (const line of lines) {
        const idx = updatedProducts.findIndex((p) => p.id === line.product.id);
        if (idx >= 0) {
          const current = Number(updatedProducts[idx].stock || 0);
          if (current < line.qty) {
            setMsg(`Not enough stock for ${line.product.name}`);
            return;
          }
          updatedProducts[idx] = { ...updatedProducts[idx], stock: current - line.qty };
        }
      }
    }

    const nextSale: Sale = {
      id: `TXN-${Date.now()}`,
      createdAt: new Date().toISOString(),
      soldBy: name,
      customerName: customerName || "Walk-in",
      customerPhone: customerPhone || "",
      total,
      type,
      status: type === "sale" ? "completed" : "quoted",
      items: lines.map((l) => ({
        productId: l.product.id,
        name: l.product.name,
        qty: l.qty,
        price: l.product.price,
      })),
    };

    if (type === "sale") {
      persistProducts(updatedProducts);
    }

    const nextSales = [nextSale, ...sales];
    persistSales(nextSales);

    printSlip(nextSale, type === "sale" ? "SALE RECEIPT" : "QUOTATION");

    setCart({});
    setCustomerName("");
    setCustomerPhone("");
    setMsg(`${type === "sale" ? "Sale" : "Quotation"} ${nextSale.id} created.`);
  }

  function updateOrder(id: string, status: CustomerOrder["status"]) {
    const next = orders.map((o) => (o.id === id ? { ...o, status } : o));
    persistOrders(next);
  }

  function printSlip(doc: Sale, title: string) {
    const w = window.open("", "_blank", "width=380,height=650");
    if (!w) return;

    w.document.write(`
      <html>
        <body style="font-family:monospace;padding:16px;">
          <h3>${title}</h3>
          <p>
            ID: ${doc.id}<br/>
            Date: ${new Date(doc.createdAt).toLocaleString()}<br/>
            Customer: ${doc.customerName || "Walk-in"}<br/>
            Phone: ${doc.customerPhone || "-"}<br/>
            Served by: ${doc.soldBy}
          </p>
          <hr/>
          ${doc.items.map((i) => `<div>${i.name} x${i.qty} @ ${i.price}</div>`).join("")}
          <hr/>
          <h3>Total: KES ${Number(doc.total).toLocaleString()}</h3>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <main className="page-shell">
      <section className="hero card dark-card">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div>
          <h1>Mastermind POS</h1>
          <p>Fast sales, quotations, receipts, walk-in customers and online order handling.</p>
          <div className="hero-mini">
            <span className="hero-pill">Admin and Clerk access</span>
            <span className="hero-pill">Print receipts</span>
            <span className="hero-pill">Stock reduces on sale</span>
          </div>
        </div>
      </section>

      {!loggedIn ? (
        <section className="card login-card">
          <h2>POS Login</h2>
          <input
            className="input"
            placeholder="Admin or Clerk name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button className="btn btn-primary" onClick={login}>
            Login
          </button>
          <div className="feedback">{msg}</div>
        </section>
      ) : (
        <div className="stack">
          <section className="card top-strip">
            <div>
              <b>Logged in as:</b> {name}
              <div className="muted">Role: {role}</div>
            </div>
            <div className="pill-dark">Live POS Session</div>
          </section>

          <div className="grid-main">
            <section className="card">
              <div className="split-head">
                <h2>Products</h2>
                <input
                  className="input search-input"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="product-grid">
                {visibleProducts.map((p) => (
                  <button key={p.id} onClick={() => add(p.id)} className="product-tile">
                    {p.img ? <img src={p.img} alt={p.name} className="tile-img" /> : <div className="tile-img empty" />}
                    <b>{p.name}</b>
                    <div>KES {Number(p.price).toLocaleString()}</div>
                    <small>Stock {p.stock}</small>
                  </button>
                ))}
              </div>
            </section>

            <aside className="card sticky-cart">
              <h3>Cart</h3>

              {lines.length === 0 ? (
                <p className="muted">No items in cart.</p>
              ) : (
                lines.map((l) => (
                  <div key={l.product.id} className="cart-line">
                    <div>
                      <strong>{l.product.name}</strong>
                      <div className="muted-small">KES {Number(l.product.price).toLocaleString()}</div>
                    </div>
                    <div className="qty-wrap">
                      <button className="qty-btn minus" onClick={() => minus(l.product.id)}>
                        -
                      </button>
                      <b>{l.qty}</b>
                      <button className="qty-btn plus" onClick={() => add(l.product.id)}>
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}

              <div className="total">Total: KES {total.toLocaleString()}</div>

              <input
                className="input"
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                className="input"
                placeholder="Customer phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />

              <div className="action-stack">
                <button className="btn btn-primary" onClick={() => submit("sale")} disabled={!lines.length}>
                  Complete Sale & Print Receipt
                </button>
                <button className="btn btn-dark" onClick={() => submit("quotation")} disabled={!lines.length}>
                  Generate Quotation & Print
                </button>
              </div>

              <div className="feedback">{msg}</div>
            </aside>
          </div>

          <section className="card">
            <h2>Online Orders ({orders.length})</h2>
            {orders.length === 0 ? (
              <p className="muted">No online orders.</p>
            ) : (
              orders.map((o) => (
                <article key={o.id} className="order-card">
                  <div>
                    <strong>{o.customerName}</strong> ({o.customerPhone})
                    <div className="muted-small">{new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="right">
                    <b>KES {Number(o.total).toLocaleString()}</b>
                    <div className="badge">{o.status}</div>
                  </div>
                  <div className="order-actions">
                    <button className="btn btn-soft" onClick={() => updateOrder(o.id, "new")}>
                      New
                    </button>
                    <button className="btn btn-primary" onClick={() => updateOrder(o.id, "processing")}>
                      Processing
                    </button>
                    <button className="btn btn-dark" onClick={() => updateOrder(o.id, "completed")}>
                      Completed
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      )}

      <style jsx>{`
        .page-shell {
          max-width: 1280px;
          margin: 0 auto;
          padding: 16px;
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(250, 204, 21, 0.14), transparent 22%),
            radial-gradient(circle at bottom right, rgba(17, 24, 39, 0.08), transparent 24%),
            linear-gradient(180deg, #fffdf4 0%, #ffffff 100%);
          color: #111827;
        }
        .stack { display: grid; gap: 16px; }
        .card {
          background: linear-gradient(180deg, #ffffff 0%, #fffdf5 100%);
          border: 1px solid rgba(250, 204, 21, 0.28);
          border-top: 4px solid #111827;
          border-radius: 24px;
          padding: 16px;
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
          position: relative;
          overflow: hidden;
        }
        .dark-card {
          background: linear-gradient(135deg, #111827 0%, #1f2937 46%, #2b2b2b 100%);
          color: #fff;
        }
        .hero h1 { margin: 0 0 8px; color: #facc15; }
        .hero p { margin: 0 0 12px; color: #e5e7eb; }
        .hero-mini { display: flex; gap: 8px; flex-wrap: wrap; }
        .hero-pill, .pill-dark {
          background: rgba(250, 204, 21, 0.14);
          color: #fde68a;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(250, 204, 21, 0.2);
          font-size: 12px;
          font-weight: 700;
        }
        .pill-dark { background: #111827; color: #facc15; }
        .orb {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
        }
        .orb-a {
          width: 180px; height: 180px; right: -60px; top: -70px;
          background: rgba(250, 204, 21, 0.12);
        }
        .orb-b {
          width: 120px; height: 120px; left: -30px; bottom: -30px;
          background: rgba(250, 204, 21, 0.07);
        }
        .login-card { max-width: 420px; }
        .top-strip {
          display: flex; justify-content: space-between; gap: 12px; align-items: center;
        }
        .grid-main {
          display: grid;
          grid-template-columns: 1.7fr 0.95fr;
          gap: 16px;
        }
        .sticky-cart { position: sticky; top: 12px; height: fit-content; }
        .split-head {
          display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 12px;
        }
        .split-head h2 { margin: 0; }
        .search-input { max-width: 280px; margin: 0; }
        .product-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .product-tile {
          text-align: left;
          border: 1px solid rgba(250, 204, 21, 0.2);
          padding: 10px;
          background: white;
          border-radius: 16px;
          cursor: pointer;
          display: grid;
          gap: 6px;
        }
        .tile-img {
          width: 100%; height: 120px; object-fit: contain;
          border-radius: 12px; background: #f8fafc; border: 1px solid #eceff3;
        }
        .tile-img.empty { background: linear-gradient(180deg, #fff7cc 0%, #fff 100%); }
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 12px 13px;
          margin-bottom: 10px;
          font: inherit;
          background: #fff;
          color: #111827;
          box-sizing: border-box;
        }
        .input:focus {
          outline: none;
          border-color: #facc15;
          box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.18);
        }
        .btn {
          border: none; border-radius: 14px; padding: 11px 14px; font-weight: 900; cursor: pointer;
        }
        .btn-primary {
          background: linear-gradient(180deg, #fde047 0%, #facc15 100%);
          color: #111827;
        }
        .btn-dark {
          background: linear-gradient(180deg, #111827 0%, #1f2937 100%);
          color: #facc15;
        }
        .btn-soft {
          background: #fff;
          color: #111827;
          border: 1px solid rgba(250, 204, 21, 0.28);
        }
        .feedback { color: #334155; font-weight: 700; }
        .muted { color: #64748b; }
        .muted-small { color: #64748b; font-size: 13px; }
        .cart-line {
          display: flex; justify-content: space-between; gap: 10px; align-items: center;
          padding: 10px 0; border-bottom: 1px dashed #e5e7eb;
        }
        .qty-wrap { display: flex; align-items: center; gap: 8px; }
        .qty-btn {
          width: 30px; height: 30px; border-radius: 10px; border: 1px solid #d1d5db;
          background: #fff; font-size: 18px; font-weight: 900; cursor: pointer;
        }
        .minus { color: #dc2626; }
        .plus { color: #16a34a; }
        .total { font-size: 18px; font-weight: 900; margin: 12px 0 10px; }
        .action-stack { display: grid; gap: 10px; }
        .order-card {
          border: 1px solid #eceff3;
          border-radius: 18px;
          padding: 12px;
          background: #fff;
          display: grid;
          gap: 10px;
          margin-top: 10px;
        }
        .right {
          display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
        }
        .badge {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 6px 10px; border-radius: 999px;
          background: #111827; color: #facc15; font-size: 12px; font-weight: 800;
        }
        .order-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        @media (max-width: 980px) {
          .grid-main { grid-template-columns: 1fr; }
          .sticky-cart { position: static; }
          .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 640px) {
          .page-shell { padding: 10px; }
          .card { border-radius: 20px; padding: 14px; }
          .top-strip, .split-head { flex-direction: column; align-items: stretch; }
          .search-input { max-width: none; }
          .product-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
          .tile-img { height: 100px; }
          .order-actions { display: grid; grid-template-columns: 1fr; }
          .order-actions .btn { width: 100%; }
        }
        @media (max-width: 420px) {
          .product-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
