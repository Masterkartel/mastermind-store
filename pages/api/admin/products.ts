export const config = { runtime: "edge" };

import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "../../../lib/admin-auth";
import { makeId, readStore, writeStore } from "../../../lib/store-db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await readStore();

  if (req.method === "GET") {
    return res.status(200).json(db.products);
  }

  if (req.method === "POST") {
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Only admin can add products" });
    }

    const { name, price, stock, product_code, sku, img, category } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const product = {
      id: makeId("prd"),
      name: String(name),
      price: Number(price) || 0,
      retail_price: Number(price) || 0,
      stock: Number(stock) || 0,
      product_code: product_code ? String(product_code) : undefined,
      sku: sku ? String(sku) : undefined,
      img: img ? String(img) : undefined,
      category: category ? String(category) : undefined,
    };

    db.products.unshift(product);
    await writeStore(db);
    return res.status(201).json(product);
  }

  if (req.method === "PUT") {
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Only admin can edit products" });
    }

    const { id, ...patch } = req.body || {};
    const idx = db.products.findIndex((p) => p.id === id);

    if (idx < 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const current = db.products[idx];

    db.products[idx] = {
      ...current,
      ...patch,
      price: Number((patch as any).price ?? current.price) || 0,
      retail_price:
        Number((patch as any).retail_price ?? (patch as any).price ?? current.retail_price ?? current.price) || 0,
      stock: Number((patch as any).stock ?? current.stock) || 0,
      product_code:
        typeof (patch as any).product_code === "string"
          ? String((patch as any).product_code) || undefined
          : current.product_code,
      sku:
        typeof (patch as any).sku === "string"
          ? String((patch as any).sku) || undefined
          : current.sku,
      img:
        typeof (patch as any).img === "string"
          ? String((patch as any).img) || undefined
          : current.img,
      category:
        typeof (patch as any).category === "string"
          ? String((patch as any).category) || undefined
          : (current as any).category,
    };

    await writeStore(db);
    return res.status(200).json(db.products[idx]);
  }

  if (req.method === "DELETE") {
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Only admin can delete products" });
    }

    const bodyId = req.body?.id ? String(req.body.id) : "";
    const queryId = req.query.id ? String(req.query.id) : "";
    const id = bodyId || queryId;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    db.products = db.products.filter((p) => p.id !== id);
    await writeStore(db);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
