import { jest } from '@jest/globals';
import axios from 'axios';

/**
 * Mock Utilities for Ödeal Vercel Functions Testing
 * Provides comprehensive mocking capabilities for external dependencies
 */

// Mock response templates for different scenarios
export const MockResponses = {
  // ROP API Responses
  ROP_API: {
    CHECK_DETAIL_SUCCESS: {
      CheckId: 1234567,
      Details: [
        {
          Name: 'Test Product',
          Quantity: 1,
          Total: 100.00,
          Code: 'TEST-001',
          Price: 100.00
        },
        {
          Name: 'Second Product',
          Quantity: 2,
          Total: 50.00,
          Code: 'TEST-002',
          Price: 25.00
        }
      ]
    },
    CHECK_DETAIL_EMPTY: {
      CheckId: 1234567,
      Details: []
    },
    CHECK_DETAIL_NOT_FOUND: {
      CheckId: 0,
      Details: [],
      Error: 'Check not found'
    },
    PAYMENT_STATUS_SUCCESS: {
      success: true,
      CheckId: 1234567,
      Status: 1,
      Message: 'Payment processed successfully'
    },
    PAYMENT_STATUS_FAILED: {
      success: false,
      CheckId: 1234567,
      Status: 0,
      Error: 'Payment processing failed'
    }
  },

  // Supabase Responses
  SUPABASE: {
    BASKET_FOUND: {
      referenceCode: 'ROP_1234567',
      basketPrice: { grossPrice: 150.00 },
      products: [
        {
          referenceCode: 'TEST-001',
          name: 'Test Product',
          quantity: 1,
          unitCode: 'ADET',
          price: { grossPrice: 100.00, vatRatio: 0, sctRatio: 0 }
        }
      ],
      customerInfo: {},
      employeeInfo: {},
      receiptInfo: {},
      paymentOptions: [{ type: 'CREDITCARD', amount: 150.00 }]
    },
    WEBHOOK_PROCESSED: {
      ok: true,
      id: 'webhook_123',
      processedAt: new Date().toISOString()
    },
    WEBHOOK_DUPLICATE: {
      ok: true,
      duplicate: true,
      originalId: 'webhook_123'
    }
  },

  // Error Responses
  ERRORS: {
    NETWORK_ERROR: new Error('Network error'),
    TIMEOUT_ERROR: new Error('Request timeout'),
    AUTH_ERROR: { error: 'Unauthorized', status: 401 },
    VALIDATION_ERROR: { error: 'Invalid request', status: 400 },
    SERVER_ERROR: { error: 'Internal server error', status: 500 }
  }
};

// Mock scenarios for different testing conditions
export const MockScenarios = {
  // Success scenarios
  SUCCESS: {
    BASKET_RETRIEVAL: 'basket_retrieval_success',
    PAYMENT_PROCESSING: 'payment_processing_success',
    WEBHOOK_HANDLING: 'webhook_handling_success'
  },

  // Error scenarios
  ERRORS: {
    NETWORK_FAILURE: 'network_failure',
    TIMEOUT: 'request_timeout',
    AUTH_FAILURE: 'authentication_failure',
    VALIDATION_FAILURE: 'validation_failure',
    SERVER_FAILURE: 'server_failure',
    DATA_INCONSISTENCY: 'data_inconsistency'
  },

  // Edge cases
  EDGE_CASES: {
    EMPTY_BASKET: 'empty_basket',
    LARGE_BASKET: 'large_basket',
    SPECIAL_CHARACTERS: 'special_characters',
    CONCURRENT_REQUESTS: 'concurrent_requests',
    RATE_LIMITING: 'rate_limiting'
  }
};

/**
 * Create mock axios instance with configurable responses
 */
export function createMockAxios() {
  const mockAxios = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(() => mockAxios),
    defaults: { timeout: 5000 }
  };

  // Reset all mocks before each test
  beforeEach(() => {
    mockAxios.get.mockReset();
    mockAxios.post.mockReset();
    mockAxios.put.mockReset();
    mockAxios.delete.mockReset();
  });

  return mockAxios;
}

/**
 * Setup mock responses for ROP API calls
 */
export function setupROPMockResponses(mockAxios, scenario = 'SUCCESS') {
  switch (scenario) {
    case 'SUCCESS':
      mockAxios.get.mockResolvedValue({
        data: MockResponses.ROP_API.CHECK_DETAIL_SUCCESS
      });
      mockAxios.post.mockResolvedValue({
        data: MockResponses.ROP_API.PAYMENT_STATUS_SUCCESS
      });
      break;

    case 'EMPTY_BASKET':
      mockAxios.get.mockResolvedValue({
        data: MockResponses.ROP_API.CHECK_DETAIL_EMPTY
      });
      break;

    case 'NOT_FOUND':
      mockAxios.get.mockResolvedValue({
        data: MockResponses.ROP_API.CHECK_DETAIL_NOT_FOUND
      });
      break;

    case 'NETWORK_ERROR':
      mockAxios.get.mockRejectedValue(MockResponses.ERRORS.NETWORK_ERROR);
      mockAxios.post.mockRejectedValue(MockResponses.ERRORS.NETWORK_ERROR);
      break;

    case 'TIMEOUT':
      mockAxios.get.mockRejectedValue(MockResponses.ERRORS.TIMEOUT_ERROR);
      break;

    default:
      mockAxios.get.mockResolvedValue({
        data: MockResponses.ROP_API.CHECK_DETAIL_SUCCESS
      });
  }
}

/**
 * Setup mock responses for Supabase calls
 */
export function setupSupabaseMockResponses(mockAxios, scenario = 'SUCCESS') {
  switch (scenario) {
    case 'SUCCESS':
      mockAxios.get.mockResolvedValue({
        data: MockResponses.SUPABASE.BASKET_FOUND
      });
      mockAxios.post.mockResolvedValue({
        data: MockResponses.SUPABASE.WEBHOOK_PROCESSED
      });
      break;

    case 'DUPLICATE':
      mockAxios.post.mockResolvedValue({
        data: MockResponses.SUPABASE.WEBHOOK_DUPLICATE
      });
      break;

    case 'AUTH_ERROR':
      mockAxios.get.mockRejectedValue(MockResponses.ERRORS.AUTH_ERROR);
      break;

    default:
      mockAxios.get.mockResolvedValue({
        data: MockResponses.SUPABASE.BASKET_FOUND
      });
  }
}

/**
 * Mock environment variables for testing
 */
export function setupMockEnvironment(overrides = {}) {
  const mockEnv = {
    NODE_ENV: 'test',
    BASKET_PROVIDER: 'mock',
    ODEAL_REQUEST_KEY: 'test-key-123',
    ROP_BASE_URL: 'http://test.ropapi.com/V6/App2App',
    DEVICE_ID: 'TEST_DEVICE_001',
    RESTAURANT_ID: '123',
    DEVICE_KEY: 'test-device-key',
    ROP_HTTP_TIMEOUT_MS: '5000',
    BASKET_DEFAULT_TOTAL: '100.00',
    IDEMPOTENCY_TTL_MS: '60000',
    IDEMPOTENCY_MAX_KEYS: '1000',
    SUPABASE_URL: 'https://notification.ropapi.com',
    SUPABASE_SERVICE_KEY: 'test-supabase-key',
    ...overrides
  };

  // Mock process.env
  Object.keys(mockEnv).forEach(key => {
    process.env[key] = mockEnv[key];
  });

  return mockEnv;
}

/**
 * Mock idempotency store for testing
 */
export function createMockIdempotencyStore() {
  const store = new Map();

  return {
    store,
    get: jest.fn((key) => store.get(key)),
    set: jest.fn((key, value, ttl) => {
      store.set(key, { value, expiry: Date.now() + ttl });
    }),
    has: jest.fn((key) => store.has(key)),
    delete: jest.fn((key) => store.delete(key)),
    clear: jest.fn(() => store.clear()),
    isExpired: jest.fn((key) => {
      const entry = store.get(key);
      return !entry || entry.expiry <= Date.now();
    })
  };
}

/**
 * Mock request/response objects for testing
 */
export function createMockRequest(overrides = {}) {
  return {
    method: 'GET',
    url: '/api/app2app/baskets/TEST_001',
    headers: {
      'content-type': 'application/json',
      'x-odeal-request-key': 'test-key-123',
      ...overrides.headers
    },
    body: {},
    query: {},
    ...overrides
  };
}

export function createMockResponse() {
  const mockResponse = {
    statusCode: 200,
    headers: {},
    data: null,

    status: jest.fn(function(code) {
      this.statusCode = code;
      return this;
    }),

    json: jest.fn(function(data) {
      this.data = data;
      return this;
    }),

    setHeader: jest.fn(function(name, value) {
      this.headers[name] = value;
      return this;
    }),

    end: jest.fn(function() {
      return this;
    }),

    send: jest.fn(function(data) {
      this.data = data;
      return this;
    })
  };

  return mockResponse;
}

/**
 * Mock logger for testing
 */
export function createMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn()
  };
}

/**
 * Setup comprehensive mocks for testing
 */
export function setupTestMocks(scenarios = {}) {
  const mockAxios = createMockAxios();
  const mockIdempotencyStore = createMockIdempotencyStore();
  const mockLogger = createMockLogger();
  const mockEnv = setupMockEnvironment(scenarios.env);

  // Setup mock responses based on scenarios
  if (scenarios.rop) {
    setupROPMockResponses(mockAxios, scenarios.rop);
  }

  if (scenarios.supabase) {
    setupSupabaseMockResponses(mockAxios, scenarios.supabase);
  }

  // Mock global dependencies
  global.axios = mockAxios;
  global.idempotencyStore = mockIdempotencyStore.store;
  global.logger = mockLogger;

  return {
    mockAxios,
    mockIdempotencyStore,
    mockLogger,
    mockEnv,
    cleanup: () => {
      // Clean up global mocks
      delete global.axios;
      delete global.idempotencyStore;
      delete global.logger;
    }
  };
}

/**
 * Utility to simulate network delays
 */
export function simulateNetworkDelay(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Utility to simulate random failures
 */
export function simulateRandomFailure(failureRate = 0.1) {
  return Math.random() < failureRate;
}

/**
 * Validate mock calls
 */
export function validateMockCall(mockFn, expectedCallCount = 1, expectedArgs = null) {
  expect(mockFn).toHaveBeenCalledTimes(expectedCallCount);

  if (expectedArgs) {
    if (Array.isArray(expectedArgs)) {
      expectedArgs.forEach((args, index) => {
        expect(mockFn).toHaveBeenNthCalledWith(index + 1, ...args);
      });
    } else {
      expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
    }
  }
}

export default {
  MockResponses,
  MockScenarios,
  createMockAxios,
  setupROPMockResponses,
  setupSupabaseMockResponses,
  setupMockEnvironment,
  createMockIdempotencyStore,
  createMockRequest,
  createMockResponse,
  createMockLogger,
  setupTestMocks,
  simulateNetworkDelay,
  simulateRandomFailure,
  validateMockCall
};