import type { NextApiRequest, NextApiResponse } from 'next';
import { darajaBaseUrl, darajaToken, stkPassword, timestamp } from '../../lib/daraja';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { phone, amount } = req.body || {};
    if (!phone || !/^0?7\d{8}$/.test(phone)) return res.status(400).json({ error: 'Invalid phone' });
    if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' });

    const shortcode = process.env.DARAJA_SHORTCODE || '';
    const passkey = process.env.DARAJA_PASSKEY || '';
    const ts = timestamp();
    const pwd = stkPassword(shortcode, passkey, ts);

    const token = await darajaToken();
    const to254 = (p:string)=> p.startsWith('0') ? p.replace(/^0/,'254') : p;
    const payload: any = {
      BusinessShortCode: Number(shortcode),
      Password: pwd,
      Timestamp: ts,
      TransactionType: 'CustomerBuyGoodsOnline',
      Amount: Math.round(amount),
      PartyA: to254(phone),
      PartyB: Number(shortcode),
      PhoneNumber: to254(phone),
      CallBackURL: `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/mpesa-callback`,
      AccountReference: 'Mastermind Order',
      TransactionDesc: 'Mastermind Store Checkout'
    };

    const resp = await fetch(`${darajaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    res.status(200).json({ ok: true, data });
  } catch (e:any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
}
