import type { NextApiRequest } from "next";
import { parseBearerToken, readStore } from "./store-db";

export async function requireUser(req: NextApiRequest) {
  const parsed = parseBearerToken(req.headers.authorization || "");
  if (!parsed) return null;

  const db = await readStore();
  const user = db.users.find((u) => u.id === parsed.id && u.role === parsed.role && u.pin === parsed.pin && u.active);
  return user || null;
}
