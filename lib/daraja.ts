// /lib/daraja.ts

// Choose correct base URL for Daraja
export function darajaBaseUrl() {
  return process.env.DARAJA_ENV?.toUpperCase() === "PRODUCTION"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

// Get OAuth token
export async function darajaToken() {
  const key = process.env.DARAJA_CONSUMER_KEY || "";
  const secret = process.env.DARAJA_CONSUMER_SECRET || "";
  if (!key || !secret) throw new Error("Missing Daraja consumer key/secret");

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  const res = await fetch(
    `${darajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get Daraja token: ${text}`);
  }
  const js = (await res.json()) as { access_token: string };
  return js.access_token;
}

// Timestamp in Daraja format: yyyyMMddHHmmss
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

// Password = base64(shortcode + passkey + timestamp)
export function stkPassword(shortcode: string, passkey: string, ts: string) {
  return Buffer.from(shortcode + passkey + ts).toString("base64");
}

// Trigger STK Push
export async function stkPush(phone: string, amount: number) {
  const shortcode = process.env.DARAJA_SHORTCODE || "";
  const passkey = process.env.DARAJA_PASSKEY || "";
  if (!shortcode || !passkey) throw new Error("Missing shortcode or passkey");

  const ts = timestamp();
  const password = stkPassword(shortcode, passkey, ts);
  const token = await darajaToken();

  const to254 = (p: string) => (p.startsWith("0") ? p.replace(/^0/, "254") : p);

  // Prefer your real domain if set
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
  );

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(
      (data && (data.errorMessage || data.error || JSON.stringify(data))) ||
        "Daraja STK error"
    );
  }
  return data;
}
