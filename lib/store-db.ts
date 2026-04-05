type Product = {
  id: string;
  name: string;
  product_code?: string;
  sku?: string;
  price: number;
  retail_price?: number;
  stock: number;
  img?: string;
};

type User = {
  id: string;
  name: string;
  role: "admin" | "clerk";
  pin: string;
  active: boolean;
  createdAt: string;
};

type SaleItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
};

type Sale = {
  id: string;
  createdAt: string;
  soldBy: string;
  customerName?: string;
  items: SaleItem[];
  total: number;
  type: "sale" | "quotation";
  status: "completed" | "quoted";
};

export type StoreDB = {
  products: Product[];
  users: User[];
  sales: Sale[];
};

declare global {
  // eslint-disable-next-line no-var
  var __MM_STORE__: StoreDB | undefined;
}

function seedStore(): StoreDB {
  return {
    products: [],
    users: [
      {
        id: "admin-1",
        name: "Administrator",
        role: "admin",
        pin: "1234",
        active: true,
        createdAt: new Date().toISOString(),
      },
    ],
    sales: [],
  };
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
  return btoa(`${user.id}|${user.role}|${user.pin}`);
}

export function parseBearerToken(value = "") {
  const token = value.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const decoded = atob(token);
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
