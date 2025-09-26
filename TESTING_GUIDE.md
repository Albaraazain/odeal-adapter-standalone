# Ödeal Vercel Functions Testing Guide

## Overview

This guide provides comprehensive testing documentation for the Ödeal Vercel functions integration test suite. The test suite covers both Vercel adapter and Supabase Edge Functions implementations with full authentication, performance, and integration testing.

## Test Structure

```
odeal_adapter/
├── __tests__/
│   ├── integration/
│   │   └── odeal-functions.test.js    # Main integration tests
│   ├── unit/
│   │   ├── basketProvider.test.js     # Unit tests for basket logic
│   │   └── idempotencyStore.test.js   # Unit tests for idempotency
│   ├── performance/
│   │   └── load.test.js               # Performance and load tests
│   └── setup.js                       # Global test setup
├── jest.config.js                     # Jest configuration
├── babel.config.js                    # Babel configuration
├── test-runner.js                     # Test runner script
├── .env.test                          # Test environment variables
└── TESTING_GUIDE.md                   # This guide
```

## Test Types

### 1. Integration Tests (`__tests__/integration/`)

**File:** `odeal-functions.test.js`

**Coverage:**
- Complete end-to-end basket creation to payment flow
- Both Vercel adapter and Supabase Edge Functions
- Authentication testing (X-ODEAL-REQUEST-KEY header)
- Webhook processing (success/fail/cancel)
- Idempotency handling for duplicate requests
- Error handling and validation
- Concurrent request handling

**Key Test Scenarios:**
- ✅ Basket endpoint with valid/invalid reference codes
- ✅ Webhook endpoint processing for all payment states
- ✅ Authentication and authorization
- ✅ Data validation and structure validation
- ✅ Error handling and graceful degradation
- ✅ Performance under load
- ✅ Multiple basket providers (mock vs ROP)

### 2. Unit Tests (`__tests__/unit/`)

**Files:**
- `basketProvider.test.js` - Tests basket resolution logic
- `idempotencyStore.test.js` - Tests idempotency key management

**Coverage:**
- Individual module functionality
- Edge case handling
- Error scenarios
- Configuration validation

### 3. Performance Tests (`__tests__/performance/`)

**File:** `load.test.js`

**Coverage:**
- Concurrent request handling (50+ concurrent requests)
- Response time validation (under 5 seconds)
- Memory usage monitoring
- Endurance testing (sustained load)
- Idempotency performance under load

## Test Configuration

### Environment Variables

**File:** `.env.test`

```bash
# Test Environment
NODE_ENV=test
ODEAL_REQUEST_KEY=test-odeal-request-key
BASKET_PROVIDER=mock
BASKET_DEFAULT_TOTAL=100.00

# Performance Settings
IDEMPOTENCY_TTL_MS=60000
IDEMPOTENCY_MAX_KEYS=1000

# ROP API Configuration
ROP_BASE_URL=http://test.ropapi.com/V6/App2App
DEVICE_ID=test-device-id
RESTAURANT_ID=1
DEVICE_KEY=test-device-key

# Vercel Configuration
VERCEL_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://notification.ropapi.com
SUPABASE_SERVICE_KEY=test-supabase-service-key
```

### Jest Configuration

**File:** `jest.config.js`

**Key Settings:**
- ES modules support
- 30-second timeout for integration tests
- Coverage reporting
- Global setup file
- Performance monitoring

## Running Tests

### 1. Install Dependencies

```bash
cd odeal_adapter
npm install
```

### 2. Run All Tests

```bash
# Run all test suites
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:performance
```

### 3. Using the Test Runner

```bash
# Run default tests (unit + integration)
node test-runner.js

# Run specific test type
node test-runner.js run unit local
node test-runner.js run integration local
node test-runner.js run performance local

# Run multiple test types
node test-runner.js run-multiple unit,integration,performance local

# List available tests
node test-runner.js list
```

### 4. Test Environments

**Local Development:**
```bash
# Start local server
npm run dev

# Run tests against local server
npm run test:integration
```

**Vercel Deployment:**
```bash
# Set environment variables
export VERCEL_URL=https://your-app.vercel.app
export ODEAL_REQUEST_KEY=your-production-key

# Run tests
node test-runner.js run integration vercel
```

**Supabase Edge Functions:**
```bash
# Set environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=your-service-key

# Run tests
node test-runner.js run integration supabase
```

## Test Data Management

### Test Payloads

The tests use factory functions to generate consistent test data:

```javascript
// Create test basket payload
const basketPayload = createTestBasketPayload('REF_001', 'mock');

// Create webhook payload
const webhookPayload = createWebhookPayload('payment-succeeded', 'REF_001');
```

### Mock Data

**Basket Provider:**
- Mock products with standard structure
- Configurable total amounts
- Realistic product data

**Webhook Payloads:**
- Payment succeeded/failed/cancelled scenarios
- Unique transaction IDs
- Timestamp-based validation

## Performance Metrics

### Expected Performance

| Metric | Target | Threshold |
|--------|---------|-----------|
| Average Response Time | < 2s | < 5s |
| Success Rate | > 95% | > 90% |
| Concurrent Requests | 50+ | 20+ |
| Memory Usage | < 50MB | < 100MB |

### Monitoring

The test suite includes built-in performance monitoring:

```javascript
// Response time measurement
const { duration, result } = await PerformanceUtils.measureResponseTime(async () => {
  return await client.get('/api/app2app/baskets/TEST_001');
});

console.log(`Response time: ${duration}ms`);
```

## Integration Testing

### End-to-End Flow

1. **Basket Creation**: Generate basket with unique reference code
2. **Basket Retrieval**: Fetch basket via API endpoint
3. **Payment Processing**: Send payment webhooks
4. **Idempotency Check**: Verify duplicate handling
5. **State Validation**: Ensure proper state transitions

### Test Scenarios

**Happy Path:**
```
Basket Request → Basket Retrieved → Payment Succeeded → Success Response
```

**Error Scenarios:**
```
Invalid Auth → 401 Unauthorized
Invalid Payload → 400 Bad Request
Duplicate Request → 200 with duplicate flag
```

**Load Testing:**
```
Concurrent Requests → All Processed → Performance Metrics Validated
```

## Troubleshooting

### Common Issues

**1. Authentication Failures**
```bash
# Verify ODEAL_REQUEST_KEY is set
echo $ODEAL_REQUEST_KEY

# Check server logs for auth errors
npm run dev
```

**2. Test Timeouts**
```bash
# Increase timeout in jest.config.js
testTimeout: 60000
```

**3. Connection Issues**
```bash
# Verify server is running
curl http://localhost:3000/api/app2app/baskets/test

# Check network connectivity
ping localhost:3000
```

### Debug Mode

Enable debug logging:
```bash
export DEBUG=odeal:*
npm test
```

## Test Reports

### Coverage Reports

Generated in `coverage/` directory:
- `lcov-report/` - HTML coverage report
- `coverage/lcov.info` - LCOV format data

### Test Results

Generated in `test-report.json`:
- Test execution summary
- Performance metrics
- Error details
- Environment information

## Continuous Integration

### GitHub Actions Example

```yaml
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
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
        env:
          ODEAL_REQUEST_KEY: ${{ secrets.ODEAL_REQUEST_KEY }}
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Best Practices

### 1. Test Isolation
- Each test runs with clean state
- Environment variables reset between tests
- Mock data doesn't persist

### 2. Performance Considerations
- Tests timeout after 30 seconds
- Memory usage monitored
- Concurrent requests limited

### 3. Security Testing
- Authentication validated
- Input sanitization tested
- Error information sanitized

### 4. Maintainability
- Test data factories for consistency
- Clear test naming conventions
- Comprehensive documentation

## Contributing

### Adding New Tests

1. **Unit Tests**: Add to `__tests__/unit/`
2. **Integration Tests**: Add to `__tests__/integration/`
3. **Performance Tests**: Add to `__tests__/performance/`

### Test Naming Convention

```javascript
// Use descriptive names
test('should handle invalid authentication headers', async () => {
  // test implementation
});

// Group related tests
describe('Basket Endpoint', () => {
  test('should return basket data', async () => { /* ... */ });
  test('should validate reference codes', async () => { /* ... */ });
});
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review test logs
3. Verify environment configuration
4. Check server logs for detailed error information

---

**Version:** 1.0.0
**Last Updated:** 2025-09-22
**Maintainers:** Ödeal Integration Team