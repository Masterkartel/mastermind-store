// pages/index.tsx
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { saveOrder, type Order } from "../lib/orders";

// ---------- Types ----------
type Product = {
  id: string;
  name: string;
  price: number;
  img?: string;
};

type CartLine = {
  product: Product;
  qty: number;
};

// ---------- Data ----------
const products: Product[] = [
  {
    id: "1-batt-torch",
    name: "1 Batt Torch",
    price: 250,
    img: "/products/1-batt-torch.jpg",
  },
  {
    id: "6kg-gas",
    name: "6KG Gas",
    price: 1450,
    img: "/products/6kg-gas.png",
  },
  {
    id: "13kg-gas",
    name: "13KG Gas",
    price: 3050,
    img: "/products/13kg-gas.png",
  },
];

// ---------- Component ----------
export default function Home() {
  const [cart, setCart] = useState<CartLine[]>([]);

  // compute totals
  const totalKES = useMemo(
    () => cart.reduce((sum, l) => sum + l.qty * l.product.price, 0),
    [cart]
  );

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === p.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((l) => l.product.id !== id));
  };

  // ---------- Paystack ----------
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const payWithPaystack = () => {
    if (cart.length === 0) {
      alert("Your cart is empty");
      return;
    }

    const ref = "REF" + Date.now();

    // Build a pending order
    const pending: Order = {
      id: ref,
      dateISO: new Date().toISOString(),
      currency: "KES",
      total: totalKES,
      items: cart.map((l) => ({
        id: l.product.id,
        name: l.product.name,
        qty: l.qty,
        price: l.product.price,
      })),
      status: "pending",
    };
    saveOrder(pending);

    // @ts-ignore PaystackPop injected globally
    const PaystackPop = (window as any).PaystackPop;
    if (!PaystackPop) {
      alert("Couldn't start Paystack. Please refresh and try again.");
      return;
    }

    const handler = PaystackPop.setup({
      key: "pk_live_10bc141ee6ae2ae48edcd102c06540ffe1cb3ae6", // your live public key
      email: "customer@example.com", // replace with customer email
      amount: totalKES * 100, // Paystack expects amount in kobo (100 = 1 KES)
      currency: "KES",
      ref,
      callback: function (response: any) {
        const paid: Order = {
          ...pending,
          id: response.reference,
          status: "paid",
          dateISO: new Date().toISOString(),
        };
        saveOrder(paid);
        alert("Payment successful! Reference: " + response.reference);
        setCart([]);
      },
      onClose: function () {
        alert("Payment window closed.");
      },
    });

    handler.openIframe();
  };

  // ---------- UI ----------
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Mastermind Store</h1>

      {/* Products */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {products.map((p) => (
          <div
            key={p.id}
            className="border rounded-xl shadow p-4 flex flex-col items-center"
          >
            {p.img && (
              <Image
                src={p.img}
                alt={p.name}
                width={150}
                height={150}
                className="mb-3"
              />
            )}
            <h2 className="text-lg font-semibold">{p.name}</h2>
            <p className="text-gray-600 mb-2">KES {p.price}</p>
            <button
              onClick={() => addToCart(p)}
              className="bg-black text-white px-3 py-1 rounded"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>

      {/* Cart */}
      <div className="border-t pt-6">
        <h2 className="text-2xl font-bold mb-4">Cart</h2>
        {cart.length === 0 ? (
          <p>No items yet.</p>
        ) : (
          <ul className="mb-4">
            {cart.map((l) => (
              <li
                key={l.product.id}
                className="flex justify-between items-center mb-2"
              >
                <span>
                  {l.product.name} x {l.qty}
                </span>
                <span>KES {l.qty * l.product.price}</span>
                <button
                  onClick={() => removeFromCart(l.product.id)}
                  className="text-red-500 ml-3"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="font-semibold">Total: KES {totalKES}</p>

        {/* Paystack button */}
        <button
          onClick={payWithPaystack}
          className="mt-4 px-6 py-2 rounded text-white"
          style={{ backgroundColor: "#08a045" }} // Paystack green
        >
          Pay with M-Pesa
        </button>
      </div>
    </main>
  );
}
