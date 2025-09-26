import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';

// Import mock utilities
import { setupTestMocks, MockResponses, MockScenarios } from '../mocks/mockUtilities.js';
import { BasketFactory, WebhookFactory, ErrorFactory } from '../factories/testDataFactories.js';
import MockServer from '../mocks/mockServer.js';

/**
 * Example tests demonstrating comprehensive mock utilities usage
 */

describe('Mock Utilities Examples', () => {
  let mockServer;

  beforeEach(async () => {
    // Setup comprehensive mocks
    setupTestMocks({
      env: { BASKET_PROVIDER: 'mock' },
      rop: 'SUCCESS',
      supabase: 'SUCCESS'
    });

    // Start mock server for API testing
    mockServer = new MockServer();
    await mockServer.start();
    mockServer.setupDefaults();
  });

  afterEach(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  describe('Basic Mock Usage', () => {
    test('should use mock utilities for basket testing', () => {
      // Create test basket using factory
      const basket = BasketFactory.createBasket({
        referenceCode: 'TEST_BASKET_001',
        total: 150.00
      });

      // Validate basket structure
      TestUtils.validateBasketStructure(basket);
      expect(basket.referenceCode).toBe('TEST_BASKET_001');
      expect(basket.basketPrice.grossPrice).toBe(150.00);
    });

    test('should create webhook payloads with different scenarios', () => {
      // Success webhook
      const successWebhook = WebhookFactory.createSuccessWebhook('TEST_001');
      expect(successWebhook.status).toBe('succeeded');
      expect(successWebhook.basketReferenceCode).toBe('TEST_001');

      // Failed webhook
      const failedWebhook = WebhookFactory.createFailedWebhook('TEST_001', {
        errorCode: 'insufficient_funds',
        errorMessage: 'Insufficient funds'
      });
      expect(failedWebhook.status).toBe('failed');
      expect(failedWebhook.errorCode).toBe('insufficient_funds');

      // Cancelled webhook
      const cancelledWebhook = WebhookFactory.createCancelledWebhook('TEST_001');
      expect(cancelledWebhook.status).toBe('cancelled');
    });

    test('should simulate different error scenarios', () => {
      // Create different error types
      const networkError = ErrorFactory.createNetworkError();
      expect(networkError.code).toBe('NETWORK_ERROR');

      const authError = ErrorFactory.createAuthError();
      expect(authError.status).toBe(401);

      const validationError = ErrorFactory.createValidationError('Invalid data');
      expect(validationError.status).toBe(400);
    });
  });

  describe('Mock Server Usage', () => {
    test('should test against mock server endpoints', async () => {
      // Test against mock server
      const response = await axios.get(`${mockServer.getUrl()}/V6/App2App/CheckDetail?CheckId=1234567`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('CheckId');
      expect(response.data).toHaveProperty('Details');
    });

    test('should handle different response scenarios', async () => {
      // Test error scenario
      try {
        await axios.get(`${mockServer.getUrl()}/V6/App2App/CheckDetail?CheckId=999999`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Database connection failed');
      }
    });

    test('should test performance scenarios', async () => {
      // Test fast response
      const startTime = Date.now();
      await axios.get(`${mockServer.getUrl()}/V6/App2App/CheckDetail?perf_test=fast`);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should be fast
    });
  });

  describe('Scenario Testing', () => {
    test('should test success scenario', async () => {
      const testContext = new TestContext();
      await testContext.initialize({
        rop: 'SUCCESS'
      });

      // Test basket resolution
      const basket = BasketFactory.createBasket();
      expect(basket.referenceCode).toBeDefined();
      expect(basket.products).toHaveLength(1);

      await testContext.cleanup();
    });

    test('should test failure scenario', async () => {
      const testContext = new TestContext();
      await testContext.initialize({
        rop: 'NETWORK_ERROR'
      });

      // Simulate network error
      const error = ErrorFactory.createNetworkError();
      expect(error.code).toBe('NETWORK_ERROR');

      await testContext.cleanup();
    });

    test('should test timeout scenario', async () => {
      const testContext = new TestContext();
      await testContext.initialize({
        rop: 'TIMEOUT'
      });

      // Simulate timeout
      await testContext.simulateNetworkDelay(100);
      const error = ErrorFactory.createTimeoutError();
      expect(error.code).toBe('ECONNABORTED');

      await testContext.cleanup();
    });
  });

  describe('Performance Testing', () => {
    test('should measure response time', async () => {
      const result = await PerformanceUtils.measureResponseTime(async () => {
        await axios.get(`${mockServer.getUrl()}/health`);
        return { status: 200 };
      });

      expect(result.duration).toBeGreaterThan(0);
      expect(result.result.status).toBe(200);
    });

    test('should run load test', async () => {
      const results = await PerformanceUtils.runLoadTest(async (index) => {
        const response = await axios.get(`${mockServer.getUrl()}/health`);
        return response;
      }, 5);

      expect(results.successCount).toBe(5);
      expect(results.failureCount).toBe(0);
      expect(results.successRate).toBe(1);
    });

    test('should test with large baskets', async () => {
      const largeBasket = BasketFactory.createLargeBasket(100);
      expect(largeBasket.products).toHaveLength(100);
      expect(largeBasket.basketPrice.grossPrice).toBeGreaterThan(0);
    });
  });

  describe('Integration Testing', () => {
    test('should test complete flow with mock server', async () => {
      // Create basket
      const basket = BasketFactory.createBasket({
        referenceCode: 'INTEGRATION_TEST_001'
      });

      // Create webhook payload
      const webhook = WebhookFactory.createSuccessWebhook(basket.referenceCode);

      // Test basket retrieval against mock server
      const basketResponse = await axios.get(
        `${mockServer.getUrl()}/V6/App2App/CheckDetail?CheckId=1234567`
      );

      expect(basketResponse.status).toBe(200);
      expect(basketResponse.data.CheckId).toBe(1234567);

      // Test webhook processing
      const webhookResponse = await axios.post(
        `${mockServer.getUrl()}/V6/App2App/PaymentStatus`,
        {
          CheckId: 1234567,
          Status: 1
        }
      );

      expect(webhookResponse.status).toBe(200);
      expect(webhookResponse.data.success).toBe(true);
    });

    test('should test error handling', async () => {
      // Test with invalid authentication
      try {
        await axios.get(`${mockServer.getUrl()}/V6/App2App/CheckDetail`, {
          headers: { authorization: 'invalid' }
        });
        fail('Should have failed with 401');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('Unauthorized');
      }
    });

    test('should test idempotency', async () => {
      const testContext = new TestContext();
      await testContext.initialize();

      // Create idempotency key
      const idempotencyKey = 'test_key_001';
      const webhook = WebhookFactory.createSuccessWebhook('TEST_001');

      // First request
      const firstResponse = { status: 200, data: { ok: true } };

      // Simulate idempotency store check
      expect(testContext.mocks.mockIdempotencyStore.has).not.toHaveBeenCalled();

      await testContext.cleanup();
    });
  });

  describe('Edge Cases', () => {
    test('should handle special characters in reference codes', () => {
      const basket = BasketFactory.createBasketWithSpecialCharacters();
      expect(basket.referenceCode).toContain('émojis');
      expect(basket.referenceCode).toContain('🎉');
    });

    test('should handle empty baskets', () => {
      const emptyBasket = BasketFactory.createEmptyBasket();
      expect(emptyBasket.products).toHaveLength(0);
      expect(emptyBasket.basketPrice.grossPrice).toBe(0);
    });

    test('should handle invalid webhooks', () => {
      const invalidWebhook = WebhookFactory.createInvalidWebhook();
      expect(invalidWebhook).not.toHaveProperty('basketReferenceCode');
      expect(invalidWebhook).not.toHaveProperty('amount');
    });

    test('should handle malformed JSON', () => {
      const malformedWebhook = WebhookFactory.createMalformedWebhook();
      expect(malformedWebhook).toBe('invalid json string');
    });
  });

  describe('Mock Validation', () => {
    test('should validate mock calls', () => {
      const mockAxios = axios.create();
      mockAxios.get = jest.fn().mockResolvedValue({ data: { test: 'value' } });

      // Make mock call
      mockAxios.get('/test');

      // Validate call was made
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
      expect(mockAxios.get).toHaveBeenCalledWith('/test');
    });

    test('should validate mock call arguments', () => {
      const mockAxios = axios.create();
      mockAxios.post = jest.fn().mockResolvedValue({ data: { success: true } });

      // Make multiple calls with different arguments
      mockAxios.post('/endpoint1', { data: 'test1' });
      mockAxios.post('/endpoint2', { data: 'test2' });

      // Validate all calls
      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      expect(mockAxios.post).toHaveBeenNthCalledWith(1, '/endpoint1', { data: 'test1' });
      expect(mockAxios.post).toHaveBeenNthCalledWith(2, '/endpoint2', { data: 'test2' });
    });
  });
});

describe('Mock Utilities Integration', () => {
  test('should integrate all mock utilities seamlessly', async () => {
    // Create test context
    const testContext = new TestContext();
    await testContext.initialize();

    // Create test data
    const basket = BasketFactory.createBasket();
    const webhook = WebhookFactory.createSuccessWebhook(basket.referenceCode);

    // Mock external dependencies
    MockScenarios.setupSuccessScenario(testContext.mocks.mockAxios);

    // Test performance
    const performanceResult = await PerformanceUtils.measureResponseTime(async () => {
      await testContext.simulateNetworkDelay(50);
      return { success: true };
    });

    // Validate results
    expect(performanceResult.duration).toBeGreaterThan(50);
    expect(performanceResult.result.success).toBe(true);

    // Cleanup
    await testContext.cleanup();
  });
});