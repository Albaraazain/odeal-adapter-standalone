import { verifyOdeal, allowMethods } from '../../_lib/verify.js';
import { resolveBasket } from '../../../src/basketProvider.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;
  if (!verifyOdeal(req, res)) return;
  try {
    const q = req.query || {};
    let referenceCode = Array.isArray(q.referenceCode) ? q.referenceCode[0] : q.referenceCode;
    // Normalize legacy scheme hits like /baskets/payment?customInfo=REF...
    if ((referenceCode === 'payment' || referenceCode === 'directcharge')) {
      let custom = q.customInfo || q.reference || q.ref;
      if (Array.isArray(custom)) custom = custom[0];
      if (typeof custom === 'string' && custom.trim()) {
        referenceCode = custom.trim();
      }
    }
    const basket = await resolveBasket(referenceCode);
    res.status(200).json(basket);
  } catch (e) {
    res.status(500).json({ error: 'Basket resolution error', detail: String(e?.message || e) });
  }
}

export const config = {
  api: {
    bodyParser: false, // GET endpoint; no body
  },
};
