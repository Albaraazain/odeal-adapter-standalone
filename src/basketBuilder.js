// Ödeal basket builder and validator (doc-shaped)
// Ensures we always return a schema-aligned basket:
// - referenceCode (string)
// - receiptInfo (object)
// - customInfo (string|null)
// - employeeInfo { employeeReferenceCode }
// - customerInfo (object)
// - basketPrice { grossPrice }
// - products [ { referenceCode, name, quantity, unitCode, price { grossPrice, vatRatio, sctRatio } } ]
// - paymentOptions [ { type: 'CREDITCARD', amount } ]

const REQUIRE_EMP = String(process.env.ODEAL_REQUIRE_EMPLOYEE || 'true').toLowerCase() === 'true';

class BasketValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BasketValidationError';
  }
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function validateBasketModel(b) {
  if (!b || typeof b !== 'object') throw new BasketValidationError('basket_missing');
  if (!b.referenceCode || String(b.referenceCode).trim().length === 0) {
    throw new BasketValidationError('reference_code_missing');
  }
  if (!Array.isArray(b.products) || b.products.length === 0) {
    throw new BasketValidationError('products_missing');
  }
  for (const p of b.products) {
    if (!p.name || !p.referenceCode) throw new BasketValidationError('product_fields_missing');
    if (!p.quantity || p.quantity <= 0) throw new BasketValidationError('product_quantity_invalid');
    if (!p.price || typeof p.price.grossPrice !== 'number') throw new BasketValidationError('product_price_invalid');
  }
  if (!b.basketPrice || typeof b.basketPrice.grossPrice !== 'number') {
    throw new BasketValidationError('basket_price_missing');
  }
  if (!Array.isArray(b.paymentOptions) || b.paymentOptions.length === 0) {
    throw new BasketValidationError('payment_options_missing');
  }
  if (REQUIRE_EMP) {
    if (!b.employeeInfo || !b.employeeInfo.employeeReferenceCode) {
      throw new BasketValidationError('employee_reference_missing');
    }
  }
}

function buildBasket({ referenceCode, items, employeeRef, paymentAmount, customerInfo, receiptInfo, customInfo }) {
  if (!referenceCode) throw new BasketValidationError('reference_code_missing');
  const products = [];
  for (const it of items || []) {
    const quantity = Number(it.quantity || 0);
    const unitGross = Number(it.unitGross || 0);
    const vatRatio = Number(it.vatRatio || 0);
    const sctRatio = Number(it.sctRatio || 0);
    if (!it.name || !it.referenceCode || !(quantity > 0) || !(unitGross >= 0)) continue;
    products.push({
      referenceCode: String(it.referenceCode),
      name: String(it.name),
      quantity,
      unitCode: String(it.unitCode || 'ADET'),
      price: { grossPrice: round2(unitGross), vatRatio, sctRatio },
    });
  }
  if (products.length === 0) throw new BasketValidationError('products_missing');
  const total = round2(products.reduce((s, p) => s + p.price.grossPrice * p.quantity, 0));
  const amount = paymentAmount != null ? round2(paymentAmount) : total;
  const basket = {
    referenceCode,
    receiptInfo: receiptInfo || {},
    customInfo: customInfo ?? null,
    employeeInfo: employeeRef ? { employeeReferenceCode: String(employeeRef) } : {},
    customerInfo: customerInfo || {},
    basketPrice: { grossPrice: total },
    products,
    paymentOptions: [{ type: 'CREDITCARD', amount }],
  };
  validateBasketModel(basket);
  return basket;
}

function buildMock({ referenceCode, total, employeeRef }) {
  const t = round2(total != null ? total : 100);
  return buildBasket({
    referenceCode,
    employeeRef,
    items: [{ referenceCode: 'ITEM-TEST', name: 'Test Product', quantity: 1, unitGross: t, vatRatio: 0, sctRatio: 0 }],
    paymentAmount: t,
  });
}

module.exports = { buildBasket, buildMock, BasketValidationError };

