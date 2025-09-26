import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { timingSafeEqual } from 'node:crypto';
import { resolveBasket, extractCheckId } from './basketProvider.js';
import { makeEventKey, isDuplicate, remember } from './idempotencyStore.js';
import { postPaymentStatus } from './ropClient.js';

const app = express();
const PORT = Number(process.env.PORT || 8787);
const ODEAL_REQUEST_KEY = process.env.ODEAL_REQUEST_KEY;
const ROUTE_ROP_AUTOSYNC = String(process.env.ROUTE_ROP_AUTOSYNC || 'false').toLowerCase() === 'true';

if (!ODEAL_REQUEST_KEY) {
  console.warn('[WARN] ODEAL_REQUEST_KEY is not set; requests will be unauthorized');
}

// Basic hardening
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(process.env.NODE_ENV === 'production' ? morgan('tiny') : morgan('dev'));
app.use(express.json({ limit: '1mb' }));

// Lightweight rate-limiting to protect webhook/basket endpoints
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_PER_MIN || 120),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(['/webhooks/odeal', '/app2app'], limiter);

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function verifyOdeal(req, res) {
  const key = req.get('X-ODEAL-REQUEST-KEY');
  if (!ODEAL_REQUEST_KEY || !key || !timingSafeEqualStr(key, ODEAL_REQUEST_KEY)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  // Enforce JSON on POST webhooks
  if (req.method === 'POST' && !req.is('application/json')) {
    res.status(415).json({ error: 'Unsupported Media Type' });
    return false;
  }
  return true;
}

app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Basket fetch – Ödeal calls this with the referenceCode
app.get('/app2app/baskets/:referenceCode', async (req, res) => {
  if (!verifyOdeal(req, res)) return;
  try {
    const referenceCodeRaw = req.params.referenceCode;
    let referenceCode = referenceCodeRaw;

    // Robustness: some older/alternative app2app flows may hit basketUrl as
    //   /baskets/payment?amount=..&customInfo=REF_...
    // In that case, treat customInfo as the real reference code.
    if ((referenceCode === 'payment' || referenceCode === 'directcharge') && req.query) {
      const q = req.query;
      const customInfo = (q.customInfo || q.reference || q.ref);
      if (typeof customInfo === 'string' && customInfo.trim().length > 0) {
        referenceCode = customInfo.trim();
      }
    }

    const basket = await resolveBasket(referenceCode);
    console.log(`[basket] refRaw=${referenceCodeRaw} -> ref=${referenceCode} ok`);
    res.json(basket);
  } catch (e) {
    res.status(500).json({ error: 'Basket resolution error', detail: String(e?.message || e) });
  }
});

// Webhook helpers
async function maybeBridgeToRop({ type, body }) {
  if (!ROUTE_ROP_AUTOSYNC) return;
  const ref = body?.basketReferenceCode || body?.referenceCode || '';
  const checkId = extractCheckId(ref);
  if (!checkId) return;
  let status = -1;
  if (type === 'payment-succeeded') status = 1;
  else if (type === 'payment-cancelled') status = 0;
  else status = -1;
  try {
    await postPaymentStatus({ CheckId: checkId, Status: status });
  } catch (e) {
    console.warn('[WARN] ROP PaymentStatus bridge failed:', e?.message || e);
  }
}

function webhookRoute(type) {
  return async (req, res) => {
    if (!verifyOdeal(req, res)) return;
    try {
      const key = makeEventKey(type, req.body || {});
      if (isDuplicate(key)) {
        return res.json({ ok: true, duplicate: true });
      }
      remember(key);
      await maybeBridgeToRop({ type, body: req.body });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Webhook error', detail: String(e?.message || e) });
    }
  };
}

app.post('/webhooks/odeal/payment-succeeded', webhookRoute('payment-succeeded'));
app.post('/webhooks/odeal/payment-failed', webhookRoute('payment-failed'));
app.post('/webhooks/odeal/payment-cancelled', webhookRoute('payment-cancelled'));

app.listen(PORT, () => {
  console.log(`[odeal-adapter] listening on :${PORT}`);
});
