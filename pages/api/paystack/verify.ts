// pages/api/paystack/verify.ts
export const runtime = "edge";

type VerifyBody = { reference?: string };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let reference = "";
  try {
    const body = (await req.json()) as VerifyBody;
    reference = body?.reference || "";
  } catch {
    // fall through
  }
  if (!reference) {
    return new Response(JSON.stringify({ error: "Missing reference" }), {
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

  const resp = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
    }
  );

  const data = await resp.json();
  return new Response(JSON.stringify(data), {
    status: resp.ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}
