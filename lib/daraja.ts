// /lib/daraja.ts
export function darajaBaseUrl() {
  return process.env.DARAJA_ENV?.toUpperCase() === "PRODUCTION"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

export async function darajaToken() {
  const key = process.env.DARAJA_CONSUMER_KEY || "";
  const secret = process.env.DARAJA_CONSUMER_SECRET || "";
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(
    `${darajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  if (!res.ok) throw new Error("Failed to get Daraja token");
  const js = await res.json();
  return js.access_token as string;
}

export function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export function stkPassword(shortcode: string, passkey: string, ts: string) {
  return Buffer.from(shortcode + passkey + ts).toString("base64");
}

export async function stkPush(phone: string, amount: number) {
  const shortcode = process.env.DARAJA_SHORTCODE || "";
  const passkey = process.env.DARAJA_PASSKEY || "";
  const ts = timestamp();
  const pwd = stkPassword(shortcode, passkey, ts);
  const token = await darajaToken();
  const to254 = (p: string) => (p.startsWith("0") ? p.replace(/^0/, "254") : p);

  const payload = {
    BusinessShortCode: Number(shortcode),
    Password: pwd,
    Timestamp: ts,
    TransactionType: "CustomerBuyGoodsOnline",
    Amount: Math.round(amount),
    PartyA: to254(phone),
    PartyB: Number(shortcode),
    PhoneNumber: to254(phone),
    // The caller (API route) should set the correct absolute callback URL in production,
    // but this will work on Vercel too:
    CallBackURL: "https://example.com/api/mpesa-callback",
    AccountReference: "Mastermind Order",
    TransactionDesc: "Mastermind Store Checkout",
  };

  const resp = await fetch(
    `${darajaBaseUrl()}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
