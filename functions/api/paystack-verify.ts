// functions/api/paystack-verify.ts
// Works on Cloudflare Pages Functions. No extra typings to avoid build errors.
// Set PAYSTACK_SECRET_KEY in Cloudflare > Project > Settings > Environment Variables.
export const onRequestGet = async (ctx: any) => {
  try {
    const url = new URL(ctx.request.url);
    const reference = url.searchParams.get("reference");
    if (!reference) {
      return new Response(JSON.stringify({ ok: false, error: "Missing reference" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const secret = ctx.env?.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return new Response(JSON.stringify({ ok: false, error: "Server misconfigured: PAYSTACK_SECRET_KEY missing" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    });

    const data = await resp.json();
    // Normalized shape for the frontend
    const status = data?.data?.status; // "success" | "failed" | "abandoned" | etc.
    const amount = data?.data?.amount; // in kobo
    const currency = data?.data?.currency; // "KES"
    const verified = status === "success";

    return new Response(JSON.stringify({ ok: true, verified, status, amount, currency, raw: data?.data || null }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "Verify failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
