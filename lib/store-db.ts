import productsSeed from "../public/products.json";

export type Product = {
  id: string;
  name: string;
  product_code?: string;
  sku?: string;
  price: number;
  retail_price?: number;
  stock: number;
  img?: string;
  category?: string;
};

export type User = {
  id: string;
  name: string;
  role: "admin" | "clerk";
  pin: string;
  active: boolean;
  createdAt: string;
};

export type SaleItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
};

export type Sale = {
  id: string;
  createdAt: string;
  soldBy: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  total: number;
  type: "sale" | "quotation";
  status: "completed" | "quoted";
};

export type CustomerOrder = {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress?: string;
  notes?: string;
  items: SaleItem[];
  total: number;
  status: "new" | "processing" | "completed";
};

export type StoreDB = {
  products: Product[];
  users: User[];
  sales: Sale[];
  orders: CustomerOrder[];
};

declare global {
  // eslint-disable-next-line no-var
  var __MM_STORE__: StoreDB | undefined;
}

function seedProducts(): Product[] {
  const arr = Array.isArray(productsSeed) ? productsSeed : [];
  return arr.slice(0, 5000).map((p: any, idx: number) => ({
    id: String(p.id || p.product_code || p.sku || `P-${idx + 1}`),
    name: String(p.name || `Product ${idx + 1}`),
    product_code: p.product_code ? String(p.product_code) : undefined,
    sku: p.sku ? String(p.sku) : undefined,
    price: Number(p.retail_price ?? p.price ?? 0) || 0,
    retail_price: Number(p.retail_price ?? p.price ?? 0) || 0,
    stock: Number(p.stock ?? 0) || 0,
    img: p.img ? String(p.img) : undefined,
    category: p.category ? String(p.category) : undefined,
  }));
}

function seedStore(): StoreDB {
  return {
    products: seedProducts(),
    users: [
      {
        id: "admin-1",
        name: "Mastermind",
        role: "admin",
        pin: "Oury2933#",
        active: true,
        createdAt: new Date().toISOString(),
      },
    ],
    sales: [],
    orders: [],
  };
}

function encodeBase64(value: string) {
  if (typeof btoa === "function") return btoa(value);
  return Buffer.from(value, "utf8").toString("base64");
}

function decodeBase64(value: string) {
  if (typeof atob === "function") return atob(value);
  return Buffer.from(value, "base64").toString("utf8");
}

export async function ensureStoreFile() {
  if (!globalThis.__MM_STORE__) {
    globalThis.__MM_STORE__ = seedStore();
  }
}

export async function readStore(): Promise<StoreDB> {
  await ensureStoreFile();
  return globalThis.__MM_STORE__ as StoreDB;
}

export async function writeStore(next: StoreDB) {
  globalThis.__MM_STORE__ = next;
}

export function createToken(user: { id: string; role: string; pin: string }) {
  return encodeBase64(`${user.id}|${user.role}|${user.pin}`);
}

export function parseBearerToken(value = "") {
  const token = value.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const decoded = decodeBase64(token);
    const [id, role, pin] = decoded.split("|");
    if (!id || !role || !pin) return null;
    return { id, role, pin };
  } catch {
    return null;
  }
}

export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
