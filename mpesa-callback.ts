import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: Persist result to DB and map to order by CheckoutRequestID/MerchantRequestID
  console.log('MPESA CALLBACK:', JSON.stringify(req.body));
  res.status(200).json({ received: true });
}
