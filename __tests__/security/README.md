# Ödeal Vercel Functions Security Testing

This directory contains comprehensive security testing utilities for Ödeal Vercel Functions authentication and input validation mechanisms.

## Overview

The security testing suite provides thorough testing capabilities for:

1. **Authentication Security Testing**
   - Timing attack detection
   - Authentication bypass prevention
   - Brute force and rate limiting testing
   - Token manipulation and forgery testing
   - Security header validation

2. **Input Validation Security Testing**
   - Cross-Site Scripting (XSS) testing
   - SQL injection testing
   - Command injection testing
   - Path traversal testing
   - LDAP injection testing
   - XML injection testing

3. **Advanced Security Testing**
   - Fuzzing and edge case testing
   - Comprehensive vulnerability scanning
   - Automated security assessment
   - Detailed reporting and recommendations

## File Structure

```
security/
├── authSecurityTestUtils.js         # Core authentication security testing utilities
├── advancedSecurityTestUtils.js     # Advanced input validation and fuzzing utilities
├── authenticationSecurity.test.js   # Authentication security test suite
├── comprehensiveSecurity.test.js    # Comprehensive security test suite
└── README.md                        # This documentation file
```

## Core Components

### 1. TimingAttackTester

Tests for timing-based vulnerabilities in authentication mechanisms:

```javascript
import { TimingAttackTester } from './authSecurityTestUtils.js';

const tester = new TimingAttackTester('http://localhost:3000');
const result = await tester.testAuthenticationTiming('/api/app2app/baskets/TEST_001', 100);
console.log(result.recommendation);
```

**Features:**
- Measures response times for valid vs invalid credentials
- Tests timing attacks with different key lengths
- Statistical analysis and correlation detection
- Automated vulnerability assessment

### 2. AuthBypassTester

Tests various authentication bypass techniques:

```javascript
import { AuthBypassTester } from './authSecurityTestUtils.js';

const tester = new AuthBypassTester('http://localhost:3000');
const results = await tester.testAuthBypassTechniques('/api/app2app/baskets/TEST_001');
const report = tester.generateReport();
```

**Tests Covered:**
- Empty/null authentication headers
- SQL injection in auth headers
- Command injection attempts
- Header splitting and CRLF injection
- Unicode and encoding attacks
- Case sensitivity testing

### 3. BruteForceTester

Tests brute force protection and rate limiting:

```javascript
import { BruteForceTester } from './authSecurityTestUtils.js';

const tester = new BruteForceTester('http://localhost:3000');
await tester.testBruteForceProtection('/api/app2app/baskets/TEST_001', 20);
await tester.testRateLimiting('/api/app2app/baskets/TEST_001', 10, 5);
await tester.testCredentialSpraying('/api/app2app/baskets/TEST_001', 10);
```

**Capabilities:**
- Brute force attack simulation
- Rate limiting detection
- Credential spraying testing
- Concurrent request handling
- Protection mechanism validation

### 4. TokenManipulationTester

Tests token manipulation and forgery:

```javascript
import { TokenManipulationTester } from './authSecurityTestUtils.js';

const tester = new TokenManipulationTester('http://localhost:3000');
await tester.testTokenManipulation('/api/app2app/baskets/TEST_001');
await tester.testTokenForgery('/api/app2app/baskets/TEST_001');
await tester.testTokenExpiration('/api/app2app/baskets/TEST_001');
```

**Test Scenarios:**
- Partial key testing
- Token encoding/decoding attacks
- Null byte injection
- Token expiration validation
- Binary data testing

### 5. SecurityHeaderTester

Validates security headers and CSRF protection:

```javascript
import { SecurityHeaderTester } from './authSecurityTestUtils.js';

const tester = new SecurityHeaderTester('http://localhost:3000');
await tester.testSecurityHeaders('/api/app2app/baskets/TEST_001');
await tester.testCSRFProtection('/api/app2app/baskets/TEST_001');
await tester.testInformationDisclosure('/api/app2app/baskets/TEST_001');
```

**Security Headers Checked:**
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security
- Content-Security-Policy
- Referrer-Policy
- Permissions-Policy

### 6. InputValidationTester

Comprehensive input validation testing:

```javascript
import { InputValidationTester } from './advancedSecurityTestUtils.js';

const tester = new InputValidationTester('http://localhost:3000');
await tester.testXSSVulnerabilities('/api/app2app/baskets/TEST_001', 'query');
await tester.testSQLInjection('/api/app2app/baskets/TEST_001', 'header');
await tester.testCommandInjection('/api/app2app/baskets/TEST_001', 'body');
await tester.testPathTraversal('/api/app2app/baskets/TEST_001', 'query');
```

**Attack Patterns Included:**
- 50+ XSS attack vectors
- 30+ SQL injection patterns
- 25+ command injection techniques
- 40+ path traversal methods
- LDAP and XML injection tests

### 7. FuzzingTester

Automated fuzzing for edge case discovery:

```javascript
import { FuzzingTester } from './advancedSecurityTestUtils.js';

const tester = new FuzzingTester('http://localhost:3000');
await tester.fuzzEndpoint('/api/app2app/baskets/TEST_001', 'query', 100);
await tester.fuzzEndpoint('/api/app2app/baskets/TEST_001', 'header', 100);
await tester.fuzzEndpoint('/api/app2app/baskets/TEST_001', 'body', 100);
```

**Fuzzing Payloads:**
- Boundary values and special characters
- Unicode and control characters
- Encoding and format string patterns
- Random and malformed data
- Time-based and large inputs

### 8. SecurityTestSuite

Comprehensive security testing orchestration:

```javascript
import { SecurityTestSuite } from './authSecurityTestUtils.js';

const suite = new SecurityTestSuite('http://localhost:3000');
const results = await suite.runAllTests('/api/app2app/baskets/TEST_001');
const report = suite.generateReport(results);
```

## Running Security Tests

### Individual Test Categories

```bash
# Run authentication security tests
npm test -- --testNamePattern="Authentication Security Tests"

# Run input validation tests
npm test -- --testNamePattern="Input Validation Security Tests"

# Run comprehensive security tests
npm test -- --testNamePattern="Comprehensive Security Tests"
```

### Full Security Suite

```bash
# Run all security tests
npm test -- --testPathPattern="security/"

# Run with verbose output
npm test -- --testPathPattern="security/" --verbose

# Run with specific timeout
npm test -- --testPathPattern="security/" --testTimeout=300000
```

## Configuration

### Environment Variables

```bash
# Required for testing
export VERCEL_URL="http://localhost:3000"
export ODEAL_REQUEST_KEY="your-test-key"

# Optional configuration
export BASKET_PROVIDER="mock"
export ROP_BASE_URL="http://test.ropapi.com/V6/App2App"
export DEVICE_ID="TEST_DEVICE_001"
export RESTAURANT_ID="123"
export DEVICE_KEY="test-device-key"
```

### Test Configuration

Security tests can be customized through configuration objects:

```javascript
const customConfig = {
  baseUrl: 'https://your-endpoint.com',
  validAuthKey: 'your-auth-key',
  testTimeout: 30000,
  requestTimeout: 10000,
  timingThreshold: 100,
  bruteForceThreshold: 10,
  maxPayloadSize: 1024 * 1024
};

const tester = new SecurityTestSuite(customConfig.baseUrl);
```

## Security Test Results

### Authentication Security Results

```javascript
{
  "timingVulnerabilities": 0,
  "authBypasses": 0,
  "bruteForceProtection": 1,
  "tokenIssues": 0,
  "securityHeaderIssues": 1,
  "securityScore": 85,
  "overallAssessment": "✅ GOOD: Generally secure with minor issues"
}
```

### Input Validation Results

```javascript
{
  "xssVulnerabilities": 0,
  "sqlInjectionVulnerabilities": 0,
  "commandInjectionVulnerabilities": 0,
  "pathTraversalVulnerabilities": 0,
  "ldapInjectionVulnerabilities": 0,
  "xmlInjectionVulnerabilities": 0,
  "securityScore": 95,
  "overallAssessment": "✅ EXCELLENT: Strong input validation"
}
```

### Comprehensive Report

```javascript
{
  "executiveSummary": {
    "overallSecurityScore": 90,
    "overallAssessment": "✅ EXCELLENT: Strong security posture",
    "criticalIssues": 0,
    "recommendations": [
      {
        "priority": "MEDIUM",
        "category": "Security Headers",
        "recommendation": "Add missing security headers"
      }
    ]
  },
  "detailedResults": {
    "authentication": {...},
    "inputValidation": {...},
    "fuzzing": {...},
    "webhooks": {...},
    "rateLimiting": {...}
  },
  "securityMetrics": {
    "authentication": {"score": 85, "status": "GOOD"},
    "inputValidation": {"score": 95, "status": "EXCELLENT"},
    "fuzzing": {"score": 100, "status": "EXCELLENT"},
    "webhooks": {"score": 90, "status": "EXCELLENT"},
    "rateLimiting": {"score": 80, "status": "GOOD"}
  }
}
```

## Security Best Practices

### 1. Authentication Security

- **Use constant-time comparison** for authentication tokens
- **Implement rate limiting** to prevent brute force attacks
- **Validate all authentication headers** thoroughly
- **Use secure random token generation**
- **Implement proper token expiration**

### 2. Input Validation

- **Validate all user inputs** using strict whitelisting
- **Use parameterized queries** to prevent SQL injection
- **Encode all outputs** to prevent XSS
- **Sanitize file paths** to prevent path traversal
- **Use prepared statements** for database operations

### 3. Security Headers

- **Implement Content Security Policy** to prevent XSS
- **Use X-Frame-Options** to prevent clickjacking
- **Enable HSTS** for secure connections
- **Set X-Content-Type-Options** to prevent MIME sniffing
- **Use Referrer-Policy** to control referrer information

### 4. Rate Limiting

- **Implement progressive delays** for failed attempts
- **Use IP-based rate limiting** for public endpoints
- **Set reasonable thresholds** for different operations
- **Monitor for suspicious patterns**
- **Implement account lockout** after excessive failures

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Security Tests
on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run security tests
        run: npm test -- --testPathPattern="security/"
        env:
          VERCEL_URL: ${{ secrets.VERCEL_URL }}
          ODEAL_REQUEST_KEY: ${{ secrets.ODEAL_REQUEST_KEY }}

      - name: Generate security report
        run: node -e "const { SecurityTestSuite } = require('./security/authSecurityTestUtils.js'); const suite = new SecurityTestSuite(process.env.VERCEL_URL); suite.runAllTests('/api/app2app/baskets/TEST_001').then(results => console.log(suite.generateReport(results)));"
```

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any
    environment {
        VERCEL_URL = 'http://localhost:3000'
        ODEAL_REQUEST_KEY = credentials('odeal-request-key')
    }

    stages {
        stage('Security Tests') {
            steps {
                sh 'npm install'
                sh 'npm test -- --testPathPattern="security/"'
            }
        }
    }
}
```

## Troubleshooting

### Common Issues

1. **Timeout Errors**
   - Increase test timeout: `--testTimeout=300000`
   - Check server responsiveness
   - Verify network connectivity

2. **Authentication Failures**
   - Verify ODEAL_REQUEST_KEY environment variable
   - Check server authentication configuration
   - Ensure correct endpoint URLs

3. **Rate Limiting**
   - Reduce request frequency in tests
   - Increase delay between requests
   - Use different test endpoints

4. **Memory Issues**
   - Reduce fuzzing iterations
   - Increase available memory
   - Run tests in smaller batches

### Debug Mode

Enable debug logging for troubleshooting:

```javascript
const tester = new SecurityTestSuite('http://localhost:3000');
tester.debug = true; // Enable detailed logging
```

## Contributing

### Adding New Security Tests

1. **Create new tester class** extending base functionality
2. **Implement test methods** with proper error handling
3. **Add comprehensive documentation**
4. **Include test cases** in the comprehensive suite
5. **Update configuration** if needed

### Test Guidelines

- **Follow Jest testing patterns**
- **Include proper setup and teardown**
- **Handle errors gracefully**
- **Provide detailed reporting**
- **Test both success and failure scenarios**

## License

This security testing suite is part of the Ödeal Vercel Functions project and follows the same license terms.

## Support

For issues or questions regarding the security testing suite:
1. Check the troubleshooting section
2. Review test logs for detailed error information
3. Consult the main project documentation
4. Create an issue with detailed reproduction steps

## Changelog

### Version 1.0.0
- Initial release of comprehensive security testing suite
- Authentication security testing utilities
- Input validation testing capabilities
- Advanced fuzzing and vulnerability scanning
- Comprehensive reporting and recommendations