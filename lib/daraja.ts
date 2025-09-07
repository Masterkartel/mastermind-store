// /lib/daraja.ts

export async function stkPush(phone: string, amount: number) {
  const base =
    (process.env.DARAJA_ENV || "").toUpperCase() === "PRODUCTION"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  const key = process.env.DARAJA_CONSUMER_KEY || "";
  const secret = process.env.DARAJA_CONSUMER_SECRET || "";
  const shortcode = process.env.DARAJA_SHORTCODE || "";
  const passkey = process.env.DARAJA_PASSKEY || "";
  if (!key || !secret || !shortcode || !passkey) {
    throw new Error("Missing Daraja env vars");
  }

  // 1) OAuth token
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const tokRes = await fetch(
    `${base}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  if (!tokRes.ok) throw new Error(`Token error: ${await tokRes.text()}`);
  const { access_token } = (await tokRes.json()) as { access_token: string };

  // 2) Build STK payload
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${d.getFullYear()}${pad(d.getMonth
