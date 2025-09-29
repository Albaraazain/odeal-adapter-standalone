import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Employee Info environment mapping', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.BASKET_PROVIDER = 'mock';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('populates full employeeInfo from env', async () => {
    process.env.ODEAL_EMPLOYEE_REF = 'EMP001';
    process.env.ODEAL_EMPLOYEE_NAME = 'Ahmet';
    process.env.ODEAL_EMPLOYEE_SURNAME = 'Yilmaz';
    process.env.ODEAL_EMPLOYEE_GSM_NUMBER = '905551112233';
    process.env.ODEAL_EMPLOYEE_IDENTITY_NUMBER = '12345678901';
    process.env.ODEAL_EMPLOYEE_MAIL_ADDRESS = 'ahmet.yilmaz@example.com';

    jest.resetModules();
    const { mockBasket } = await import('../../src/basketProvider.js');
    const basket = mockBasket('TEST_REF');
    expect(basket).toBeTruthy();
    expect(basket).toHaveProperty('employeeInfo');
    expect(basket.employeeInfo).toMatchObject({
      employeeReferenceCode: 'EMP001',
      name: 'Ahmet',
      surname: 'Yilmaz',
      gsmNumber: '905551112233',
      identityNumber: '12345678901',
      mailAddress: 'ahmet.yilmaz@example.com',
    });
  });

  test('only reference code is included when others are absent', async () => {
    process.env.ODEAL_EMPLOYEE_REF = 'EMP123';
    delete process.env.ODEAL_EMPLOYEE_NAME;
    delete process.env.ODEAL_EMPLOYEE_SURNAME;
    delete process.env.ODEAL_EMPLOYEE_GSM_NUMBER;
    delete process.env.ODEAL_EMPLOYEE_IDENTITY_NUMBER;
    delete process.env.ODEAL_EMPLOYEE_MAIL_ADDRESS;

    jest.resetModules();
    const { mockBasket } = await import('../../src/basketProvider.js');
    const basket = mockBasket('TEST_REF');
    expect(basket.employeeInfo).toMatchObject({ employeeReferenceCode: 'EMP123' });
    expect(Object.keys(basket.employeeInfo)).toContain('employeeReferenceCode');
  });

  test('falls back to permissive shape if no employee info present and required', async () => {
    delete process.env.ODEAL_EMPLOYEE_REF;
    process.env.ODEAL_REQUIRE_EMPLOYEE = 'true';
    jest.resetModules();
    const { mockBasket } = await import('../../src/basketProvider.js');
    const basket = mockBasket('TEST_REF');
    // Fallback returns minimal permissive shape
    expect(basket).toHaveProperty('employeeInfo');
    expect(Object.keys(basket.employeeInfo || {})).toHaveLength(0);
  });
});
