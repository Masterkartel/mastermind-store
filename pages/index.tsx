import React, { useMemo, useState, useEffect } from 'react';
import Head from 'next/head';
import { ShoppingCart, Search, Phone, MapPin, Truck, Check, Store } from 'lucide-react';

const BRAND = { name: 'Mastermind Electricals & Electronics', primary: '#F2C300', dark: '#111111' };
const CONTACT = {
  domain: process.env.NEXT_PUBLIC_BRAND_DOMAIN || 'www.mastermindelectricals.com',
  email: process.env.NEXT_PUBLIC_BRAND_EMAIL || 'sales@mastermindelectricals.com',
  till: process.env.NEXT_PUBLIC_TILL || '8636720',
};

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'tvs', name: 'TVs & Screens' },
  { id: 'audio', name: 'Woofers & Audio' },
  { id: 'lighting', name: 'Bulbs & Lighting' },
  { id: 'gas', name: 'Gas Cylinders & Refills' },
  { id: 'services', name: 'M-Pesa & Services' },
  { id: 'other', name: 'Other' },
];

function currency(kes: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(kes);
}

function useCart() {
  const [items, setItems] = useState<Record<string, number>>({});
  const add = (id: string, qty = 1) => setItems((s) => ({ ...s, [id]: (s[id] || 0) + qty }));
  const remove = (id: string) =>
    setItems((s) => {
      const { [id]: _, ...r } = s;
      return r;
    });
  const setQty = (id: string, qty: number) => setItems((s) => ({ ...s, [id]: Math.max(0, qty) }));
  return { items, add, remove, setQty };
}

export default function Home() {
  const cart = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('popular');
  const [phone, setPhone] = useState('');
  const [delivery, setDelivery] = useState('pickup');

  useEffect(() => {
    fetch('/products.json').then((r) => r.json()).then(setProducts).catch(() => {});
  }, []);

  const lines = useMemo(
    () =>
      Object.entries(cart.items)
        .filter(([_, q]: any) => q > 0)
        .map(([id, qty]: any) => ({ product: products.find((p) => p.id === id), qty })),
    [cart.items, products]
  );

  const total = useMemo(() => lines.reduce((s, l) => s + ((l.product?.price || 0) * l.qty), 0), [lines]);

  const filtered = useMemo(() => {
    let list = products.filter((p: any) => (category === 'all' ? true : p.category === category));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p: any) => `${p.name} ${p.desc ?? ''} ${p.sku ?? ''}`.toLowerCase().includes(q));
    }
    switch (sort) {
      case 'price-asc':
        list = list.slice().sort((a: any, b: any) => a.price - b.price);
        break;
      case 'price-desc':
        list = list.slice().sort((a: any, b: any) => b.price - a.price);
        break;
    }
    return list;
  }, [products, query, category, sort]);

  async function requestStkPush() {
    if (!/^0?7\d{8}$/.test(phone)) {
      alert('Enter valid Safaricom number, e.g., 07XXXXXXXX');
      return;
    }
    if (total <= 0) {
      alert('Your cart is empty.');
      return;
    }
    const resp = await fetch('/api/mpesa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        amount: total,
        items: lines.map((l) => ({ id: l.product.id, qty: l.qty })),
      }),
    });
    const data = await resp.json();
    if (data.ok) alert('STK Push sent via Safaricom Daraja (Till ' + CONTACT.till + '). Enter your M-Pesa PIN.');
    else alert('Payment error: ' + (data.error || 'unknown'));
  }

  return (
    <div style={{ fontFamily: 'Inter, ui-sans-serif' }}>
      <Head>
        <title>Mastermind Electricals & Electronics</title>
      </Head>

      {/* Top bar */}
      <div
        style={{
          background: BRAND.dark,
          color: 'white',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ height: 32, width: 32, borderRadius: 8, background: BRAND.primary }} />
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Welcome to</div>
            <div style={{ fontWeight: 600 }}>{BRAND.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 14, opacity: 0.9 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Phone size={16} />
            <span>{CONTACT.email}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <MapPin size={16} />
            <span>Sotik Town, Bomet</span>
          </div>
        </div>
        <button
          style={{
            background: 'white',
            color: '#111',
            padding: '8px 12px',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ShoppingCart size={16} />
          Cart: {lines.length}
        </button>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '2fr 1fr' }}>
          <div
            style={{
              background: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: 16,
              padding: 16,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: -40,
                top: -40,
                height: 160,
                width: 160,
                borderRadius: 80,
                background: BRAND.primary,
                opacity: 0.15,
              }}
            />
            <div style={{ textTransform: 'uppercase', fontSize: 12, letterSpacing: 1, color: '#111' }}>
              Trusted in Sotik
            </div>
            <h1 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800, color: '#111' }}>
              Quality Electronics, Lighting & Gas — Fast Delivery
            </h1>
            <p style={{ marginTop: 8, color: '#555' }}>
              Shop TVs, woofers, LED bulbs, and 6kg/13kg gas refills. Pay via M-Pesa. Pickup or same-day delivery.
            </p>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                style={{
                  background: BRAND.primary,
                  color: '#111',
                  fontSize: 12,
                  padding: '4px 8px',
                  borderRadius: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Truck size={12} />
                Same-day delivery
              </div>
              <div
                style={{
                  border: '1px solid #e5e5e5',
                  fontSize: 12,
                  padding: '4px 8px',
                  borderRadius: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Check size={12} />
                1-Year TV Warranty
              </div>
            </div>
          </div>
          <div
            style={{
              background: '#111',
              color: 'white',
              borderRadius: 16,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Store size={18} />
              <span style={{ fontWeight: 600 }}>Visit Our Shop</span>
            </div>
            <div style={{ marginTop: 8, opacity: 0.9, fontSize: 14 }}>
              Mastermind Electricals & Electronics, Sotik Town
            </div>
            <div style={{ marginTop: 8, opacity: 0.75, fontSize: 14 }}>Open Mon-Sun • 7:30am – 8:00pm</div>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#999' }} />
            <input
              placeholder='Search products, e.g., "43 TV" or "bulb"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #ddd', borderRadius: 8 }}
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }}
          >
            <option value='popular'>Popular</option>
            <option value='price-asc'>Price: Low → High</option>
            <option value='price-desc'>Price: High → Low</option>
          </select>
        </div>
      </div>

      {/* Products */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {filtered.map((p: any) => {
            const price = p.retail ?? p.price; // show retail if available
            const unit = p.unit || 'pcs';
            return (
              <div key={p.id} style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={p.img || 'https://via.placeholder.com/600x360?text=Product+Image'}
                    alt={p.name}
                    style={{ height: 160, width: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', left: 8, top: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {Array.isArray(p.badges)
                      ? p.badges.map((b: string) => (
                          <span
                            key={b}
                            style={{ background: BRAND.primary, color: '#111', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}
                          >
                            {b}
                          </span>
                        ))
                      : null}
                  </div>
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 12, color: '#777' }}>{p.sku}</div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: '#555' }}>{p.desc || ''}</div>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#111' }}>{currency(price)}</div>
                    <button
                      onClick={() => cart.add(p.id)}
                      disabled={p.stock <= 0}
                      style={{
                        background: BRAND.primary,
                        color: '#111',
                        padding: '6px 10px',
                        borderRadius: 10,
                        opacity: p.stock <= 0 ? 0.6 : 1,
                      }}
                    >
                      {p.stock > 0 ? 'Add' : 'Out of stock'}
                    </button>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
                    Stock: {p.stock} {unit}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
        <div
          style={{
            borderTop: '1px solid #eee',
            paddingTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))',
            gap: 16,
            fontSize: 14,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: '#111' }}>{BRAND.name}</div>
            <div style={{ marginTop: 8, color: '#555' }}>Tibet Yellow & Black brand. Genuine stock, fair prices, friendly support.</div>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Shop</div>
            <ul style={{ marginTop: 8, color: '#555', paddingLeft: 16 }}>
              <li>TVs & Screens</li>
              <li>Woofers & Audio</li>
              <li>Bulbs & Lighting</li>
              <li>Gas Refills</li>
            </ul>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Contact</div>
            <ul style={{ marginTop: 8, color: '#555', paddingLeft: 16 }}>
              <li>Email: {CONTACT.email}</li>
              <li>Website: {CONTACT.domain}</li>
              <li>M-Pesa Till: {CONTACT.till}</li>
              <li>Sotik Town, Bomet County</li>
            </ul>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Payments</div>
            <ul style={{ marginTop: 8, color: '#555', paddingLeft: 16 }}>
              <li>M-Pesa Till {CONTACT.till} (Daraja STK Push)</li>
              <li>Cash on Delivery (local)</li>
              <li>In-store M-Pesa Agent</li>
            </ul>
          </div>
        </div>
        <div style={{ textAlign: 'center', color: '#999', fontSize: 12, padding: '16px 0' }}>
          © {new Date().getFullYear()} Mastermind Electricals & Electronics. All rights reserved.
        </div>

        {/* Keep this inside the wrapper so JSX stays valid */}
        <div style={{ textAlign: 'center', color: '#666', marginTop: 6 }}>
          Checkout via Safaricom Daraja • Till {CONTACT.till}
        </div>
      </div>
    </div>
  );
}
