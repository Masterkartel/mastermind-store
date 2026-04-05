export const config = { runtime: "edge" };

import type { NextApiRequest, NextApiResponse } from "next";
import { readStore } from "../../lib/store-db";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const db = await readStore();
  res.status(200).json(db.products.filter((p) => Number(p.stock) > 0));
}
