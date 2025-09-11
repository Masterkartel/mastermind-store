// pages/index.tsx
import Head from "next/head";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

/** ---------------- Types ---------------- */
type Product = {
  id: string;
  name: string;
  priceKES: number; // integer KES (no decimals)
  img?: string;     // optional /public image path
};

type CartLine = {
  product: Product;
  qty: number;
};

/** --------------- Paystack types --------------- */
declare global {
  interface Window {
    PaystackPop?: {
      setup(opts: {
        key: string;
        email: string;
        amount: number; // lowest denomination (KES * 100)
        currency: "KES" | "NGN" | "GHS" | "USD" | "ZAR";
        ref?: string;
        channels?: string[];
        metadata?: Record<string, any>;
        callback?: (resp: { reference: string; status?: string }) => void;
        onClose?: () => void;
        label?: string;
      }): { openIframe: () => void };
    };
  }
}

/** --------------- Config --------------- */
// Using your live public key exactly as you provided earlier.
// If you later prefer environment variables, we can switch.
const PAYSTACK_PUBLIC_KEY = "pk_live_10bc141ee6ae2ae48edcd102c06540ffe1cb3ae6";

/** --------------- Demo catalog --------------- */
const PRODUCTS: Product[] = [
  {
    id: "torch-1batt",
    name: "1 Batt Torch",
    priceKES: 250,
    img: "/torch.png", // keep or remove if not present in /public
  },
  {
    id: "gas-6kg",
    name: "6KG Gas",
    priceKES: 1450,
    img: "/6kg.png",
  },
  {
    id: "gas-13kg",
    name: "13KG Gas",
    priceKES: 3050,
    img: "/13kg.png",
  },
];

/** --------------- Helpers --------------- */
const formatKES = (v: number) =>
  `KES ${v.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

/** ===========================================
 *                 Page
 * ==========================================*/
export default function Home() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loadingPay, setLoadingPay] = useState(false);

  // inject the Paystack script once on client
  useEffect(() => {
    const id = "paystack-inline";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const totalKES = useMemo(
    () => cart.reduce((sum, l) => sum + l.product.priceKES * l.qty, 0),
    [cart]
  );

  function addToCart(p: Product) {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id);
      if (i === -1) return [...prev, { product: p, qty: 1 }];
      const copy = [...prev];
      copy[i] = { ...copy[i], qty: copy[i].qty + 1 };
      return copy;
    });
  }

  function decQty(id: string) {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.product.id === id);
      if (i === -1) return prev;
      const nextQty = prev[i].qty - 1;
      if (nextQty <= 0) return prev.filter((l) => l.product.id !== id);
      const copy = [...prev];
      copy[i] = { ...copy[i], qty: nextQty };
      return copy;
    });
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== id));
  }

  /** ------------ Paystack checkout ------------ */
  function startPaystack() {
    if (!PAYSTACK_PUBLIC_KEY) {
      alert("Paystack not configured. Please set your public key.");
      return;
    }
    if (!window.PaystackPop) {
      alert("Couldn't start Paystack. Please reload and try again.");
      return;
    }
    if (totalKES <= 0) {
      alert("Your cart is empty.");
      return;
    }

    setLoadingPay(true);

    // a lightweight reference for this attempt
    const reference = `MME-${Date.now()}`;

    const handler = window.PaystackPop!.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: "customer@mastermindelectricals.com", // can be replaced with real email input later
      amount: totalKES * 100, // KES in base unit
      currency: "KES",
      ref: reference,
      label: "Mastermind Electricals",
      channels: ["card", "bank", "mobile_money"], // Paystack will restrict to what your account supports
      metadata: {
        custom_fields: [
          {
            display_name: "Items",
            variable_name: "items",
            value: cart.map((l) => `${l.product.name} x${l.qty}`).join(", "),
          },
        ],
      },
      callback: (resp) => {
        // Redirect to a status page we can add later, or show a toast.
        // For now we’ll do a client redirect with the reference in the URL.
        window.location.href = `/payment-status?reference=${encodeURIComponent(
          resp.reference
        )}`;
      },
      onClose: () => {
        setLoadingPay(false);
      },
    });

    handler.openIframe();
  }

  return (
    <>
      <Head>
        <title>Mastermind Electricals & Electronics</title>
        <meta
          name="description"
          content="Gas refills and electronics in Sotik — Mastermind Electricals & Electronics"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Simple container with neutral styling so it works even if Tailwind is missing */}
      <div
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Noto Sans', 'Helvetica Neue', 'Apple Color Emoji', 'Segoe UI Emoji'",
          maxWidth: 980,
          margin: "0 auto",
          padding: "24px 16px",
          color: "#111827",
        }}
      >
        <header style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
            Mastermind Store
          </h1>
          <p style={{ marginTop: 4, color: "#6B7280" }}>
            Trusted in Sotik • Fast delivery
          </p>
        </header>

        <main style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
          {/* ------------ Products ------------ */}
          <section>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {PRODUCTS.map((p) => (
                <article
                  key={p.id}
                  style={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 12,
                    padding: 12,
                    background: "#fff",
                  }}
                >
                  {p.img ? (
                    <div style={{ position: "relative", width: "100%", height: 140 }}>
                      <Image
                        src={p.img}
                        alt={p.name}
                        fill
                        style={{ objectFit: "contain" }}
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        height: 140,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#F9FAFB",
                        borderRadius: 8,
                        color: "#9CA3AF",
                        fontSize: 14,
                      }}
                    >
                      No image
                    </div>
                  )}
                  <h3 style={{ margin: "10px 0 2px", fontSize: 16, fontWeight: 700 }}>
                    {p.name}
                  </h3>
                  <div style={{ color: "#374151", marginBottom: 10 }}>
                    {formatKES(p.priceKES)}
                  </div>
                  <button
                    onClick={() => addToCart(p)}
                    style={{
                      width: "100%",
                      height: 36,
                      borderRadius: 8,
                      border: "1px solid #111827",
                      background: "#111827",
                      color: "white",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Add to Cart
                  </button>
                </article>
              ))}
            </div>
          </section>

          {/* ------------ Cart ------------ */}
          <aside>
            <div
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                padding: 16,
                background: "#fff",
                position: "sticky",
                top: 16,
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 20, fontWeight: 800 }}>
                Your Cart
              </h2>

              {cart.length === 0 ? (
                <p style={{ color: "#6B7280", marginTop: 0 }}>No items yet.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {cart.map((l) => (
                    <li
                      key={l.product.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "8px 0",
                        borderBottom: "1px dashed #E5E7EB",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, lineHeight: 1.2 }}>
                          {l.product.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#6B7280" }}>
                          {formatKES(l.product.priceKES)} × {l.qty}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => decQty(l.product.id)}
                          title="Decrease"
                          style={chipBtn}
                        >
                          −
                        </button>
                        <button
                          onClick={() => addToCart(l.product)}
                          title="Increase"
                          style={chipBtn}
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeLine(l.product.id)}
                          title="Remove"
                          style={{ ...chipBtn, background: "#FEE2E2", color: "#991B1B" }}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 12,
                  fontWeight: 800,
                }}
              >
                <span>Total</span>
                <span>{formatKES(totalKES)}</span>
              </div>

              <button
                onClick={startPaystack}
                disabled={loadingPay || totalKES <= 0}
                style={{
                  width: "100%",
                  height: 44,
                  marginTop: 14,
                  borderRadius: 10,
                  border: "none",
                  // Paystack brand green
                  background: loadingPay || totalKES <= 0 ? "#A7F3D0" : "#00C3A4",
                  color: "white",
                  fontWeight: 800,
                  letterSpacing: 0.2,
                  cursor:
                    loadingPay || totalKES <= 0 ? "not-allowed" : "pointer",
                  transition: "transform 120ms ease",
                }}
              >
                {loadingPay ? "Launching Paystack…" : "Pay with M-Pesa (Paystack)"}
              </button>

              <p style={{ marginTop: 10, fontSize: 12, color: "#6B7280" }}>
                You’ll be redirected to complete payment securely via Paystack.
              </p>
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}

/** small reusable button style */
const chipBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "1px solid #E5E7EB",
  background: "#F3F4F6",
  fontWeight: 800,
  cursor: "pointer",
  lineHeight: "26px",
  textAlign: "center",
};
