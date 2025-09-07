import React, { useMemo, useState, useEffect } from 'react';
import Head from 'next/head';
import { ShoppingCart, Search, Phone, MapPin, Truck, Check, X } from 'lucide-react';

const BRAND = { name:'Mastermind Electricals & Electronics', primary:'#F2C300', dark:'#111111' };
const CONTACT = {
  domain: process.env.NEXT_PUBLIC_BRAND_DOMAIN || 'www.mastermindelectricals.com',
  email: process.env.NEXT_PUBLIC_BRAND_EMAIL || 'sales@mastermindelectricals.com',
  till: process.env.NEXT_PUBLIC_TILL || '8636720',
};

function currency(kes:number){ return new Intl.NumberFormat('en-KE',{ style:'currency', currency:'KES', maximumFractionDigits:0 }).format(kes); }

function useCart(){
  const [items, setItems] = useState<Record<string, number>>({});
  const add = (id:string, qty=1)=> setItems(s=>({ ...s, [id]:(s[id]||0)+qty }));
  const remove = (id:string)=> setItems(s=>{ const { [id]:_, ...r } = s; return r; });
  const setQty = (id:string, qty:number)=> setItems(s=>({ ...s, [id]:Math.max(0, qty) }));
  return { items, add, remove, setQty };
}

export default function Home(){
  const cart = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [phone, setPhone] = useState('');
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(()=>{ fetch('/products.json').then(r=>r.json()).then(setProducts).catch(()=>{}); },[]);

  const lines = useMemo(()=> Object.entries(cart.items)
    .filter(([_,qty])=> (qty as number) > 0)
    .map(([id,qty])=>({ product: products.find(p=>p.id===id), qty })), [cart.items, products]);

  const total = useMemo(()=> lines.reduce((s,l)=> s + (Number(l.product?.price)||0) * (Number(l.qty)||0), 0), [lines]);

  const filtered = useMemo(()=>{
    let list = products.slice();
    if (q.trim()){
      const s = q.toLowerCase();
      list = list.filter((p:any)=>`${p.name ?? ''} ${p.sku ?? ''}`.toLowerCase().includes(s));
    }
    return list;
  }, [products, q]);

  async function requestStkPush(){
    if (!/^0?7\d{8}$/.test(phone)) { alert('Enter valid Safaricom number, e.g., 07XXXXXXXX'); return; }
    if (total <= 0) { alert('Your cart is empty.'); return; }
    const resp = await fetch('/api/mpesa', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ phone, amount: total, items: lines.map(l=>({ id:l.product.id, qty:l.qty })) }) });
    const data = await resp.json();
    if (data.ok) alert(`STK Push sent (Till ${CONTACT.till}). Enter your M-Pesa PIN.`);
    else alert('Payment error: ' + (data.error || 'unknown'));
  }

  return (
    <div style={{fontFamily:'Inter, ui-sans-serif'}}>
      <Head><title>Mastermind Electricals & Electronics</title></Head>

      {/* Top Bar */}
      <header style={{background:BRAND.dark, color:'#fff'}}>
        <div className="container" style={{maxWidth:1200, margin:'0 auto', padding:'10px 16px', display:'flex', gap:12, alignItems:'center', justifyContent:'space-between'}}>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <div style={{height:32,width:32,borderRadius:8, background:BRAND.primary}}/>
            <div>
              <div style={{fontSize:12, opacity:.8}}>Welcome to</div>
              <div style={{fontWeight:700}}>{BRAND.name}</div>
            </div>
          </div>
          <div className="hide-sm" style={{display:'flex', gap:16, alignItems:'center', fontSize:14, opacity:.9}}>
            <div style={{display:'flex', gap:6, alignItems:'center'}}><Phone size={16}/><span>{CONTACT.email}</span></div>
            <div style={{display:'flex', gap:6, alignItems:'center'}}><MapPin size={16}/><span>Sotik Town, Bomet</span></div>
          </div>
          <button onClick={()=>setCartOpen(true)} aria-label="Open cart"
            style={{background:'#fff', color:'#111', padding:'8px 12px', borderRadius:14, display:'flex', alignItems:'center', gap:6}}>
            <ShoppingCart size={16}/>Cart: {lines.length}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section style={{maxWidth:1200, margin:'0 auto', padding:'16px'}}>
        <div className="hero-grid" style={{display:'grid', gap:16, gridTemplateColumns:'2fr 1fr'}}>
          <div style={{background:'#fff', border:'1px solid #e5e5e5', borderRadius:16, padding:16, position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', right:-40, top:-40, height:160, width:160, borderRadius:999, background:BRAND.primary, opacity:.15}}/>
            <div style={{textTransform:'uppercase', fontSize:12, letterSpacing:1, color:'#111'}}>Trusted in Sotik</div>
            <h1 style={{margin:'8px 0 0', fontSize:28, fontWeight:800, color:'#111'}}>Quality Electronics, Lighting & Gas — Fast Delivery</h1>
            <p style={{marginTop:8, color:'#555'}}>Shop TVs, woofers, LED bulbs, and 6kg/13kg gas refills. Pay via M-Pesa. Pickup or same-day delivery.</p>
            <div style={{marginTop:12, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
              <div style={{background:BRAND.primary, color:'#111', fontSize:12, padding:'4px 8px', borderRadius:12, display:'inline-flex', alignItems:'center', gap:6}}><Truck size={12}/>Same-day delivery</div>
              <div style={{border:'1px solid #e5e5e5', fontSize:12, padding:'4px 8px', borderRadius:12, display:'inline-flex', alignItems:'center', gap:6}}><Check size={12}/>1-Year TV Warranty</div>
            </div>
          </div>
          <div style={{background:'#111', color:'#fff', borderRadius:16, padding:16, display:'flex', flexDirection:'column', justifyContent:'center'}}>
            <div style={{display:'flex', gap:8, alignItems:'center', fontWeight:600}}>Visit Our Shop</div>
            <div style={{marginTop:8, opacity:.9, fontSize:14}}>Mastermind Electricals & Electronics, Sotik Town</div>
            <div style={{marginTop:8, opacity:.75, fontSize:14}}>Open Mon-Sun • 7:30am – 8:00pm</div>
          </div>
        </div>
      </section>

      {/* Search only (no categories) */}
      <section style={{maxWidth:1200, margin:'0 auto', padding:'0 16px 8px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute', left:10, top:10, color:'#999'}}/>
          <input placeholder='Search products, e.g., "43 TV" or "bulb"' value={q} onChange={e=>setQ(e.target.value)}
            style={{width:'100%', padding:'10px 12px 10px 34px', border:'1px solid #ddd', borderRadius:10}}/>
        </div>
      </section>

      {/* Grid */}
      <section style={{maxWidth:1200, margin:'0 auto', padding:'8px 16px 20px'}}>
        <div className="grid" style={{display:'grid', gap:16, gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))'}}>
          {filtered.map((p:any)=> {
            const price = Number(p.price) || 0;
            const stock = Number(p.stock) || 0;
            return (
              <div key={p.id} style={{background:'#fff', border:'1px solid #e5e5e5', borderRadius:16, overflow:'hidden'}}>
                <div style={{position:'relative'}}>
                  <img
                    src={p.img || `/images/${p.id}.jpg`}
                    onError={(e)=>{ (e.currentTarget as HTMLImageElement).src='https://via.placeholder.com/600x360?text=Product'; }}
                    alt={p.name}
                    style={{height:140, width:'100%', objectFit:'cover'}}
                  />
                </div>
                <div style={{padding:12}}>
                  <div style={{fontSize:12, color:'#777'}}>SKU: {p.sku || '—'}</div>
                  <div style={{fontWeight:700, lineHeight:1.2, marginTop:2}}>{p.name}</div>
                  <div style={{marginTop:8, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <div style={{fontSize:18, fontWeight:800, color:'#111'}}>{currency(price)}</div>
                    <button
                      onClick={()=> cart.add(p.id)}
                      disabled={stock <= 0}
                      style={{
                        background:BRAND.primary, color:'#111', padding:'6px 10px', borderRadius:10,
                        opacity: stock <= 0 ? 0.6 : 1, whiteSpace:'nowrap'
                      }}>
                      {stock > 0 ? 'Add' : 'Out of stock'}
                    </button>
                  </div>
                  <div style={{marginTop:6, fontSize:12, color:'#666'}}>Stock: {stock}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer style={{maxWidth:1200, margin:'0 auto', padding:'16px'}}>
        <div style={{borderTop:'1px solid #eee', paddingTop:16, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16, fontSize:14}}>
          <div><div style={{fontWeight:700, color:'#111'}}>{BRAND.name}</div>
            <div style={{marginTop:8, color:'#555'}}>Genuine stock, fair prices, friendly support.</div></div>
          <div><div style={{fontWeight:700}}>Contact</div>
            <ul style={{marginTop:8, color:'#555', paddingLeft:16}}>
              <li>Email: {CONTACT.email}</li>
              <li>Website: {CONTACT.domain}</li>
              <li>M-Pesa Till: {CONTACT.till}</li>
              <li>Sotik Town, Bomet County</li>
            </ul>
          </div>
          <div><div style={{fontWeight:700}}>Payments</div>
            <ul style={{marginTop:8, color:'#555', paddingLeft:16}}>
              <li>M-Pesa Till {CONTACT.till} (Daraja STK Push)</li>
              <li>Cash on Delivery (local)</li>
            </ul>
          </div>
        </div>
        <div style={{textAlign:'center', color:'#999', fontSize:12, padding:'16px 0'}}>© {new Date().getFullYear()} Mastermind Electricals & Electronics.</div>
      </footer>

      {/* Cart Drawer */}
      <div aria-hidden={!cartOpen} style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display: cartOpen ? 'block' : 'none', zIndex:50
      }} onClick={(e)=>{ if (e.target===e.currentTarget) setCartOpen(false); }}>
        <aside role="dialog" aria-label="Shopping cart"
          style={{position:'absolute', right:0, top:0, bottom:0, width:'92vw', maxWidth:420, background:'#fff',
                  padding:16, overflow:'auto'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <h2 style={{fontWeight:800, fontSize:18}}>Your Cart</h2>
            <button aria-label="Close cart" onClick={()=>setCartOpen(false)} style={{background:'none', border:'none'}}><X/></button>
          </div>

          <div style={{marginTop:12}}>
            {lines.length === 0 && <div style={{color:'#666', fontSize:14}}>Your cart is empty.</div>}
            {lines.map(({product, qty})=>(
              <div key={product.id} style={{display:'flex', gap:10, alignItems:'center', padding:'10px 0', borderBottom:'1px solid #eee'}}>
                <img src={product.img || `/images/${product.id}.jpg`} alt={product.name}
                     onError={(e)=>{ (e.currentTarget as HTMLImageElement).src='https://via.placeholder.com/120x120?text=Item'; }}
                     style={{height:60, width:60, borderRadius:8, objectFit:'cover'}}/>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{product.name}</div>
                  <div style={{fontSize:12, color:'#666'}}>SKU: {product.sku || '—'}</div>
                  <div style={{marginTop:4, display:'flex', alignItems:'center', gap:8}}>
                    <button onClick={()=>cart.setQty(product.id, (qty as number)-1)} style={{padding:'2px 8px', border:'1px solid #ddd', borderRadius:8}}>-</button>
                    <div style={{minWidth:24, textAlign:'center'}}>{String(qty)}</div>
                    <button onClick={()=>cart.setQty(product.id, (qty as number)+1)} style={{padding:'2px 8px', border:'1px solid #ddd', borderRadius:8}}>+</button>
                    <button onClick={()=>cart.remove(product.id)} style={{marginLeft:'auto', background:'none', border:'1px solid #eee', borderRadius:8, padding:'4px 8px'}}>Remove</button>
                  </div>
                </div>
                <div style={{fontWeight:700}}>{currency((Number(product.price)||0) * (Number(qty)||0))}</div>
              </div>
            ))}
          </div>

          <div style={{borderTop:'1px solid #eee', marginTop:12, paddingTop:12}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
              <div style={{color:'#666'}}>Subtotal</div>
              <div style={{fontWeight:800}}>{currency(total)}</div>
            </div>
            <div style={{fontSize:12, color:'#666'}}>Delivery: Pickup (Free) or local delivery available.</div>

            <div style={{marginTop:10}}>
              <label style={{fontSize:12, color:'#444'}}>Safaricom Number</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="07XXXXXXXX"
                     style={{width:'100%', padding:'10px 12px', border:'1px solid #ddd', borderRadius:10, marginTop:6}}/>
            </div>

            <button onClick={requestStkPush}
              style={{marginTop:12, width:'100%', height:44, background:BRAND.primary, color:'#111', borderRadius:12, fontWeight:800}}>
              Pay with M-Pesa
            </button>
            <div style={{textAlign:'center', fontSize:12, color:'#777', marginTop:6}}>Secure STK Push • Till {CONTACT.till}</div>
          </div>
        </aside>
      </div>

      {/* Simple mobile CSS */}
      <style jsx>{`
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr; }
          .hide-sm { display: none !important; }
          .grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
        }
        @media (max-width: 420px) {
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>
    </div>
  );
}
