import type { NextApiRequest, NextApiResponse } from "next";
import { createToken, readStore } from "../../../lib/store-db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, pin } = req.body || {};
  if (!name || !pin) return res.status(400).json({ error: "Name and PIN are required" });

  const db = await readStore();
  const user = db.users.find(
    (u) => u.active && u.name.toLowerCase() === String(name).toLowerCase() && u.pin === String(pin)
  );

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  return res.status(200).json({
    token: createToken(user),
    user: { id: user.id, name: user.name, role: user.role },
  });
}
