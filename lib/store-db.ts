import { promises as fs } from "fs";
import path from "path";

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

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

function cleanNum(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function seedFromPublicProducts(): Promise<Product[]> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "public", "products.json"), "utf8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 5000).map((p: any, idx: number) => ({
      id: String(p.id || p.product_code || p.sku || `P-${idx + 1}`),
      name: String(p.name || `Product ${idx + 1}`),
      product_code: p.product_code ? String(p.product_code) : undefined,
      sku: p.sku ? String(p.sku) : undefined,
      price: cleanNum(p.retail_price ?? p.price, 0),
      retail_price: cleanNum(p.retail_price ?? p.price, 0),
      stock: cleanNum(p.stock, 0),
      img: p.img ? String(p.img) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const products = await seedFromPublicProducts();
    const initial: StoreDB = {
      products,
      users: [
        {
          id: "admin-1",
          name: "Administrator",
          role: "admin",
          pin: process.env.DEFAULT_ADMIN_PIN || "1234",
          active: true,
          createdAt: new Date().toISOString(),
        },
      ],
      sales: [],
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

export async function readStore(): Promise<StoreDB> {
  await ensureStoreFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const db = JSON.parse(raw || "{}");
  return {
    products: Array.isArray(db.products) ? db.products : [],
    users: Array.isArray(db.users) ? db.users : [],
    sales: Array.isArray(db.sales) ? db.sales : [],
  };
}

export async function writeStore(next: StoreDB) {
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
}

export function createToken(user: { id: string; role: string; pin: string }) {
  return Buffer.from(`${user.id}|${user.role}|${user.pin}`).toString("base64");
}

export function parseBearerToken(value = "") {
  const token = value.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
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
