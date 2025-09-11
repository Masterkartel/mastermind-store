// pages/paystack-success.tsx
import { useEffect, useState } from "react";
import Link from "next/link";

export default function PaystackSuccess() {
  const [status, setStatus] = useState<"verifying"|"success"|"failed">("verifying");
  const [message, setMessage] = useState("Verifying payment…");

  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("reference");
    if (!ref) {
      setStatus("failed");
      setMessage("Missing payment reference.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(ref)}`);
        const data = await res.json();
        if (data?.status && data?.data?.status === "success") {
          try {
            localStorage.removeItem("mm_cart");
          } catch {}
          setStatus("success");
          setMessage("Payment successful! Thank you for your order.");
        } else {
          setStatus("failed");
          setMessage(data?.message || "Payment not verified.");
        }
      } catch {
        setStatus("failed");
        setMessage("Could not verify payment.");
      }
    })();
  }, []);

  return (
    <div style={{minHeight:"100vh", display:"grid", placeItems:"center", background:"#fafafa", fontFamily:"Inter, ui-sans-serif"}}>
      <div style={{background:"#fff", border:"1px solid #eee", borderRadius:16, padding:24, maxWidth:520, textAlign:"center"}}>
        <h1 style={{marginTop:0}}>{status==="success" ? "✅ Success" : status==="verifying" ? "⏳ Please wait" : "❌ Payment Failed"}</h1>
        <p style={{color:"#555"}}>{message}</p>
        <Link href="/" style={{display:"inline-block", marginTop:14, background:"#111", color:"#fff", padding:"10px 16px", borderRadius:12, textDecoration:"none", fontWeight:800}}>
          Back to shop
        </Link>
      </div>
    </div>
  );
}
