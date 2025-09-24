#!/usr/bin/env node

/**
 * Ödeal Vercel Functions Test Utilities Coordinator
 *
 * This module coordinates all test utilities for comprehensive testing of
 * Ödeal Vercel functions (both Vercel adapter and Supabase Edge Functions).
 *
 * @author Test Utilities Specialist
 * @date 2025-09-22
 * @version 1.0.0
 */

// Core dependencies
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration and environment
const ENVIRONMENTS = {
  local: {
    vercelUrl: 'http://localhost:3000',
    supabaseUrl: 'https://notification.ropapi.com',
    supabaseKey: process.env.SUPABASE_SERVICE_KEY || '',
    odealRequestKey: process.env.ODEAL_REQUEST_KEY || '',
    basketProvider: process.env.BASKET_PROVIDER || 'mock'
  },
  staging: {
    vercelUrl: process.env.VERCEL_STAGING_URL,
    supabaseUrl: 'https://notification.ropapi.com',
    supabaseKey: process.env.SUPABASE_STAGING_KEY || '',
    odealRequestKey: process.env.ODEAL_STAGING_KEY || '',
    basketProvider: process.env.BASKET_PROVIDER || 'mock'
  },
  production: {
    vercelUrl: process.env.VERCEL_PRODUCTION_URL,
    supabaseUrl: 'https://notification.ropapi.com',
    supabaseKey: process.env.SUPABASE_PRODUCTION_KEY || '',
    odealRequestKey: process.env.ODEAL_PRODUCTION_KEY || '',
    basketProvider: process.env.BASKET_PROVIDER || 'mock'
  }
};

/**
 * Test HTTP Client for Ödeal Functions
 */
class TestHttpClient {
  constructor(environment = 'local') {
    this.environment = environment;
    this.config = ENVIRONMENTS[environment];
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor for automatic authentication
    axios.interceptors.request.use((config) => {
      config.metadata = { startTime: new Date() };

      // Add authentication headers based on URL
      if (config.url.includes('/functions/v1/')) {
        // Supabase Edge Functions
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${this.config.supabaseKey}`;
        if (this.config.odealRequestKey) {
          config.headers['X-ODEAL-REQUEST-KEY'] = this.config.odealRequestKey;
        }
      } else if (config.url.includes('/api/')) {
        // Vercel adapter
        config.headers = config.headers || {};
        if (this.config.odealRequestKey) {
          config.headers['X-ODEAL-REQUEST-KEY'] = this.config.odealRequestKey;
        }
      }

      // Log request
      console.log(`🌐 ${config.method.toUpperCase()} ${config.url}`);
      if (config.data) {
        console.log(`📦 Request Body: ${JSON.stringify(config.data, null, 2)}`);
      }

      return config;
    });

    // Response interceptor for logging and metrics
    axios.interceptors.response.use((response) => {
      const duration = new Date() - response.config.metadata.startTime;

      console.log(`✅ Response ${response.status} (${duration}ms)`);
      if (response.data) {
        console.log(`📄 Response Body: ${JSON.stringify(response.data, null, 2)}`);
      }

      response.duration = duration;
      return response;
    }, (error) => {
      const duration = new Date() - error.config.metadata.startTime;

      console.log(`❌ Error ${error.response?.status || 'Unknown'} (${duration}ms)`);
      if (error.response?.data) {
        console.log(`📄 Error Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }

      error.duration = duration;
      return Promise.reject(error);
    });
  }

  async getBasket(referenceCode, options = {}) {
    const baseUrl = this.getBaseUrl('basket');
    const url = `${baseUrl}/${referenceCode}`;

    return await axios.get(url, options);
  }

  async postWebhook(webhookType, payload, options = {}) {
    const baseUrl = this.getBaseUrl('webhook');
    const url = `${baseUrl}/${webhookType}`;

    return await axios.post(url, payload, options);
  }

  getBaseUrl(type) {
    if (type === 'basket') {
      if (this.config.vercelUrl) {
        return `${this.config.vercelUrl}/api/app2app/baskets`;
      } else {
        return `${this.config.supabaseUrl}/functions/v1/odeal-basket`;
      }
    } else if (type === 'webhook') {
      if (this.config.vercelUrl) {
        return `${this.config.vercelUrl}/api/webhooks/odeal`;
      } else {
        return `${this.config.supabaseUrl}/functions/v1/odeal-webhook`;
      }
    }
    throw new Error(`Unknown endpoint type: ${type}`);
  }

  setEnvironment(environment) {
    this.environment = environment;
    this.config = ENVIRONMENTS[environment];
  }
}

/**
 * Test Data Factory
 */
class TestDataFactory {
  static generateReferenceCode(prefix = 'TEST') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  static createBasket(overrides = {}) {
    return {
      referenceCode: this.generateReferenceCode('BASKET'),
      basketPrice: { grossPrice: 100.00 },
      products: [
        {
          referenceCode: 'ITEM-TEST-001',
          name: 'Test Product',
          quantity: 1,
          unitCode: 'ADET',
          price: { grossPrice: 100.00, vatRatio: 0, sctRatio: 0 }
        }
      ],
      customerInfo: {},
      employeeInfo: {},
      receiptInfo: {},
      customInfo: null,
      paymentOptions: [{ type: 'CREDITCARD', amount: 100.00 }],
      ...overrides
    };
  }

  static createWebhookPayload(type, referenceCode, overrides = {}) {
    const basePayload = {
      basketReferenceCode: referenceCode,
      paymentId: this.generateReferenceCode('PAY'),
      amount: 100.00,
      currency: 'TRY',
      timestamp: new Date().toISOString()
    };

    switch (type) {
      case 'payment-succeeded':
        return {
          ...basePayload,
          status: 'succeeded',
          ...overrides
        };
      case 'payment-failed':
        return {
          ...basePayload,
          status: 'failed',
          errorCode: 'card_declined',
          errorMessage: 'Card was declined',
          ...overrides
        };
      case 'payment-cancelled':
        return {
          ...basePayload,
          status: 'cancelled',
          reason: 'user_cancelled',
          ...overrides
        };
      default:
        throw new Error(`Unknown webhook type: ${type}`);
    }
  }

  static createTestScenarios() {
    return {
      validBasket: this.createBasket(),
      basketWithMultipleItems: this.createBasket({
        products: [
          {
            referenceCode: 'ITEM-TEST-001',
            name: 'Test Product 1',
            quantity: 2,
            unitCode: 'ADET',
            price: { grossPrice: 50.00, vatRatio: 0, sctRatio: 0 }
          },
          {
            referenceCode: 'ITEM-TEST-002',
            name: 'Test Product 2',
            quantity: 1,
            unitCode: 'ADET',
            price: { grossPrice: 75.00, vatRatio: 0, sctRatio: 0 }
          }
        ],
        basketPrice: { grossPrice: 175.00 },
        paymentOptions: [{ type: 'CREDITCARD', amount: 175.00 }]
      }),
      webhookSuccess: this.createWebhookPayload('payment-succeeded', this.generateReferenceCode()),
      webhookFailure: this.createWebhookPayload('payment-failed', this.generateReferenceCode()),
      webhookCancellation: this.createWebhookPayload('payment-cancelled', this.generateReferenceCode())
    };
  }
}

/**
 * Authentication Test Helpers
 */
class AuthTestHelpers {
  static testAuthenticationScenarios(client, referenceCode) {
    return [
      {
        name: 'Valid Authentication',
        test: () => client.getBasket(referenceCode)
      },
      {
        name: 'No Authentication',
        test: () => {
          const tempClient = new TestHttpClient(client.environment);
          tempClient.config.odealRequestKey = null;
          return tempClient.getBasket(referenceCode);
        }
      },
      {
        name: 'Invalid Authentication',
        test: () => {
          const tempClient = new TestHttpClient(client.environment);
          tempClient.config.odealRequestKey = 'invalid_key';
          return tempClient.getBasket(referenceCode);
        }
      },
      {
        name: 'Empty Authentication',
        test: () => {
          const tempClient = new TestHttpClient(client.environment);
          tempClient.config.odealRequestKey = '';
          return tempClient.getBasket(referenceCode);
        }
      }
    ];
  }

  static generateTestKeys() {
    return {
      valid: process.env.ODEAL_REQUEST_KEY || 'test_key_123456',
      invalid: 'invalid_key_987654',
      empty: '',
      malformed: 'malformed-key-with-special-chars!@#$%',
      expired: 'expired_key_20200101',
      revoked: 'revoked_key_20200101'
    };
  }

  static createAuthMiddleware(requiredKey) {
    return (req, res, next) => {
      const authKey = req.headers['x-odeal-request-key'];

      if (!authKey) {
        return res.status(401).json({ error: 'Missing authentication header' });
      }

      if (authKey !== requiredKey) {
        return res.status(401).json({ error: 'Invalid authentication key' });
      }

      next();
    };
  }
}

/**
 * Mock Server Setup
 */
class MockServer {
  constructor() {
    this.mockResponses = new Map();
    this.setupDefaultResponses();
  }

  setupDefaultResponses() {
    // Mock ROP API responses
    this.mockResponses.set('/V6/App2App/CheckDetail', {
      CheckId: 1234567,
      Details: [
        {
          Name: 'Test Product',
          Quantity: 1,
          Total: 100.00,
          Code: 'TEST-001'
        }
      ]
    });

    this.mockResponses.set('/V6/App2App/PaymentStatus', {
      success: true,
      CheckId: 1234567,
      Status: 1
    });

    // Mock Supabase responses
    this.mockResponses.set('/rest/v1/payment_notifications', {
      id: 1,
      DeviceId: 'TEST_DEVICE_001',
      RestaurantId: 'REST_TEST_123',
      CheckId: 'CHECK_TEST_001',
      operation_type: 'payment_requested',
      processed: false
    });
  }

  getMockResponse(url) {
    return this.mockResponses.get(url) || { error: 'Mock response not found' };
  }

  setMockResponse(url, response) {
    this.mockResponses.set(url, response);
  }

  createMockAxios() {
    const mockAxios = {
      get: jest.fn().mockImplementation((url, config) => {
        return Promise.resolve({ data: this.getMockResponse(url) });
      }),
      post: jest.fn().mockImplementation((url, data, config) => {
        return Promise.resolve({ data: this.getMockResponse(url) });
      }),
      create: () => this.createMockAxios()
    };
    return mockAxios;
  }
}

/**
 * Performance Test Utilities
 */
class PerformanceTestUtils {
  static async measureResponseTime(testFn) {
    const start = Date.now();
    const result = await testFn();
    const end = Date.now();

    return {
      result,
      duration: end - start
    };
  }

  static async runLoadTest(testFn, concurrentRequests = 10) {
    const promises = Array.from({ length: concurrentRequests }, (_, i) => testFn(i));
    const results = await Promise.allSettled(promises);

    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    return {
      totalRequests: concurrentRequests,
      successful: successful.length,
      failed: failed.length,
      successRate: successful.length / concurrentRequests,
      averageResponseTime: this.calculateAverageResponseTime(successful),
      results: results
    };
  }

  static calculateAverageResponseTime(results) {
    if (results.length === 0) return 0;

    const totalDuration = results.reduce((sum, result) => {
      return sum + (result.value?.duration || 0);
    }, 0);

    return totalDuration / results.length;
  }

  static generatePerformanceReport(loadTestResult) {
    return {
      summary: {
        totalRequests: loadTestResult.totalRequests,
        successRate: `${(loadTestResult.successRate * 100).toFixed(2)}%`,
        averageResponseTime: `${loadTestResult.averageResponseTime.toFixed(2)}ms`
      },
      details: {
        successful: loadTestResult.successful,
        failed: loadTestResult.failed,
        requestsPerSecond: (loadTestResult.successful / (loadTestResult.averageResponseTime / 1000)).toFixed(2)
      }
    };
  }
}

/**
 * Test Result Validator
 */
class TestResultValidator {
  static validateBasketResponse(response) {
    const errors = [];

    if (!response.data) {
      errors.push('Response has no data');
      return errors;
    }

    if (!response.data.referenceCode) {
      errors.push('Missing referenceCode in basket response');
    }

    if (!response.data.basketPrice) {
      errors.push('Missing basketPrice in basket response');
    }

    if (!Array.isArray(response.data.products)) {
      errors.push('products should be an array');
    }

    if (!Array.isArray(response.data.paymentOptions)) {
      errors.push('paymentOptions should be an array');
    }

    return errors;
  }

  static validateWebhookResponse(response) {
    const errors = [];

    if (response.status !== 200) {
      errors.push(`Expected status 200, got ${response.status}`);
    }

    if (!response.data) {
      errors.push('Response has no data');
      return errors;
    }

    if (response.data.error) {
      errors.push(`Response contains error: ${response.data.error}`);
    }

    return errors;
  }

  static validateErrorResponse(response, expectedStatus = 401) {
    const errors = [];

    if (response.status !== expectedStatus) {
      errors.push(`Expected status ${expectedStatus}, got ${response.status}`);
    }

    if (!response.data) {
      errors.push('Error response has no data');
      return errors;
    }

    if (!response.data.error) {
      errors.push('Error response should contain error message');
    }

    return errors;
  }
}

/**
 * Main Test Utilities Export
 */
class OdealTestUtilities {
  constructor(environment = 'local') {
    this.environment = environment;
    this.httpClient = new TestHttpClient(environment);
    this.mockServer = new MockServer();
    this.testDataFactory = TestDataFactory;
    this.authHelpers = AuthTestHelpers;
    this.performanceUtils = PerformanceTestUtils;
    this.resultValidator = TestResultValidator;
  }

  async runBasicTests() {
    console.log('🧪 Running Basic Ödeal Tests...\n');

    const scenarios = this.testDataFactory.createTestScenarios();
    const results = [];

    // Test basket endpoint
    console.log('🛒 Testing Basket Endpoints...');
    try {
      const basketResponse = await this.httpClient.getBasket(scenarios.validBasket.referenceCode);
      const validationErrors = this.resultValidator.validateBasketResponse(basketResponse);

      results.push({
        type: 'basket',
        scenario: 'valid_basket',
        success: validationErrors.length === 0,
        response: basketResponse,
        errors: validationErrors
      });
    } catch (error) {
      results.push({
        type: 'basket',
        scenario: 'valid_basket',
        success: false,
        error: error.message
      });
    }

    // Test webhook endpoints
    console.log('🔔 Testing Webhook Endpoints...');
    for (const [type, payload] of [
      ['payment-succeeded', scenarios.webhookSuccess],
      ['payment-failed', scenarios.webhookFailure],
      ['payment-cancelled', scenarios.webhookCancellation]
    ]) {
      try {
        const webhookResponse = await this.httpClient.postWebhook(type, payload);
        const validationErrors = this.resultValidator.validateWebhookResponse(webhookResponse);

        results.push({
          type: 'webhook',
          scenario: type,
          success: validationErrors.length === 0,
          response: webhookResponse,
          errors: validationErrors
        });
      } catch (error) {
        results.push({
          type: 'webhook',
          scenario: type,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async runAuthenticationTests() {
    console.log('🔐 Running Authentication Tests...\n');

    const referenceCode = this.testDataFactory.generateReferenceCode();
    const authScenarios = this.authHelpers.testAuthenticationScenarios(this.httpClient, referenceCode);
    const results = [];

    for (const scenario of authScenarios) {
      try {
        const response = await scenario.test();
        const expectedSuccess = scenario.name === 'Valid Authentication';
        const success = expectedSuccess ? response.status === 200 : response.status === 401;

        results.push({
          scenario: scenario.name,
          success,
          response,
          expectedStatus: expectedSuccess ? 200 : 401
        });
      } catch (error) {
        results.push({
          scenario: scenario.name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async runPerformanceTests() {
    console.log('⚡ Running Performance Tests...\n');

    const referenceCode = this.testDataFactory.generateReferenceCode();

    // Single request performance
    const singleRequestResult = await this.performanceUtils.measureResponseTime(() =>
      this.httpClient.getBasket(referenceCode)
    );

    // Load test
    const loadTestResult = await this.performanceUtils.runLoadTest(() =>
      this.httpClient.getBasket(this.testDataFactory.generateReferenceCode()), 5
    );

    return {
      singleRequest: singleRequestResult,
      loadTest: loadTestResult,
      report: this.performanceUtils.generatePerformanceReport(loadTestResult)
    };
  }

  generateTestReport(basicResults, authResults, performanceResults) {
    const summary = {
      basic: {
        total: basicResults.length,
        passed: basicResults.filter(r => r.success).length,
        failed: basicResults.filter(r => !r.success).length
      },
      auth: {
        total: authResults.length,
        passed: authResults.filter(r => r.success).length,
        failed: authResults.filter(r => !r.success).length
      },
      performance: performanceResults.report
    };

    return {
      summary,
      details: {
        basic: basicResults,
        auth: authResults,
        performance: performanceResults
      },
      environment: this.environment,
      timestamp: new Date().toISOString()
    };
  }
}

// Export classes and utilities
module.exports = {
  TestHttpClient,
  TestDataFactory,
  AuthTestHelpers,
  MockServer,
  PerformanceTestUtils,
  TestResultValidator,
  OdealTestUtilities,
  ENVIRONMENTS
};

// CLI functionality
if (require.main === module) {
  const args = process.argv.slice(2);
  const environment = args[0] || 'local';
  const testType = args[1] || 'all';

  const testUtils = new OdealTestUtilities(environment);

  async function runTests() {
    console.log(`🚀 Starting Ödeal Test Utilities - Environment: ${environment}\n`);

    const results = {};

    if (testType === 'all' || testType === 'basic') {
      results.basic = await testUtils.runBasicTests();
    }

    if (testType === 'all' || testType === 'auth') {
      results.auth = await testUtils.runAuthenticationTests();
    }

    if (testType === 'all' || testType === 'performance') {
      results.performance = await testUtils.runPerformanceTests();
    }

    const report = testUtils.generateTestReport(
      results.basic || [],
      results.auth || [],
      results.performance || {}
    );

    console.log('\n📊 Test Report:');
    console.log(JSON.stringify(report, null, 2));

    process.exit(report.summary.basic.failed + report.summary.auth.failed > 0 ? 1 : 0);
  }

  runTests().catch(console.error);
}