export const config = { runtime: "edge" };

import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "../../../lib/admin-auth";
import { readStore, writeStore } from "../../../lib/store-db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await readStore();

  if (req.method === "GET") {
    return res.status(200).json(db.orders.slice().reverse());
  }

  if (req.method === "PUT") {
    const { id, status } = req.body || {};
    if (!id || !status) {
      return res.status(400).json({ error: "id and status are required" });
    }

    const idx = db.orders.findIndex((o) => o.id === id);
    if (idx < 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    db.orders[idx] = {
      ...db.orders[idx],
      status,
    };

    await writeStore(db);
    return res.status(200).json(db.orders[idx]);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
