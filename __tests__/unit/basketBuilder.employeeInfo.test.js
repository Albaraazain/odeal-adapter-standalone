const { buildBasket, buildMock, BasketValidationError } = require('../../src/basketBuilder.js');

describe('basketBuilder employeeInfo structure', () => {
  const OLD_ENV = process.env.ODEAL_REQUIRE_EMPLOYEE;

  beforeAll(() => {
    process.env.ODEAL_REQUIRE_EMPLOYEE = 'true';
  });

  afterAll(() => {
    if (OLD_ENV === undefined) delete process.env.ODEAL_REQUIRE_EMPLOYEE;
    else process.env.ODEAL_REQUIRE_EMPLOYEE = OLD_ENV;
  });

  test('accepts full employeeInfo and preserves fields', () => {
    const basket = buildBasket({
      referenceCode: 'UT_BASKET_001',
      items: [{ referenceCode: 'SKU1', name: 'Item', quantity: 1, unitGross: 10, vatRatio: 0, sctRatio: 0 }],
      employeeInfo: {
        employeeReferenceCode: 'musteri',
        name: 'SambaPOS',
        surname: 'Test',
        identityNumber: '5999999999',
        gsmNumber: '5999999999',
        mailAddress: null,
      },
      paymentAmount: 10,
    });
    expect(basket).toHaveProperty('employeeInfo');
    expect(basket.employeeInfo).toEqual({
      employeeReferenceCode: 'musteri',
      name: 'SambaPOS',
      surname: 'Test',
      identityNumber: '5999999999',
      gsmNumber: '5999999999',
      mailAddress: null,
    });
  });

  test('backward compatibility: employeeRef only', () => {
    const basket = buildMock({ referenceCode: 'UT_REF_ONLY', total: 5, employeeRef: 'legacy_code' });
    expect(basket.employeeInfo).toMatchObject({ employeeReferenceCode: 'legacy_code' });
    // new fields default to null when not supplied
    expect(basket.employeeInfo).toHaveProperty('name', null);
    expect(basket.employeeInfo).toHaveProperty('surname', null);
    expect(basket.employeeInfo).toHaveProperty('identityNumber', null);
    expect(basket.employeeInfo).toHaveProperty('gsmNumber', null);
    expect(basket.employeeInfo).toHaveProperty('mailAddress', null);
  });

  test('uses employeeRef when employeeInfo provided without code', () => {
    const basket = buildBasket({
      referenceCode: 'UT_FALLBACK',
      items: [{ referenceCode: 'SKU', name: 'Item', quantity: 1, unitGross: 7 }],
      employeeRef: 'fallback',
      employeeInfo: { name: 'Only Name' },
    });
    expect(basket.employeeInfo.employeeReferenceCode).toBe('fallback');
    expect(basket.employeeInfo.name).toBe('Only Name');
  });

  test('throws when employee required but missing', () => {
    expect(() => buildBasket({
      referenceCode: 'UT_MISSING_EMP',
      items: [{ referenceCode: 'SKU', name: 'Item', quantity: 1, unitGross: 7 }],
    })).toThrow(BasketValidationError);
  });

  test('coerces scalar fields to string when possible', () => {
    const basket = buildBasket({
      referenceCode: 'UT_COERCE',
      items: [{ referenceCode: 'SKU', name: 'Item', quantity: 1, unitGross: 7 }],
      employeeInfo: { employeeReferenceCode: 'ok', identityNumber: 12345 },
    });
    expect(basket.employeeInfo.identityNumber).toBe('12345');
  });
});
