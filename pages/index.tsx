import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

type Product = { id: string; name: string; price?: number; retail_price?: number; stock?: number; img?: string; product_code?: string; sku?: string };

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/catalog");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => `${p.name} ${p.product_code || ""} ${p.sku || ""}`.toLowerCase().includes(q));
  }, [products, query]);

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 20, fontFamily: "Inter, sans-serif" }}>
      <Head><title>Mastermind Electronics</title></Head>
      <h1>Mastermind Electronics Store</h1>
      <p>Now includes an operational Admin + POS system.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <a href="/admin">Open Admin Panel</a>
        <a href="/pos">Open POS Terminal</a>
      </div>
      <input placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: "100%", padding: 10, marginBottom: 12 }} />
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))" }}>
        {filtered.map((p) => (
          <article key={p.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, background: "white" }}>
            {p.img ? <img src={p.img} alt={p.name} style={{ width: "100%", height: 120, objectFit: "contain", background: "#f5f5f5" }} /> : null}
            <h3 style={{ fontSize: 16 }}>{p.name}</h3>
            <div>KES {Math.round(Number(p.retail_price ?? p.price ?? 0)).toLocaleString("en-KE")}</div>
            <small>Stock: {Number(p.stock || 0)}</small>
          </article>
        ))}
      </div>
    </main>
  );
}
