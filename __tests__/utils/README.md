# Ödeal Vercel Functions Test Utilities

This directory contains comprehensive test utilities for testing Ödeal Vercel functions, supporting both Vercel adapter and Supabase Edge Functions implementations.

## Overview

The test utilities provide:

1. **Test HTTP Client** (`test-http-client.js`) - Complete HTTP client with authentication, performance monitoring, and validation
2. **Mock Utilities** (`../mocks/mockUtilities.js`) - Comprehensive mocking for external dependencies
3. **Test Data Factories** (`../factories/testDataFactories.js`) - Factory classes for creating realistic test data
4. **Mock Server** (`../mocks/mockServer.js`) - HTTP server simulation for external APIs
5. **Authentication Test Helpers** - Security-focused authentication testing utilities

## Quick Start

### Basic Usage

```javascript
const { OdealTestUtilities } = require('./test-http-client');

// Initialize test utilities
const testUtils = new OdealTestUtilities('local');

// Run basic tests
const results = await testUtils.runBasicTests();
console.log('Basic test results:', results);

// Run authentication tests
const authResults = await testUtils.runAuthenticationTests();
console.log('Auth test results:', authResults);

// Run performance tests
const perfResults = await testUtils.runPerformanceTests();
console.log('Performance test results:', perfResults);
```

### Command Line Usage

```bash
# Run all tests
node utils/test-http-client.js local all

# Run specific test types
node utils/test-http-client.js local basic
node utils/test-http-client.js local auth
node utils/test-http-client.js local performance

# Use different environments
node utils/test-http-client.js staging all
node utils/test-http-client.js production all
```

## Features

### Test HTTP Client

- **Dual Platform Support**: Automatically handles both Vercel adapter and Supabase Edge Functions
- **Authentication Management**: Automatic header handling for different authentication schemes
- **Performance Monitoring**: Built-in response time measurement and metrics collection
- **Request Validation**: Comprehensive request/response validation and error handling
- **Environment Configuration**: Support for multiple test environments (local, staging, production)

### Mock Utilities

- **External Dependency Mocking**: Mock ROP API, Supabase, and other external services
- **Scenario-based Testing**: Predefined scenarios for success, failure, timeout, and error cases
- **Request/Response Simulation**: Realistic HTTP request/response object mocking
- **Network Simulation**: Simulate network delays, timeouts, and connection failures
- **Validation Helpers**: Comprehensive data validation utilities

### Test Data Factories

- **Basket Factory**: Create realistic basket data with various configurations
- **Webhook Factory**: Generate webhook payloads for all webhook types
- **ROP Factory**: Create mock ROP API responses
- **Error Factory**: Generate error objects for testing error scenarios
- **Performance Factory**: Create data for performance and load testing

### Mock Server

- **HTTP Server Simulation**: Full HTTP server for testing external API calls
- **Request Logging**: Comprehensive request/response logging for debugging
- **Scenario Support**: Built-in scenarios for common testing situations
- **Performance Testing**: Support for load testing and performance validation
- **Dynamic Responses**: Configurable responses based on request parameters

### Authentication Testing

- **Security Testing**: Comprehensive authentication and security testing
- **Multiple Auth Scenarios**: Test different authentication methods and failure cases
- **Token Management**: Test token generation, validation, and expiration
- **Rate Limiting**: Test rate limiting and abuse prevention
- **Authorization**: Test authorization and permission scenarios

## Environment Configuration

### Required Environment Variables

```bash
# Basic configuration
ODEAL_REQUEST_KEY=your-odeal-request-key
BASKET_PROVIDER=mock  # or 'rop'

# Vercel adapter (local development)
VERCEL_URL=http://localhost:3000

# Supabase Edge Functions
SUPABASE_URL=https://notification.ropapi.com
SUPABASE_SERVICE_KEY=your-supabase-service-key

# ROP API (if using ROP provider)
ROP_BASE_URL=http://your-rop-api.com/V6/App2App
DEVICE_ID=your-device-id
RESTAURANT_ID=your-restaurant-id
DEVICE_KEY=your-device-key

# Test configuration
IDEMPOTENCY_TTL_MS=60000
IDEMPOTENCY_MAX_KEYS=1000
```

### Environment Files

Create `.env` files for different environments:

- `.env.local` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

## Test Scenarios

### Basic Functionality Tests

```javascript
const { TestHttpClient, TestDataFactory } = require('./test-http-client');

const client = new TestHttpClient('local');
const factory = new TestDataFactory();

// Test basket retrieval
const basket = factory.createBasket();
const response = await client.getBasket(basket.referenceCode);

// Test webhook processing
const webhook = factory.createWebhookPayload('payment-succeeded', basket.referenceCode);
const webhookResponse = await client.postWebhook('payment-succeeded', webhook);
```

### Error Scenario Testing

```javascript
const { MockScenarios, ErrorFactory } = require('./test-http-client');

// Test network errors
const networkError = ErrorFactory.createNetworkError();

// Test authentication failures
const authError = ErrorFactory.createAuthError();

// Test timeout scenarios
const timeoutError = ErrorFactory.createTimeoutError();
```

### Performance Testing

```javascript
const { PerformanceTestUtils } = require('./test-http-client');

// Single request performance
const result = await PerformanceTestUtils.measureResponseTime(async () => {
  return await client.getBasket('TEST_123');
});

console.log(`Request took ${result.duration}ms`);

// Load testing
const loadResult = await PerformanceTestUtils.runLoadTest(async () => {
  return await client.getBasket(factory.generateReferenceCode());
}, 10); // 10 concurrent requests

console.log(`Success rate: ${(loadResult.successRate * 100).toFixed(2)}%`);
```

### Integration Testing

```javascript
const { OdealTestUtilities } = require('./test-http-client');

const testUtils = new OdealTestUtilities('local');

// End-to-end test flow
const scenario = {
  basket: testUtils.testDataFactory.createBasket(),
  webhook: testUtils.testDataFactory.createWebhookPayload('payment-succeeded', 'TEST_123')
};

// Test complete flow
const basketResponse = await testUtils.httpClient.getBasket(scenario.basket.referenceCode);
const webhookResponse = await testUtils.httpClient.postWebhook('payment-succeeded', scenario.webhook);

// Validate results
const basketErrors = testUtils.resultValidator.validateBasketResponse(basketResponse);
const webhookErrors = testUtils.resultValidator.validateWebhookResponse(webhookResponse);
```

## Mock Server Usage

### Starting the Mock Server

```javascript
const { createMockServer } = require('./test-http-client');

// Create and start mock server
const mockServer = await createMockServer({
  port: 3001,
  setupDefaults: true
});

console.log(`Mock server running on port ${mockServer.port}`);

// Use mock server for testing
const client = new TestHttpClient('local');
client.config.vercelUrl = `http://localhost:${mockServer.port}`;

// Run tests against mock server
const results = await client.getBasket('TEST_123');

// Stop mock server when done
await mockServer.stop();
```

### Custom Scenarios

```javascript
// Create custom scenario
mockServer.setResponse('GET:/V6/App2App/CheckDetail', {
  status: 200,
  body: {
    CheckId: 1234567,
    Details: [
      { Name: 'Custom Product', Quantity: 1, Total: 150.00, Code: 'CUSTOM-001' }
    ]
  }
});

// Test with custom response
const response = await client.getBasket('TEST_123');
```

## Test Data Examples

### Basket Data

```javascript
const basket = BasketFactory.createBasket({
  referenceCode: 'TEST_123',
  total: 250.00,
  products: [
    {
      referenceCode: 'ITEM-001',
      name: 'Test Product 1',
      quantity: 2,
      unitCode: 'ADET',
      price: { grossPrice: 100.00, vatRatio: 0.10, sctRatio: 0 }
    },
    {
      referenceCode: 'ITEM-002',
      name: 'Test Product 2',
      quantity: 1,
      unitCode: 'ADET',
      price: { grossPrice: 50.00, vatRatio: 0.10, sctRatio: 0 }
    }
  ],
  paymentOptions: [
    { type: 'CREDITCARD', amount: 200.00, installmentCount: 3 },
    { type: 'CASH', amount: 50.00 }
  ]
});
```

### Webhook Data

```javascript
const webhook = WebhookFactory.createSuccessWebhook('TEST_123', {
  amount: 250.00,
  currency: 'TRY',
  paymentMethod: 'credit_card',
  transactionId: 'txn_123456789',
  authCode: 'AUTH123',
  rrn: 'RRN123456789',
  cardType: 'VISA',
  lastFour: '1234'
});
```

## Best Practices

### 1. Test Organization

```javascript
// Group related tests
describe('Basket Endpoint Tests', () => {
  let testUtils;
  let client;

  beforeEach(() => {
    testUtils = new OdealTestUtilities('local');
    client = testUtils.httpClient;
  });

  test('should retrieve basket successfully', async () => {
    const basket = testUtils.testDataFactory.createBasket();
    const response = await client.getBasket(basket.referenceCode);

    expect(response.status).toBe(200);
    const errors = testUtils.resultValidator.validateBasketResponse(response);
    expect(errors).toHaveLength(0);
  });
});
```

### 2. Error Handling

```javascript
// Always test error scenarios
test('should handle authentication failures', async () => {
  const client = new TestHttpClient('local');
  client.config.odealRequestKey = 'invalid_key';

  try {
    await client.getBasket('TEST_123');
    fail('Expected authentication error');
  } catch (error) {
    expect(error.response.status).toBe(401);
  }
});
```

### 3. Performance Testing

```javascript
// Include performance thresholds
test('should meet performance requirements', async () => {
  const result = await PerformanceTestUtils.measureResponseTime(async () => {
    return await client.getBasket('TEST_123');
  });

  expect(result.duration).toBeLessThan(2000); // 2 second threshold
});
```

### 4. Data Validation

```javascript
// Validate all responses
const errors = testUtils.resultValidator.validateBasketResponse(response);
if (errors.length > 0) {
  console.warn('Validation errors:', errors);
}
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify `ODEAL_REQUEST_KEY` is set correctly
   - Check environment configuration
   - Ensure authentication headers are properly formatted

2. **Network Timeouts**
   - Increase timeout values in test configuration
   - Check network connectivity
   - Verify server availability

3. **Mock Server Issues**
   - Ensure mock server is started before running tests
   - Check port availability
   - Verify mock server configuration

4. **Test Data Validation**
   - Review factory-generated data structure
   - Check required fields
   - Validate data formats

### Debug Mode

Enable debug logging for troubleshooting:

```javascript
const testUtils = new OdealTestUtilities('local');
testUtils.httpClient.debug = true;

// Or set environment variable
process.env.DEBUG_TESTS = 'true';
```

## Integration with CI/CD

The test utilities are designed to work seamlessly with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Ödeal Functions Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
        env:
          ODEAL_REQUEST_KEY: ${{ secrets.ODEAL_REQUEST_KEY }}
          BASKET_PROVIDER: mock
      - name: Run performance tests
        run: node utils/test-http-client.js local performance
```

## Contributing

When contributing to the test utilities:

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new functionality
3. Update documentation for new features
4. Ensure compatibility with existing test scenarios
5. Run the full test suite before submitting changes

## License

This test utilities package is part of the Ödeal Vercel Functions project and follows the same license terms.