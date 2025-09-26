// Import ROP client only when needed to avoid HTTPS validation in mock mode

import { log } from './logger.js';

const PROVIDER = (process.env.BASKET_PROVIDER || 'mock').toLowerCase();
const DEFAULT_TOTAL = Number(process.env.BASKET_DEFAULT_TOTAL || '100.00');
const EMP_REF = process.env.ODEAL_EMPLOYEE_REF || process.env.ODEAL_EMPLOYEE_CODE || '';

function parseCheckId(referenceCode) {
  // Accept formats like ROP_3215799, CHECK_123, trailing digits, and directcharge fallback
  if (!referenceCode || typeof referenceCode !== 'string') return undefined;

  // Handle directcharge fallback format: "directcharge?amount=585.0&ref=de1a7feb-94ed-4f6a-ba27-eccaefeb894f"
  if (referenceCode.startsWith('directcharge?')) {
    const urlParams = new URLSearchParams(referenceCode.substring('directcharge?'.length));
    const actualRef = urlParams.get('ref');
    if (actualRef) {
      log.debug('parseCheckId: directcharge detected', { actualRef });
      // Recursively parse the extracted reference
      return parseCheckId(actualRef);
    }
  }

  // Handle UUID patterns by returning null to trigger mock basket
  // Since UUIDs are used for basket references but we need numeric checkIds for ROP lookup
  if (referenceCode.includes('-') && /^[0-9a-f-]{36}$/i.test(referenceCode)) {
    log.debug('parseCheckId: UUID reference detected, using mock basket', { referenceCode });
    return null; // Return null to indicate we should use mock basket
  }

  // Handle prefixed numeric formats (ROP_123, CHECK_456, etc.)
  const m = /(?:.*?_)?(\d+)$/.exec(referenceCode);
  const checkId = m ? Number(m[1]) : undefined;

  if (!checkId) {
    log.warn('parseCheckId: cannot extract numeric id', { referenceCode });
  } else {
    log.debug('parseCheckId: parsed', { checkId });
  }

  return checkId;
}

function mockBasket(referenceCode) {
  return {
    referenceCode,
    basketPrice: { grossPrice: DEFAULT_TOTAL },
    products: [
      {
        referenceCode: 'ITEM-TEST',
        name: 'Test Product',
        quantity: 1,
        unitCode: 'ADET',
        price: { grossPrice: DEFAULT_TOTAL, vatRatio: 0, sctRatio: 0 },
      },
    ],
    customerInfo: {},
    employeeInfo: EMP_REF ? { employeeReferenceCode: EMP_REF } : {},
    receiptInfo: {},
    customInfo: null,
    paymentOptions: [{ type: 'CREDITCARD', amount: DEFAULT_TOTAL }],
  };
}

function ropLinesToBasket(referenceCode, rop) {
  // Attempt to map common fields; fall back to mock if structure differs.
  const lines = rop?.Details || rop?.Lines || rop?.items || [];
  let products = [];
  for (const l of lines) {
    const name = l.Name || l.name || l.ItemName || 'Item';
    const qty = Number(l.Quantity ?? l.qty ?? l.Qty ?? 1);
    const gross = Number(l.Total ?? l.Gross ?? l.Price ?? 0);
    const unitGross = gross && qty ? gross / qty : Number(l.Price || 0);
    const sku = l.Code || l.Sku || l.ItemCode || name;
    products.push({
      referenceCode: String(sku),
      name: String(name),
      quantity: qty,
      unitCode: 'ADET',
      price: { grossPrice: Number(unitGross.toFixed(2)), vatRatio: 0, sctRatio: 0 },
    });
  }
  if (!products.length) return mockBasket(referenceCode);

  const total = products.reduce((s, p) => s + p.price.grossPrice * p.quantity, 0);
  const basket = {
    referenceCode,
    basketPrice: { grossPrice: Number(total.toFixed(2)) },
    products,
    customerInfo: {},
    employeeInfo: EMP_REF ? { employeeReferenceCode: EMP_REF } : {},
    receiptInfo: {},
    customInfo: null,
    paymentOptions: [{ type: 'CREDITCARD', amount: Number(total.toFixed(2)) }],
  };
  return basket;
}

async function resolveBasket(referenceCode) {
  if (PROVIDER !== 'rop') {
    log.info('resolveBasket: using mock provider', { referenceCode, provider: PROVIDER });
    const b = mockBasket(referenceCode);
    log.info('resolveBasket: mock basket built', {
      referenceCode: b.referenceCode,
      total: b.basketPrice?.grossPrice,
      products: b.products?.length,
      employeeInfoPresent: Boolean(EMP_REF),
    });
    return b;
  }
  const checkId = parseCheckId(referenceCode);
  if (!checkId) {
    log.info('resolveBasket: mock due to missing checkId', { referenceCode });
    return mockBasket(referenceCode);
  }
  try {
    // Import ROP client only when in ROP mode
    const { getCheckDetail } = await import('./ropClient.js');
    const t0 = Date.now();
    const rop = await getCheckDetail({ CheckId: checkId });
    const dt = Date.now() - t0;
    log.info('resolveBasket: ROP check fetched', { checkId, ms: dt, hasLines: Boolean(rop?.Details || rop?.Lines) });
    const basket = ropLinesToBasket(referenceCode, rop);
    log.info('resolveBasket: basket from ROP', {
      referenceCode: basket.referenceCode,
      total: basket.basketPrice?.grossPrice,
      products: basket.products?.length,
      employeeInfoPresent: Boolean(EMP_REF),
    });
    return basket;
  } catch (e) {
    // Fallback to mock on errors
    log.error('resolveBasket: error, fallback to mock', { referenceCode, error: String(e?.message || e) });
    return mockBasket(referenceCode);
  }
}

function extractCheckId(referenceCode) {
  return parseCheckId(referenceCode);
}

export {
  resolveBasket,
  extractCheckId,
  mockBasket,
  ropLinesToBasket
};
