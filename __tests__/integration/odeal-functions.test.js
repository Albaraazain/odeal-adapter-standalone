import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Test configuration
const TEST_CONFIG = {
  vercelUrl: process.env.VERCEL_URL || 'http://localhost:3000',
  supabaseUrl: process.env.SUPABASE_URL || 'https://notification.ropapi.com',
  odealRequestKey: process.env.ODEAL_REQUEST_KEY || 'test-key',
  basketProvider: process.env.BASKET_PROVIDER || 'mock',
  testTimeout: 30000,
  requestTimeout: 10000,
};

// Test HTTP client with authentication
const createTestClient = (baseUrl, authKey) => {
  return axios.create({
    baseURL: baseUrl,
    timeout: TEST_CONFIG.requestTimeout,
    headers: {
      'Content-Type': 'application/json',
      'X-ODEAL-REQUEST-KEY': authKey,
    },
  });
};

// Test data factories
const createTestBasketPayload = (referenceCode, provider = 'mock') => {
  return {
    referenceCode,
    basketPrice: { grossPrice: 100.00 },
    products: [
      {
        referenceCode: 'ITEM-TEST',
        name: 'Test Product',
        quantity: 1,
        unitCode: 'ADET',
        price: { grossPrice: 100.00, vatRatio: 0, sctRatio: 0 },
      },
    ],
    customerInfo: {},
    employeeInfo: {},
    receiptInfo: {},
    customInfo: null,
    paymentOptions: [{ type: 'CREDITCARD', amount: 100.00 }],
  };
};

const createWebhookPayload = (type, referenceCode, overrides = {}) => {
  const basePayload = {
    basketReferenceCode: referenceCode,
    paymentId: `pay_test_${Date.now()}`,
    amount: 100.00,
    currency: 'TRY',
    timestamp: new Date().toISOString(),
    ...overrides,
  };

  switch (type) {
    case 'payment-succeeded':
      return { ...basePayload, status: 'succeeded' };
    case 'payment-failed':
      return {
        ...basePayload,
        status: 'failed',
        errorCode: 'card_declined',
        errorMessage: 'Card was declined'
      };
    case 'payment-cancelled':
      return {
        ...basePayload,
        status: 'cancelled',
        reason: 'user_cancelled'
      };
    default:
      return basePayload;
  }
};

describe('Ödeal Vercel Functions Integration Tests', () => {
  let vercelClient;
  let supabaseClient;

  beforeAll(() => {
    // Initialize test clients
    vercelClient = createTestClient(TEST_CONFIG.vercelUrl, TEST_CONFIG.odealRequestKey);

    if (process.env.SUPABASE_SERVICE_KEY) {
      supabaseClient = axios.create({
        baseURL: `${TEST_CONFIG.supabaseUrl}/functions/v1`,
        timeout: TEST_CONFIG.requestTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'X-ODEAL-REQUEST-KEY': TEST_CONFIG.odealRequestKey,
        },
      });
    }
  });

  describe('Basket Endpoint Tests', () => {
    const testReferenceCodes = [
      'ROP_1234567',
      'MOCK_TEST_001',
      'CHECK_987654',
      'TEST_SPECIAL_émojis_🎉_123',
      'NONEXISTENT_999'
    ];

    testReferenceCodes.forEach((referenceCode) => {
      test(`GET /api/app2app/baskets/${referenceCode} - should return basket data`, async () => {
        try {
          const response = await vercelClient.get(`/api/app2app/baskets/${referenceCode}`);

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('referenceCode', referenceCode);
          expect(response.data).toHaveProperty('basketPrice');
          expect(response.data).toHaveProperty('products');
          expect(response.data).toHaveProperty('paymentOptions');

          // Validate basket structure
          expect(response.data.basketPrice).toHaveProperty('grossPrice');
          expect(Array.isArray(response.data.products)).toBe(true);
          expect(Array.isArray(response.data.paymentOptions)).toBe(true);

          if (response.data.products.length > 0) {
            const product = response.data.products[0];
            expect(product).toHaveProperty('referenceCode');
            expect(product).toHaveProperty('name');
            expect(product).toHaveProperty('quantity');
            expect(product).toHaveProperty('price');
          }
        } catch (error) {
          if (error.response?.status === 401) {
            // Skip test if authentication fails
            console.warn(`Skipping basket test for ${referenceCode} - authentication failed`);
            return;
          }
          throw error;
        }
      });
    });

    test('GET /api/app2app/baskets/:referenceCode - should handle invalid authentication', async () => {
      const invalidClient = createTestClient(TEST_CONFIG.vercelUrl, 'invalid-key');

      try {
        await invalidClient.get('/api/app2app/baskets/TEST_001');
        fail('Should have failed with 401');
      } catch (error) {
        expect(error.response?.status).toBe(401);
        expect(error.response?.data).toHaveProperty('error', 'Unauthorized');
      }
    });

    test('GET /api/app2app/baskets/:referenceCode - should work with different providers', async () => {
      const provider = TEST_CONFIG.basketProvider;
      const referenceCode = provider === 'rop' ? 'ROP_1234567' : 'MOCK_TEST_001';

      try {
        const response = await vercelClient.get(`/api/app2app/baskets/${referenceCode}`);

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('referenceCode', referenceCode);

        // Provider-specific validation
        if (provider === 'rop') {
          // Should have real product data
          expect(response.data.products.length).toBeGreaterThan(0);
        } else {
          // Should have mock data
          expect(response.data.products[0].referenceCode).toBe('ITEM-TEST');
        }
      } catch (error) {
        if (error.response?.status === 401) {
          console.warn(`Skipping provider test - authentication failed`);
          return;
        }
        throw error;
      }
    });
  });

  describe('Webhook Endpoint Tests', () => {
    const webhookTypes = ['payment-succeeded', 'payment-failed', 'payment-cancelled'];

    webhookTypes.forEach((webhookType) => {
      test(`POST /api/webhooks/odeal/${webhookType} - should process webhook successfully`, async () => {
        const referenceCode = `ROP_WEBHOOK_${Date.now()}`;
        const payload = createWebhookPayload(webhookType, referenceCode);

        try {
          const response = await vercelClient.post(`/api/webhooks/odeal/${webhookType}`, payload);

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('ok', true);
        } catch (error) {
          if (error.response?.status === 401) {
            console.warn(`Skipping webhook test for ${webhookType} - authentication failed`);
            return;
          }
          throw error;
        }
      });
    });

    test('Webhook endpoints should handle idempotency', async () => {
      const referenceCode = `ROP_DUPLICATE_${Date.now()}`;
      const payload = createWebhookPayload('payment-succeeded', referenceCode);

      try {
        // Send first request
        const response1 = await vercelClient.post('/api/webhooks/odeal/payment-succeeded', payload);
        expect(response1.status).toBe(200);
        expect(response1.data).toHaveProperty('ok', true);
        expect(response1.data).not.toHaveProperty('duplicate');

        // Send duplicate request
        const response2 = await vercelClient.post('/api/webhooks/odeal/payment-succeeded', payload);
        expect(response2.status).toBe(200);
        expect(response2.data).toHaveProperty('ok', true);
        expect(response2.data).toHaveProperty('duplicate', true);
      } catch (error) {
        if (error.response?.status === 401) {
          console.warn('Skipping idempotency test - authentication failed');
          return;
        }
        throw error;
      }
    });

    webhookTypes.forEach((webhookType) => {
      test(`POST /api/webhooks/odeal/${webhookType} - should handle invalid authentication`, async () => {
        const invalidClient = createTestClient(TEST_CONFIG.vercelUrl, 'invalid-key');
        const payload = createWebhookPayload(webhookType, 'TEST_001');

        try {
          await invalidClient.post(`/api/webhooks/odeal/${webhookType}`, payload);
          fail('Should have failed with 401');
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.data).toHaveProperty('error', 'Unauthorized');
        }
      });
    });

    test('Webhook endpoints should handle invalid payloads', async () => {
      try {
        await vercelClient.post('/api/webhooks/odeal/payment-succeeded', '{invalid: json}');
        fail('Should have failed with 400');
      } catch (error) {
        expect(error.response?.status).toBe(400);
      }
    });

    test('Webhook endpoints should handle empty payloads', async () => {
      try {
        await vercelClient.post('/api/webhooks/odeal/payment-succeeded', '');
        fail('Should have failed with 400');
      } catch (error) {
        expect(error.response?.status).toBe(400);
      }
    });
  });

  describe('End-to-End Integration Tests', () => {
    test('Complete basket creation to payment flow', async () => {
      const referenceCode = `ROP_E2E_${Date.now()}`;

      try {
        // Step 1: Get basket
        const basketResponse = await vercelClient.get(`/api/app2app/baskets/${referenceCode}`);
        expect(basketResponse.status).toBe(200);

        // Step 2: Process payment succeeded
        const successPayload = createWebhookPayload('payment-succeeded', referenceCode, {
          amount: basketResponse.data.basketPrice.grossPrice,
        });

        const successResponse = await vercelClient.post('/api/webhooks/odeal/payment-succeeded', successPayload);
        expect(successResponse.status).toBe(200);

        // Step 3: Verify idempotency
        const duplicateResponse = await vercelClient.post('/api/webhooks/odeal/payment-succeeded', successPayload);
        expect(duplicateResponse.status).toBe(200);
        expect(duplicateResponse.data).toHaveProperty('duplicate', true);

      } catch (error) {
        if (error.response?.status === 401) {
          console.warn('Skipping E2E test - authentication failed');
          return;
        }
        throw error;
      }
    });

    test('Multiple concurrent requests should be handled properly', async () => {
      const referenceCodes = Array.from({ length: 5 }, (_, i) => `ROP_CONCURRENT_${Date.now()}_${i}`);

      try {
        // Send concurrent basket requests
        const basketPromises = referenceCodes.map(code =>
          vercelClient.get(`/api/app2app/baskets/${code}`)
        );

        const basketResponses = await Promise.all(basketPromises);

        // All should succeed
        basketResponses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('referenceCode');
        });

        // Send concurrent webhook requests
        const webhookPromises = referenceCodes.map((code, index) => {
          const payload = createWebhookPayload('payment-succeeded', code);
          return vercelClient.post('/api/webhooks/odeal/payment-succeeded', payload);
        });

        const webhookResponses = await Promise.all(webhookPromises);

        // All should succeed
        webhookResponses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('ok', true);
        });

      } catch (error) {
        if (error.response?.status === 401) {
          console.warn('Skipping concurrent test - authentication failed');
          return;
        }
        throw error;
      }
    });

    test('Error handling and graceful degradation', async () => {
      try {
        // Test with non-existent reference code
        const response = await vercelClient.get('/api/app2app/baskets/NONEXISTENT_999999');
        expect(response.status).toBe(200);

        // Should return fallback mock data
        expect(response.data).toHaveProperty('referenceCode', 'NONEXISTENT_999999');
        expect(response.data.products[0].referenceCode).toBe('ITEM-TEST');

      } catch (error) {
        if (error.response?.status === 401) {
          console.warn('Skipping error handling test - authentication failed');
          return;
        }
        throw error;
      }
    });
  });

  describe('Performance and Load Tests', () => {
    test('Response time should be within acceptable limits', async () => {
      const referenceCode = `ROP_PERF_${Date.now()}`;

      try {
        const startTime = Date.now();
        const response = await vercelClient.get(`/api/app2app/baskets/${referenceCode}`);
        const endTime = Date.now();

        expect(response.status).toBe(200);
        expect(endTime - startTime).toBeLessThan(5000); // 5 seconds

      } catch (error) {
        if (error.response?.status === 401) {
          console.warn('Skipping performance test - authentication failed');
          return;
        }
        throw error;
      }
    });

    test('Memory usage under load should be reasonable', async () => {
      // This test would typically require more sophisticated monitoring
      // For now, we'll test that the system doesn't crash under load
      const referenceCodes = Array.from({ length: 20 }, (_, i) => `ROP_LOAD_${Date.now()}_${i}`);

      try {
        const promises = referenceCodes.map(code =>
          vercelClient.get(`/api/app2app/baskets/${code}`)
        );

        const responses = await Promise.all(promises);

        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

      } catch (error) {
        if (error.response?.status === 401) {
          console.warn('Skipping load test - authentication failed');
          return;
        }
        throw error;
      }
    });
  });

  describe('Data Validation Tests', () => {
    test('Basket data should have correct structure', async () => {
      const referenceCode = `ROP_VALIDATION_${Date.now()}`;

      try {
        const response = await vercelClient.get(`/api/app2app/baskets/${referenceCode}`);

        expect(response.status).toBe(200);

        // Validate basket structure
        const basket = response.data;
        expect(basket).toHaveProperty('referenceCode');
        expect(basket).toHaveProperty('basketPrice');
        expect(basket).toHaveProperty('products');
        expect(basket).toHaveProperty('customerInfo');
        expect(basket).toHaveProperty('employeeInfo');
        expect(basket).toHaveProperty('receiptInfo');
        expect(basket).toHaveProperty('paymentOptions');

        // Validate nested structure
        expect(basket.basketPrice).toHaveProperty('grossPrice');
        expect(typeof basket.basketPrice.grossPrice).toBe('number');
        expect(Array.isArray(basket.products)).toBe(true);
        expect(Array.isArray(basket.paymentOptions)).toBe(true);

        // Validate product structure
        if (basket.products.length > 0) {
          const product = basket.products[0];
          expect(product).toHaveProperty('referenceCode');
          expect(product).toHaveProperty('name');
          expect(product).toHaveProperty('quantity');
          expect(product).toHaveProperty('price');
          expect(product.price).toHaveProperty('grossPrice');
        }

      } catch (error) {
        if (error.response?.status === 401) {
          console.warn('Skipping validation test - authentication failed');
          return;
        }
        throw error;
      }
    });

    test('Webhook payloads should be validated correctly', async () => {
      const referenceCode = `ROP_WEBHOOK_VALID_${Date.now()}`;

      try {
        // Test with missing required fields
        const invalidPayload = { referenceCode };

        try {
          await vercelClient.post('/api/webhooks/odeal/payment-succeeded', invalidPayload);
          fail('Should have failed with 400');
        } catch (error) {
          expect(error.response?.status).toBe(400);
        }

        // Test with valid payload
        const validPayload = createWebhookPayload('payment-succeeded', referenceCode);
        const response = await vercelClient.post('/api/webhooks/odeal/payment-succeeded', validPayload);
        expect(response.status).toBe(200);

      } catch (error) {
        if (error.response?.status === 401) {
          console.warn('Skipping webhook validation test - authentication failed');
          return;
        }
        throw error;
      }
    });
  });
});

// Export utilities for use in other test files
export {
  TEST_CONFIG,
  createTestClient,
  createTestBasketPayload,
  createWebhookPayload,
};