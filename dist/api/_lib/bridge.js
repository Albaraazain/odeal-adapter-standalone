import { postPaymentStatus } from '../../src/ropClient.js';
import { extractCheckId } from '../../src/basketProvider.js';
import { makeEventKey, isDuplicate, remember } from '../../src/idempotencyStore.js';

export async function handleWebhook(type, req, res) {
  const key = makeEventKey(type, req.body || {});
  if (isDuplicate(key)) {
    return res.json({ ok: true, duplicate: true });
  }
  remember(key);

  const autosync = String(process.env.ROUTE_ROP_AUTOSYNC || 'false').toLowerCase() === 'true';
  if (autosync) {
    try {
      const ref = req.body?.basketReferenceCode || req.body?.referenceCode || '';
      const checkId = extractCheckId(ref);
      if (checkId) {
        let status = -1;
        if (type === 'payment-succeeded') status = 1;
        else if (type === 'payment-cancelled') status = 0;
        await postPaymentStatus({ CheckId: checkId, Status: status });
      }
    } catch (e) {
      // Non-fatal: still return 200 to Ödeal
      console.warn('[webhook] autosync error:', e?.message || e);
    }
  }
  return res.json({ ok: true });
}

