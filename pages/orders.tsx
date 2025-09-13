import { useEffect, useState } from "react";

type Order = {
  id: string;
  amount: number;
  status: string;
  createdAt?: string;
  paidAt?: string;
  display?: string;
  items?: {
    name: string;
    price: number;
    quantity: number;
    total: number;
    img?: string;
  }[];
  reference?: string;
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function parseToMs(dateStr?: string) {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? undefined : d.getTime();
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<(Order & { _ts?: number })[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("orders");
    if (raw) {
      try {
        const parsed: Order[] = JSON.parse(raw);

        const normalized = parsed.map((o) => {
          const display =
            o.createdAt ||
            o.paidAt ||
            (o.id ? new Date(parseInt(o.id.replace(/^\D+/, ""))).toISOString() : undefined);

          let ts =
            parseToMs(o.paidAt) ??
            parseToMs(o.createdAt) ??
            parseToMs(display) ??
            Number(o.id.replace(/^\D+/, "")) ||
            0;

          return { ...o, display, _ts: ts };
        });

        // ✅ sort newest → oldest
        normalized.sort((a, b) => {
          const ta = a._ts ?? 0;
          const tb = b._ts ?? 0;
          if (tb > ta) return 1;
          if (tb < ta) return -1;
          return 0;
        });

        setOrders(normalized);
      } catch (e) {
        console.error("Failed to parse orders", e);
      }
    }
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200); // 1.2s
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Orders</h1>
      <button
        className="mb-4 px-3 py-1 bg-gray-200 rounded"
        onClick={() => (window.location.href = "/")}
      >
        ← Back to Shop
      </button>

      {orders.map((order) => (
        <div key={order.id} className="border rounded-lg p-3 mb-3 bg-white shadow">
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setExpanded(expanded === order.id ? null : order.id)}
          >
            <div>
              <div className="font-semibold">
                Order <span className="text-gray-700">#{order.id}</span>
              </div>
              <div className="text-sm text-gray-500">{formatDate(order.display)}</div>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 rounded-full text-sm ${
                  order.status.toLowerCase() === "successful"
                    ? "bg-green-100 text-green-700"
                    : order.status.toLowerCase() === "paid"
                    ? "bg-green-100 text-green-700"
                    : order.status.toLowerCase() === "failed"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
              <span className="font-semibold">KES {order.amount}</span>
            </div>
          </div>

          {expanded === order.id && (
            <div className="mt-3 space-y-2 text-sm">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  {item.img && (
                    <img src={item.img} alt={item.name} className="w-10 h-10 object-cover" />
                  )}
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div>
                      KES {item.price} × {item.quantity} ={" "}
                      <span className="font-semibold">KES {item.total}</span>
                    </div>
                  </div>
                </div>
              ))}

              {order.reference && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Reference</span>
                  <code className="bg-gray-100 px-2 py-1 rounded">{order.reference}</code>
                  <button
                    className="text-xs bg-purple-100 px-2 py-1 rounded"
                    onClick={() => copyToClipboard(order.reference!, order.id)}
                  >
                    Copy
                  </button>
                  {copiedId === order.id && (
                    <span className="ml-2 text-green-600 text-xs font-medium">Copied!</span>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <span className="text-gray-600">Status</span>
                <span
                  className={`px-2 py-1 rounded-full text-sm ${
                    order.status.toLowerCase() === "successful"
                      ? "bg-green-100 text-green-700"
                      : order.status.toLowerCase() === "paid"
                      ? "bg-green-100 text-green-700"
                      : order.status.toLowerCase() === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              <div>
                <span className="text-gray-600">Total</span>{" "}
                <span className="font-semibold">KES {order.amount}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
