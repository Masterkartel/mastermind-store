// pages/api/paystack/initialize.ts
export const runtime = "edge";

type InitBody = {
  amountKsh: number;          // amount in KES (whole number)
  phone?: string;
  items?: Array<{ id: string; name: string; qty: number; price: number }>;
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { amountKsh, phone = "", items = [] } = (await req.json()) as InitBody;

  // Convert KES -> "kobo" (Paystack uses base 100 of NGN). We’ll treat KES as a "custom" currency amount for record;
  // The account’s currency will charge as set in your Paystack account.
  const amountKobo = Math.max(1, Math.round(amountKsh * 100));

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return new Response("PAYSTACK_SECRET_KEY is not set", { status: 500 });
  }

  // a very safe reference
  const reference = `MM-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  const payload = {
    amount: amountKobo,
    email: "guest@mastermindelectricals.com", // we are not collecting email yet
    reference,
    callback_url: `${new URL(req.url).origin}/paystack-success?reference=${encodeURIComponent(
      reference
    )}`,
    metadata: {
      custom_fields: [
        { display_name: "Phone", variable_name: "phone", value: phone || "-" },
      ],
      items,
      currency_hint: "KES",
      cart_total_kes: amountKsh,
    },
  };

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data?.status) {
    return new Response(
      data?.message || "Paystack initialize failed",
      { status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ authorization_url: data.data.authorization_url }),
    { headers: { "Content-Type": "application/json" } }
  );
}
