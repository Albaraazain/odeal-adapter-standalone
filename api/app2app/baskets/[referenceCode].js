import { verifyOdeal, allowMethods } from '../../_lib/verify.js';
import { resolveBasket } from '../../../src/basketProvider.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;
  if (!verifyOdeal(req, res)) return;
  try {
    const { referenceCode } = req.query;
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
