"use client";

import { useState, useEffect } from "react";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  items: OrderItem[];
  total: number;
  status: "Successful" | "Pending" | "Failed" | "Paid";
  createdAt: string;
};

const formatDateTime = (date: Date) => {
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const createdFromId = (id: string) => {
  const num = Number(String(id).replace(/^\D+/, ""));
  if (!Number.isFinite(num)) return null;
  const d = new Date(num);
  if (d.getTime() > 0 && d.getTime() < Date.now() + 86400000) {
    return formatDateTime(d);
  }
  return null;
};

const POSSIBLE_KEYS = ["orders", "mpesaOrders", "checkoutOrders"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;

    const load = () => {
      const merged: Order[] = [];
      for (const key of POSSIBLE_KEYS) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) merged.push(...arr);
        } catch {}
      }

      const normalized: Order[] = (merged || [])
        .filter((o) => o && typeof (o as any).id === "string")
        .map((o: any) => {
          const created =
            o.createdAt || createdFromId(o.id) || formatDateTime(new Date());
          const items: OrderItem[] = Array.isArray(o.items) ? o.items : [];
          return { ...o, createdAt: created, items };
        });

      // newest first
      normalized.sort((a, b) => {
        const na = Number(String(a.id).replace(/^\D+/, ""));
        const nb = Number(String(b.id).replace(/^\D+/, ""));
        if (Number.isFinite(na) && Number.isFinite(nb)) return nb - na;
        return 0;
      });

      setOrders(normalized);

      // default collapsed on (re)load
      const initialExpanded: Record<string, boolean> = {};
      normalized.forEach((o) => (initialExpanded[o.id] = false));
      setExpanded(initialExpanded);
    };

    // initial load
    load();

    // listen for updates coming from checkout write timing or other tabs
    const onStorage = (e: StorageEvent) => {
      if (!e.key || POSSIBLE_KEYS.includes(e.key)) load();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    // small delayed reloads to catch late writes right after redirect
    const t1 = setTimeout(load, 600);
    const t2 = setTimeout(load, 1500);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold mb-4">My Orders</h1>
      <button
        onClick={() => (window.location.href = "/")}
        className="mb-4 px-4 py-2 bg-gray-200 rounded"
      >
        ← Back to Shop
      </button>
      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border rounded p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => {
                navigator.clipboard.writeText(order.id).then(() => {
                  const el = document.createElement("div");
                  el.innerText = "Copied!";
                  el.style.position = "fixed";
                  el.style.bottom = "20px";
                  el.style.left = "50%";
                  el.style.transform = "translateX(-50%)";
                  el.style.background = "rgba(0,0,0,0.75)";
                  el.style.color = "#4ade80"; // green
                  el.style.padding = "6px 12px";
                  el.style.borderRadius = "6px";
                  el.style.fontSize = "14px";
                  el.style.zIndex = "9999";
                  document.body.appendChild(el);
                  setTimeout(() => el.remove(), 1200);
                });
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    Order <span className="text-gray-600">#{order.id}</span>
                  </p>
                  <p className="text-xs text-gray-500">{order.createdAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      order.status === "Successful"
                        ? "bg-green-100 text-green-500"
                        : order.status === "Paid"
                        ? "bg-gray-100 text-gray-500"
                        : order.status === "Failed"
                        ? "bg-red-100 text-red-500"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {order.status}
                  </span>
                  <span className="font-bold">KES {order.total}</span>
                </div>
              </div>
              {expanded[order.id] && (
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span>KES {item.price * item.quantity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <div className="text-right font-bold">
            Total KES{" "}
            {orders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}
