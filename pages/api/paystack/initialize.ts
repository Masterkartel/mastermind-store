// pages/api/paystack/initialize.ts
export const runtime = "edge";

type InitBody = {
  amount: number;      // KES total (e.g. 1550)
  email: string;       // customer email
  reference?: string;  // optional custom reference you generate
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: InitBody | null = null;
  try {
    body = (await req.json()) as InitBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { amount, email, reference } = body || {};
  if (!amount || !email) {
    return new Response(JSON.stringify({ error: "Missing amount or email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const origin = new URL(req.url).origin; // e.g. https://mastermindelectricals.com

  const resp = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: Math.round(Number(amount) * 100), // Paystack expects smallest unit
      reference,
      callback_url: `${origin}/paystack-success`,
      currency: "KES", // optional; NGN is default. Remove if your Paystack account is NGN-only.
    }),
  });

  const data = await resp.json();
  return new Response(JSON.stringify(data), {
    status: resp.ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}
