// lib/orders.ts

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number; // unit price
};

export type Order = {
  id: string;            // e.g. Paystack reference
  dateISO: string;       // new Date().toISOString()
  total: number;
  currency: string;      // "KES"
  items: OrderItem[];
  status?: "paid" | "pending" | "failed" | "refunded";
};

/** Append an order to localStorage (mm_orders). Safe on SSR. */
export function saveOrder(order: Order): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("mm_orders");
    const arr: Order[] = raw ? JSON.parse(raw) : [];
    arr.push(order);
    localStorage.setItem("mm_orders", JSON.stringify(arr));
  } catch {
    // ignore storage errors
  }
}

/** Read orders (newest first). Returns [] if none or SSR. */
export function getOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("mm_orders");
    const arr: Order[] = raw ? JSON.parse(raw) : [];
    return arr.sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""));
  } catch {
    return [];
  }
}
