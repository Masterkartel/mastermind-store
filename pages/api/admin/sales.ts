import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "../../../lib/admin-auth";
import { makeId, readStore, writeStore } from "../../../lib/store-db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await readStore();

  if (req.method === "GET") return res.status(200).json(db.sales.slice().reverse());

  if (req.method === "POST") {
    try {
      const { items = [], customerName = "", type = "sale" } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Items required" });

      let total = 0;
      const normalized = items.map((line: any) => {
        const product = db.products.find((p) => p.id === line.productId);
        if (!product) throw new Error(`Product not found: ${line.productId}`);

        const qty = Math.max(1, Number(line.qty) || 1);
        const price = Number(line.price ?? product.price) || 0;
        if (type === "sale" && Number(product.stock) < qty) throw new Error(`Insufficient stock for ${product.name}`);

        total += qty * price;
        return { productId: product.id, name: product.name, qty, price };
      });

      if (type === "sale") {
        for (const item of normalized) {
          const product = db.products.find((p) => p.id === item.productId);
          if (product) product.stock = Math.max(0, Number(product.stock) - item.qty);
        }
      }

      const sale = {
        id: makeId(type === "sale" ? "sale" : "quo"),
        createdAt: new Date().toISOString(),
        soldBy: user.name,
        customerName: customerName ? String(customerName) : undefined,
        items: normalized,
        total,
        type: type === "quotation" ? "quotation" : "sale",
        status: type === "quotation" ? "quoted" : "completed",
      } as const;

      db.sales.push(sale as any);
      await writeStore(db);
      return res.status(201).json(sale);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "Could not create transaction" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
