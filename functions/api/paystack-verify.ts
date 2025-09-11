// functions/api/paystack-verify.ts
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const reference = url.searchParams.get("reference");
    if (!reference) {
      return json({ ok: false, error: "missing_reference" }, 400);
    }

    const secret = env.PAYSTACK_SECRET_KEY as string | undefined;
    if (!secret) {
      return json({ ok: false, error: "missing_secret" }, 500);
    }

    const resp = await fetch(
      "https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference),
      { headers: { Authorization: `Bearer ${secret}` } }
    );

    const data = await resp.json();
    return json({ ok: true, paystack: data }, 200);
  } catch (e: any) {
    return json({ ok: false, error: "exception", detail: String(e) }, 500);
  }
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
