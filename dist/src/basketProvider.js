import { getCheckDetail } from './ropClient.js';

const PROVIDER = (process.env.BASKET_PROVIDER || 'mock').toLowerCase();
const DEFAULT_TOTAL = Number(process.env.BASKET_DEFAULT_TOTAL || '100.00');

function parseCheckId(referenceCode) {
  // Accept formats like ROP_3215799, CHECK_123, or any trailing digits
  const m = /(?:.*?_)?(\d+)$/.exec(referenceCode || '');
  return m ? Number(m[1]) : undefined;
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
    employeeInfo: {},
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
  return {
    referenceCode,
    basketPrice: { grossPrice: Number(total.toFixed(2)) },
    products,
    customerInfo: {},
    employeeInfo: {},
    receiptInfo: {},
    customInfo: null,
    paymentOptions: [{ type: 'CREDITCARD', amount: Number(total.toFixed(2)) }],
  };
}

export async function resolveBasket(referenceCode) {
  if (PROVIDER !== 'rop') {
    return mockBasket(referenceCode);
  }
  const checkId = parseCheckId(referenceCode);
  if (!checkId) {
    return mockBasket(referenceCode);
  }
  try {
    const rop = await getCheckDetail({ CheckId: checkId });
    return ropLinesToBasket(referenceCode, rop);
  } catch (e) {
    // Fallback to mock on errors
    return mockBasket(referenceCode);
  }
}

export function extractCheckId(referenceCode) {
  return parseCheckId(referenceCode);
}

