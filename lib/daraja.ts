import type { NextApiRequest, NextApiResponse } from "next";

const consumerKey = process.env.DARAJA_CONSUMER_KEY as string;
const consumerSecret = process.env.DARAJA_CONSUMER_SECRET as string;
const shortCode = process.env.DARAJA_SHORTCODE as string;
const passKey = process.env.DARAJA_PASSKEY as string;
const callbackUrl = `${process.env.NEXT_PUBLIC_BRAND_DOMAIN}/api/mpesa-callback`;

/**
 * Generate Safaricom timestamp (YYYYMMDDHHMMSS)
 */
function makeTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/**
 * Get OAuth token from Safaricom
 */
async function getToken(): Promise<string> {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const res = await fetch(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  const data = await res.json();
  return data.access_token;
}

/**
 * Initiate STK Push (Lipa na M-Pesa Online)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { phone, amount } = req.body;

    const timestamp = makeTimestamp();
    const password = Buffer.from(shortCode + passKey + timestamp).toString("base64");
    const token = await getToken();

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: phone,
          PartyB: shortCode,
          PhoneNumber: phone,
          CallBackURL: callbackUrl,
          AccountReference: "MastermindStore",
          TransactionDesc: "Payment for goods",
        }),
      }
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("Daraja STK error:", err);
    return res.status(500).json({ error: err.message });
  }
}
