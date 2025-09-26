# Ödeal Authentication Test Utilities

Comprehensive authentication testing utilities for Ödeal Vercel functions, providing security testing, vulnerability detection, and performance analysis capabilities.

## Overview

The authentication test utilities provide a complete testing framework for validating the security and functionality of the Ödeal Vercel functions authentication system. The utilities include:

1. **AuthTestClient** - HTTP client with authentication header management
2. **AuthScenarios** - Comprehensive authentication scenario testing
3. **SecurityTestUtils** - Security vulnerability detection and testing
4. **Integration Tests** - Complete test suite validation

## Features

### 🔐 Authentication Testing
- Valid/invalid authentication scenarios
- Missing authentication detection
- Malformed authentication handling
- Token expiration testing
- Unicode and special character testing
- SQL injection protection testing
- XSS injection protection testing

### 🔒 Security Testing
- Timing attack vulnerability detection
- Rate limiting validation
- Brute force protection testing
- Header injection detection
- Request smuggling detection
- Input validation testing
- Information disclosure detection
- CORS configuration testing

### ⚡ Performance Testing
- Concurrent request handling
- Response time analysis
- Rate limiting performance
- Load testing capabilities
- Performance benchmarking

### 📊 Reporting and Analysis
- Comprehensive security reports
- Vulnerability assessment
- Risk level determination
- Detailed recommendations
- Statistical analysis
- JSON export functionality

## Installation

The authentication test utilities are designed to work with the existing Jest test infrastructure in the Ödeal adapter project.

### Prerequisites
- Node.js 16+
- Jest testing framework
- Axios HTTP client
- Crypto module (built-in)

### Dependencies

The utilities require the following dependencies (already included in the project):

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "jest": "^29.0.0"
  }
}
```

## Quick Start

### Basic Usage

```javascript
import { AuthTestClient } from './__tests__/utils/authTestClient.js';

// Create test client
const client = new AuthTestClient({
  baseURL: 'http://localhost:3000',
  defaultKey: 'test-key-123'
});

// Test authentication
const results = await client.testAuthentication('/api/app2app/baskets/TEST_001', {
  valid: true,
  invalid: true,
  missing: true
});

console.log('Valid authentication:', results.valid.status);
console.log('Invalid authentication:', results.invalid.status);
console.log('Missing authentication:', results.missing.status);
```

### Advanced Security Testing

```javascript
import { SecurityTestUtils } from './__tests__/utils/securityTestUtils.js';

const securityUtils = new SecurityTestUtils(client);

// Run comprehensive security tests
const securityResults = await securityUtils.runSecurityTests('/api/app2app/baskets/TEST_001');

console.log('Security Score:', securityResults.securityScore);
console.log('Vulnerabilities:', securityResults.vulnerabilities.length);
console.log('Risk Level:', securityResults.analysis.riskLevel);
```

### Scenario Testing

```javascript
import { AuthScenarios } from './__tests__/utils/authScenarios.js';

const scenarios = new AuthScenarios(client);

// Test all authentication scenarios
const results = await scenarios.runAllScenarios('/api/app2app/baskets/TEST_001');

// Generate comprehensive report
const report = scenarios.generateReport(results);

console.log('Security Score:', report.securityScore);
console.log('Recommendations:', report.recommendations.length);
```

## API Reference

### AuthTestClient

The main HTTP client for authentication testing.

#### Constructor

```javascript
new AuthTestClient(config)
```

**Parameters:**
- `config.baseURL` (string): Base URL for API requests (default: 'http://localhost:3000')
- `config.defaultKey` (string): Default authentication key (default: 'test-key-123')
- `config.timeout` (number): Request timeout in milliseconds (default: 5000)
- `config.requestSigning` (boolean): Enable request signing (default: false)
- `config.securityHeaders` (object): Additional security headers

#### Methods

##### `createAuthenticatedRequest(method, url, data, authConfig)`

Creates an authenticated HTTP request.

**Parameters:**
- `method` (string): HTTP method ('GET', 'POST', 'PUT', 'DELETE', etc.)
- `url` (string): Request URL
- `data` (object): Request body (optional)
- `authConfig` (object): Authentication configuration
  - `key` (string|null): Authentication key (null for no auth)
  - `customHeaders` (object): Custom headers

**Returns:** Promise<axios.Response>

##### `testAuthentication(endpoint, scenarios)`

Tests various authentication scenarios.

**Parameters:**
- `endpoint` (string): API endpoint to test
- `scenarios` (object): Scenarios to test
  - `valid` (boolean): Test valid authentication
  - `missing` (boolean): Test missing authentication
  - `invalid` (boolean): Test invalid authentication
  - `malformed` (boolean): Test malformed authentication

**Returns:** Promise<object> Test results

##### `testTimingAttack(endpoint, iterations)`

Tests for timing attack vulnerabilities.

**Parameters:**
- `endpoint` (string): API endpoint to test
- `iterations` (number): Number of test iterations (default: 100)

**Returns:** Promise<object> Timing analysis results

##### `testRateLimiting(endpoint, requestCount, concurrent)`

Tests rate limiting effectiveness.

**Parameters:**
- `endpoint` (string): API endpoint to test
- `requestCount` (number): Number of requests to send
- `concurrent` (boolean): Send requests concurrently (default: true)

**Returns:** Promise<object> Rate limiting test results

##### `testBruteForce(endpoint, keyLength, attempts)`

Tests brute force protection.

**Parameters:**
- `endpoint` (string): API endpoint to test
- `keyLength` (number): Length of keys to generate (default: 32)
- `attempts` (number): Number of brute force attempts (default: 1000)

**Returns:** Promise<object> Brute force test results

##### `generateSecurityReport(endpoint)`

Generates comprehensive security report.

**Parameters:**
- `endpoint` (string): API endpoint to test

**Returns:** Promise<object> Security report

### AuthScenarios

Comprehensive authentication scenario testing.

#### Constructor

```javascript
new AuthScenarios(client)
```

**Parameters:**
- `client` (AuthTestClient): AuthTestClient instance

#### Methods

##### `runAllScenarios(endpoint)`

Runs all authentication test scenarios.

**Parameters:**
- `endpoint` (string): API endpoint to test

**Returns:** Promise<object> All scenario results

##### `validAuthentication(endpoint)`

Tests valid authentication scenarios.

**Returns:** Promise<object> Valid authentication results

##### `missingAuthentication(endpoint)`

Tests missing authentication scenarios.

**Returns:** Promise<object> Missing authentication results

##### `invalidAuthentication(endpoint)`

Tests invalid authentication scenarios.

**Returns:** Promise<object> Invalid authentication results

##### `sqlInjection(endpoint)`

Tests SQL injection vulnerability.

**Returns:** Promise<object> SQL injection test results

##### `xssInjection(endpoint)`

Tests XSS injection vulnerability.

**Returns:** Promise<object> XSS injection test results

##### `generateReport(results)`

Generates comprehensive test report.

**Parameters:**
- `results` (object): Test results

**Returns:** object Test report

### SecurityTestUtils

Security vulnerability detection and testing.

#### Constructor

```javascript
new SecurityTestUtils(client)
```

**Parameters:**
- `client` (AuthTestClient): AuthTestClient instance

#### Methods

##### `runSecurityTests(endpoint)`

Runs comprehensive security tests.

**Parameters:**
- `endpoint` (string): API endpoint to test

**Returns:** Promise<object> Security test results

##### `testTimingAttackVulnerability(endpoint, iterations)`

Tests timing attack vulnerability.

**Parameters:**
- `endpoint` (string): API endpoint to test
- `iterations` (number): Number of test iterations (default: 1000)

**Returns:** Promise<object> Timing attack vulnerability results

##### `testRateLimitingVulnerability(endpoint, requestCount)`

Tests rate limiting vulnerability.

**Parameters:**
- `endpoint` (string): API endpoint to test
- `requestCount` (number): Number of requests to send (default: 100)

**Returns:** Promise<object> Rate limiting vulnerability results

##### `testBruteForceVulnerability(endpoint, attempts)`

Tests brute force vulnerability.

**Parameters:**
- `endpoint` (string): API endpoint to test
- `attempts` (number): Number of attempts (default: 1000)

**Returns:** Promise<object> Brute force vulnerability results

##### `testInputValidationVulnerability(endpoint)`

Tests input validation vulnerability.

**Returns:** Promise<object> Input validation vulnerability results

##### `testCORSConfigurationVulnerability(endpoint)`

Tests CORS configuration vulnerability.

**Returns:** Promise<object> CORS configuration vulnerability results

##### `generateSecurityReport(endpoint)`

Generates security vulnerability report.

**Parameters:**
- `endpoint` (string): API endpoint to test

**Returns:** object Security report

## Test Scenarios

### Authentication Scenarios

#### Valid Authentication
- Default valid key format
- UUID format keys
- Alphanumeric keys
- Complex keys with special characters
- Short valid keys

#### Missing Authentication
- No authentication header
- Empty authentication header
- Null authentication header
- Undefined authentication header

#### Invalid Authentication
- Completely wrong keys
- Off-by-one character variations
- Case variations
- Reversed keys
- Substring keys
- Random keys

#### Malformed Authentication
- Newline injection
- Carriage return injection
- Tab injection
- Null byte injection
- Control character injection

#### Injection Attacks
- SQL injection
- XSS injection
- Command injection
- Path traversal
- Header injection

#### Special Characters
- Unicode characters
- Special characters in keys
- Whitespace handling
- Empty keys
- Extremely long keys

### Security Testing

#### Timing Attack Testing
- Statistical analysis of response times
- T-test for significance
- Confidence level calculation
- Vulnerability detection

#### Rate Limiting Testing
- Concurrent request testing
- Sequential request testing
- Rate limiting effectiveness
- Performance analysis

#### Brute Force Testing
- Random key generation
- Success rate calculation
- Time-based analysis
- Protection effectiveness

#### Input Validation Testing
- Malicious input detection
- Input sanitization testing
- Validation bypass testing
- Error handling analysis

## Integration Examples

### Example 1: Basic Authentication Testing

```javascript
import { AuthTestClient } from './__tests__/utils/authTestClient.js';

async function testBasicAuth() {
  const client = new AuthTestClient({
    baseURL: 'http://localhost:3000',
    defaultKey: 'test-key-123'
  });

  const endpoint = '/api/app2app/baskets/TEST_001';

  // Test basic authentication
  const results = await client.testAuthentication(endpoint, {
    valid: true,
    missing: true,
    invalid: true
  });

  console.log('Authentication Test Results:');
  console.log('Valid:', results.valid.status === 200 ? 'PASS' : 'FAIL');
  console.log('Missing:', results.missing.status === 401 ? 'PASS' : 'FAIL');
  console.log('Invalid:', results.invalid.status === 401 ? 'PASS' : 'FAIL');
}
```

### Example 2: Comprehensive Security Testing

```javascript
import { SecurityTestUtils } from './__tests__/utils/securityTestUtils.js';

async function testSecurity() {
  const client = new AuthTestClient();
  const securityUtils = new SecurityTestUtils(client);

  const endpoint = '/api/app2app/baskets/TEST_001';

  // Run comprehensive security tests
  const results = await securityUtils.runSecurityTests(endpoint);

  console.log('Security Test Results:');
  console.log('Security Score:', results.securityScore + '/100');
  console.log('Vulnerabilities:', results.vulnerabilities.length);
  console.log('Critical Issues:', results.analysis.criticalVulnerabilities);
  console.log('High Issues:', results.analysis.highVulnerabilities);
  console.log('Risk Level:', results.analysis.riskLevel);

  // Display recommendations
  results.recommendations.forEach(rec => {
    console.log(`- ${rec.recommendation} (${rec.priority} priority)`);
  });
}
```

### Example 3: Performance Testing

```javascript
import { AuthTestClient } from './__tests__/utils/authTestClient.js';

async function testPerformance() {
  const client = new AuthTestClient();
  const endpoint = '/api/app2app/baskets/TEST_001';

  // Test rate limiting
  const rateLimitResults = await client.testRateLimiting(endpoint, 100, true);

  console.log('Performance Test Results:');
  console.log('Total Requests:', rateLimitResults.totalRequests);
  console.log('Successful:', rateLimitResults.successfulRequests);
  console.log('Rate Limited:', rateLimitResults.rateLimitedRequests);
  console.log('Requests/Second:', rateLimitResults.requestsPerSecond.toFixed(2));
  console.log('Average Response Time:', rateLimitResults.averageResponseTime.toFixed(2) + 'ms');
}
```

### Example 4: Full Integration Test

```javascript
import { AuthTestClient, AuthScenarios, SecurityTestUtils } from './__tests__/utils/';

async function runFullTest() {
  const client = new AuthTestClient();
  const scenarios = new AuthScenarios(client);
  const securityUtils = new SecurityTestUtils(client);

  const endpoint = '/api/app2app/baskets/TEST_001';

  // Run all tests
  const [authResults, securityResults] = await Promise.all([
    scenarios.runAllScenarios(endpoint),
    securityUtils.runSecurityTests(endpoint)
  ]);

  // Generate reports
  const authReport = scenarios.generateReport(authResults);
  const securityReport = securityUtils.generateSecurityReport(endpoint);

  console.log('Test Summary:');
  console.log('Authentication Score:', authReport.securityScore + '/100');
  console.log('Security Score:', securityResults.securityScore + '/100');
  console.log('Overall Issues:', authReport.failedTests + securityResults.vulnerabilities.length);
}
```

## Running Tests

### Using the Example Script

The included example script provides a complete demonstration of the authentication testing utilities:

```bash
# Run with default settings
node examples/authTestingExample.js

# Test custom endpoint
TEST_ENDPOINT=http://localhost:3000/api/app2app/baskets/TEST_001 node examples/authTestingExample.js

# Test with custom authentication key
ODEAL_REQUEST_KEY=your-api-key node examples/authTestingExample.js

# Test with more iterations
TEST_ITERATIONS=1000 node examples/authTestingExample.js

# Test concurrent requests
TEST_CONCURRENT=true node examples/authTestingExample.js
```

### Using Jest

The utilities include comprehensive Jest integration tests:

```bash
# Run all authentication tests
npm test -- --testPathPattern=authTestIntegration

# Run specific test suite
npm test -- --testNamePattern="AuthTestClient"
npm test -- --testNamePattern="AuthScenarios"
npm test -- --testNamePattern="SecurityTestUtils"
```

## Configuration

### Environment Variables

The utilities can be configured using environment variables:

```bash
# Authentication configuration
ODEAL_REQUEST_KEY=your-api-key
TEST_ENDPOINT=http://localhost:3000/api/app2app/baskets/TEST_001

# Test configuration
TEST_ITERATIONS=1000
TEST_CONCURRENT=true
TEST_TIMEOUT=10000

# Security configuration
SECURITY_TEST_STRICT=true
SECURITY_REPORT_DETAILED=true
```

### Configuration File

You can also create a configuration file:

```javascript
// auth-test-config.js
export default {
  client: {
    baseURL: 'http://localhost:3000',
    defaultKey: 'test-key-123',
    timeout: 10000,
    requestSigning: true
  },
  tests: {
    iterations: 1000,
    concurrent: true,
    timeout: 30000
  },
  security: {
    strictMode: true,
    detailedReporting: true,
    saveResults: true
  }
};
```

## Output and Reporting

### Console Output

The utilities provide detailed console output with:

- ✅ Pass/fail indicators
- 🚨 Security vulnerability alerts
- ⚠️ Warning notifications
- 📊 Performance metrics
- 💡 Recommendations

### JSON Export

Test results can be exported to JSON format:

```javascript
const results = await client.testAuthentication(endpoint, scenarios);
const fs = require('fs');
fs.writeFileSync('auth-results.json', JSON.stringify(results, null, 2));
```

### Security Report

The security report includes:

- **Overall Security Score**: 0-100 rating
- **Vulnerability Assessment**: Critical, high, medium, low severity
- **Risk Level**: Overall risk assessment
- **Detailed Recommendations**: Specific remediation steps
- **Next Steps**: Action items for security improvement

### Example Security Report

```json
{
  "securityScore": 85,
  "vulnerabilities": [
    {
      "type": "Timing Attack",
      "severity": "medium",
      "description": "Response time differences detected",
      "recommendation": "Implement constant-time comparison"
    }
  ],
  "recommendations": [
    {
      "priority": "high",
      "recommendation": "Implement proper rate limiting"
    }
  ],
  "riskLevel": "medium"
}
```

## Best Practices

### Security Testing

1. **Run Regular Tests**: Perform security testing regularly, especially after code changes
2. **Test All Environments**: Test development, staging, and production environments
3. **Use Realistic Data**: Test with realistic authentication keys and payloads
4. **Monitor Performance**: Keep track of performance metrics during security testing
5. **Document Results**: Maintain detailed records of security test results

### Integration

1. **CI/CD Integration**: Include security tests in your CI/CD pipeline
2. **Automated Reporting**: Set up automated security reports and alerts
3. **Threshold Monitoring**: Set up thresholds for security scores and metrics
4. **Regular Updates**: Keep the testing utilities updated with the latest security practices

### Performance

1. **Concurrent Testing**: Test concurrent request handling capabilities
2. **Load Testing**: Perform load testing under realistic conditions
3. **Response Time Monitoring**: Monitor response times for security impact
4. **Resource Usage**: Monitor resource usage during security testing

## Troubleshooting

### Common Issues

#### Timeouts
```javascript
// Increase timeout for slow endpoints
const client = new AuthTestClient({
  timeout: 30000 // 30 seconds
});
```

#### Authentication Failures
```javascript
// Verify authentication key and endpoint
console.log('Testing with key:', client.defaultKey);
console.log('Testing endpoint:', endpoint);
```

#### Rate Limiting
```javascript
// Reduce concurrent requests for rate limited endpoints
const results = await client.testRateLimiting(endpoint, 10, false);
```

#### Network Issues
```javascript
// Test connectivity first
try {
  await client.createAuthenticatedRequest('GET', '/health', null, {
    key: 'test-key-123'
  });
} catch (error) {
  console.error('Network connectivity issue:', error.message);
}
```

### Debug Mode

Enable debug mode for detailed logging:

```javascript
const client = new AuthTestClient({
  debug: true,
  logLevel: 'debug'
});
```

## Contributing

### Adding New Test Scenarios

To add new authentication test scenarios:

1. Add the scenario method to the `AuthScenarios` class
2. Include proper error handling
3. Add documentation
4. Add integration tests

### Adding New Security Tests

To add new security tests:

1. Add the test method to the `SecurityTestUtils` class
2. Implement proper statistical analysis
3. Add vulnerability detection logic
4. Include comprehensive documentation

### Code Style

- Use ES6+ syntax
- Follow existing code patterns
- Include comprehensive JSDoc comments
- Add error handling for all async operations
- Use proper TypeScript types if available

## License

This authentication testing utilities are part of the Ödeal Vercel functions project and are subject to the same license terms.

## Support

For issues, questions, or contributions, please refer to the main project documentation or create an issue in the project repository.