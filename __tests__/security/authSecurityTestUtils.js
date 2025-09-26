import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Authentication Security Testing Utilities for Ödeal Vercel Functions
 * Provides comprehensive security testing capabilities for authentication mechanisms
 */

// Security test configuration
const SECURITY_TEST_CONFIG = {
  baseUrl: process.env.VERCEL_URL || 'http://localhost:3000',
  validAuthKey: process.env.ODEAL_REQUEST_KEY || 'test-key',
  testTimeout: 30000,
  requestTimeout: 10000,
  timingThreshold: 100, // ms threshold for timing attack detection
  bruteForceThreshold: 10, // number of requests before rate limiting should kick in
  maxPayloadSize: 1024 * 1024, // 1MB max payload size
};

/**
 * Timing Attack Testing Utilities
 * Tests for timing-based vulnerabilities in authentication
 */
export class TimingAttackTester {
  constructor(baseUrl = SECURITY_TEST_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  /**
   * Test for timing attacks on authentication endpoint
   * Measures response times for valid vs invalid credentials
   */
  async testAuthenticationTiming(endpoint = '/api/app2app/baskets/TEST_001', iterations = 100) {
    const validTimes = [];
    const invalidTimes = [];
    const veryCloseTimes = []; // Test with keys that differ by 1 character

    console.log(`🔍 Testing authentication timing on ${endpoint} with ${iterations} iterations...`);

    // Test with valid key
    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      try {
        await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: { 'X-ODEAL-REQUEST-KEY': SECURITY_TEST_CONFIG.validAuthKey },
          timeout: SECURITY_TEST_CONFIG.requestTimeout
        });
      } catch (error) {
        // Expected to fail or succeed, we're measuring timing
      }
      const endTime = process.hrtime.bigint();
      validTimes.push(Number(endTime - startTime) / 1000000); // Convert to milliseconds
    }

    // Test with invalid key
    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      try {
        await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: { 'X-ODEAL-REQUEST-KEY': 'invalid-key-123' },
          timeout: SECURITY_TEST_CONFIG.requestTimeout
        });
      } catch (error) {
        // Expected to fail
      }
      const endTime = process.hrtime.bigint();
      invalidTimes.push(Number(endTime - startTime) / 1000000);
    }

    // Test with very similar keys (timing attack vector)
    const similarKey = SECURITY_TEST_CONFIG.validAuthKey.slice(0, -1) + 'X';
    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      try {
        await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: { 'X-ODEAL-REQUEST-KEY': similarKey },
          timeout: SECURITY_TEST_CONFIG.requestTimeout
        });
      } catch (error) {
        // Expected to fail
      }
      const endTime = process.hrtime.bigint();
      veryCloseTimes.push(Number(endTime - startTime) / 1000000);
    }

    // Calculate statistics
    const validAvg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
    const invalidAvg = invalidTimes.reduce((a, b) => a + b, 0) / invalidTimes.length;
    const closeAvg = veryCloseTimes.reduce((a, b) => a + b, 0) / veryCloseTimes.length;

    const validStd = Math.sqrt(validTimes.reduce((sq, n) => sq + Math.pow(n - validAvg, 2), 0) / validTimes.length);
    const invalidStd = Math.sqrt(invalidTimes.reduce((sq, n) => sq + Math.pow(n - invalidAvg, 2), 0) / invalidTimes.length);
    const closeStd = Math.sqrt(veryCloseTimes.reduce((sq, n) => sq + Math.pow(n - closeAvg, 2), 0) / veryCloseTimes.length);

    const result = {
      endpoint,
      iterations,
      validKey: { avg: validAvg, std: validStd, min: Math.min(...validTimes), max: Math.max(...validTimes) },
      invalidKey: { avg: invalidAvg, std: invalidStd, min: Math.min(...invalidTimes), max: Math.max(...invalidTimes) },
      similarKey: { avg: closeAvg, std: closeStd, min: Math.min(...veryCloseTimes), max: Math.max(...veryCloseTimes) },
      timingDiff: Math.abs(validAvg - invalidAvg),
      isVulnerable: Math.abs(validAvg - invalidAvg) > SECURITY_TEST_CONFIG.timingThreshold,
      recommendation: Math.abs(validAvg - invalidAvg) > SECURITY_TEST_CONFIG.timingThreshold
        ? '⚠️ POTENTIAL TIMING VULNERABILITY: Response times differ significantly'
        : '✅ No significant timing difference detected'
    };

    this.results.push(result);
    console.log(`📊 Timing Analysis Results:`);
    console.log(`   Valid Key Avg: ${validAvg.toFixed(2)}ms ±${validStd.toFixed(2)}ms`);
    console.log(`   Invalid Key Avg: ${invalidAvg.toFixed(2)}ms ±${invalidStd.toFixed(2)}ms`);
    console.log(`   Similar Key Avg: ${closeAvg.toFixed(2)}ms ±${closeStd.toFixed(2)}ms`);
    console.log(`   Timing Difference: ${result.timingDiff.toFixed(2)}ms`);
    console.log(`   ${result.recommendation}`);

    return result;
  }

  /**
   * Test for timing attacks with different key lengths
   */
  async testKeyLengthTiming(endpoint = '/api/app2app/baskets/TEST_001') {
    const keyLengths = [8, 16, 24, 32, 64];
    const results = [];

    for (const length of keyLengths) {
      const testKey = 'a'.repeat(length);
      const times = [];

      for (let i = 0; i < 50; i++) {
        const startTime = process.hrtime.bigint();
        try {
          await axios.get(`${this.baseUrl}${endpoint}`, {
            headers: { 'X-ODEAL-REQUEST-KEY': testKey },
            timeout: SECURITY_TEST_CONFIG.requestTimeout
          });
        } catch (error) {
          // Expected to fail
        }
        const endTime = process.hrtime.bigint();
        times.push(Number(endTime - startTime) / 1000000);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      results.push({ length, avgTime, times });
    }

    // Check if response time correlates with key length
    const sortedResults = results.sort((a, b) => a.length - b.length);
    const timeCorrelation = this.calculateCorrelation(
      sortedResults.map(r => r.length),
      sortedResults.map(r => r.avgTime)
    );

    const result = {
      testType: 'Key Length Timing',
      results,
      correlation: timeCorrelation,
      isVulnerable: Math.abs(timeCorrelation) > 0.7,
      recommendation: Math.abs(timeCorrelation) > 0.7
        ? '⚠️ POTENTIAL TIMING VULNERABILITY: Response time correlates with key length'
        : '✅ No significant correlation between key length and response time'
    };

    this.results.push(result);
    console.log(`🔑 Key Length Timing Analysis:`);
    console.log(`   Correlation: ${timeCorrelation.toFixed(3)}`);
    console.log(`   ${result.recommendation}`);

    return result;
  }

  calculateCorrelation(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  getResults() {
    return this.results;
  }

  generateReport() {
    const vulnerabilities = this.results.filter(r => r.isVulnerable);
    const totalTests = this.results.length;

    return {
      totalTests,
      vulnerabilitiesFound: vulnerabilities.length,
      vulnerabilityRate: (vulnerabilities.length / totalTests) * 100,
      details: this.results,
      summary: vulnerabilities.length > 0
        ? `⚠️ ${vulnerabilities.length} potential timing vulnerabilities detected`
        : '✅ No timing vulnerabilities detected'
    };
  }
}

/**
 * Authentication Bypass Testing Utilities
 * Tests for various authentication bypass techniques
 */
export class AuthBypassTester {
  constructor(baseUrl = SECURITY_TEST_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  /**
   * Test various authentication bypass techniques
   */
  async testAuthBypassTechniques(endpoint = '/api/app2app/baskets/TEST_001') {
    const bypassTests = [
      {
        name: 'Empty Header',
        headers: {},
        description: 'Testing with missing authentication header'
      },
      {
        name: 'Null Header',
        headers: { 'X-ODEAL-REQUEST-KEY': null },
        description: 'Testing with null authentication header'
      },
      {
        name: 'Empty String Header',
        headers: { 'X-ODEAL-REQUEST-KEY': '' },
        description: 'Testing with empty string authentication header'
      },
      {
        name: 'None Header',
        headers: { 'X-ODEAL-REQUEST-KEY': 'none' },
        description: 'Testing with "none" as authentication key'
      },
      {
        name: 'Undefined Header',
        headers: { 'X-ODEAL-REQUEST-KEY': 'undefined' },
        description: 'Testing with "undefined" as authentication key'
      },
      {
        name: 'SQL Injection',
        headers: { 'X-ODEAL-REQUEST-KEY': "' OR '1'='1" },
        description: 'Testing SQL injection in authentication header'
      },
      {
        name: 'NoSQL Injection',
        headers: { 'X-ODEAL-REQUEST-KEY': '{"$ne": null}' },
        description: 'Testing NoSQL injection in authentication header'
      },
      {
        name: 'Command Injection',
        headers: { 'X-ODEAL-REQUEST-KEY': 'test; ls -la' },
        description: 'Testing command injection in authentication header'
      },
      {
        name: 'Path Traversal',
        headers: { 'X-ODEAL-REQUEST-KEY': '../../../etc/passwd' },
        description: 'Testing path traversal in authentication header'
      },
      {
        name: 'XSS Injection',
        headers: { 'X-ODEAL-REQUEST-KEY': '<script>alert("xss")</script>' },
        description: 'Testing XSS injection in authentication header'
      },
      {
        name: 'Case Sensitivity',
        headers: { 'x-odeal-request-key': SECURITY_TEST_CONFIG.validAuthKey },
        description: 'Testing case sensitivity in header name'
      },
      {
        name: 'Extra Spaces',
        headers: { 'X-ODEAL-REQUEST-KEY': ` ${SECURITY_TEST_CONFIG.validAuthKey} ` },
        description: 'Testing with extra spaces around valid key'
      },
      {
        name: 'Comment Injection',
        headers: { 'X-ODEAL-REQUEST-KEY': `${SECURITY_TEST_CONFIG.validAuthKey}/* comment */` },
        description: 'Testing comment injection in authentication header'
      }
    ];

    console.log(`🔓 Testing authentication bypass techniques on ${endpoint}...`);

    for (const test of bypassTests) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: test.headers,
          timeout: SECURITY_TEST_CONFIG.requestTimeout,
          validateStatus: () => true // Don't throw on any status
        });
        const endTime = Date.now();

        const isBypass = response.status !== 401;

        const result = {
          testName: test.name,
          description: test.description,
          headers: test.headers,
          status: response.status,
          responseTime: endTime - startTime,
          isBypass,
          responseData: response.data,
          recommendation: isBypass
            ? '⚠️ POTENTIAL BYPASS: Request was not properly authenticated'
            : '✅ Properly blocked unauthorized access'
        };

        this.results.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (Status: ${response.status})`);

      } catch (error) {
        const result = {
          testName: test.name,
          description: test.description,
          headers: test.headers,
          status: 'NETWORK_ERROR',
          error: error.message,
          isBypass: false,
          recommendation: '✅ Request blocked (network error)'
        };

        this.results.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (${error.message})`);
      }
    }

    return this.results;
  }

  /**
   * Test header manipulation and injection attacks
   */
  async testHeaderInjection(endpoint = '/api/app2app/baskets/TEST_001') {
    const injectionTests = [
      {
        name: 'CRLF Injection',
        headers: {
          'X-ODEAL-REQUEST-KEY': `test\r\nX-Forwarded-For: 127.0.0.1\r\nX-Injected-Header: injected-value`
        },
        description: 'Testing CRLF injection in authentication header'
      },
      {
        name: 'Header Splitting',
        headers: {
          'X-ODEAL-REQUEST-KEY': `test\nX-New-Header: injected-value`
        },
        description: 'Testing header splitting attack'
      },
      {
        name: 'Multiple Auth Headers',
        headers: {
          'X-ODEAL-REQUEST-KEY': SECURITY_TEST_CONFIG.validAuthKey,
          'X-ODEAL-REQUEST-KEY': 'invalid-key'
        },
        description: 'Testing multiple authentication headers'
      },
      {
        name: 'Very Long Header',
        headers: {
          'X-ODEAL-REQUEST-KEY': 'a'.repeat(10000)
        },
        description: 'Testing very long authentication header'
      },
      {
        name: 'Unicode Characters',
        headers: {
          'X-ODEAL-REQUEST-KEY': '🔑测试密钥测试密钥'
        },
        description: 'Testing Unicode characters in authentication header'
      },
      {
        name: 'Base64 Encoded',
        headers: {
          'X-ODEAL-REQUEST-KEY': Buffer.from(SECURITY_TEST_CONFIG.validAuthKey).toString('base64')
        },
        description: 'Testing base64 encoded authentication header'
      }
    ];

    console.log(`🔍 Testing header injection attacks on ${endpoint}...`);

    for (const test of injectionTests) {
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: test.headers,
          timeout: SECURITY_TEST_CONFIG.requestTimeout,
          validateStatus: () => true
        });

        const isBypass = response.status !== 401;

        const result = {
          testName: test.name,
          description: test.description,
          headers: test.headers,
          status: response.status,
          isBypass,
          responseData: response.data,
          recommendation: isBypass
            ? '⚠️ POTENTIAL BYPASS: Header injection may have succeeded'
            : '✅ Properly blocked header injection'
        };

        this.results.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (Status: ${response.status})`);

      } catch (error) {
        const result = {
          testName: test.name,
          description: test.description,
          headers: test.headers,
          status: 'NETWORK_ERROR',
          error: error.message,
          isBypass: false,
          recommendation: '✅ Request blocked (network error)'
        };

        this.results.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (${error.message})`);
      }
    }

    return this.results;
  }

  getResults() {
    return this.results;
  }

  generateReport() {
    const bypasses = this.results.filter(r => r.isBypass);
    const totalTests = this.results.length;

    return {
      totalTests,
      bypassesFound: bypasses.length,
      bypassRate: (bypasses.length / totalTests) * 100,
      details: this.results,
      summary: bypasses.length > 0
        ? `⚠️ ${bypasses.length} potential authentication bypasses detected`
        : '✅ No authentication bypasses detected'
    };
  }
}

/**
 * Brute Force and Rate Limiting Testing Utilities
 * Tests for brute force protection and rate limiting mechanisms
 */
export class BruteForceTester {
  constructor(baseUrl = SECURITY_TEST_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  /**
   * Test brute force protection mechanisms
   */
  async testBruteForceProtection(endpoint = '/api/app2app/baskets/TEST_001', requestCount = 20) {
    console.log(`🔨 Testing brute force protection on ${endpoint} with ${requestCount} requests...`);

    const randomKeys = Array.from({ length: requestCount }, () =>
      crypto.randomBytes(16).toString('hex')
    );

    const responses = [];
    let blockedCount = 0;
    let rateLimitedCount = 0;

    for (let i = 0; i < requestCount; i++) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: { 'X-ODEAL-REQUEST-KEY': randomKeys[i] },
          timeout: SECURITY_TEST_CONFIG.requestTimeout,
          validateStatus: () => true
        });
        const endTime = Date.now();

        responses.push({
          request: i + 1,
          status: response.status,
          responseTime: endTime - startTime,
          key: randomKeys[i]
        });

        if (response.status === 429) {
          rateLimitedCount++;
        } else if (response.status === 403) {
          blockedCount++;
        }

        // Small delay to avoid overwhelming the server
        if (i < requestCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        responses.push({
          request: i + 1,
          status: 'NETWORK_ERROR',
          error: error.message,
          key: randomKeys[i]
        });

        if (error.response?.status === 429) {
          rateLimitedCount++;
        }
      }
    }

    const result = {
      testType: 'Brute Force Protection',
      endpoint,
      totalRequests: requestCount,
      successfulRequests: responses.filter(r => r.status === 200).length,
      unauthorizedRequests: responses.filter(r => r.status === 401).length,
      blockedRequests: blockedCount,
      rateLimitedRequests: rateLimitedCount,
      networkErrors: responses.filter(r => r.status === 'NETWORK_ERROR').length,
      responses,
      hasRateLimiting: rateLimitedCount > 0,
      hasBlocking: blockedCount > 0,
      recommendation: rateLimitedCount > 0 || blockedCount > 0
        ? `✅ Protection detected: ${rateLimitedCount} rate limited, ${blockedCount} blocked`
        : '⚠️ No brute force protection detected'
    };

    this.results.push(result);
    console.log(`📊 Brute Force Test Results:`);
    console.log(`   Total Requests: ${requestCount}`);
    console.log(`   Unauthorized: ${responses.filter(r => r.status === 401).length}`);
    console.log(`   Rate Limited: ${rateLimitedCount}`);
    console.log(`   Blocked: ${blockedCount}`);
    console.log(`   ${result.recommendation}`);

    return result;
  }

  /**
   * Test rate limiting mechanisms
   */
  async testRateLimiting(endpoint = '/api/app2app/baskets/TEST_001', requestsPerSecond = 10, duration = 5) {
    console.log(`⏱️ Testing rate limiting on ${endpoint} with ${requestsPerSecond} req/sec for ${duration} seconds...`);

    const responses = [];
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);

    let requestCount = 0;
    let rateLimitedCount = 0;

    while (Date.now() < endTime) {
      requestCount++;
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: { 'X-ODEAL-REQUEST-KEY': crypto.randomBytes(8).toString('hex') },
          timeout: SECURITY_TEST_CONFIG.requestTimeout,
          validateStatus: () => true
        });

        responses.push({
          timestamp: Date.now(),
          status: response.status,
          request: requestCount
        });

        if (response.status === 429) {
          rateLimitedCount++;
        }

      } catch (error) {
        responses.push({
          timestamp: Date.now(),
          status: error.response?.status || 'NETWORK_ERROR',
          error: error.message,
          request: requestCount
        });

        if (error.response?.status === 429) {
          rateLimitedCount++;
        }
      }

      // Control request rate
      await new Promise(resolve => setTimeout(resolve, 1000 / requestsPerSecond));
    }

    const actualDuration = (Date.now() - startTime) / 1000;
    const actualRate = requestCount / actualDuration;

    const result = {
      testType: 'Rate Limiting',
      endpoint,
      targetRate: requestsPerSecond,
      actualRate: actualRate.toFixed(2),
      duration: actualDuration.toFixed(2),
      totalRequests: requestCount,
      rateLimitedRequests: rateLimitedCount,
      rateLimitingPercentage: ((rateLimitedCount / requestCount) * 100).toFixed(2),
      responses,
      hasRateLimiting: rateLimitedCount > 0,
      recommendation: rateLimitedCount > 0
        ? `✅ Rate limiting detected: ${rateLimitedCount} of ${requestCount} requests limited`
        : '⚠️ No rate limiting detected'
    };

    this.results.push(result);
    console.log(`📊 Rate Limiting Test Results:`);
    console.log(`   Target Rate: ${requestsPerSecond} req/sec`);
    console.log(`   Actual Rate: ${actualRate.toFixed(2)} req/sec`);
    console.log(`   Rate Limited: ${rateLimitedCount}/${requestCount} (${((rateLimitedCount / requestCount) * 100).toFixed(2)}%)`);
    console.log(`   ${result.recommendation}`);

    return result;
  }

  /**
   * Test credential spraying attack
   */
  async testCredentialSpraying(endpoint = '/api/app2app/baskets/TEST_001', userCount = 10) {
    console.log(`💦 Testing credential spraying on ${endpoint} with ${userCount} different keys...`);

    const commonKeys = [
      'admin', 'password', '123456', 'qwerty', 'letmein',
      'welcome', 'test', 'demo', 'dev', 'staging'
    ];

    const responses = [];
    let unauthorizedCount = 0;

    for (let i = 0; i < userCount; i++) {
      const testKey = commonKeys[i % commonKeys.length];

      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: { 'X-ODEAL-REQUEST-KEY': testKey },
          timeout: SECURITY_TEST_CONFIG.requestTimeout,
          validateStatus: () => true
        });

        responses.push({
          key: testKey,
          status: response.status,
          request: i + 1
        });

        if (response.status === 401) {
          unauthorizedCount++;
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        responses.push({
          key: testKey,
          status: error.response?.status || 'NETWORK_ERROR',
          error: error.message,
          request: i + 1
        });

        if (error.response?.status === 401) {
          unauthorizedCount++;
        }
      }
    }

    const result = {
      testType: 'Credential Spraying',
      endpoint,
      totalAttempts: userCount,
      unauthorizedAttempts: unauthorizedCount,
      successRate: ((userCount - unauthorizedCount) / userCount * 100).toFixed(2),
      responses,
      recommendation: unauthorizedCount === userCount
        ? '✅ All common keys properly rejected'
        : '⚠️ Some common keys may have been accepted'
    };

    this.results.push(result);
    console.log(`📊 Credential Spraying Results:`);
    console.log(`   Total Attempts: ${userCount}`);
    console.log(`   Unauthorized: ${unauthorizedCount}`);
    console.log(`   Success Rate: ${result.successRate}%`);
    console.log(`   ${result.recommendation}`);

    return result;
  }

  getResults() {
    return this.results;
  }

  generateReport() {
    const rateLimitingTests = this.results.filter(r => r.hasRateLimiting);
    const blockingTests = this.results.filter(r => r.hasBlocking);

    return {
      totalTests: this.results.length,
      rateLimitingDetected: rateLimitingTests.length,
      blockingDetected: blockingTests.length,
      hasProtection: rateLimitingTests.length > 0 || blockingTests.length > 0,
      details: this.results,
      summary: rateLimitingTests.length > 0 || blockingTests.length > 0
        ? `✅ Brute force protection detected in ${rateLimitingTests.length + blockingTests.length} tests`
        : '⚠️ No brute force protection detected'
    };
  }
}

/**
 * Token Manipulation Testing Utilities
 * Tests for token manipulation, forgery, and validation issues
 */
export class TokenManipulationTester {
  constructor(baseUrl = SECURITY_TEST_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  /**
   * Test various token manipulation techniques
   */
  async testTokenManipulation(endpoint = '/api/app2app/baskets/TEST_001') {
    const validKey = SECURITY_TEST_CONFIG.validAuthKey;
    const manipulationTests = [
      {
        name: 'Partial Key - First Half',
        key: validKey.substring(0, Math.floor(validKey.length / 2)),
        description: 'Testing with first half of valid key'
      },
      {
        name: 'Partial Key - Second Half',
        key: validKey.substring(Math.floor(validKey.length / 2)),
        description: 'Testing with second half of valid key'
      },
      {
        name: 'Reversed Key',
        key: validKey.split('').reverse().join(''),
        description: 'Testing with reversed valid key'
      },
      {
        name: 'Uppercase Key',
        key: validKey.toUpperCase(),
        description: 'Testing with uppercase version of valid key'
      },
      {
        name: 'Lowercase Key',
        key: validKey.toLowerCase(),
        description: 'Testing with lowercase version of valid key'
      },
      {
        name: 'Key + Extra Character',
        key: validKey + 'a',
        description: 'Testing with valid key plus extra character'
      },
      {
        name: 'Key - Missing Character',
        key: validKey.substring(0, validKey.length - 1),
        description: 'Testing with valid key minus last character'
      },
      {
        name: 'Key with Spaces',
        key: validKey.split('').join(' '),
        description: 'Testing with spaces between characters'
      },
      {
        name: 'Double Key',
        key: validKey + validKey,
        description: 'Testing with double valid key'
      },
      {
        name: 'Hex Encoded Key',
        key: Buffer.from(validKey).toString('hex'),
        description: 'Testing with hex encoded valid key'
      },
      {
        name: 'URL Encoded Key',
        key: encodeURIComponent(validKey),
        description: 'Testing with URL encoded valid key'
      },
      {
        name: 'Key with Null Bytes',
        key: validKey + '\x00',
        description: 'Testing with null byte injection'
      }
    ];

    console.log(`🔧 Testing token manipulation on ${endpoint}...`);

    for (const test of manipulationTests) {
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: { 'X-ODEAL-REQUEST-KEY': test.key },
          timeout: SECURITY_TEST_CONFIG.requestTimeout,
          validateStatus: () => true
        });

        const isAccepted = response.status !== 401;

        const result = {
          testName: test.name,
          description: test.description,
          key: test.key,
          keyLength: test.key.length,
          status: response.status,
          isAccepted,
          responseData: response.data,
          recommendation: isAccepted
            ? '⚠️ POTENTIAL VULNERABILITY: Manipulated token was accepted'
            : '✅ Properly rejected manipulated token'
        };

        this.results.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (Status: ${response.status})`);

      } catch (error) {
        const result = {
          testName: test.name,
          description: test.description,
          key: test.key,
          keyLength: test.key.length,
          status: 'NETWORK_ERROR',
          error: error.message,
          isAccepted: false,
          recommendation: '✅ Request blocked (network error)'
        };

        this.results.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (${error.message})`);
      }
    }

    return this.results;
  }

  /**
   * Test token forgery techniques
   */
  async testTokenForgery(endpoint = '/api/app2app/baskets/TEST_001') {
    const forgeryTests = [
      {
        name: 'Empty Token',
        key: '',
        description: 'Testing with empty token'
      },
      {
        name: 'Null Token',
        key: 'null',
        description: 'Testing with null string token'
      },
      {
        name: 'Boolean True',
        key: 'true',
        description: 'Testing with boolean true as token'
      },
      {
        name: 'Boolean False',
        key: 'false',
        description: 'Testing with boolean false as token'
      },
      {
        name: 'Number Token',
        key: '123456789',
        description: 'Testing with numeric token'
      },
      {
        name: 'Object Token',
        key: '{"token":"fake","admin":true}',
        description: 'Testing with JSON object token'
      },
      {
        name: 'Array Token',
        key: '["fake","token"]',
        description: 'Testing with array token'
      },
      {
        name: 'XML Token',
        key: '<token>fake</token>',
        description: 'Testing with XML token'
      },
      {
        name: 'Base64 Empty',
        key: Buffer.from('').toString('base64'),
        description: 'Testing with base64 encoded empty string'
      },
      {
        name: 'Binary Token',
        key: '\x00\x01\x02\x03\x04\x05',
        description: 'Testing with binary data token'
      }
    ];

    console.log(`🎭 Testing token forgery on ${endpoint}...`);

    for (const test of forgeryTests) {
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: { 'X-ODEAL-REQUEST-KEY': test.key },
          timeout: SECURITY_TEST_CONFIG.requestTimeout,
          validateStatus: () => true
        });

        const isAccepted = response.status !== 401;

        const result = {
          testName: test.name,
          description: test.description,
          key: test.key,
          status: response.status,
          isAccepted,
          responseData: response.data,
          recommendation: isAccepted
            ? '⚠️ POTENTIAL VULNERABILITY: Forged token was accepted'
            : '✅ Properly rejected forged token'
        };

        this.results.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (Status: ${response.status})`);

      } catch (error) {
        const result = {
          testName: test.name,
          description: test.description,
          key: test.key,
          status: 'NETWORK_ERROR',
          error: error.message,
          isAccepted: false,
          recommendation: '✅ Request blocked (network error)'
        };

        this.results.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (${error.message})`);
      }
    }

    return this.results;
  }

  /**
   * Test token expiration and validation
   */
  async testTokenExpiration(endpoint = '/api/app2app/baskets/TEST_001') {
    console.log(`⏰ Testing token expiration on ${endpoint}...`);

    const expirationTests = [
      {
        name: 'Very Old Timestamp',
        key: `test_${new Date(0).toISOString()}`,
        description: 'Testing with very old timestamp in token'
      },
      {
        name: 'Future Timestamp',
        key: `test_${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}`,
        description: 'Testing with future timestamp in token'
      },
      {
        name: 'Expired Token Format',
        key: `${SECURITY_TEST_CONFIG.validAuthKey}_expired_${Date.now() - 3600000}`,
        description: 'Testing with expired token format'
      },
      {
        name: 'Just Expired Token',
        key: `${SECURITY_TEST_CONFIG.validAuthKey}_exp_${Date.now() - 1000}`,
        description: 'Testing with recently expired token'
      },
      {
        name: 'Not Yet Valid Token',
        key: `${SECURITY_TEST_CONFIG.validAuthKey}_nbf_${Date.now() + 1000}`,
        description: 'Testing with not yet valid token'
      }
    ];

    for (const test of expirationTests) {
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: { 'X-ODEAL-REQUEST-KEY': test.key },
          timeout: SECURITY_TEST_CONFIG.requestTimeout,
          validateStatus: () => true
        });

        const isAccepted = response.status !== 401;

        const result = {
          testName: test.name,
          description: test.description,
          key: test.key,
          status: response.status,
          isAccepted,
          responseData: response.data,
          recommendation: isAccepted
            ? '⚠️ POTENTIAL VULNERABILITY: Expired/invalid token was accepted'
            : '✅ Properly rejected expired/invalid token'
        };

        this.results.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (Status: ${response.status})`);

      } catch (error) {
        const result = {
          testName: test.name,
          description: test.description,
          key: test.key,
          status: 'NETWORK_ERROR',
          error: error.message,
          isAccepted: false,
          recommendation: '✅ Request blocked (network error)'
        };

        this.results.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (${error.message})`);
      }
    }

    return this.results;
  }

  getResults() {
    return this.results;
  }

  generateReport() {
    const acceptedTokens = this.results.filter(r => r.isAccepted);
    const totalTests = this.results.length;

    return {
      totalTests,
      acceptedTokens: acceptedTokens.length,
      acceptanceRate: (acceptedTokens.length / totalTests) * 100,
      details: this.results,
      summary: acceptedTokens.length > 0
        ? `⚠️ ${acceptedTokens.length} manipulated/forged tokens were accepted`
        : '✅ All manipulated/forged tokens properly rejected'
    };
  }
}

/**
 * Security Header Testing Utilities
 * Tests for security headers and CSRF protection
 */
export class SecurityHeaderTester {
  constructor(baseUrl = SECURITY_TEST_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  /**
   * Test security headers presence
   */
  async testSecurityHeaders(endpoint = '/api/app2app/baskets/TEST_001') {
    console.log(`🔒 Testing security headers on ${endpoint}...`);

    const expectedHeaders = [
      { name: 'X-Content-Type-Options', expected: 'nosniff', critical: true },
      { name: 'X-Frame-Options', expected: 'DENY', critical: true },
      { name: 'X-XSS-Protection', expected: '1; mode=block', critical: true },
      { name: 'Strict-Transport-Security', expected: 'max-age=31536000; includeSubDomains', critical: false },
      { name: 'Content-Security-Policy', expected: null, critical: false }, // Any value is acceptable
      { name: 'Referrer-Policy', expected: 'strict-origin-when-cross-origin', critical: false },
      { name: 'Permissions-Policy', expected: null, critical: false } // Any value is acceptable
    ];

    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: { 'X-ODEAL-REQUEST-KEY': SECURITY_TEST_CONFIG.validAuthKey },
        timeout: SECURITY_TEST_CONFIG.requestTimeout,
        validateStatus: () => true
      });

      const headers = response.headers;
      const testResults = [];

      for (const expectedHeader of expectedHeaders) {
        const headerValue = headers[expectedHeader.name.toLowerCase()];
        const isPresent = !!headerValue;
        const isCorrect = expectedHeader.expected === null ||
                         headerValue === expectedHeader.expected ||
                         (expectedHeader.name === 'Content-Security-Policy' && isPresent) ||
                         (expectedHeader.name === 'Permissions-Policy' && isPresent);

        const result = {
          headerName: expectedHeader.name,
          expected: expectedHeader.expected,
          actual: headerValue,
          isPresent,
          isCorrect,
          isCritical: expectedHeader.critical,
          recommendation: isCorrect
            ? '✅ Header properly configured'
            : expectedHeader.critical && !isPresent
            ? '⚠️ CRITICAL: Missing security header'
            : '⚠️ Security header not properly configured'
        };

        testResults.push(result);
        console.log(`   ${expectedHeader.name}: ${result.recommendation}`);
        if (headerValue) {
          console.log(`      Expected: ${expectedHeader.expected || 'any value'}`);
          console.log(`      Actual: ${headerValue}`);
        }
      }

      const overallResult = {
        testType: 'Security Headers',
        endpoint,
        totalHeaders: expectedHeaders.length,
        presentHeaders: testResults.filter(r => r.isPresent).length,
        correctHeaders: testResults.filter(r => r.isCorrect).length,
        criticalMissing: testResults.filter(r => r.isCritical && !r.isPresent).length,
        results: testResults,
        recommendation: testResults.filter(r => r.isCritical && !r.isPresent).length > 0
          ? '⚠️ CRITICAL: Missing critical security headers'
          : '✅ Security headers properly configured'
      };

      this.results.push(overallResult);
      console.log(`📊 Security Headers Summary:`);
      console.log(`   Total Headers: ${expectedHeaders.length}`);
      console.log(`   Present: ${testResults.filter(r => r.isPresent).length}`);
      console.log(`   Correct: ${testResults.filter(r => r.isCorrect).length}`);
      console.log(`   Critical Missing: ${testResults.filter(r => r.isCritical && !r.isPresent).length}`);
      console.log(`   ${overallResult.recommendation}`);

      return overallResult;

    } catch (error) {
      const result = {
        testType: 'Security Headers',
        endpoint,
        status: 'NETWORK_ERROR',
        error: error.message,
        recommendation: '❌ Unable to test security headers due to network error'
      };

      this.results.push(result);
      console.log(`❌ Failed to test security headers: ${error.message}`);
      return result;
    }
  }

  /**
   * Test CSRF protection
   */
  async testCSRFProtection(endpoint = '/api/app2app/baskets/TEST_001') {
    console.log(`🛡️ Testing CSRF protection on ${endpoint}...`);

    const csrfTests = [
      {
        name: 'POST without CSRF Token',
        method: 'POST',
        headers: { 'X-ODEAL-REQUEST-KEY': SECURITY_TEST_CONFIG.validAuthKey },
        data: { test: 'data' },
        description: 'Testing POST request without CSRF token'
      },
      {
        name: 'PUT without CSRF Token',
        method: 'PUT',
        headers: { 'X-ODEAL-REQUEST-KEY': SECURITY_TEST_CONFIG.validAuthKey },
        data: { test: 'data' },
        description: 'Testing PUT request without CSRF token'
      },
      {
        name: 'DELETE without CSRF Token',
        method: 'DELETE',
        headers: { 'X-ODEAL-REQUEST-KEY': SECURITY_TEST_CONFIG.validAuthKey },
        description: 'Testing DELETE request without CSRF token'
      },
      {
        name: 'GET with Body',
        method: 'GET',
        headers: { 'X-ODEAL-REQUEST-KEY': SECURITY_TEST_CONFIG.validAuthKey, 'Content-Type': 'application/json' },
        data: { test: 'data' },
        description: 'Testing GET request with body (potential CSRF)'
      }
    ];

    const testResults = [];

    for (const test of csrfTests) {
      try {
        const response = await axios({
          method: test.method,
          url: `${this.baseUrl}${endpoint}`,
          headers: test.headers,
          data: test.data,
          timeout: SECURITY_TEST_CONFIG.requestTimeout,
          validateStatus: () => true
        });

        const isBlocked = response.status === 403 || response.status === 400;

        const result = {
          testName: test.name,
          description: test.description,
          method: test.method,
          status: response.status,
          isBlocked,
          responseData: response.data,
          recommendation: isBlocked
            ? '✅ Request properly blocked (CSRF protection may be active)'
            : '⚠️ Request accepted (CSRF protection may be missing)'
        };

        testResults.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (Status: ${response.status})`);

      } catch (error) {
        const result = {
          testName: test.name,
          description: test.description,
          method: test.method,
          status: error.response?.status || 'NETWORK_ERROR',
          error: error.message,
          isBlocked: error.response?.status === 403 || error.response?.status === 400,
          recommendation: '✅ Request blocked (network error or protection active)'
        };

        testResults.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (${error.message})`);
      }
    }

    const overallResult = {
      testType: 'CSRF Protection',
      endpoint,
      totalTests: csrfTests.length,
      blockedRequests: testResults.filter(r => r.isBlocked).length,
      acceptedRequests: testResults.filter(r => !r.isBlocked).length,
      results: testResults,
      hasProtection: testResults.filter(r => r.isBlocked).length > 0,
      recommendation: testResults.filter(r => r.isBlocked).length > 0
        ? '✅ CSRF protection detected'
        : '⚠️ CSRF protection may be missing'
    };

    this.results.push(overallResult);
    console.log(`📊 CSRF Protection Summary:`);
    console.log(`   Total Tests: ${csrfTests.length}`);
    console.log(`   Blocked: ${testResults.filter(r => r.isBlocked).length}`);
    console.log(`   Accepted: ${testResults.filter(r => !r.isBlocked).length}`);
    console.log(`   ${overallResult.recommendation}`);

    return overallResult;
  }

  /**
   * Test information disclosure
   */
  async testInformationDisclosure(endpoint = '/api/app2app/baskets/TEST_001') {
    console.log(`🔍 Testing information disclosure on ${endpoint}...`);

    const disclosureTests = [
      {
        name: 'Invalid Auth - Error Details',
        headers: { 'X-ODEAL-REQUEST-KEY': 'invalid' },
        description: 'Testing if invalid auth reveals too much information'
      },
      {
        name: 'Missing Auth - Error Details',
        headers: {},
        description: 'Testing if missing auth reveals too much information'
      },
      {
        name: 'Malformed Request - Error Details',
        headers: { 'X-ODEAL-REQUEST-KEY': SECURITY_TEST_CONFIG.validAuthKey },
        url: `${endpoint}/invalid/path`,
        description: 'Testing if malformed requests reveal too much information'
      }
    ];

    const testResults = [];

    for (const test of disclosureTests) {
      try {
        const response = await axios.get(`${this.baseUrl}${test.url || endpoint}`, {
          headers: test.headers,
          timeout: SECURITY_TEST_CONFIG.requestTimeout,
          validateStatus: () => true
        });

        const responseBody = JSON.stringify(response.data).toLowerCase();
        const revealsTooMuch = responseBody.includes('stack') ||
                             responseBody.includes('trace') ||
                             responseBody.includes('internal') ||
                             responseBody.includes('database') ||
                             responseBody.includes('password') ||
                             responseBody.includes('secret');

        const result = {
          testName: test.name,
          description: test.description,
          status: response.status,
          responseData: response.data,
          revealsTooMuch,
          recommendation: revealsTooMuch
            ? '⚠️ Response may reveal sensitive information'
            : '✅ Response properly sanitized'
        };

        testResults.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (Status: ${response.status})`);

      } catch (error) {
        const result = {
          testName: test.name,
          description: test.description,
          status: error.response?.status || 'NETWORK_ERROR',
          error: error.message,
          revealsTooMuch: false,
          recommendation: '✅ Error properly handled (no information disclosure)'
        };

        testResults.push(result);
        console.log(`   ${test.name}: ${result.recommendation} (${error.message})`);
      }
    }

    const overallResult = {
      testType: 'Information Disclosure',
      endpoint,
      totalTests: disclosureTests.length,
      safeResponses: testResults.filter(r => !r.revealsTooMuch).length,
      revealingResponses: testResults.filter(r => r.revealsTooMuch).length,
      results: testResults,
      recommendation: testResults.filter(r => r.revealsTooMuch).length > 0
        ? '⚠️ Potential information disclosure detected'
        : '✅ No information disclosure detected'
    };

    this.results.push(overallResult);
    console.log(`📊 Information Disclosure Summary:`);
    console.log(`   Total Tests: ${disclosureTests.length}`);
    console.log(`   Safe Responses: ${testResults.filter(r => !r.revealsTooMuch).length}`);
    console.log(`   Revealing Responses: ${testResults.filter(r => r.revealsTooMuch).length}`);
    console.log(`   ${overallResult.recommendation}`);

    return overallResult;
  }

  getResults() {
    return this.results;
  }

  generateReport() {
    const securityHeaderTests = this.results.filter(r => r.testType === 'Security Headers');
    const csrfTests = this.results.filter(r => r.testType === 'CSRF Protection');
    const disclosureTests = this.results.filter(r => r.testType === 'Information Disclosure');

    return {
      totalTests: this.results.length,
      securityHeaderTests: securityHeaderTests.length,
      csrfTests: csrfTests.length,
      disclosureTests: disclosureTests.length,
      criticalIssues: securityHeaderTests.filter(r => r.criticalMissing > 0).length,
      hasCSRFProtection: csrfTests.filter(r => r.hasProtection).length > 0,
      hasInformationDisclosure: disclosureTests.filter(r => r.revealingResponses > 0).length > 0,
      details: this.results,
      summary: securityHeaderTests.filter(r => r.criticalMissing > 0).length > 0
        ? '⚠️ CRITICAL: Missing critical security headers'
        : '✅ Security headers and protections properly configured'
    };
  }
}

/**
 * Comprehensive Security Test Suite
 * Runs all security tests and generates a comprehensive report
 */
export class SecurityTestSuite {
  constructor(baseUrl = SECURITY_TEST_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
    this.timingTester = new TimingAttackTester(baseUrl);
    this.bypassTester = new AuthBypassTester(baseUrl);
    this.bruteForceTester = new BruteForceTester(baseUrl);
    this.tokenTester = new TokenManipulationTester(baseUrl);
    this.headerTester = new SecurityHeaderTester(baseUrl);
  }

  /**
   * Run all security tests
   */
  async runAllTests(endpoint = '/api/app2app/baskets/TEST_001') {
    console.log('🚀 Starting comprehensive security testing suite...');
    console.log(`🎯 Target endpoint: ${endpoint}`);
    console.log(`🌐 Base URL: ${this.baseUrl}`);
    console.log('');

    const results = {
      timingAttacks: [],
      authBypass: [],
      bruteForce: [],
      tokenManipulation: [],
      securityHeaders: [],
      summary: {},
      timestamp: new Date().toISOString(),
      endpoint,
      baseUrl: this.baseUrl
    };

    // Run timing attack tests
    console.log('🔍 Running timing attack tests...');
    const timingResult1 = await this.timingTester.testAuthenticationTiming(endpoint);
    const timingResult2 = await this.timingTester.testKeyLengthTiming(endpoint);
    results.timingAttacks = [timingResult1, timingResult2];

    // Run authentication bypass tests
    console.log('\n🔓 Running authentication bypass tests...');
    const bypassResult1 = await this.bypassTester.testAuthBypassTechniques(endpoint);
    const bypassResult2 = await this.bypassTester.testHeaderInjection(endpoint);
    results.authBypass = [bypassResult1, bypassResult2];

    // Run brute force tests
    console.log('\n🔨 Running brute force tests...');
    const bruteResult1 = await this.bruteForceTester.testBruteForceProtection(endpoint);
    const bruteResult2 = await this.bruteForceTester.testRateLimiting(endpoint);
    const bruteResult3 = await this.bruteForceTester.testCredentialSpraying(endpoint);
    results.bruteForce = [bruteResult1, bruteResult2, bruteResult3];

    // Run token manipulation tests
    console.log('\n🔧 Running token manipulation tests...');
    const tokenResult1 = await this.tokenTester.testTokenManipulation(endpoint);
    const tokenResult2 = await this.tokenTester.testTokenForgery(endpoint);
    const tokenResult3 = await this.tokenTester.testTokenExpiration(endpoint);
    results.tokenManipulation = [tokenResult1, tokenResult2, tokenResult3];

    // Run security header tests
    console.log('\n🔒 Running security header tests...');
    const headerResult1 = await this.headerTester.testSecurityHeaders(endpoint);
    const headerResult2 = await this.headerTester.testCSRFProtection(endpoint);
    const headerResult3 = await this.headerTester.testInformationDisclosure(endpoint);
    results.securityHeaders = [headerResult1, headerResult2, headerResult3];

    // Generate summary
    results.summary = this.generateSummary(results);

    console.log('\n📊 Security Testing Summary:');
    console.log(`   Timing Vulnerabilities: ${results.summary.timingVulnerabilities}`);
    console.log(`   Auth Bypasses: ${results.summary.authBypasses}`);
    console.log(`   Brute Force Protection: ${results.summary.bruteForceProtection}`);
    console.log(`   Token Issues: ${results.summary.tokenIssues}`);
    console.log(`   Security Header Issues: ${results.summary.securityHeaderIssues}`);
    console.log(`   Overall Security Score: ${results.summary.securityScore}/100`);
    console.log(`   ${results.summary.overallAssessment}`);

    return results;
  }

  /**
   * Generate summary from test results
   */
  generateSummary(results) {
    const timingVulnerabilities = results.timingAttacks.filter(r => r.isVulnerable).length;
    const authBypasses = results.authBypass.flatMap(r => r).filter(t => t.isBypass).length;
    const bruteForceProtection = results.bruteForce.filter(r => r.hasRateLimiting || r.hasBlocking).length;
    const tokenIssues = results.tokenManipulation.flatMap(r => r).filter(t => t.isAccepted).length;
    const securityHeaderIssues = results.securityHeaders.filter(r => r.criticalMissing > 0 || r.revealingResponses > 0).length;

    const totalTests = results.timingAttacks.length +
                     results.authBypass.flatMap(r => r).length +
                     results.bruteForce.length +
                     results.tokenManipulation.flatMap(r => r).length +
                     results.securityHeaders.length;

    const issuesFound = timingVulnerabilities + authBypasses + tokenIssues + securityHeaderIssues;
    const securityScore = Math.max(0, 100 - (issuesFound * 10) - (bruteForceProtection > 0 ? 0 : 20));

    let overallAssessment = '';
    if (securityScore >= 90) {
      overallAssessment = '✅ EXCELLENT: Strong security posture';
    } else if (securityScore >= 70) {
      overallAssessment = '✅ GOOD: Generally secure with minor issues';
    } else if (securityScore >= 50) {
      overallAssessment = '⚠️ MODERATE: Some security concerns identified';
    } else {
      overallAssessment = '❌ POOR: Significant security vulnerabilities detected';
    }

    return {
      timingVulnerabilities,
      authBypasses,
      bruteForceProtection,
      tokenIssues,
      securityHeaderIssues,
      totalTests,
      issuesFound,
      securityScore,
      overallAssessment
    };
  }

  /**
   * Generate detailed security report
   */
  generateReport(results) {
    return {
      executiveSummary: {
        securityScore: results.summary.securityScore,
        overallAssessment: results.summary.overallAssessment,
        criticalIssues: results.summary.timingVulnerabilities + results.summary.authBypasses,
        recommendations: this.generateRecommendations(results)
      },
      detailedFindings: {
        timingAttacks: this.timingTester.generateReport(),
        authBypass: this.bypassTester.generateReport(),
        bruteForce: this.bruteForceTester.generateReport(),
        tokenManipulation: this.tokenTester.generateReport(),
        securityHeaders: this.headerTester.generateReport()
      },
      testResults: results,
      metadata: {
        timestamp: results.timestamp,
        endpoint: results.endpoint,
        baseUrl: results.baseUrl,
        testConfiguration: SECURITY_TEST_CONFIG
      }
    };
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];

    if (results.summary.timingVulnerabilities > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Timing Attacks',
        recommendation: 'Implement constant-time comparison for authentication tokens to prevent timing attacks',
        details: 'Use crypto.timingSafeEqual() or similar constant-time comparison functions'
      });
    }

    if (results.summary.authBypasses > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Authentication Bypass',
        recommendation: 'Fix authentication bypass vulnerabilities in the verification logic',
        details: 'Ensure all authentication paths are properly validated and cannot be bypassed'
      });
    }

    if (results.summary.bruteForceProtection === 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Brute Force Protection',
        recommendation: 'Implement rate limiting and account lockout mechanisms',
        details: 'Add rate limiting to authentication endpoints and implement progressive delays'
      });
    }

    if (results.summary.tokenIssues > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Token Validation',
        recommendation: 'Strengthen token validation and input sanitization',
        details: 'Implement proper token format validation and reject malformed tokens'
      });
    }

    if (results.summary.securityHeaderIssues > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Security Headers',
        recommendation: 'Add missing security headers to prevent common web vulnerabilities',
        details: 'Configure X-Content-Type-Options, X-Frame-Options, and other security headers'
      });
    }

    return recommendations;
  }
}

// Export for use in test files
export {
  TimingAttackTester,
  AuthBypassTester,
  BruteForceTester,
  TokenManipulationTester,
  SecurityHeaderTester,
  SecurityTestSuite,
  SECURITY_TEST_CONFIG
};