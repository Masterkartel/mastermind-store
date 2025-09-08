import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Daraja sometimes GETs first; always 200 OK
  if (req.method !== "POST") return res.status(200).send("OK");

  try {
    const body = req.body || {};
    // Extract basics if present
    const resultCode = body?.Body?.stkCallback?.ResultCode;
    const resultDesc = body?.Body?.stkCallback?.ResultDesc;
    const amount = body?.Body?.stkCallback?.CallbackMetadata?.Item?.find?.((i: any) => i.Name === "Amount")?.Value;
    const mpesaReceipt = body?.Body?.stkCallback?.CallbackMetadata?.Item?.find?.((i: any) => i.Name === "MpesaReceiptNumber")?.Value;
    const phone = body?.Body?.stkCallback?.CallbackMetadata?.Item?.find?.((i: any) => i.Name === "PhoneNumber")?.Value;

    // Email notify if configured
    const key = process.env.RESEND_API_KEY;
    const to = process.env.NOTIFY_TO || "sales@mastermindelectricals.com";
    if (key) {
      const html = `
        <h2>M-Pesa Payment Callback</h2>
        <p><strong>Result:</strong> ${resultCode} — ${resultDesc}</p>
        <p><strong>Amount:</strong> ${amount || "-"} | <strong>Receipt:</strong> ${mpesaReceipt || "-"}</p>
        <p><strong>Payer:</strong> ${phone || "-"}</p>
        <pre style="white-space:pre-wrap;background:#fafafa;border:1px solid #eee;padding:8px;border-radius:8px">${JSON.stringify(body, null, 2)}</pre>
      `;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Mastermind <noreply@mastermindelectricals.com>",
          to: [to],
          subject: `M-Pesa ${resultCode === 0 ? "SUCCESS" : "FAIL"} ${mpesaReceipt ? "• " + mpesaReceipt : ""}`,
          html,
        }),
      }).catch(() => {});
    }

    // Always 200 so Daraja is satisfied
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch {
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
