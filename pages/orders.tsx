// pages/orders.tsx
import { useEffect, useState } from "react";
import { getOrders, type Order, setCart } from "@/lib/orders";
import Head from "next/head";
import Link from "next/link";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(getOrders());
  }, []);

  return (
    <>
      <Head>
        <title>My Orders • Mastermind</title>
      </Head>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <Link
            href="/"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            ← Back to Shop
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border p-6 text-center">
            <p className="mb-3 text-gray-600">No orders yet.</p>
            <Link
              href="/"
              className="inline-flex rounded-lg bg-black px-4 py-2 text-white"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((o) => (
              <li key={o.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm text-gray-500">
                      {new Date(o.createdAt).toLocaleString()}
                    </div>
                    <div className="text-lg font-semibold">
                      {o.items.length} item{o.items.length > 1 ? "s" : ""} • KES{" "}
                      {o.total.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Ref: <span className="font-mono">{o.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        o.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : o.status === "failed" || o.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {o.status.toUpperCase()}
                    </span>

                    <button
                      onClick={() => {
                        // Put items back into cart and go to shop
                        setCart(
                          o.items.map((it) => ({
                            id: it.id,
                            name: it.name,
                            price: it.price,
                            qty: it.qty,
                          }))
                        );
                        window.location.href = "/";
                      }}
                      className="rounded-lg bg-[#0AA5A0] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Reorder
                    </button>
                  </div>
                </div>

                <div className="mt-3 divide-y text-sm">
                  {o.items.map((it) => (
                    <div
                      key={`${o.id}-${it.id}`}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <div className="font-medium">{it.name}</div>
                        <div className="text-gray-500">
                          Qty {it.qty} × KES {it.price.toLocaleString()}
                        </div>
                      </div>
                      <div className="font-semibold">
                        KES {(it.price * it.qty).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-xs text-gray-500">
          Note: orders are stored on this device only. We can upgrade to
          account-based orders (email or phone login) anytime.
        </p>
      </div>
    </>
  );
}
