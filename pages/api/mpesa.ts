// /pages/api/mpesa.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { stkPush } from "../../lib/daraja";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { phone, amount } = req.body || {};
    if (!phone || !/^0?7\d{8}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone (use 07XXXXXXXX)" });
    }
    if (!amount || amount < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Optional: if you want to override the default callback with your real domain:
    // (uncomment if desired)
    // process.env.NEXT_PUBLIC_BRAND_DOMAIN && (globalThis as any).__MM_CALLBACK__ =
    //   `https://${process.env.NEXT_PUBLIC_BRAND_DOMAIN}/api/mpesa-callback`;

    const data = await stkPush(phone, amount);
    return res.status(200).json({ ok: true, data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
