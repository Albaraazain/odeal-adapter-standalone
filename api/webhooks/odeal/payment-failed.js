import { verifyOdeal, allowMethods } from '../../../_lib/verify.js';
import { handleWebhook } from '../../../_lib/bridge.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  if (!verifyOdeal(req, res)) return;
  return handleWebhook('payment-failed', req, res);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
