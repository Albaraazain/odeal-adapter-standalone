// Import ROP client only when needed to avoid HTTPS validation in mock mode

import { log } from './logger.js';
import { parseCompositeReference } from './referenceParser.js';
import { buildBasket, buildMock, BasketValidationError } from './basketBuilder.js';

const PROVIDER = (process.env.BASKET_PROVIDER || 'mock').toLowerCase();
const DEFAULT_TOTAL = Number(process.env.BASKET_DEFAULT_TOTAL || '100.00');
const EMP_REF = process.env.ODEAL_EMPLOYEE_REF || process.env.ODEAL_EMPLOYEE_CODE || '';

function envEmployeeInfo() {
  const ref = process.env.ODEAL_EMPLOYEE_REF || process.env.ODEAL_EMPLOYEE_CODE || '';
  const name = process.env.ODEAL_EMPLOYEE_NAME || '';
  const surname = process.env.ODEAL_EMPLOYEE_SURNAME || '';
  const gsmNumber = process.env.ODEAL_EMPLOYEE_GSM_NUMBER || '';
  const identityNumber = process.env.ODEAL_EMPLOYEE_IDENTITY_NUMBER || '';
  const mailAddress = process.env.ODEAL_EMPLOYEE_MAIL_ADDRESS || '';
  const info = {};
  if (ref) info.employeeReferenceCode = String(ref);
  if (name) info.name = String(name);
  if (surname) info.surname = String(surname);
  if (gsmNumber) info.gsmNumber = String(gsmNumber);
  if (identityNumber) info.identityNumber = String(identityNumber);
  if (mailAddress) info.mailAddress = String(mailAddress);
  return info;
}

// Build customerInfo from environment variables when provided.
// Returns {} when no relevant env vars are set to preserve existing behavior in tests/dev.
function envCustomerInfo() {
  // Hardcoded per request to satisfy fiscal app requirements
  // name: Cenk, surname: Üner, identityNumber (TCKN): 15808969220
  return {
    type: 'INDIVIDUAL',
    name: 'Cenk',
    surname: 'Üner',
    identityNumber: '15808969220',
    // City/town/address/email/gsm are required in some profiles
    // See: API Reference → Veri Modelleri → Sepet Aktar (customer: city/town/address required)
    // https://docs.odeal.com/reference/i%CC%87stek-limit-bilgisi
    city: 'İstanbul',
    town: 'Kadıköy',
    address: 'Bahariye Cad. No:1 Kadıköy/İstanbul',
    email: 'cenk.uner@example.com',
    gsmNumber: '5551234567',
  };
}

// Build Ödeal doc-shaped customer object for basket.customer
// Fields taken from docs (Sepet Aktar → customer object & Müşteri Kaydet):
// - referenceCode (required by docs when sent)
// - type (e.g., "PERSON" | "COMPANY")
// - title (company title or full name)
// - name, surname (optional)
// - taxOffice, taxNumber (VKN), identityNumber (TCKN)
// - gsmNumber, email, city, town, address
function envOdealCustomer() {
  // Keep customer (doc-shaped) aligned as well for device UX
  return {
    referenceCode: 'CENK-UNER-REF',
    type: 'PERSON',
    title: 'Cenk Üner',
    name: 'Cenk',
    surname: 'Üner',
    identityNumber: '15808969220',
    // Required fields per "Sepet Aktar → customer" when customer is present
    email: 'cenk.uner@example.com',
    gsmNumber: '5551234567',
    city: 'İstanbul',
    town: 'Kadıköy',
    address: 'Bahariye Cad. No:1 Kadıköy/İstanbul',
  };
}

// Backward-compatible helper: extract legacy numeric checkId for logs only
function parseLegacyNumericCheckId(referenceCode) {
  if (!referenceCode || typeof referenceCode !== 'string') return undefined;
  const m = /(?:.*?_)?(\d+)$/.exec(referenceCode);
  return m ? Number(m[1]) : undefined;
}

function mockBasket(referenceCode, overrideTotal) {
  try {
    return buildMock({
      referenceCode,
      total: overrideTotal != null ? Number(overrideTotal) : DEFAULT_TOTAL,
      employeeInfo: envEmployeeInfo(),
      employeeRef: EMP_REF || undefined,
      customerInfo: envCustomerInfo(),
      customer: envOdealCustomer(),
    });
  } catch (e) {
    if (e instanceof BasketValidationError) {
      log.error('mockBasket validation failed', { error: e.message });
    } else {
      log.error('mockBasket error', { error: String(e?.message || e) });
    }
    // Fall back to a minimal permissive shape
    return {
      referenceCode,
      basketPrice: { grossPrice: DEFAULT_TOTAL },
      products: [{ referenceCode: 'ITEM-TEST', name: 'Test Product', quantity: 1, unitCode: (process.env.ODEAL_DEFAULT_UNIT_CODE || 'C62'), price: { grossPrice: DEFAULT_TOTAL, vatRatio: 0, sctRatio: 0 } }],
      customerInfo: envCustomerInfo(),
      customer: envOdealCustomer(),
      employeeInfo: (Object.keys(envEmployeeInfo()).length)
        ? envEmployeeInfo()
        : (EMP_REF ? { employeeReferenceCode: EMP_REF } : {}),
      receiptInfo: {},
      customInfo: null,
      paymentOptions: [{ type: 'CREDITCARD', amount: DEFAULT_TOTAL }],
    };
  }
}

function ropLinesToBasket(referenceCode, rop) {
  const lines = rop?.Details || rop?.Lines || rop?.items || [];
  const items = [];
  for (const l of lines) {
    const name = l.Name || l.name || l.ItemName || 'Item';
    const qty = Number(l.Quantity ?? l.qty ?? l.Qty ?? 1);
    const gross = Number(l.Total ?? l.Gross ?? l.Price ?? 0);
    const unitGross = gross && qty ? gross / qty : Number(l.Price || 0);
    const sku = l.Code || l.Sku || l.ItemCode || name;
    const unitFromLine = l.Unit || l.unit || l.UnitCode || l.unitCode;
    items.push({
      referenceCode: String(sku),
      name: String(name),
      quantity: qty,
      unitCode: unitFromLine || process.env.ODEAL_DEFAULT_UNIT_CODE || 'C62',
      unitGross: Number(unitGross.toFixed(2)),
      vatRatio: 0,
      sctRatio: 0,
    });
  }
  if (!items.length) return mockBasket(referenceCode);
  try {
    return buildBasket({ referenceCode, items, employeeRef: EMP_REF || undefined, employeeInfo: envEmployeeInfo(), customerInfo: envCustomerInfo(), customer: envOdealCustomer() });
  } catch (e) {
    if (e instanceof BasketValidationError) {
      log.error('ROP basket validation failed', { error: e.message });
    } else {
      log.error('ROP basket build error', { error: String(e?.message || e) });
    }
    return mockBasket(referenceCode);
  }
}

async function resolveBasket(referenceCode, opts = {}) {
  const desiredTotal = typeof opts.desiredTotal === 'number' && !Number.isNaN(opts.desiredTotal)
    ? opts.desiredTotal
    : undefined;
  if (PROVIDER !== 'rop') {
    log.info('resolveBasket: using mock provider', { referenceCode, provider: PROVIDER, desiredTotal });
    const b = mockBasket(referenceCode, desiredTotal);
    log.info('resolveBasket: mock basket built', {
      referenceCode: b.referenceCode,
      total: b.basketPrice?.grossPrice,
      products: b.products?.length,
      employeeInfoPresent: Boolean(envEmployeeInfo().employeeReferenceCode || Object.keys(envEmployeeInfo()).length),
    });
    return b;
  }
  const composite = parseCompositeReference(referenceCode);
  if (!composite) {
    const legacy = parseLegacyNumericCheckId(referenceCode);
    log.info('resolveBasket: mock due to missing composite reference', { referenceCode, desiredTotal, legacyCheckId: legacy });
    return mockBasket(referenceCode, desiredTotal);
  }
  try {
    // Import ROP client only when in ROP mode
    const { getCheckDetail } = await import('./ropClient.js');
    const t0 = Date.now();
    const rop = await getCheckDetail({ deviceId: composite.deviceId, restaurantId: composite.restaurantId, CheckId: composite.checkId });
    const dt = Date.now() - t0;
    log.info('resolveBasket: ROP check fetched', { checkId: composite.checkId, ms: dt, hasLines: Boolean(rop?.Details || rop?.Lines) });
    const basket = ropLinesToBasket(referenceCode, rop);
    log.info('resolveBasket: basket from ROP', {
      referenceCode: basket.referenceCode,
      total: basket.basketPrice?.grossPrice,
      products: basket.products?.length,
      employeeInfoPresent: Boolean(envEmployeeInfo().employeeReferenceCode || Object.keys(envEmployeeInfo()).length),
    });
    return basket;
  } catch (e) {
    // Fallback to mock on errors
    log.error('resolveBasket: error, fallback to mock', { referenceCode, error: String(e?.message || e) });
    return mockBasket(referenceCode);
  }
}

function extractCheckId(referenceCode) {
  const composite = parseCompositeReference(referenceCode);
  return composite?.checkId;
}

export {
  resolveBasket,
  extractCheckId,
  mockBasket,
  ropLinesToBasket
};
