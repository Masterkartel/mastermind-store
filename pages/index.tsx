// pages/index.tsx
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

type Product = {
  id: string;

  product_code?: string;

  name: string;

  category?: string;

  cost_price?: number;

  retail_price: number | string;

  stock?: number | string;

  img?: string;
};

type CartLine = { product: Product; qty: number };

// ---- LocalStorage keys ----
const CART_KEY = "mm_cart";
const ORDERS_KEY = "mm_orders";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [cartMap, setCartMap] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

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
      const saved = localStorage.getItem(CART_KEY);
      if (saved) setCartMap(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cartMap));
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
      .map(([id, qty]) =>
        byId[id] ? { product: byId[id], qty } : null
      )
      .filter(Boolean) as CartLine[];
  }, [cartMap, products]);

  const cartCount = useMemo(
    () => Object.values(cartMap).reduce((a, b) => a + b, 0),
    [cartMap]
  );

  const cartTotal = useMemo(
    () =>
      cartLines.reduce(
        (sum, l) =>
          sum +
          (Number(l.product.retail_price) || 0) *
            l.qty,
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
        `${p.name} ${p.product_code ?? ""} ${p.id}`
          .toLowerCase()
          .replace(/\s+/g, " ");

      return hay.includes(q);

    });

  }, [products, query]);

  const currency = (n: number) =>
    `KES ${Math.round(n).toLocaleString("en-KE")}`;

  // ---- Paystack handler ----
  const handlePaystack = () => {

    const PaystackPop =
      typeof window !== "undefined"
        ? (window as any)?.PaystackPop
        : undefined;

    if (!PaystackPop) {
      alert("Couldn't start Paystack. Refresh page.");
      return;
    }

    if (!customerName || !customerPhone || !customerEmail) {
      alert("Enter name, phone and email.");
      return;
    }

    if (cartLines.length === 0) {
      alert("Cart empty.");
      return;
    }

    const amountKES = Math.round(cartTotal);

    const itemsPayload = cartLines.map((l) => ({
      id: l.product.id,
      name: l.product.name,
      price: Number(l.product.retail_price) || 0,
      qty: l.qty,
      img: l.product.img || "",
    }));

    const handler = PaystackPop.setup({

      key: "pk_live_10bc141ee6ae2ae48edcd102c06540ffe1cb3ae6",

      email: customerEmail,

      amount: amountKES * 100,

      currency: "KES",

      metadata: {

        custom_fields: [

          {
            display_name: "Customer Name",
            variable_name: "customer_name",
            value: customerName
          },

          {
            display_name: "Phone",
            variable_name: "phone",
            value: customerPhone
          },

          {
            display_name: "Cart Items",
            variable_name: "cart_items",
            value: JSON.stringify(itemsPayload)
          }

        ]

      },

      callback: function (response: any) {

        const now = new Date();

        const newOrder = {

          id: `T${now.getTime()}`,

          reference: response.reference as string,

          createdAt: now.toISOString(),

          total: amountKES,

          status: "PENDING",

          paymentStatus: "PENDING",

          items: itemsPayload

        };

        try {

          const raw =
            localStorage.getItem(ORDERS_KEY);

          const arr =
            raw ? JSON.parse(raw) : [];

          const next =
            Array.isArray(arr)
              ? [...arr, newOrder]
              : [newOrder];

          localStorage.setItem(
            ORDERS_KEY,
            JSON.stringify(next)
          );

        } catch {}

        clear();

        setShowCart(false);

        window.location.href =
          `/orders?ref=${encodeURIComponent(
            response.reference
          )}`;

      },

      onClose: function () {

        alert("Payment window closed.");

      }

    });

    handler.openIframe();

  };

  return (

    <div
      style={{
        fontFamily: "Inter, ui-sans-serif",
        background: "#fafafa"
      }}
    >

      <Head>

        <title>
          Mastermind Electricals & Electronics
        </title>

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />

        <script
          src="https://js.paystack.co/v1/inline.js"
          async
        ></script>

      </Head>

      <div className="container">

        <input
          value={query}
          onChange={(e) =>
            setQuery(e.target.value)
          }
          placeholder="Search product or code"
          className="search"
        />

        <div className="productGrid">

          {filtered.map((p) => {

            const price =
              Number(p.retail_price) || 0;

            const stock =
              Number(p.stock) || 0;

            return (

              <article
                key={p.id}
                className="card"
              >

                <div className="card__img">

                  {p.img && (

                    <img
                      src={p.img}
                      alt={p.name}
                    />

                  )}

                </div>

                <div className="sku">

                  {p.product_code}

                </div>

                <div className="name">

                  {p.name}

                </div>

                <div className="price">

                  {currency(price)}

                </div>

                <div className="stock">

                  Stock: {stock}

                </div>

                {stock > 0 ? (

                  <button
                    onClick={() => add(p.id)}
                    className="btn"
                  >

                    Add

                  </button>

                ) : (

                  <div className="btn disabled">

                    Out of stock

                  </div>

                )}

              </article>

            );

          })}

        </div>

      </div>

    </div>

  );

}
