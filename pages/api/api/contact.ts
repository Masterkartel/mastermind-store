import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { name, contact, message } = req.body || {};
  if (!name || !contact || !message) return res.status(400).json({ error: "Missing fields" });

  try {
    const key = process.env.RESEND_API_KEY;
    const to = process.env.NOTIFY_TO || "sales@mastermindelectricals.com";
    if (!key) {
      // No email provider configured yet — succeed but log
      console.log("CONTACT (no email provider):", { name, contact, message });
      return res.status(200).json({ ok: true });
    }

    const html = `
      <h2>New Contact Message</h2>
      <p><strong>Name:</strong> ${String(name).replace(/[<>]/g, "")}</p>
      <p><strong>Contact:</strong> ${String(contact).replace(/[<>]/g, "")}</p>
      <p><strong>Message:</strong><br/>${String(message).replace(/[<>]/g, "")}</p>
    `;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mastermind <noreply@mastermindelectricals.com>",
        to: [to],
        subject: "New message from Mastermind website",
        html,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("Resend error:", r.status, t);
      return res.status(500).json({ error: "Email send failed" });
    }
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
