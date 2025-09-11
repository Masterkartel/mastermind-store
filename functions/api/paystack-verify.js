// functions/api/paystack-verify.js
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const reference = url.searchParams.get("reference");
    if (!reference) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing reference" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const r = await fetch(
      "https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference),
      {
        headers: {
          Authorization: `Bearer ${env.PAYSTACK_SECRET}`,
          Accept: "application/json",
        },
      }
    );

    const data = await r.json();
    return new Response(JSON.stringify(data), {
      status: r.ok ? 200 : r.status,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
