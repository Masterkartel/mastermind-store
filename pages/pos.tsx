import { useMemo, useState } from "react";

type Product = { id: string; name: string; price: number; stock: number };
type CustomerOrder = { id: string; customerName: string; customerPhone: string; total: number; status: string; createdAt: string };
type CartMap = Record<string, number>;

export default function PosPage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [token, setToken] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [cart, setCart] = useState<CartMap>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [msg, setMsg] = useState("");

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ product: products.find((p) => p.id === id), qty }))
        .filter((l) => l.product) as { product: Product; qty: number }[],
    [cart, products]
  );
  const total = useMemo(() => lines.reduce((s, l) => s + Number(l.product.price) * l.qty, 0), [lines]);

  async function loadAll(authToken: string) {
    const headers = { Authorization: `Bearer ${authToken}` };
    const [pRes, oRes] = await Promise.all([
      fetch("/api/admin/products", { headers }),
      fetch("/api/admin/orders", { headers }),
    ]);
    if (pRes.ok) setProducts(await pRes.json());
    if (oRes.ok) setOrders(await oRes.json());
  }

  async function login() {
    setMsg("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error || "Login failed");
    if (data.user.role !== "clerk" && data.user.role !== "admin") return setMsg("Only clerk/admin can use POS");
    setToken(data.token);
    await loadAll(data.token);
  }

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));

  async function submit(type: "sale" | "quotation") {
    const items = lines.map((l) => ({ productId: l.product.id, qty: l.qty, price: l.product.price }));
    const res = await fetch("/api/admin/sales", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ items, type, customerName, customerPhone }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error || "Could not complete transaction");

    printSlip(data, type === "sale" ? "SALE RECEIPT" : "QUOTATION");
    setCart({});
    setMsg(`${type === "sale" ? "Sale" : "Quotation"} ${data.id} created.`);
    await loadAll(token);
  }

  function printSlip(doc: any, title: string) {
    const w = window.open("", "_blank", "width=360,height=600");
    if (!w) return;
    w.document.write(`<html><body style="font-family:monospace;padding:16px;"><h3>${title}</h3><p>ID: ${doc.id}<br/>Date: ${new Date(doc.createdAt).toLocaleString()}<br/>Customer: ${doc.customerName || "Walk-in"}<br/>Phone: ${doc.customerPhone || "-"}<br/>Served by: ${doc.soldBy}</p><hr/>${doc.items.map((i: any) => `<div>${i.name} x${i.qty} @ ${i.price}</div>`).join("")}<hr/><h3>Total: KES ${Number(doc.total).toLocaleString()}</h3></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      <h1>POS Terminal</h1>
      <p style={{ color: "#64748b" }}>Clerk access URL: <code>/pos</code></p>
      {!token ? (
        <div className="card" style={{ display: "grid", gap: 8, maxWidth: 360 }}>
          <input className="input" placeholder="Clerk/Admin name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="PIN" type="password" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button className="btn" onClick={login}>Login to POS</button>
          <div>{msg}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
          <section className="card">
            <h2>Products</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
              {products.map((p) => (
                <button key={p.id} onClick={() => add(p.id)} style={{ textAlign: "left", border: "1px solid #ddd", padding: 10, background: "white", borderRadius: 10 }}>
                  <b>{p.name}</b>
                  <div>KES {Number(p.price).toLocaleString()}</div>
                  <small>Stock {p.stock}</small>
                </button>
              ))}
            </div>
          </section>
          <aside className="card">
            <h3>Cart</h3>
            {lines.map((l) => <div key={l.product.id}>{l.product.name} x {l.qty}</div>)}
            <div style={{ marginTop: 10 }}>Total: KES {total.toLocaleString()}</div>
            <input className="input" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ marginTop: 8 }} />
            <input className="input" placeholder="Customer phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ marginTop: 8 }} />
            <button className="btn" onClick={() => submit("sale")} disabled={!lines.length} style={{ width: "100%", marginTop: 8 }}>Complete sale & print receipt</button>
            <button className="btn" onClick={() => submit("quotation")} disabled={!lines.length} style={{ width: "100%", marginTop: 8 }}>Generate quotation & print</button>
            <div style={{ marginTop: 8 }}>{msg}</div>
          </aside>

          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <h2>Online Orders ({orders.length})</h2>
            {orders.map((o) => (
              <article key={o.id} style={{ borderTop: "1px solid #e2e8f0", padding: "10px 0" }}>
                <strong>{o.customerName}</strong> ({o.customerPhone}) — KES {Number(o.total).toLocaleString()} • {o.status}
              </article>
            ))}
          </section>
        </div>
      )}
    </main>
  );
}
