// pages/index.tsx
import Head from "next/head";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import products from "@/data/products.json"; // <-- adjust if your path differs
import { saveOrder, type Order } from "@/lib/orders";

// ----------------- Types -----------------
type Product = {
  id: string;
  name: string;
  price: number; // KES
  sku?: string;
  stock?: number;
  img?: string; // /products/xxx.jpg
};

type CartLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

// --------------- Cart storage ------------
const CART_KEY = "mm_cart_v1";
function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const v = localStorage.getItem(CART_KEY);
    return v ? (JSON.parse(v) as CartLine[]) : [];
  } catch {
    return [];
  }
}
function writeCart(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
}

// ---------- Paystack checkout (NEW) ----------
async function startPaystackCheckout(
  totalKES: number,
  cartLines: CartLine[]
) {
  if (typeof window === "undefined") return;

  // Load Paystack JS if not already present
  if (!(window as any).PaystackPop) {
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    document.head.appendChild(s);
    await new Promise((res) => (s.onload = res));
  }

  const publicKey =
    process.env.NEXT_PUBLIC_PAYSTACK_KEY || "pk_live_xxx_replace_in_env";

  // @ts-ignore injected by script
  const PaystackPop = (window as any).PaystackPop;
  if (!PaystackPop) {
    alert("Couldn't start Paystack. Please refresh and try again.");
    return;
  }

  // Reference we also use as the local order id
  const ref = `MM-${Date.now()}`;

  // Save a local 'pending' order immediately (so it appears in My Orders)
  const pending: Order = {
    id: ref,
    createdAt: new Date().toISOString(),
    items: cartLines,
    total: totalKES,
    status: "pending",
    channel: "paystack",
  };
  saveOrder(pending);

  // IMPORTANT:
  // Until Paystack enables KES/Mobile Money on your account,
  // restrict channels to "card" to avoid "Currency not supported" popups.
  const handler = PaystackPop.setup({
    key: publicKey,
    email: "customer@mastermindelectricals.com",
    amount: totalKES, // base units; Paystack will interpret based on enabled currency/channel
    currency: "KES",
    channels: ["card"], // change to ["card","mobile_money"] after Paystack enables KES/M-Pesa for your account
    ref,
    callback: function () {
      window.location.href = `/paystack-status?reference=${encodeURIComponent(
        ref
      )}`;
    },
    onClose: function () {
      window.location.href = `/paystack-status?reference=${encodeURIComponent(
        ref
      )}&closed=1`;
    },
  });

  handler.openIframe();
}

// ----------------- Page -------------------
export default function HomePage() {
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    setCart(readCart());
  }, []);

  useEffect(() => {
    writeCart(cart);
  }, [cart]);

  const total = useMemo(
    () => cart.reduce((sum, l) => sum + l.price * l.qty, 0),
    [cart]
  );

  function addToCart(p: Product) {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.id === p.id);
      if (idx >= 0) {
        const cp = [...prev];
        cp[idx] = { ...cp[idx], qty: cp[idx].qty + 1 };
        return cp;
      }
      return [...prev, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((l) => l.id !== id));
  }

  function decQty(id: string) {
    setCart((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, qty: Math.max(1, l.qty - 1) } : l))
        .filter((l) => l.qty > 0)
    );
  }

  function incQty(id: string) {
    setCart((prev) => prev.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l)));
  }

  return (
    <>
      <Head>
        <title>Mastermind Electricals & Electronics</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Image src="/favicon-192.png" alt="logo" width={28} height={28} />
            <span className="text-sm font-semibold">
              Mastermind Electricals & Electronics
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* NEW: My Orders */}
            <a
              href="/orders"
              className="hidden rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 sm:inline-flex"
            >
              My Orders
            </a>

            <button
              className="rounded-full bg-yellow-400 px-3 py-2 text-sm font-semibold"
              onClick={() =>
                document.getElementById("cart-drawer")?.classList.remove("hidden")
              }
            >
              Cart: {cart.reduce((s, l) => s + l.qty, 0)}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
        {(products as Product[]).map((p) => (
          <div key={p.id} className="rounded-2xl border p-4">
            <div className="mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-gray-50">
              {p.img ? (
                <Image
                  src={p.img}
                  alt={p.name}
                  width={800}
                  height={600}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  No image
                </div>
              )}
            </div>
            <div className="mb-1 text-sm text-gray-500">{p.sku || ""}</div>
            <div className="text-lg font-semibold">{p.name}</div>
            <div className="mb-3 text-gray-700">KES {p.price.toLocaleString()}</div>
            <button
              onClick={() => addToCart(p)}
              className="w-full rounded-xl bg-black px-4 py-2 font-semibold text-white hover:opacity-90"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </main>

      {/* Cart Drawer */}
      <div
        id="cart-drawer"
        className="hidden fixed inset-0 z-20 bg-black/40"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.classList.add("hidden");
        }}
      >
        <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-auto bg-white p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Your Cart</h2>
            <button
              className="rounded-lg border px-3 py-1 text-sm"
              onClick={() =>
                document.getElementById("cart-drawer")?.classList.add("hidden")
              }
            >
              Close
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="rounded-xl border p-4 text-center text-gray-600">
              Cart is empty.
            </div>
          ) : (
            <>
              <ul className="divide-y">
                {cart.map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium">{l.name}</div>
                      <div className="text-sm text-gray-600">
                        KES {l.price.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg border px-2 py-1"
                        onClick={() => decQty(l.id)}
                      >
                        −
                      </button>
                      <span className="w-8 text-center">{l.qty}</span>
                      <button
                        className="rounded-lg border px-2 py-1"
                        onClick={() => incQty(l.id)}
                      >
                        +
                      </button>

                      <button
                        className="ml-2 rounded-lg border px-2 py-1 text-sm"
                        onClick={() => removeFromCart(l.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-xl border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="text-lg font-semibold">
                    KES {total.toLocaleString()}
                  </span>
                </div>

                {/* Paystack button (NEW color & copy) */}
                <button
                  onClick={() => startPaystackCheckout(total, cart)}
                  className="mt-2 w-full rounded-xl bg-[#0AA5A0] px-4 py-3 font-semibold text-white hover:opacity-90"
                >
                  Pay with Paystack
                </button>

                {/* My Orders quick link (mobile) */}
                <a
                  href="/orders"
                  className="mt-3 block w-full rounded-xl border px-4 py-3 text-center font-medium hover:bg-gray-50"
                >
                  My Orders
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
