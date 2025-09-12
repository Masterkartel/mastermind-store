// functions/api/paystack-verify.ts
// Minimal, type-free version so it builds on Cloudflare Pages without extra deps.

export const onRequestGet = async (context: any) => {
  try {
    const url = new URL(context.request.url);
    const reference = url.searchParams.get("reference");
    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const secret = context.env?.PAYSTACK_SECRET_KEY as string | undefined;
    if (!secret) {
      return new Response(
        JSON.stringify({ error: "Server misconfig: missing PAYSTACK_SECRET_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify with Paystack
    const resp = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
          Accept: "application/json",
        },
      }
    );

    const body = await resp.json().catch(() => ({}));

    // Normalize to: success | failed | pending
    let normalized: "success" | "failed" | "pending" = "pending";
    const okFlag = body?.status === true;
    const psStatus: string | undefined = body?.data?.status || body?.status;

    if (okFlag && (psStatus === "success" || psStatus === "failed")) {
      normalized = psStatus === "success" ? "success" : "failed";
    } else if (psStatus === "success") {
      normalized = "success";
    } else if (psStatus === "failed") {
      normalized = "failed";
    } else {
      normalized = "pending"; // abandoned / processing / not-found
    }

    return new Response(JSON.stringify({ status: normalized, raw: body }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "Verify exception", detail: String(e?.message || e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
