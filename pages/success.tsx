// pages/success.tsx
import { useEffect, useState } from "react";
import Head from "next/head";

type VerifyResponse = {
  ok: boolean;
  paystack?: any;
  error?: string;
};

export default function Success() {
  const [status, setStatus] = useState<"checking" | "success" | "failed">("checking");
  const [ref, setRef] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("Verifying payment...");

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("ref");
    setRef(r);
    if (!r) {
      setStatus("failed");
      setMsg("Missing payment reference.");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/paystack-verify?reference=${encodeURIComponent(r)}`);
        const data: VerifyResponse = await res.json();

        if (!data.ok) {
          setStatus("failed");
          setMsg("Verification failed. Please contact support.");
          return;
        }

        const ps = data.paystack;
        if (ps?.status && ps?.data?.status === "success") {
          setStatus("success");
          setMsg("Payment successful! Thank you.");
        } else {
          setStatus("failed");
          setMsg(ps?.message || "Payment not successful.");
        }
      } catch {
        setStatus("failed");
        setMsg("Could not verify payment. Try again.");
      }
    })();
  }, []);

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif", background: "#fff", minHeight: "100vh" }}>
      <Head>
        <title>Payment Status</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 14px" }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5, margin: "12px 0 8px" }}>
          Payment Status
        </h1>

        <div style={{ color: "#666", marginBottom: 12 }}>Reference: {ref || "—"}</div>

        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 16,
            padding: 18,
            background: "#fafafa",
            fontSize: 16,
            fontWeight: 700,
            color: status === "success" ? "#0f5132" : status === "failed" ? "#842029" : "#333",
          }}
        >
          {msg}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <a href="/" style={btnDark}>Back to Shop</a>
          <a href={ref ? `/success?ref=${encodeURIComponent(ref)}` : "/"} style={btnYellow}>Try Again</a>
        </div>
      </div>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 16px",
  borderRadius: 12,
  fontWeight: 800,
  textDecoration: "none",
};

const btnDark: React.CSSProperties = { ...btnBase, background: "#111", color: "#fff" };
const btnYellow: React.CSSProperties = { ...btnBase, background: "#f4d03f", color: "#111" };
