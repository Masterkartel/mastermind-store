export const config = { runtime: "edge" };

import type { NextApiRequest, NextApiResponse } from "next";
import { createToken, readStore } from "../../../lib/store-db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, pin } = req.body || {};
  if (!name || !pin) {
    return res.status(400).json({ error: "name and pin are required" });
  }

  const db = await readStore();
  const user = db.users.find(
    (u) => u.name === String(name) && u.pin === String(pin) && u.active
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = createToken(user);

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      active: user.active,
    },
  });
}
