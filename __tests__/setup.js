import { jest } from '@jest/globals';
import axios from 'axios';

// Import comprehensive mock utilities
import {
  setupTestMocks,
  createMockRequest,
  createMockResponse,
  createMockLogger,
  simulateNetworkDelay
} from './mocks/mockUtilities.js';

import {
  BasketFactory,
  WebhookFactory,
  RopFactory,
  ErrorFactory
} from './factories/testDataFactories.js';

import MockServer from './mocks/mockServer.js';

// Global test setup
global.beforeAll = async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.BASKET_PROVIDER = process.env.BASKET_PROVIDER || 'mock';
  process.env.IDEMPOTENCY_TTL_MS = '60000'; // 1 minute for tests
  process.env.IDEMPOTENCY_MAX_KEYS = '1000';

  // Setup global test timeouts
  jest.setTimeout(30000);

  // Initialize mock server if needed
  if (process.env.USE_MOCK_SERVER === 'true') {
    global.mockServer = new MockServer();
    await global.mockServer.start();
    global.mockServer.setupDefaults();
  }

  // Clean up any existing test data
  await cleanupTestData();
};

global.afterAll = async () => {
  // Clean up test data
  await cleanupTestData();

  // Stop mock server if running
  if (global.mockServer) {
    await global.mockServer.stop();
  }

  // Restore mocks
  jest.restoreAllMocks();
};

global.beforeEach = async () => {
  // Reset idempotency store before each test
  if (global.idempotencyStore) {
    global.idempotencyStore.clear();
  }

  // Clear any mock calls
  jest.clearAllMocks();

  // Clear mock server request log
  if (global.mockServer) {
    global.mockServer.clearRequestLog();
  }
};

global.afterEach = async () => {
  // Clean up after each test
  await cleanupTestData();
};

// Test data cleanup function
async function cleanupTestData() {
  // Clear any test-related data from idempotency store
  if (global.idempotencyStore) {
    const now = Date.now();
    for (const [key, expiry] of global.idempotencyStore.entries()) {
      if (expiry <= now) {
        global.idempotencyStore.delete(key);
      }
    }
  }
}

// Mock server setup for testing external APIs (legacy - keep for compatibility)
export function createMockServer() {
  const mockResponses = {
    '/V6/App2App/CheckDetail': {
      CheckId: 1234567,
      Details: [
        {
          Name: 'Test Product',
          Quantity: 1,
          Total: 100.00,
          Code: 'TEST-001'
        }
      ]
    },
    '/V6/App2App/PaymentStatus': {
      success: true,
      CheckId: 1234567,
      Status: 1
    }
  };

  const mockAxios = axios.create();

  // Mock axios methods
  mockAxios.get = jest.fn().mockImplementation((url, config) => {
    const response = mockResponses[url] || {};
    return Promise.resolve({ data: response });
  });

  mockAxios.post = jest.fn().mockImplementation((url, data) => {
    const response = mockResponses[url] || {};
    return Promise.resolve({ data: response });
  });

  return mockAxios;
}

// Test authentication middleware
export function createAuthMiddleware(expectedKey) {
  return (req, res, next) => {
    const got = req.headers['x-odeal-request-key'];
    if (!expectedKey || !got || got !== expectedKey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };
}

// Enhanced test utilities with factory integration
export const TestUtils = {
  // Legacy utility functions
  generateUniqueReference: () => `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  // Factory-based test data creation
  createTestBasket: (overrides = {}) => BasketFactory.createBasket(overrides),
  createLargeBasket: (itemCount = 50) => BasketFactory.createLargeBasket(itemCount),
  createEmptyBasket: () => BasketFactory.createEmptyBasket(),
  createBasketWithSpecialChars: () => BasketFactory.createBasketWithSpecialCharacters(),

  createWebhookPayload: (type, referenceCode, overrides = {}) =>
    WebhookFactory.createWebhookPayload(type, referenceCode, overrides),
  createSuccessWebhook: (referenceCode, overrides = {}) =>
    WebhookFactory.createSuccessWebhook(referenceCode, overrides),
  createFailedWebhook: (referenceCode, overrides = {}) =>
    WebhookFactory.createFailedWebhook(referenceCode, overrides),
  createCancelledWebhook: (referenceCode, overrides = {}) =>
    WebhookFactory.createCancelledWebhook(referenceCode, overrides),
  createInvalidWebhook: (overrides = {}) => WebhookFactory.createInvalidWebhook(overrides),

  createRopCheckDetail: (overrides = {}) => RopFactory.createCheckDetailResponse(overrides),
  createRopPaymentStatus: (overrides = {}) => RopFactory.createPaymentStatusResponse(overrides),

  // Error simulation
  createNetworkError: () => ErrorFactory.createNetworkError(),
  createTimeoutError: () => ErrorFactory.createTimeoutError(),
  createAuthError: () => ErrorFactory.createAuthError(),
  createValidationError: (message) => ErrorFactory.createValidationError(message),
  createServerError: () => ErrorFactory.createServerError(),

  // Validation helpers
  validateBasketStructure: (basket) => {
    expect(basket).toHaveProperty('referenceCode');
    expect(basket).toHaveProperty('basketPrice');
    expect(basket).toHaveProperty('products');
    expect(basket).toHaveProperty('paymentOptions');
    expect(basket.basketPrice).toHaveProperty('grossPrice');
    expect(Array.isArray(basket.products)).toBe(true);
    expect(Array.isArray(basket.paymentOptions)).toBe(true);
  },

  validateWebhookResponse: (response) => {
    expect(response).toHaveProperty('ok', true);
    expect(typeof response).toBe('object');
  },

  validateErrorResponse: (response, expectedStatus, expectedError) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.data).toHaveProperty('error');
    if (expectedError) {
      expect(response.data.error).toContain(expectedError);
    }
  },

  // Reference code utilities
  parseReferenceCode: (referenceCode) => {
    const match = /(?:.*?_)?(\d+)$/.exec(referenceCode || '');
    return match ? Number(match[1]) : undefined;
  }
};

// Enhanced performance test utilities
export const PerformanceUtils = {
  measureResponseTime: async (fn) => {
    const start = Date.now();
    const result = await fn();
    const end = Date.now();
    return {
      result,
      duration: end - start
    };
  },

  measureMemoryUsage: () => {
    if (global.process && global.process.memoryUsage) {
      return process.memoryUsage();
    }
    return null;
  },

  runLoadTest: async (testFn, concurrentRequests = 10) => {
    const startTime = Date.now();
    const promises = Array.from({ length: concurrentRequests }, (_, i) => testFn(i));
    const results = await Promise.all(promises);
    const endTime = Date.now();

    const successCount = results.filter(r => r.status === 200).length;
    const failureCount = results.filter(r => r.status !== 200).length;

    return {
      results,
      successCount,
      failureCount,
      successRate: successCount / results.length,
      totalDuration: endTime - startTime,
      averageResponseTime: results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length
    };
  },

  runStressTest: async (testFn, duration = 30000) => {
    const startTime = Date.now();
    const results = [];
    let requestCount = 0;

    while (Date.now() - startTime < duration) {
      requestCount++;
      const start = Date.now();
      try {
        const result = await testFn(requestCount);
        results.push({
          success: true,
          duration: Date.now() - start,
          status: result.status
        });
      } catch (error) {
        results.push({
          success: false,
          duration: Date.now() - start,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return {
      totalRequests: requestCount,
      successCount,
      failureCount: requestCount - successCount,
      successRate: successCount / requestCount,
      averageResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      requestsPerSecond: requestCount / (duration / 1000)
    };
  }
};

// Mock scenario utilities
export const MockScenarios = {
  setupSuccessScenario: (mockAxios) => {
    mockAxios.get.mockResolvedValue({
      data: RopFactory.createCheckDetailResponse()
    });
    mockAxios.post.mockResolvedValue({
      data: RopFactory.createPaymentStatusResponse()
    });
  },

  setupFailureScenario: (mockAxios, errorType = 'network') => {
    switch (errorType) {
      case 'network':
        mockAxios.get.mockRejectedValue(ErrorFactory.createNetworkError());
        break;
      case 'timeout':
        mockAxios.get.mockRejectedValue(ErrorFactory.createTimeoutError());
        break;
      case 'auth':
        mockAxios.get.mockRejectedValue(ErrorFactory.createAuthError());
        break;
      case 'server':
        mockAxios.get.mockRejectedValue(ErrorFactory.createServerError());
        break;
      default:
        mockAxios.get.mockRejectedValue(new Error('Unknown error'));
    }
  },

  setupRateLimitScenario: (mockAxios) => {
    mockAxios.get.mockRejectedValue(ErrorFactory.createRateLimitError());
  }
};

// Test context helper
export class TestContext {
  constructor() {
    this.mocks = {};
    this.data = {};
    this.scenarios = {};
  }

  async initialize(scenarios = {}) {
    // Setup comprehensive mocks
    this.mocks = setupTestMocks(scenarios);

    // Create test data
    this.data = {
      basket: BasketFactory.createBasket(),
      webhook: WebhookFactory.createSuccessWebhook(this.data.basket?.referenceCode || 'TEST_001'),
      ropResponse: RopFactory.createCheckDetailResponse()
    };

    // Initialize mock server if needed
    if (process.env.USE_MOCK_SERVER === 'true' && global.mockServer) {
      this.mockServer = global.mockServer;
    }
  }

  async cleanup() {
    if (this.mocks.cleanup) {
      this.mocks.cleanup();
    }
  }

  simulateNetworkDelay(ms = 100) {
    return simulateNetworkDelay(ms);
  }

  createRequest(overrides = {}) {
    return createMockRequest(overrides);
  }

  createResponse() {
    return createMockResponse();
  }

  getLogger() {
    return createMockLogger();
  }
}

// Export for use in test files
global.TestUtils = TestUtils;
global.PerformanceUtils = PerformanceUtils;
global.MockScenarios = MockScenarios;
global.TestContext = TestContext;
global.createMockServer = createMockServer;
global.createAuthMiddleware = createAuthMiddleware;
global.BasketFactory = BasketFactory;
global.WebhookFactory = WebhookFactory;
global.RopFactory = RopFactory;
global.ErrorFactory = ErrorFactory;