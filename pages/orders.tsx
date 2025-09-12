// pages/orders.tsx
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

type OrderItem = { id: string; name: string; price: number; qty: number };
type Order = {
  id: string;
  reference: string;
  date: string;
  total: number;
  name: string;
  phone: string;
  email: string;
  items: OrderItem[];
  status: "paid" | "pending";
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mm_orders") || "[]");
      setOrders(saved);
    } catch {}
  }, []);

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background:"#fafafa", minHeight:"100vh" }}>
      <Head>
        <title>My Orders • Mastermind</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <header style={{ background:"#111", color:"#fff" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"12px" }}>
          <Link href="/" style={{ color:"#fff", textDecoration:"none", fontWeight:800 }}>
            ← Back to Shop
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin:"0 auto", padding:"16px" }}>
        <h1 style={{ fontSize:28, fontWeight:800, marginBottom:12 }}>My Orders</h1>

        {orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <div style={{ display:"grid", gap:12 }}>
            {orders.map((o) => (
              <div key={o.id} style={{ background:"#fff", border:"1px solid #eee", borderRadius:12, padding:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontWeight:700 }}>
                  <span>Ref: {o.reference}</span>
                  <span>KES {o.total.toLocaleString("en-KE")}</span>
                </div>
                <div style={{ color:"#666", fontSize:14, marginBottom:8 }}>
                  {new Date(o.date).toLocaleString()} • {o.status.toUpperCase()}
                </div>
                <div style={{ color:"#444", fontSize:14, marginBottom:8 }}>
                  {o.name} • {o.phone} • {o.email}
                </div>
                <ul style={{ margin:0, paddingLeft:18 }}>
                  {o.items.map((it, i) => (
                    <li key={i}>{it.name} × {it.qty} — KES {(it.price * it.qty).toLocaleString("en-KE")}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
