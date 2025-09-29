import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { resolveBasket, extractCheckId } from '../../src/basketProvider.js';

// Mock the ropClient module
jest.mock('../../src/ropClient.js', () => ({
  getCheckDetail: jest.fn()
}));

let getCheckDetail;
beforeAll(async () => {
  ({ getCheckDetail } = await import('../../src/ropClient.js'));
});

describe('BasketProvider', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('extractCheckId', () => {
    test('should extract check ID from ROP format', () => {
      expect(extractCheckId('ROP_1234567')).toBe(1234567);
      expect(extractCheckId('ROP_987654')).toBe(987654);
    });

    test('should extract check ID from CHECK format', () => {
      expect(extractCheckId('CHECK_123')).toBe(123);
      expect(extractCheckId('CHECK_456')).toBe(456);
    });

    test('should extract check ID from plain numbers', () => {
      expect(extractCheckId('1234567')).toBe(1234567);
      expect(extractCheckId('987')).toBe(987);
    });

    test('should return undefined for invalid formats', () => {
      expect(extractCheckId('INVALID')).toBeUndefined();
      expect(extractCheckId('')).toBeUndefined();
      expect(extractCheckId('NO_NUMBERS')).toBeUndefined();
    });

    test('should handle edge cases', () => {
      expect(extractCheckId('ROP_')).toBeUndefined();
      expect(extractCheckId('CHECK_')).toBeUndefined();
      expect(extractCheckId('_123')).toBe(123);
    });
  });

  describe('resolveBasket', () => {
    test('should return mock basket when provider is not ROP', async () => {
      process.env.BASKET_PROVIDER = 'mock';

      const result = await resolveBasket('TEST_001');

      expect(result).toEqual({
        referenceCode: 'TEST_001',
        basketPrice: { grossPrice: 100.00 },
        products: [
          {
            referenceCode: 'ITEM-TEST',
            name: 'Test Product',
            quantity: 1,
            unitCode: 'ADET',
            price: { grossPrice: 100.00, vatRatio: 0, sctRatio: 0 },
          }
        ],
        customerInfo: {},
        employeeInfo: {},
        receiptInfo: {},
        customInfo: null,
        paymentOptions: [{ type: 'CREDITCARD', amount: 100.00 }],
      });
    });

    test('should return mock basket when provider is ROP but no check ID', async () => {
      process.env.BASKET_PROVIDER = 'rop';

      const result = await resolveBasket('INVALID_REF');

      expect(result.referenceCode).toBe('INVALID_REF');
      expect(result.products[0].referenceCode).toBe('ITEM-TEST');
    });

    test('should call ROP API when provider is ROP and check ID is valid', async () => {
      process.env.BASKET_PROVIDER = 'rop';

      const mockResponse = {
        Details: [
          {
            Name: 'Pizza Margherita',
            Quantity: 2,
            Total: 150.00,
            Code: 'PIZZA-001'
          },
          {
            Name: 'Coca Cola',
            Quantity: 1,
            Total: 25.00,
            Code: 'DRINK-001'
          }
        ]
      };

      getCheckDetail.mockResolvedValue(mockResponse);

      const result = await resolveBasket('ROP_1234567');

      expect(getCheckDetail).toHaveBeenCalledWith({ CheckId: 1234567 });
      expect(result.referenceCode).toBe('ROP_1234567');
      expect(result.basketPrice.grossPrice).toBe(175.00);
      expect(result.products).toHaveLength(2);
      expect(result.products[0]).toEqual({
        referenceCode: 'PIZZA-001',
        name: 'Pizza Margherita',
        quantity: 2,
        unitCode: 'ADET',
        price: { grossPrice: 75.00, vatRatio: 0, sctRatio: 0 },
      });
    });

    test('should handle different property names in ROP response', async () => {
      process.env.BASKET_PROVIDER = 'rop';

      const mockResponse = {
        Lines: [
          {
            name: 'Burger',
            qty: 1,
            Price: 80.00,
            Sku: 'BURGER-001'
          }
        ]
      };

      getCheckDetail.mockResolvedValue(mockResponse);

      const result = await resolveBasket('ROP_1234567');

      expect(result.products[0]).toEqual({
        referenceCode: 'BURGER-001',
        name: 'Burger',
        quantity: 1,
        unitCode: 'ADET',
        price: { grossPrice: 80.00, vatRatio: 0, sctRatio: 0 },
      });
    });

    test('should fallback to mock when ROP API fails', async () => {
      process.env.BASKET_PROVIDER = 'rop';

      getCheckDetail.mockRejectedValue(new Error('API Error'));

      const result = await resolveBasket('ROP_1234567');

      expect(result.referenceCode).toBe('ROP_1234567');
      expect(result.products[0].referenceCode).toBe('ITEM-TEST');
    });

    test('should fallback to mock when ROP API returns empty lines', async () => {
      process.env.BASKET_PROVIDER = 'rop';

      const mockResponse = { Details: [] };
      getCheckDetail.mockResolvedValue(mockResponse);

      const result = await resolveBasket('ROP_1234567');

      expect(result.products[0].referenceCode).toBe('ITEM-TEST');
    });

    test('should handle missing price fields correctly', async () => {
      process.env.BASKET_PROVIDER = 'rop';

      const mockResponse = {
        Details: [
          {
            Name: 'Free Item',
            Quantity: 1,
            Code: 'FREE-001'
          }
        ]
      };

      getCheckDetail.mockResolvedValue(mockResponse);

      const result = await resolveBasket('ROP_1234567');

      expect(result.products[0].price.grossPrice).toBe(0);
      expect(result.basketPrice.grossPrice).toBe(0);
    });

    test('should calculate total price correctly', async () => {
      process.env.BASKET_PROVIDER = 'rop';

      const mockResponse = {
        Details: [
          {
            Name: 'Item 1',
            Quantity: 2,
            Total: 100.00,
            Code: 'ITEM-001'
          },
          {
            Name: 'Item 2',
            Quantity: 3,
            Total: 150.00,
            Code: 'ITEM-002'
          }
        ]
      };

      getCheckDetail.mockResolvedValue(mockResponse);

      const result = await resolveBasket('ROP_1234567');

      expect(result.basketPrice.grossPrice).toBe(250.00);
      expect(result.products[0].price.grossPrice).toBe(50.00);
      expect(result.products[1].price.grossPrice).toBe(50.00);
    });
  });

  describe('Default total configuration', () => {
    test('should use default total from environment', async () => {
      process.env.BASKET_PROVIDER = 'mock';
      process.env.BASKET_DEFAULT_TOTAL = '200.50';

      const result = await resolveBasket('TEST_001');

      expect(result.basketPrice.grossPrice).toBe(200.50);
      expect(result.products[0].price.grossPrice).toBe(200.50);
      expect(result.paymentOptions[0].amount).toBe(200.50);
    });

    test('should use fallback default total when not set', async () => {
      process.env.BASKET_PROVIDER = 'mock';
      delete process.env.BASKET_DEFAULT_TOTAL;

      const result = await resolveBasket('TEST_001');

      expect(result.basketPrice.grossPrice).toBe(100.00);
    });
  });
});
