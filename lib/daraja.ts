// /lib/daraja.ts
// Minimal Daraja STK Push helper used by pages/api/mpesa.ts

function baseUrl() {
  return (process.env.DARAJA_ENV || "").toUpperCase() === "PRODUCTION"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function makeTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

async function getToken(): Promise<string> {
  const key = process.env.DARAJA_CONSUMER_KEY || "";
  const secret = process.env.DARAJA_CONSUMER_SECRET || "";
  if (!key || !secret) throw new Error("Missing DARAJA_CONSUMER_KEY/SECRET");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(
    `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  if (!res.ok) throw new Error(`Token error: ${await res.text()}`);
  const { access_token } = (await res.json()) as { access_token: string };
  return access_token;
}

export async function stkPush(phone: string, amount: number) {
  const shortcode = process.env.DARAJA_SHORTCODE || "";
  const passkey = process.env.DARAJA_PASSKEY || "";
  if (!shortcode || !passkey) throw new Error("Missing DARAJA_SHORTCODE/PASSKEY");

  const ts = makeTimestamp();
  const password = Buffer.from(shortcode + passkey + ts).toString("base64");
  const token = await getToken();
  const to254 = (p: string) => (p.startsWith("0") ? p.replace(/^0/, "254") : p);

  const callback =
    process.env.NEXT_PUBLIC_BRAND_DOMAIN
      ? `https://${process.env.NEXT_PUBLIC_BRAND_DOMAIN}/api/mpesa-callback`
      : "https://example.com/api/mpesa-callback";

  const payload = {
    BusinessShortCode: Number(shortcode),
    Password: password,
    Timestamp: ts,
    TransactionType: "CustomerBuyGoodsOnline",
    Amount: Math.round(amount),
    PartyA: to254(phone),
    PartyB: Number(shortcode),
    PhoneNumber: to254(phone),
    CallBackURL: callback,
    AccountReference: "Mastermind Order",
    TransactionDesc: "Mastermind Store Checkout",
  };

  const resp = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(
      (data && (data.errorMessage || data.error || JSON.stringify(data))) ||
        "Daraja STK error"
    );
  }
  return data;
}