export function darajaBaseUrl() {
  return process.env.DARAJA_ENV?.toUpperCase() === 'PRODUCTION'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

export async function darajaToken() {
  const key = process.env.DARAJA_CONSUMER_KEY || '';
  const secret = process.env.DARAJA_CONSUMER_SECRET || '';
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const res = await fetch(`${darajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  if (!res.ok) throw new Error('Failed to get token');
  const js = await res.json();
  return js.access_token as string;
}

export function stkPassword(shortcode: string, passkey: string, timestamp: string) {
  return Buffer.from(shortcode + passkey + timestamp).toString('base64');
}

export function timestamp() {
  const d = new Date();
  const pad = (n:number)=> String(n).padStart(2,'0');
  return d.getFullYear().toString() + pad(d.getMonth()+1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
}
