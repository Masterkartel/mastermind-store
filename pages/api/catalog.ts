export const config = { runtime: "edge" };

import type { NextApiRequest, NextApiResponse } from "next";
import { readStore } from "../../lib/store-db";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const db = await readStore();

  const catalog = db.products
    .filter((p) => p.active !== false)
    .map((p) => ({
      id: p.id,
      name: p.name,
      product_code: p.product_code,
      sku: p.sku,
      category: p.category,
      price: p.price,
      retail_price: p.retail_price ?? p.price,
      stock: p.stock,
      img: p.img,
    }));

  return res.status(200).json(catalog);
}
