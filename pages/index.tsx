// pages/paystack-success.tsx
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function PaystackSuccess() {
  const router = useRouter();
  const { reference } = router.query;
  const [status, setStatus] = useState<"checking" | "ok" | "fail">("checking");
  const [message, setMessage] = useState("Verifying payment…");

  useEffect(() => {
    if (!reference) return;

    (async () => {
      try {
        const res = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const json = await res.json();

        if (json?.data?.status === "success") {
          setStatus("ok");
          setMessage("✅ Payment Successful! Thank you.");
        } else {
          setStatus("fail");
          setMessage("❌ Payment not completed. Please try again.");
        }
      } catch {
        setStatus("fail");
        setMessage("❌ Could not verify payment.");
      }
    })();
  }, [reference]);

  return (
    <>
      <Head>
        <title>Payment Status • Mastermind</title>
      </Head>
      <div style={{ maxWidth: 680, margin: "60px auto", padding: 16, textAlign: "center" }}>
        <h1 style={{ marginBottom: 8 }}>Payment Status</h1>
        <p style={{ color: "#444", marginBottom: 18 }}>
          Reference: <strong>{reference as string}</strong>
        </p>
        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 24,
            fontSize: 18,
          }}
        >
          {message}
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "#111",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Back to Shop
          </button>
          {status !== "ok" && (
            <button
              onClick={() => router.push("/")}
              style={{
                background: "#f4d03f",
                color: "#111",
                border: "none",
                padding: "10px 14px",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </>
  );
}
