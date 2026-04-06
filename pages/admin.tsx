import { useEffect, useMemo, useState } from "react";

type Role = "admin" | "clerk";

type User = {
  id: string;
  name: string;
  role: Role;
  active: boolean;
};

type Product = {
  id: string;
  name: string;
  price: number;
  retail_price?: number;
  stock: number;
  sku?: string;
  product_code?: string;
  img?: string;
  category?: string;
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

type CustomerOrder = {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: "new" | "processing" | "completed";
  items: { name: string; qty: number }[];
};

const initialDraft = {
  name: "",
  price: "",
  stock: "",
  sku: "",
  product_code: "",
  img: "",
  category: "",
};

export default function AdminPage() {
  const [loginName, setLoginName] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [token, setToken] = useState("");
  const [me, setMe] = useState<{ id: string; name: string; role: Role } | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [draft, setDraft] = useState(initialDraft);
  const [editingId, setEditingId] = useState("");
  const [clerk, setClerk] = useState({ name: "", pin: "" });
  const [feedback, setFeedback] = useState("");
  const [tab, setTab] = useState<"overview" | "inventory" | "orders" | "sales" | "users">("overview");
  const [productSearch, setProductSearch] = useState("");

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const stats = useMemo(() => {
    const totalRevenue = sales
      .filter((s) => s.type === "sale")
      .reduce((sum, s) => sum + Number(s.total || 0), 0);

    const quotationValue = sales
      .filter((s) => s.type === "quotation")
      .reduce((sum, s) => sum + Number(s.total || 0), 0);

    const lowStock = products.filter((p) => Number(p.stock || 0) <= 3).length;
    const totalStockUnits = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
    const openOrders = orders.filter((o) => o.status !== "completed").length;
    const clerks = users.filter((u) => u.role === "clerk").length;

    return {
      totalRevenue,
      quotationValue,
      lowStock,
      totalStockUnits,
      openOrders,
      clerks,
    };
  }, [sales, products, orders, users]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) =>
      `${p.name} ${p.sku || ""} ${p.product_code || ""} ${p.category || ""}`.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  async function loadData(nextToken = token) {
    const headers = { Authorization: `Bearer ${nextToken}` };

    const [productsRes, usersRes, ordersRes, salesRes] = await Promise.all([
      fetch("/api/admin/products", { headers }),
      fetch("/api/admin/users", { headers }),
      fetch("/api/admin/orders", { headers }),
      fetch("/api/admin/sales", { headers }),
    ]);

    if (productsRes.ok) setProducts(await productsRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    if (ordersRes.ok) setOrders(await ordersRes.json());
    if (salesRes.ok) setSales(await salesRes.json());
  }

  async function login() {
    setFeedback("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: loginName, pin: loginPin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback(data.error || "Login failed");
        return;
      }

      if (data.user.role !== "admin") {
        setFeedback("Only admin can access this page.");
        return;
      }

      setToken(data.token);
      setMe(data.user);
      await loadData(data.token);
      setFeedback(`Welcome ${data.user.name}`);
    } catch {
      setFeedback("Network error during login.");
    }
  }

  async function saveProduct() {
    setFeedback("");

    const payload = {
      name: draft.name.trim(),
      price: Number(draft.price),
      stock: Number(draft.stock),
      sku: draft.sku.trim() || undefined,
      product_code: draft.product_code.trim() || undefined,
      img: draft.img.trim() || undefined,
      category: draft.category.trim() || undefined,
    };

    if (!payload.name || Number.isNaN(payload.price) || Number.isNaN(payload.stock)) {
      setFeedback("Enter valid product name, price and stock.");
      return;
    }

    try {
      if (!editingId) {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setFeedback(data.error || "Could not add product");
          return;
        }
        setProducts((prev) => [data, ...prev]);
        setDraft(initialDraft);
        setFeedback("Product created.");
        return;
      }

      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ id: editingId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Could not update product");
        return;
      }
      setProducts((prev) => prev.map((p) => (p.id === editingId ? data : p)));
      setEditingId("");
      setDraft(initialDraft);
      setFeedback("Product updated.");
    } catch {
      setFeedback("Network error while saving product.");
    }
  }

  function editProduct(product: Product) {
    setEditingId(product.id);
    setDraft({
      name: product.name || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? ""),
      sku: product.sku || "",
      product_code: product.product_code || "",
      img: product.img || "",
      category: product.category || "",
    });
    setTab("inventory");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteProduct(id: string) {
    const ok = window.confirm("Delete this product?");
    if (!ok) return;

    try {
      const res = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: authHeaders,
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Could not delete product");
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setFeedback("Product deleted.");
    } catch {
      setFeedback("Network error while deleting product.");
    }
  }

  async function createClerk() {
    if (!clerk.name.trim() || !clerk.pin.trim()) {
      setFeedback("Enter clerk name and password.");
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: clerk.name.trim(),
          pin: clerk.pin.trim(),
          role: "clerk",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Could not create clerk");
        return;
      }
      setUsers((prev) => [...prev, data]);
      setClerk({ name: "", pin: "" });
      setFeedback("Clerk account created.");
    } catch {
      setFeedback("Network error while creating clerk.");
    }
  }

  async function removeUser(id: string) {
    const ok = window.confirm("Delete this clerk?");
    if (!ok) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: authHeaders,
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Could not delete user");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setFeedback("User deleted.");
    } catch {
      setFeedback("Network error while deleting clerk.");
    }
  }

  async function setOrderStatus(id: string, status: CustomerOrder["status"]) {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Could not update order");
        return;
      }
      setOrders((prev) => prev.map((o) => (o.id === id ? data : o)));
      setFeedback(`Order ${id} updated to ${status}.`);
    } catch {
      setFeedback("Network error while updating order.");
    }
  }

  return (
    <main className="page-shell">
      <section className="hero card dark-card">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div>
          <h1>Mastermind Admin</h1>
          <p>Inventory, users, orders, POS analysis and product publishing.</p>
          <div className="hero-mini">
            <span className="hero-pill">Admin login only</span>
            <span className="hero-pill">Creates clerk accounts</span>
            <span className="hero-pill">Matches customer tone</span>
          </div>
        </div>
      </section>

      {!token ? (
        <section className="card login-card">
          <h2>Admin Login</h2>
          <input
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            placeholder="Admin name"
            className="input"
          />
          <input
            value={loginPin}
            onChange={(e) => setLoginPin(e.target.value)}
            placeholder="Password"
            type="password"
            className="input"
          />
          <button onClick={login} className="btn btn-primary">
            Login
          </button>
          <p className="feedback">{feedback}</p>
        </section>
      ) : (
        <div className="stack">
          <section className="card topbar">
            <div>
              <b>{me?.name}</b>
              <div className="muted">Role: {me?.role}</div>
            </div>
            <div className="tabs">
              {[
                ["overview", "Overview"],
                ["inventory", "Inventory"],
                ["orders", "Orders"],
                ["sales", "Sales"],
                ["users", "Users"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={`tab-btn ${tab === value ? "tab-active" : ""}`}
                  onClick={() => setTab(value as typeof tab)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {tab === "overview" && (
            <>
              <section className="stats-grid">
                <div className="card stat-card">
                  <span className="stat-label">Revenue</span>
                  <strong>KES {stats.totalRevenue.toLocaleString()}</strong>
                </div>
                <div className="card stat-card">
                  <span className="stat-label">Quotations Value</span>
                  <strong>KES {stats.quotationValue.toLocaleString()}</strong>
                </div>
                <div className="card stat-card">
                  <span className="stat-label">Products</span>
                  <strong>{products.length}</strong>
                </div>
                <div className="card stat-card">
                  <span className="stat-label">Stock Units</span>
                  <strong>{stats.totalStockUnits}</strong>
                </div>
                <div className="card stat-card">
                  <span className="stat-label">Low Stock</span>
                  <strong>{stats.lowStock}</strong>
                </div>
                <div className="card stat-card">
                  <span className="stat-label">Clerks</span>
                  <strong>{stats.clerks}</strong>
                </div>
              </section>

              <section className="grid-2">
                <div className="card">
                  <h2>Recent Orders</h2>
                  {orders.length === 0 ? (
                    <p className="muted">No customer orders yet.</p>
                  ) : (
                    orders.slice(0, 5).map((o) => (
                      <article key={o.id} className="row-card">
                        <div>
                          <strong>{o.customerName}</strong>
                          <div className="muted-small">{o.customerPhone}</div>
                        </div>
                        <div className="right">
                          <b>KES {Number(o.total).toLocaleString()}</b>
                          <div className="badge">{o.status}</div>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                <div className="card">
                  <h2>Recent Sales</h2>
                  {sales.length === 0 ? (
                    <p className="muted">No sales yet.</p>
                  ) : (
                    sales.slice(0, 5).map((s) => (
                      <article key={s.id} className="row-card">
                        <div>
                          <strong>{s.customerName || "Walk-in"}</strong>
                          <div className="muted-small">{s.soldBy}</div>
                        </div>
                        <div className="right">
                          <b>KES {Number(s.total).toLocaleString()}</b>
                          <div className="badge">{s.type}</div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </>
          )}

          {tab === "inventory" && (
            <>
              <section className="grid-2">
                <div className="card">
                  <h2>{editingId ? "Edit Product" : "Add Product"}</h2>
                  <div className="form-grid">
                    <input
                      className="input"
                      placeholder="Product name"
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="Price"
                      value={draft.price}
                      onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="Stock"
                      value={draft.stock}
                      onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="SKU"
                      value={draft.sku}
                      onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="Product code"
                      value={draft.product_code}
                      onChange={(e) => setDraft((d) => ({ ...d, product_code: e.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="Category"
                      value={draft.category}
                      onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                    />
                    <input
                      className="input input-span"
                      placeholder="Image URL"
                      value={draft.img}
                      onChange={(e) => setDraft((d) => ({ ...d, img: e.target.value }))}
                    />
                  </div>

                  {draft.img ? (
                    <div className="preview-card">
                      <img src={draft.img} alt="Preview" className="preview-img" />
                    </div>
                  ) : null}

                  <div className="action-row">
                    <button onClick={saveProduct} className="btn btn-primary">
                      {editingId ? "Save Changes" : "Add Product"}
                    </button>
                    {editingId ? (
                      <button
                        onClick={() => {
                          setEditingId("");
                          setDraft(initialDraft);
                        }}
                        className="btn btn-dark"
                      >
                        Cancel Edit
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="card">
                  <h2>Inventory Snapshot</h2>
                  <div className="mini-stats">
                    <div className="mini-box">
                      <span>Products</span>
                      <strong>{products.length}</strong>
                    </div>
                    <div className="mini-box">
                      <span>Low Stock</span>
                      <strong>{stats.lowStock}</strong>
                    </div>
                    <div className="mini-box">
                      <span>Total Units</span>
                      <strong>{stats.totalStockUnits}</strong>
                    </div>
                  </div>
                  <p className="muted">
                    Products added here sync into the customer page and POS because all three use the same live store API.
                  </p>
                </div>
              </section>

              <section className="card">
                <div className="split-head">
                  <h2>Products ({filteredProducts.length})</h2>
                  <input
                    className="input search-input"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>

                <div className="product-list">
                  {filteredProducts.map((p) => (
                    <article key={p.id} className="product-row">
                      <div className="product-main">
                        {p.img ? <img src={p.img} alt={p.name} className="row-img" /> : <div className="row-img empty" />}
                        <div>
                          <strong>{p.name}</strong>
                          <div className="muted-small">
                            {p.category || "Uncategorized"} • SKU: {p.sku || "-"} • Code: {p.product_code || "-"}
                          </div>
                          <div className="muted-small">Stock: {p.stock}</div>
                        </div>
                      </div>

                      <div className="product-actions">
                        <b>KES {Number(p.price).toLocaleString()}</b>
                        <button className="btn btn-soft" onClick={() => editProduct(p)}>
                          Edit
                        </button>
                        <button className="btn btn-danger" onClick={() => deleteProduct(p.id)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}

          {tab === "orders" && (
            <section className="card">
              <h2>Customer Orders ({orders.length})</h2>
              {orders.length === 0 ? (
                <p className="muted">No customer orders yet.</p>
              ) : (
                orders.map((o) => (
                  <article key={o.id} className="order-card">
                    <div className="order-top">
                      <div>
                        <strong>
                          {o.customerName} • {o.customerPhone}
                        </strong>
                        <div className="muted-small">{new Date(o.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="right">
                        <b>KES {Number(o.total).toLocaleString()}</b>
                        <div className="badge">{o.status}</div>
                      </div>
                    </div>

                    <div className="muted-small">{o.items.map((it) => `${it.name} x${it.qty}`).join(", ")}</div>

                    <div className="action-row wrap">
                      {(["new", "processing", "completed"] as const).map((s) => (
                        <button
                          key={s}
                          className={`btn ${s === "completed" ? "btn-dark" : "btn-soft"}`}
                          onClick={() => setOrderStatus(o.id, s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </section>
          )}

          {tab === "sales" && (
            <section className="card">
              <h2>Sales & Quotations ({sales.length})</h2>
              {sales.length === 0 ? (
                <p className="muted">No sales recorded yet.</p>
              ) : (
                sales.map((s) => (
                  <article key={s.id} className="row-card">
                    <div>
                      <strong>{s.type.toUpperCase()}</strong>
                      <div className="muted-small">
                        {s.id} • {s.customerName || "Walk-in"} • {s.soldBy}
                      </div>
                      <div className="muted-small">{new Date(s.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="right">
                      <b>KES {Number(s.total).toLocaleString()}</b>
                      <div className="badge">{s.status}</div>
                    </div>
                  </article>
                ))
              )}
            </section>
          )}

          {tab === "users" && (
            <section className="grid-2">
              <div className="card">
                <h2>Create Clerk</h2>
                <input
                  className="input"
                  placeholder="Clerk name"
                  value={clerk.name}
                  onChange={(e) => setClerk((c) => ({ ...c, name: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Password"
                  value={clerk.pin}
                  onChange={(e) => setClerk((c) => ({ ...c, pin: e.target.value }))}
                />
                <button onClick={createClerk} className="btn btn-primary">
                  Create Clerk
                </button>
                <p className="muted">
                  Clerks created here can log into <b>/pos</b> immediately.
                </p>
              </div>

              <div className="card">
                <h2>Users ({users.length})</h2>
                {users.map((u) => (
                  <article key={u.id} className="row-card">
                    <div>
                      <strong>{u.name}</strong>
                      <div className="muted-small">
                        {u.role} • {u.active ? "active" : "inactive"}
                      </div>
                    </div>
                    <div className="action-row">
                      {u.role === "clerk" ? (
                        <button className="btn btn-danger" onClick={() => removeUser(u.id)}>
                          Delete
                        </button>
                      ) : (
                        <span className="badge">Admin</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <p className="feedback">{feedback}</p>
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
        .hero-pill {
          background: rgba(250, 204, 21, 0.14);
          color: #fde68a;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(250, 204, 21, 0.2);
          font-size: 12px;
          font-weight: 700;
        }
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
        .topbar { display: grid; gap: 12px; }
        .tabs { display: flex; flex-wrap: wrap; gap: 8px; }
        .tab-btn {
          border: none; cursor: pointer; background: #111827; color: #f9fafb;
          border-radius: 999px; padding: 8px 12px; font-weight: 800;
        }
        .tab-active {
          background: linear-gradient(180deg, #fde047 0%, #facc15 100%);
          color: #111827;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
        }
        .stat-card { display: grid; gap: 8px; }
        .stat-label { color: #6b7280; font-size: 13px; font-weight: 700; }
        .stat-card strong { font-size: 22px; }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
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
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .input-span { grid-column: span 2; }
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
        .btn-danger { background: #ef4444; color: #fff; }
        .feedback { margin: 0; color: #334155; font-weight: 700; }
        .muted { color: #64748b; }
        .muted-small { color: #64748b; font-size: 13px; }
        .preview-card {
          border: 1px dashed #d1d5db;
          border-radius: 18px;
          padding: 12px;
          margin: 4px 0 10px;
          background: #fff;
        }
        .preview-img {
          width: 100%; max-height: 220px; object-fit: contain; border-radius: 12px;
        }
        .mini-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 10px;
        }
        .mini-box {
          background: linear-gradient(180deg, #fffef8 0%, #ffffff 100%);
          border: 1px solid rgba(250, 204, 21, 0.22);
          border-radius: 18px;
          padding: 12px;
          display: grid;
          gap: 4px;
        }
        .mini-box span { font-size: 12px; color: #64748b; font-weight: 700; }
        .mini-box strong { font-size: 20px; }
        .split-head {
          display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;
        }
        .split-head h2 { margin: 0; }
        .search-input { max-width: 280px; margin: 0; }
        .product-list { display: grid; gap: 12px; }
        .product-row, .row-card, .order-card {
          border: 1px solid #eceff3;
          border-radius: 18px;
          padding: 12px;
          background: #fff;
        }
        .product-row, .row-card {
          display: flex; justify-content: space-between; gap: 12px; align-items: center;
        }
        .order-card { display: grid; gap: 10px; }
        .order-top {
          display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;
        }
        .product-main {
          display: flex; gap: 12px; align-items: center; min-width: 0;
        }
        .row-img {
          width: 58px; height: 58px; border-radius: 12px; object-fit: cover;
          background: #f8fafc; border: 1px solid #e5e7eb; flex: 0 0 auto;
        }
        .row-img.empty { background: linear-gradient(180deg, #fff7cc 0%, #fff 100%); }
        .product-actions, .right, .action-row {
          display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end;
        }
        .product-actions { flex-direction: column; align-items: flex-end; }
        .wrap { justify-content: flex-start; }
        .badge {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 6px 10px; border-radius: 999px;
          background: #111827; color: #facc15; font-size: 12px; font-weight: 800;
        }
        @media (max-width: 1100px) {
          .stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 900px) {
          .grid-2 { grid-template-columns: 1fr; }
          .form-grid { grid-template-columns: 1fr; }
          .input-span { grid-column: span 1; }
          .split-head { flex-direction: column; align-items: stretch; }
          .search-input { max-width: none; }
        }
        @media (max-width: 640px) {
          .page-shell { padding: 10px; }
          .card { border-radius: 20px; padding: 14px; }
          .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .mini-stats { grid-template-columns: 1fr; }
          .product-row, .row-card, .order-top { flex-direction: column; align-items: stretch; }
          .product-actions, .right, .action-row { justify-content: flex-start; align-items: stretch; }
          .product-actions .btn, .action-row .btn { width: 100%; }
          .tabs { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; }
          .tab-btn { white-space: nowrap; flex: 0 0 auto; }
        }
      `}</style>
    </main>
  );
}
