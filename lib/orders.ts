// lib/orders.ts

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number; // unit price
};

export type Order = {
  id: string; // e.g. Paystack reference
  dateISO: string;
  total: number;
  currency: string; // "KES"
  items: OrderItem[];
  status?: "paid" | "pending" | "failed" | "refunded";
};

/** Save an order to localStorage (no-op on server) */
export function saveOrder(order: Order): void {
  if (typeof window === "undefined") return; // SSR/Build guard
  try {
    const raw = localStorage.getItem("mm_orders");
    const arr: Order[] = raw ? JSON.parse(raw) : [];
    arr.push(order);
    localStorage.setItem("mm_orders", JSON.stringify(arr));
  } catch {
    // ignore storage errors
  }
}

/** Read orders from localStorage (empty on server) */
export function getOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("mm_orders");
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}
