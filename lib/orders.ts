// lib/orders.ts
export type CartLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export type Order = {
  id: string;              // same as paystack reference if available
  createdAt: string;       // ISO date
  items: CartLine[];
  total: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  channel: "paystack";
};

const ORDERS_KEY = "mm_orders_v1";
const CART_KEY = "mm_cart_v1";

// --- Storage helpers ---
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Orders API (local) ---
export function getOrders(): Order[] {
  return read<Order[]>(ORDERS_KEY, []);
}

export function saveOrder(order: Order) {
  const all = getOrders();
  all.unshift(order); // newest first
  write(ORDERS_KEY, all);
}

export function updateOrderStatus(id: string, status: Order["status"]) {
  const all = getOrders();
  const idx = all.findIndex(o => o.id === id);
  if (idx >= 0) {
    all[idx].status = status;
    write(ORDERS_KEY, all);
  }
}

// --- Cart helpers used by Orders page for "Reorder" ---
export function getCart(): CartLine[] {
  return read<CartLine[]>(CART_KEY, []);
}
export function setCart(lines: CartLine[]) {
  write(CART_KEY, lines);
}
