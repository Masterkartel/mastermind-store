// functions/api/paystack-verify.ts
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const reference = url.searchParams.get("reference");

    if (!reference) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing reference" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // Call Paystack verify
    const resp = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, // set in CF Pages > Settings > Environment variables
          Accept: "application/json",
        },
      }
    );

    const data = await resp.json();

    // Optional: normalize a small response for the frontend
    return new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json" },
      status: resp.ok ? 200 : 502,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err?.message || err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};
