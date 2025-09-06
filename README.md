# Mastermind Electricals & Electronics — E‑Commerce (Next.js + Daraja)

## Deploy (Vercel)
1. Import this repo into Vercel and deploy.
2. Environment variables:
   - DARAJA_CONSUMER_KEY=
   - DARAJA_CONSUMER_SECRET=
   - DARAJA_PASSKEY=
   - DARAJA_SHORTCODE=8636720
   - DARAJA_ENV=PRODUCTION
   - NEXT_PUBLIC_BRAND_DOMAIN=www.mastermindelectricals.com
   - NEXT_PUBLIC_BRAND_EMAIL=sales@mastermindelectricals.com
   - NEXT_PUBLIC_TILL=8636720
3. Products are served from **/public/products.json** (already generated from your Excel). To update stock or prices, replace this file and redeploy.

## Domain
- Add **www.mastermindelectricals.com** in Vercel → Project → Settings → Domains. Follow the CNAME instructions.

## Payments (M‑Pesa Till)
- Uses Lipa na M‑Pesa Online (Daraja) with **CustomerBuyGoodsOnline** for your Till 8636720.
- POST /api/mpesa initiates STK Push. POST /api/mpesa-callback receives the result.
