import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// We'll dynamically import the module after setting env so that
// top-level constants pick up the environment variables.

jest.mock('../../src/ropClient.js', () => ({
  getCheckDetail: jest.fn(),
}));

let getCheckDetail;
beforeAll(async () => {
  ({ getCheckDetail } = await import('../../src/ropClient.js'));
});

describe('basketProvider env → employeeInfo mapping', () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.ODEAL_EMPLOYEE_REF;
    delete process.env.ODEAL_EMPLOYEE_CODE;
    delete process.env.ODEAL_EMPLOYEE_NAME;
    delete process.env.ODEAL_EMPLOYEE_SURNAME;
    delete process.env.ODEAL_EMPLOYEE_IDENTITY_NUMBER;
    delete process.env.ODEAL_EMPLOYEE_GSM_NUMBER;
    delete process.env.ODEAL_EMPLOYEE_MAIL_ADDRESS;
    delete process.env.BASKET_PROVIDER;
    delete process.env.BASKET_DEFAULT_TOTAL;
    delete process.env.ODEAL_REQUIRE_EMPLOYEE;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  test('mock provider builds basket with full employeeInfo from env', async () => {
    process.env.BASKET_PROVIDER = 'mock';
    process.env.ODEAL_REQUIRE_EMPLOYEE = 'true';
    process.env.BASKET_DEFAULT_TOTAL = '123.45';
    process.env.ODEAL_EMPLOYEE_CODE = 'musteri';
    process.env.ODEAL_EMPLOYEE_NAME = 'SambaPOS';
    process.env.ODEAL_EMPLOYEE_SURNAME = 'Test';
    process.env.ODEAL_EMPLOYEE_IDENTITY_NUMBER = '5999999999';
    process.env.ODEAL_EMPLOYEE_GSM_NUMBER = '5999999999';
    process.env.ODEAL_EMPLOYEE_MAIL_ADDRESS = '';

    const { resolveBasket } = await import('../../src/basketProvider.js');
    const basket = await resolveBasket('UT_ENV_MOCK_001');

    expect(basket.referenceCode).toBe('UT_ENV_MOCK_001');
    expect(basket.basketPrice.grossPrice).toBe(123.45);
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

  test('rop provider passes env employeeInfo through', async () => {
    process.env.BASKET_PROVIDER = 'rop';
    process.env.ODEAL_REQUIRE_EMPLOYEE = 'true';
    process.env.ODEAL_EMPLOYEE_REF = 'musteri';
    process.env.ODEAL_EMPLOYEE_NAME = 'SambaPOS';
    process.env.ODEAL_EMPLOYEE_SURNAME = 'Test';
    process.env.ODEAL_EMPLOYEE_IDENTITY_NUMBER = '5999999999';
    process.env.ODEAL_EMPLOYEE_GSM_NUMBER = '5999999999';

    jest.resetModules();
    const { resolveBasket } = await import('../../src/basketProvider.js');

    // Mock ROP response with one line
    getCheckDetail.mockResolvedValue({
      Details: [ { Name: 'Line', Quantity: 1, Total: 10, Code: 'SKU' } ],
    });

    const basket = await resolveBasket('ROP_123456');
    expect(basket.employeeInfo).toEqual({
      employeeReferenceCode: 'musteri',
      name: 'SambaPOS',
      surname: 'Test',
      identityNumber: '5999999999',
      gsmNumber: '5999999999',
      mailAddress: null,
    });
  });
});
