import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { timingSafeEqual } from 'node:crypto';
import { resolveBasket, extractCheckId } from './basketProvider.js';
import { makeEventKey, isDuplicate, remember } from './idempotencyStore.js';
import { postPaymentStatus } from './ropClient.js';
import { log } from './logger.js';

const app = express();
const PORT = Number(process.env.PORT || 8787);
const ODEAL_REQUEST_KEY = process.env.ODEAL_REQUEST_KEY;
const ROUTE_ROP_AUTOSYNC = String(process.env.ROUTE_ROP_AUTOSYNC || 'false').toLowerCase() === 'true';
const EMP_REF_SET = Boolean(process.env.ODEAL_EMPLOYEE_REF || process.env.ODEAL_EMPLOYEE_CODE);

if (!ODEAL_REQUEST_KEY) {
  log.warn('ODEAL_REQUEST_KEY is not set; requests will be unauthorized');
}

// Startup diagnostics
log.info('Adapter starting', {
  port: PORT,
  basketProvider: (process.env.BASKET_PROVIDER || 'mock').toLowerCase(),
  basketDefaultTotal: process.env.BASKET_DEFAULT_TOTAL || '100.00',
  routeRopAutosync: ROUTE_ROP_AUTOSYNC,
  employeeRefConfigured: EMP_REF_SET,
});

// Basic hardening
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(process.env.NODE_ENV === 'production' ? morgan('tiny') : morgan('dev'));

// Correlation id middleware
app.use((req, res, next) => {
  const rid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  res.locals.rid = rid;
  const fwd = req.get('x-forwarded-for');
  log.debug('HTTP request', {
    rid,
    method: req.method,
    url: req.originalUrl,
    ip: fwd || req.ip,
    ua: req.get('user-agent'),
    authHeaderPresent: Boolean(req.get('X-ODEAL-REQUEST-KEY')),
  });
  next();
});
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
    log.warn('Auth failed', { rid: res.locals.rid, reason: !ODEAL_REQUEST_KEY ? 'no-server-key' : !key ? 'no-header' : 'mismatch' });
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  // Enforce JSON on POST webhooks
  if (req.method === 'POST' && !req.is('application/json')) {
    log.warn('Unsupported media type on POST', { rid: res.locals.rid, contentType: req.get('content-type') });
    res.status(415).json({ error: 'Unsupported Media Type' });
    return false;
  }
  return true;
}

app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Compatibility aliases for legacy serverless paths (no Vercel/Netlify now)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get('/api/app2app/baskets/:referenceCode', async (req, res) => {
  // Reuse the same handler logic as non-/api route by delegating to Express
  req.url = req.url.replace(/^\/api/, '');
  // Call the underlying route stack
  return app._router.handle(req, res, () => res.status(404).end());
});

app.post('/api/webhooks/odeal/payment-succeeded', (req, res) => {
  req.url = req.url.replace(/^\/api/, '');
  return app._router.handle(req, res, () => res.status(404).end());
});
app.post('/api/webhooks/odeal/payment-failed', (req, res) => {
  req.url = req.url.replace(/^\/api/, '');
  return app._router.handle(req, res, () => res.status(404).end());
});
app.post('/api/webhooks/odeal/payment-cancelled', (req, res) => {
  req.url = req.url.replace(/^\/api/, '');
  return app._router.handle(req, res, () => res.status(404).end());
});

// Basket fetch – Ödeal calls this with the referenceCode
app.get('/app2app/baskets/:referenceCode', async (req, res) => {
  if (!verifyOdeal(req, res)) return;
  try {
    const rid = res.locals.rid;
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

    log.info('Basket request', {
      rid,
      refRaw: referenceCodeRaw,
      ref: referenceCode,
      qp: Object.keys(req.query || {}),
    });
    const t0 = Date.now();
    const basket = await resolveBasket(referenceCode);
    const dt = Date.now() - t0;
    log.info('Basket response', {
      rid,
      ref: basket?.referenceCode,
      total: basket?.basketPrice?.grossPrice,
      products: Array.isArray(basket?.products) ? basket.products.length : 0,
      employeeInfoPresent: Boolean(basket?.employeeInfo && Object.keys(basket.employeeInfo).length),
      paymentOptions: Array.isArray(basket?.paymentOptions) ? basket.paymentOptions.map(p => p?.type).join(',') : undefined,
      ms: dt,
    });
    res.json(basket);
  } catch (e) {
    log.error('Basket resolution error', { rid: res.locals.rid, error: String(e?.message || e) });
    res.status(500).json({ error: 'Basket resolution error', detail: String(e?.message || e) });
  }
});

// Webhook helpers
async function maybeBridgeToRop({ type, body, rid }) {
  if (!ROUTE_ROP_AUTOSYNC) return;
  const ref = body?.basketReferenceCode || body?.referenceCode || '';
  const checkId = extractCheckId(ref);
  if (!checkId) return;
  let status = -1;
  if (type === 'payment-succeeded') status = 1;
  else if (type === 'payment-cancelled') status = 0;
  else status = -1;
  try {
    log.info('Bridge PaymentStatus → ROP', { rid, type, ref, checkId, status });
    await postPaymentStatus({ CheckId: checkId, Status: status });
    log.info('Bridge OK', { rid, checkId });
  } catch (e) {
    log.warn('Bridge failed', { rid, error: String(e?.message || e) });
  }
}

function webhookRoute(type) {
  return async (req, res) => {
    if (!verifyOdeal(req, res)) return;
    try {
      const key = makeEventKey(type, req.body || {});
      if (isDuplicate(key)) {
        log.info('Webhook duplicate', { rid: res.locals.rid, type });
        return res.json({ ok: true, duplicate: true });
      }
      remember(key);
      log.info('Webhook received', {
        rid: res.locals.rid,
        type,
        fields: Object.keys(req.body || {}),
      });
      await maybeBridgeToRop({ type, body: req.body, rid: res.locals.rid });
      res.json({ ok: true });
    } catch (e) {
      log.error('Webhook error', { rid: res.locals.rid, type, error: String(e?.message || e) });
      res.status(500).json({ error: 'Webhook error', detail: String(e?.message || e) });
    }
  };
}

app.post('/webhooks/odeal/payment-succeeded', webhookRoute('payment-succeeded'));
app.post('/webhooks/odeal/payment-failed', webhookRoute('payment-failed'));
app.post('/webhooks/odeal/payment-cancelled', webhookRoute('payment-cancelled'));

app.listen(PORT, () => {
  log.info(`[odeal-adapter] listening on :${PORT}`);
});
