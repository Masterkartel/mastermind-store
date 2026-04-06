export const config = { runtime: "edge" };

import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "../../../lib/admin-auth";
import { makeId, readStore, writeStore } from "../../../lib/store-db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const db = await readStore();
    return res.status(200).json(db.users.map((u) => ({ ...u, pin: undefined })));
  }

  if (req.method === "POST") {
    if (user.role !== "admin") return res.status(403).json({ error: "Only admin can create users" });

    const { name, pin, role } = req.body || {};
    if (!name || !pin || !role) return res.status(400).json({ error: "name, pin and role required" });
    if (!["admin", "clerk"].includes(String(role))) return res.status(400).json({ error: "invalid role" });

    const db = await readStore();
    const existing = db.users.find((u) => u.name.toLowerCase() === String(name).toLowerCase());
    if (existing) return res.status(400).json({ error: "User already exists" });

    const next = {
      id: makeId("usr"),
      name: String(name),
      role: String(role) as "admin" | "clerk",
      pin: String(pin),
      active: true,
      createdAt: new Date().toISOString(),
    };

    db.users.push(next);
    await writeStore(db);
    return res.status(201).json({ id: next.id, name: next.name, role: next.role, active: next.active });
  }

  if (req.method === "DELETE") {
    if (user.role !== "admin") return res.status(403).json({ error: "Only admin can delete users" });

    const bodyId = req.body?.id ? String(req.body.id) : "";
    const queryId = req.query.id ? String(req.query.id) : "";
    const id = bodyId || queryId;

    if (!id) return res.status(400).json({ error: "id is required" });

    const db = await readStore();
    const target = db.users.find((u) => u.id === id);
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.role !== "clerk") return res.status(400).json({ error: "Only clerk accounts can be deleted" });

    db.users = db.users.filter((u) => u.id !== id);
    await writeStore(db);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
