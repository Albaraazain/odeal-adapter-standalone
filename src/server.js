import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { timingSafeEqual } from 'node:crypto';
import { resolveBasket, extractCheckId } from './basketProvider.js';
import { makeEventKey, isDuplicate, remember } from './idempotencyStore.js';
import { postPaymentStatus } from './ropClient.js';
import { refMap } from './refMap.js';
import { log } from './logger.js';

const app = express();
const PORT = Number(process.env.PORT || 8787);
const ODEAL_REQUEST_KEY = process.env.ODEAL_REQUEST_KEY;
const ROUTE_ROP_AUTOSYNC = String(process.env.ROUTE_ROP_AUTOSYNC || 'false').toLowerCase() === 'true';
const EMP_REF_SET = Boolean(
  process.env.ODEAL_EMPLOYEE_REF ||
  process.env.ODEAL_EMPLOYEE_CODE ||
  process.env.ODEAL_EMPLOYEE_NAME ||
  process.env.ODEAL_EMPLOYEE_SURNAME ||
  process.env.ODEAL_EMPLOYEE_GSM_NUMBER ||
  process.env.ODEAL_EMPLOYEE_IDENTITY_NUMBER ||
  process.env.ODEAL_EMPLOYEE_MAIL_ADDRESS
);
const REF_MAP_KEY = process.env.REF_MAP_KEY || '';
const REF_MAP_ENABLED = String(process.env.REF_MAP_ENABLED || 'true').toLowerCase() === 'true';

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

// Register UUID -> CheckId mapping from device/app
app.post('/app2app/refs', (req, res) => {
  try {
    const rid = res.locals.rid;
    if (!REF_MAP_ENABLED) {
      log.warn('RefMap disabled', { rid });
      return res.status(404).json({ error: 'disabled' });
    }
    if (REF_MAP_KEY) {
      const provided = req.get('X-ROP-ADAPTER-KEY') || '';
      if (!provided || provided !== REF_MAP_KEY) {
        log.warn('RefMap auth failed', { rid });
        return res.status(401).json({ error: 'unauthorized' });
      }
    }
    const body = req.body || {};
    const ref = String(body.referenceCode || body.ref || '').trim();
    const checkId = Number(body.checkId || body.CheckId || 0);
    const ttlSec = Number(body.ttlSeconds || 0);
    if (!ref || !checkId || Number.isNaN(checkId)) {
      log.warn('RefMap invalid payload', { rid, hasRef: Boolean(ref), checkId });
      return res.status(400).json({ error: 'invalid_payload' });
    }
    const ttlMs = ttlSec > 0 ? ttlSec * 1000 : undefined;
    refMap.set(ref, checkId, ttlMs);
    log.info('RefMap set', { rid, refPrefix: ref.substring(0, 8), checkId, ttlMs: ttlMs ?? 'default' });
    return res.json({ ok: true });
  } catch (e) {
    log.error('RefMap error', { error: String(e?.message || e) });
    return res.status(500).json({ error: 'server_error' });
  }
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
    // If mock provider is active, honor ?amount= for better parity with device request
    let desiredTotal;
    if (typeof req.query?.amount === 'string') {
      const num = Number(req.query.amount);
      if (!Number.isNaN(num) && num > 0) desiredTotal = num;
    }
    // If provider needs a CheckId and reference lacks digits, try lookup
    let effectiveRef = referenceCode;
    if (/\d+$/.test(referenceCode) === false) {
      const mapped = refMap.get(referenceCode);
      if (mapped) {
        effectiveRef = `${referenceCode}_${mapped}`;
        log.info('RefMap hit', { rid, refPrefix: referenceCode.substring(0, 8), checkId: mapped, effectiveRef });
      } else {
        log.debug('RefMap miss', { rid, refPrefix: referenceCode.substring(0, 8) });
      }
    }
    const basket = await resolveBasket(effectiveRef, { desiredTotal });
    const dt = Date.now() - t0;
    if (String(process.env.ODEAL_DEBUG_PAYLOAD || '0') === '1') {
      try {
        const sample = {
          referenceCode: basket?.referenceCode,
          basketPrice: { grossPrice: basket?.basketPrice?.grossPrice },
          productsCount: Array.isArray(basket?.products) ? basket.products.length : 0,
          employeeInfo: basket?.employeeInfo ? {
            employeeReferenceCodePrefix: String(basket.employeeInfo.employeeReferenceCode || '').slice(0, 4),
            present: true,
          } : { present: false },
          paymentOptions: Array.isArray(basket?.paymentOptions) ? basket.paymentOptions.map(p => p?.type) : [],
        };
        log.debug('Basket payload (sanitized)', { rid, sample });
      } catch (_) {
        // ignore logging errors
      }
    }
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
    const msg = String(e?.message || e);
    const rid = res.locals.rid;
    if (msg && (
      msg.includes('basket_missing') ||
      msg.includes('reference_code_missing') ||
      msg.includes('products_missing') ||
      msg.includes('product_fields_missing') ||
      msg.includes('product_quantity_invalid') ||
      msg.includes('product_price_invalid') ||
      msg.includes('basket_price_missing') ||
      msg.includes('payment_options_missing') ||
      msg.includes('employee_reference_missing'))
    ) {
      log.warn('Basket validation error', { rid, error: msg });
      return res.status(422).json({ error: 'basket_validation_error', detail: msg });
    }
    log.error('Basket resolution error', { rid, error: msg });
    res.status(500).json({ error: 'Basket resolution error', detail: msg });
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
