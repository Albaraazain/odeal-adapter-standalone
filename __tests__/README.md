# Ödeal Vercel Functions Mock Utilities

This directory contains comprehensive mock utilities for testing Ödeal Vercel functions, including mock servers, test data factories, and testing helpers.

## Overview

The mock utilities provide:

1. **Mock Utilities** (`mocks/mockUtilities.js`) - Core mocking functionality for external dependencies
2. **Test Data Factories** (`factories/testDataFactories.js`) - Factory functions for creating realistic test data
3. **Mock Server** (`mocks/mockServer.js`) - HTTP server for simulating external APIs
4. **Enhanced Setup** (`setup.js`) - Integrated test setup with comprehensive mocking capabilities

## Quick Start

### Basic Usage

```javascript
import { BasketFactory, WebhookFactory } from '../factories/testDataFactories.js';
import { setupTestMocks } from '../mocks/mockUtilities.js';

// Setup mocks for a test
const { mockAxios, mockIdempotencyStore, cleanup } = setupTestMocks({
  rop: 'SUCCESS',
  supabase: 'SUCCESS'
});

// Create test data
const basket = BasketFactory.createBasket({
  referenceCode: 'TEST_001',
  total: 150.00
});

const webhook = WebhookFactory.createSuccessWebhook(basket.referenceCode);

// Use in your tests...
// Cleanup when done
cleanup();
```

### Mock Server Usage

```javascript
import MockServer from '../mocks/mockServer.js';

// Create and start mock server
const mockServer = new MockServer();
await mockServer.start();
mockServer.setupDefaults();

// Test against mock server
const response = await axios.get(`${mockServer.getUrl()}/V6/App2App/CheckDetail?CheckId=1234567`);

// Stop server when done
await mockServer.stop();
```

## Detailed Usage

### 1. Mock Utilities (`mockUtilities.js`)

#### Core Mocking Functions

```javascript
import {
  createMockAxios,
  setupROPMockResponses,
  setupSupabaseMockResponses,
  setupMockEnvironment,
  createMockIdempotencyStore
} from '../mocks/mockUtilities.js';

// Create configurable mock axios instance
const mockAxios = createMockAxios();

// Setup ROP API responses for different scenarios
setupROPMockResponses(mockAxios, 'SUCCESS');
setupROPMockResponses(mockAxios, 'NETWORK_ERROR');
setupROPMockResponses(mockAxios, 'TIMEOUT');

// Setup mock environment variables
const mockEnv = setupMockEnvironment({
  BASKET_PROVIDER: 'rop',
  ODEAL_REQUEST_KEY: 'test-key-123'
});

// Create mock idempotency store
const mockStore = createMockIdempotencyStore();
```

#### Mock Response Templates

```javascript
import { MockResponses } from '../mocks/mockUtilities.js';

// Use predefined response templates
const successResponse = MockResponses.ROP_API.CHECK_DETAIL_SUCCESS;
const errorResponse = MockResponses.ERRORS.NETWORK_ERROR;
const supabaseResponse = MockResponses.SUPABASE.BASKET_FOUND;
```

#### Mock Scenarios

```javascript
import { MockScenarios } from '../mocks/mockUtilities.js';

// Use predefined scenarios
const scenario = MockScenarios.SUCCESS.BASKET_RETRIEVAL;
const errorScenario = MockScenarios.ERRORS.NETWORK_FAILURE;
const edgeCase = MockScenarios.EDGE_CASES.CONCURRENT_REQUESTS;
```

### 2. Test Data Factories (`testDataFactories.js`)

#### Basket Factory

```javascript
import { BasketFactory } from '../factories/testDataFactories.js';

// Create basic basket
const basket = BasketFactory.createBasket({
  referenceCode: 'TEST_001',
  total: 150.00
});

// Create large basket for performance testing
const largeBasket = BasketFactory.createLargeBasket(100);

// Create basket with special characters
const specialBasket = BasketFactory.createBasketWithSpecialCharacters();

// Create empty basket
const emptyBasket = BasketFactory.createEmptyBasket();
```

#### Webhook Factory

```javascript
import { WebhookFactory } from '../factories/testDataFactories.js';

// Create success webhook
const successWebhook = WebhookFactory.createSuccessWebhook('TEST_001', {
  amount: 150.00,
  cardType: 'VISA'
});

// Create failed webhook
const failedWebhook = WebhookFactory.createFailedWebhook('TEST_001', {
  errorCode: 'card_declined',
  errorMessage: 'Card was declined'
});

// Create cancelled webhook
const cancelledWebhook = WebhookFactory.createCancelledWebhook('TEST_001', {
  reason: 'user_cancelled'
});

// Create invalid webhook for error testing
const invalidWebhook = WebhookFactory.createInvalidWebhook();
```

#### ROP API Factory

```javascript
import { RopFactory } from '../factories/testDataFactories.js';

// Create check detail response
const checkDetail = RopFactory.createCheckDetailResponse({
  checkId: 1234567,
  details: [
    {
      Name: 'Test Product',
      Quantity: 1,
      Total: 100.00,
      Code: 'TEST-001'
    }
  ]
});

// Create payment status response
const paymentStatus = RopFactory.createPaymentStatusResponse({
  success: true,
  CheckId: 1234567,
  Status: 1
});
```

#### Error Factory

```javascript
import { ErrorFactory } from '../factories/testDataFactories.js';

// Create different error types
const networkError = ErrorFactory.createNetworkError();
const timeoutError = ErrorFactory.createTimeoutError();
const authError = ErrorFactory.createAuthError();
const validationError = ErrorFactory.createValidationError('Invalid data');
const serverError = ErrorFactory.createServerError();
```

### 3. Mock Server (`mockServer.js`)

#### Basic Setup

```javascript
import MockServer from '../mocks/mockServer.js';

// Create and start server
const server = new MockServer(3000);
await server.start();

// Register custom endpoints
server.registerEndpoint('/custom/endpoint', {
  methods: ['GET', 'POST'],
  response: { message: 'Custom response' }
});

// Register scenarios
server.registerScenario('/scenario/endpoint', {
  conditions: [
    {
      method: 'POST',
      response: { success: true }
    }
  ],
  response: { default: true }
});
```

#### Built-in Scenarios

The mock server includes built-in scenarios for:

- **ROP API endpoints** (`/V6/App2App/CheckDetail`, `/V6/App2App/PaymentStatus`)
- **Error scenarios** (network timeout, auth failure, rate limiting)
- **Performance scenarios** (fast response, slow response, large payload)
- **Health check** (`/health`)

#### Request Logging

```javascript
// Get request log
const log = server.getRequestLog();

// Filter log by method or status
const getRequests = server.getRequestLog({ method: 'GET' });
const errorRequests = server.getRequestLog({ status: 500 });

// Clear log
server.clearRequestLog();
```

### 4. Enhanced Test Setup (`setup.js`)

#### Test Context Helper

```javascript
import { TestContext } from '../setup.js';

// Create test context for comprehensive test setup
const testContext = new TestContext();
await testContext.initialize({
  rop: 'SUCCESS',
  supabase: 'SUCCESS'
});

// Access test data
const basket = testContext.data.basket;
const webhook = testContext.data.webhook;

// Access mocks
const mockAxios = testContext.mocks.mockAxios;
const mockStore = testContext.mocks.mockIdempotencyStore;

// Create mock request/response objects
const request = testContext.createRequest({
  method: 'POST',
  headers: { 'x-odeal-request-key': 'test-key' }
});

const response = testContext.createResponse();

// Cleanup
await testContext.cleanup();
```

#### Global Test Utilities

```javascript
// Available in test files after setup
TestUtils.createTestBasket({ total: 150.00 });
TestUtils.createSuccessWebhook('TEST_001');
TestUtils.validateBasketStructure(basket);
TestUtils.validateErrorResponse(response, 401, 'Unauthorized');

PerformanceUtils.measureResponseTime(asyncFn);
PerformanceUtils.runLoadTest(testFn, 10);
PerformanceUtils.runStressTest(testFn, 30000);

MockScenarios.setupSuccessScenario(mockAxios);
MockScenarios.setupFailureScenario(mockAxios, 'network');
```

## Testing Patterns

### 1. Unit Testing with Mocks

```javascript
test('should handle successful basket retrieval', async () => {
  // Setup mocks
  const { mockAxios, cleanup } = setupTestMocks({ rop: 'SUCCESS' });

  // Create test data
  const basket = BasketFactory.createBasket();

  // Test your function
  const result = await getBasket(basket.referenceCode);

  // Validate
  expect(result).toEqual(basket);
  TestUtils.validateBasketStructure(result);

  // Cleanup
  cleanup();
});
```

### 2. Integration Testing with Mock Server

```javascript
test('should test complete flow', async () => {
  // Start mock server
  const mockServer = new MockServer();
  await mockServer.start();
  mockServer.setupDefaults();

  // Create test data
  const basket = BasketFactory.createBasket();
  const webhook = WebhookFactory.createSuccessWebhook(basket.referenceCode);

  // Test complete flow
  const basketResponse = await axios.get(`${mockServer.getUrl()}/V6/App2App/CheckDetail?CheckId=1234567`);
  const webhookResponse = await axios.post(`${mockServer.getUrl()}/V6/App2App/PaymentStatus`, {
    CheckId: 1234567,
    Status: 1
  });

  // Validate
  expect(basketResponse.status).toBe(200);
  expect(webhookResponse.data.success).toBe(true);

  // Cleanup
  await mockServer.stop();
});
```

### 3. Performance Testing

```javascript
test('should handle concurrent requests', async () => {
  const results = await PerformanceUtils.runLoadTest(async (index) => {
    const basket = BasketFactory.createBasket({
      referenceCode: `CONCURRENT_${index}`
    });
    return getBasket(basket.referenceCode);
  }, 10);

  expect(results.successRate).toBeGreaterThan(0.95);
});
```

### 4. Error Scenario Testing

```javascript
test('should handle network errors', async () => {
  const { mockAxios, cleanup } = setupTestMocks({ rop: 'NETWORK_ERROR' });

  const basket = BasketFactory.createBasket();

  await expect(getBasket(basket.referenceCode)).rejects.toThrow('Network error');

  cleanup();
});
```

## Configuration

### Environment Variables

```javascript
// In setup.js or individual tests
setupMockEnvironment({
  NODE_ENV: 'test',
  BASKET_PROVIDER: 'mock', // or 'rop'
  ODEAL_REQUEST_KEY: 'test-key-123',
  ROP_BASE_URL: 'http://test.ropapi.com/V6/App2App',
  DEVICE_ID: 'TEST_DEVICE_001',
  RESTAURANT_ID: '123',
  DEVICE_KEY: 'test-device-key'
});
```

### Mock Server Configuration

```javascript
const server = new MockServer({
  port: 3000 // 0 for random port
});

// Disable default setup
const server = new MockServer();
await server.start(); // without setupDefaults()
```

## Best Practices

1. **Always cleanup** mocks and servers after tests
2. **Use factories** for creating realistic test data
3. **Test both success and error scenarios**
4. **Validate mock calls** to ensure proper mocking
5. **Use meaningful reference codes** for easier debugging
6. **Test edge cases** like empty baskets, special characters
7. **Use performance utilities** for load and stress testing

## Example Test Structure

```javascript
describe('Basket Service', () => {
  let testContext;

  beforeEach(async () => {
    testContext = new TestContext();
    await testContext.initialize();
  });

  afterEach(async () => {
    await testContext.cleanup();
  });

  describe('getBasket', () => {
    test('should return basket for valid reference code', async () => {
      // Arrange
      const basket = BasketFactory.createBasket();
      MockScenarios.setupSuccessScenario(testContext.mocks.mockAxios);

      // Act
      const result = await basketService.getBasket(basket.referenceCode);

      // Assert
      TestUtils.validateBasketStructure(result);
      expect(result.referenceCode).toBe(basket.referenceCode);
    });

    test('should handle network errors', async () => {
      // Arrange
      const basket = BasketFactory.createBasket();
      MockScenarios.setupFailureScenario(testContext.mocks.mockAxios, 'network');

      // Act & Assert
      await expect(basketService.getBasket(basket.referenceCode))
        .rejects.toThrow('Network error');
    });
  });
});
```

## File Structure

```
__tests__/
├── mocks/
│   ├── mockUtilities.js      # Core mocking functionality
│   └── mockServer.js         # HTTP mock server
├── factories/
│   └── testDataFactories.js  # Test data factories
├── examples/
│   └── mockUtilitiesExample.test.js  # Usage examples
├── setup.js                  # Enhanced test setup
└── README.md                 # This file
```

This comprehensive mock utilities system provides everything needed for thorough testing of Ödeal Vercel functions, from unit tests to full integration tests with realistic scenarios and performance testing.