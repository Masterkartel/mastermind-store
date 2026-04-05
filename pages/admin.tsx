import { useMemo, useState } from "react";
import { barcodePattern } from "../lib/barcode";

type User = { id: string; name: string; role: "admin" | "clerk"; active: boolean };
type Product = { id: string; name: string; price: number; stock: number; sku?: string; product_code?: string; img?: string };

export default function AdminPage() {
  const [name, setName] = useState("Administrator");
  const [pin, setPin] = useState("1234");
  const [token, setToken] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [draft, setDraft] = useState({ name: "", price: "", stock: "", sku: "", product_code: "" });
  const [clerk, setClerk] = useState({ name: "", pin: "" });
  const [feedback, setFeedback] = useState("");

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  async function login() {
    setFeedback("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, pin }) });
    const data = await res.json();
    if (!res.ok) return setFeedback(data.error || "Login failed");
    setToken(data.token);
    await loadData(data.token);
    setFeedback(`Welcome ${data.user.name}`);
  }

  async function loadData(t = token) {
    const headers = { Authorization: `Bearer ${t}` };
    const [pRes, uRes] = await Promise.all([fetch("/api/admin/products", { headers }), fetch("/api/admin/users", { headers })]);
    if (pRes.ok) setProducts(await pRes.json());
    if (uRes.ok) setUsers(await uRes.json());
  }

  async function addProduct() {
    const res = await fetch("/api/admin/products", { method: "POST", headers: authHeaders, body: JSON.stringify({ ...draft, price: Number(draft.price), stock: Number(draft.stock) }) });
    const data = await res.json();
    if (!res.ok) return setFeedback(data.error || "Could not add product");
    setDraft({ name: "", price: "", stock: "", sku: "", product_code: "" });
    setProducts((prev) => [data, ...prev]);
    setFeedback("Product created.");
  }

  async function createClerk() {
    const res = await fetch("/api/admin/users", { method: "POST", headers: authHeaders, body: JSON.stringify({ name: clerk.name, pin: clerk.pin, role: "clerk" }) });
    const data = await res.json();
    if (!res.ok) return setFeedback(data.error || "Could not create clerk");
    setClerk({ name: "", pin: "" });
    setUsers((prev) => [...prev, data]);
    setFeedback("Clerk account created.");
  }

  function printBarcode(product: Product) {
    const pattern = barcodePattern(product.product_code || product.sku || product.id);
    const w = window.open("", "_blank", "width=420,height=320");
    if (!w) return;
    w.document.write(`<html><body style="font-family:sans-serif;padding:20px;"><h3>${product.name}</h3><div style="display:flex;align-items:flex-end;height:80px;gap:1px;">${pattern
      .split("")
      .map((b) => `<span style=\"display:inline-block;width:2px;height:${b === "1" ? 80 : 35}px;background:#000;\"></span>`)
      .join("")}</div><p>${product.product_code || product.sku || product.id}</p><p>Price: KES ${Number(product.price).toLocaleString()}</p></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 20, fontFamily: "Inter, sans-serif" }}>
      <h1>Admin Panel</h1>
      <p>Use this panel to manage products, create clerk accounts and print barcode labels.</p>
      {!token ? (
        <section style={{ display: "grid", gap: 8, maxWidth: 360 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Admin name" />
          <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" type="password" />
          <button onClick={login}>Login</button>
          <div>{feedback}</div>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(5,minmax(0,1fr))" }}>
            <input placeholder="Product name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            <input placeholder="Price" value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} />
            <input placeholder="Stock" value={draft.stock} onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))} />
            <input placeholder="SKU" value={draft.sku} onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))} />
            <input placeholder="Product code" value={draft.product_code} onChange={(e) => setDraft((d) => ({ ...d, product_code: e.target.value }))} />
          </div>
          <button onClick={addProduct}>Add product</button>

          <section>
            <h2>Create POS Clerk</h2>
            <div style={{ display: "flex", gap: 8, maxWidth: 500 }}>
              <input placeholder="Clerk name" value={clerk.name} onChange={(e) => setClerk((c) => ({ ...c, name: e.target.value }))} />
              <input placeholder="PIN" value={clerk.pin} onChange={(e) => setClerk((c) => ({ ...c, pin: e.target.value }))} />
              <button onClick={createClerk}>Create clerk</button>
            </div>
            <ul>{users.map((u) => <li key={u.id}>{u.name} ({u.role})</li>)}</ul>
          </section>

          <section>
            <h2>Products ({products.length})</h2>
            <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
              <thead><tr><th align="left">Name</th><th align="left">Price</th><th align="left">Stock</th><th align="left">Actions</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid #ddd" }}>
                    <td>{p.name}</td>
                    <td>KES {Number(p.price).toLocaleString()}</td>
                    <td>{p.stock}</td>
                    <td><button onClick={() => printBarcode(p)}>Print barcode</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <div>{feedback}</div>
        </div>
      )}
    </main>
  );
}
