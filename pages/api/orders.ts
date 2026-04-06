export const config = { runtime: "edge" };

import type { NextApiRequest, NextApiResponse } from "next";
import { makeId, readStore, writeStore } from "../../lib/store-db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      notes,
      items = [],
    } = req.body || {};

    if (!customerName || !customerPhone || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "Missing required order fields" });
    }

    const db = await readStore();

    let total = 0;
    const normalized = items.map((line: any) => {
      const product = db.products.find((p) => p.id === String(line.productId));
      if (!product) throw new Error(`Product not found: ${line.productId}`);

      const qty = Math.max(1, Number(line.qty) || 1);
      const price = Number(product.retail_price ?? product.price) || 0;

      total += qty * price;

      return {
        productId: product.id,
        name: product.name,
        qty,
        price,
      };
    });

    const order = {
      id: makeId("ord"),
      createdAt: new Date().toISOString(),
      customerName: String(customerName),
      customerPhone: String(customerPhone),
      customerEmail: customerEmail ? String(customerEmail) : undefined,
      deliveryAddress: deliveryAddress ? String(deliveryAddress) : undefined,
      notes: notes ? String(notes) : undefined,
      items: normalized,
      total,
      status: "new" as const,
    };

    db.orders.push(order);
    await writeStore(db);

    return res.status(201).json(order);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || "Could not place order" });
  }
}
