// Ödeal basket builder and validator (doc-shaped)
// Ensures we always return a schema-aligned basket:
// - referenceCode (string)
// - receiptInfo (object)
// - customInfo (string|null)
// - employeeInfo {
//     employeeReferenceCode,
//     name?,
//     surname?,
//     identityNumber?,
//     gsmNumber?,
//     mailAddress? (nullable)
//   }
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

function normalizeEmployeeInfo(employeeRef, employeeInfo) {
  const src = employeeInfo && typeof employeeInfo === 'object' ? employeeInfo : {};
  const code = src.employeeReferenceCode != null && String(src.employeeReferenceCode).trim() !== ''
    ? String(src.employeeReferenceCode)
    : (employeeRef != null && String(employeeRef).trim() !== '' ? String(employeeRef) : undefined);

  if (!code) return {}; // no employee provided

  return {
    employeeReferenceCode: code,
    name: src.name != null && String(src.name).trim() !== '' ? String(src.name) : null,
    surname: src.surname != null && String(src.surname).trim() !== '' ? String(src.surname) : null,
    identityNumber: src.identityNumber != null && String(src.identityNumber).trim() !== '' ? String(src.identityNumber) : null,
    gsmNumber: src.gsmNumber != null && String(src.gsmNumber).trim() !== '' ? String(src.gsmNumber) : null,
    mailAddress: src.mailAddress != null && String(src.mailAddress).trim() !== '' ? String(src.mailAddress) : null,
  };
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
  // employee validation (new structure aware)
  const ei = b.employeeInfo;
  if (REQUIRE_EMP) {
    if (!ei || !ei.employeeReferenceCode || String(ei.employeeReferenceCode).trim() === '') {
      throw new BasketValidationError('employee_reference_missing');
    }
  }
  if (ei && typeof ei === 'object' && Object.keys(ei).length) {
    if (ei.employeeReferenceCode != null && typeof ei.employeeReferenceCode !== 'string') {
      throw new BasketValidationError('employee_reference_invalid');
    }
    if (ei.name != null && typeof ei.name !== 'string') throw new BasketValidationError('employee_name_invalid');
    if (ei.surname != null && typeof ei.surname !== 'string') throw new BasketValidationError('employee_surname_invalid');
    if (ei.identityNumber != null && typeof ei.identityNumber !== 'string') throw new BasketValidationError('employee_identity_invalid');
    if (ei.gsmNumber != null && typeof ei.gsmNumber !== 'string') throw new BasketValidationError('employee_gsm_invalid');
    if (ei.mailAddress != null && typeof ei.mailAddress !== 'string') throw new BasketValidationError('employee_mail_invalid');
  }
}

function buildBasket({ referenceCode, items, employeeRef, employeeInfo, paymentAmount, customerInfo, receiptInfo, customInfo }) {
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
    employeeInfo: normalizeEmployeeInfo(employeeRef, employeeInfo),
    customerInfo: customerInfo || {},
    basketPrice: { grossPrice: total },
    products,
    paymentOptions: [{ type: 'CREDITCARD', amount }],
  };
  validateBasketModel(basket);
  return basket;
}

function buildMock({ referenceCode, total, employeeRef, employeeInfo, customerInfo }) {
  const t = round2(total != null ? total : 100);
  return buildBasket({
    referenceCode,
    employeeRef,
    employeeInfo,
    customerInfo,
    items: [{ referenceCode: 'ITEM-TEST', name: 'Test Product', quantity: 1, unitGross: t, vatRatio: 0, sctRatio: 0 }],
    paymentAmount: t,
  });
}

export { buildBasket, buildMock, BasketValidationError };
