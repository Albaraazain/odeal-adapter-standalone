import { jest } from '@jest/globals';
import axios from 'axios';
import crypto from 'crypto';

/**
 * Authentication Test Client for Ödeal Vercel Functions
 * Provides comprehensive HTTP client with authentication header management
 * and security testing capabilities
 */
export class AuthTestClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'http://localhost:3000';
    this.defaultKey = config.defaultKey || 'test-key-123';
    this.timeout = config.timeout || 5000;
    this.requestSigning = config.requestSigning || false;
    this.securityHeaders = config.securityHeaders || {};

    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });

    // Request/response interceptors for security testing
    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors for request/response handling
   */
  setupInterceptors() {
    // Request interceptor for authentication headers and signing
    this.client.interceptors.request.use((config) => {
      // Add timing measurement for security testing
      config.metadata = { startTime: Date.now() };

      // Add default security headers
      config.headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Ödeal-Test-Client/1.0',
        ...this.securityHeaders,
        ...config.headers
      };

      // Add request signing if enabled
      if (this.requestSigning && config.headers['X-ODEAL-REQUEST-KEY']) {
        config.headers['X-ODEAL-SIGNATURE'] = this.signRequest(config);
      }

      return config;
    });

    // Response interceptor for timing analysis
    this.client.interceptors.response.use((response) => {
      const endTime = Date.now();
      response.config.metadata.endTime = endTime;
      response.config.metadata.duration = endTime - response.config.metadata.startTime;
      return response;
    });
  }

  /**
   * Create a request with authentication headers
   */
  async createAuthenticatedRequest(method, url, data = null, authConfig = {}) {
    const headers = {};

    // Add authentication header based on config
    if (authConfig.key !== undefined) {
      if (authConfig.key === null) {
        // No authentication header
      } else if (authConfig.key === 'invalid') {
        headers['X-ODEAL-REQUEST-KEY'] = 'invalid-key';
      } else {
        headers['X-ODEAL-REQUEST-KEY'] = authConfig.key;
      }
    } else {
      headers['X-ODEAL-REQUEST-KEY'] = this.defaultKey;
    }

    // Add custom headers for testing
    if (authConfig.customHeaders) {
      Object.assign(headers, authConfig.customHeaders);
    }

    const requestConfig = {
      method,
      url,
      headers
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      requestConfig.data = data;
    }

    return this.client.request(requestConfig);
  }

  /**
   * Cryptographically sign requests for integrity verification
   */
  signRequest(config) {
    const timestamp = Date.now().toString();
    const method = config.method.toUpperCase();
    const url = config.url;
    const data = config.data ? JSON.stringify(config.data) : '';

    const message = `${timestamp}:${method}:${url}:${data}`;
    const secret = config.headers['X-ODEAL-REQUEST-KEY'];

    return crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
  }

  /**
   * Test authentication scenarios
   */
  async testAuthentication(endpoint, scenarios = {}) {
    const results = {};

    // Test valid authentication
    if (scenarios.valid !== false) {
      results.valid = await this.createAuthenticatedRequest('GET', endpoint, null, {
        key: this.defaultKey
      });
    }

    // Test missing authentication
    if (scenarios.missing !== false) {
      results.missing = await this.createAuthenticatedRequest('GET', endpoint, null, {
        key: null
      });
    }

    // Test invalid authentication
    if (scenarios.invalid !== false) {
      results.invalid = await this.createAuthenticatedRequest('GET', endpoint, null, {
        key: 'invalid-key'
      });
    }

    // Test malformed authentication
    if (scenarios.malformed !== false) {
      results.malformed = await this.createAuthenticatedRequest('GET', endpoint, null, {
        key: '',
        customHeaders: {
          'X-ODEAL-REQUEST-KEY': ''
        }
      });
    }

    return results;
  }

  /**
   * Test timing attack vulnerability
   */
  async testTimingAttack(endpoint, iterations = 100) {
    const validTimes = [];
    const invalidTimes = [];

    // Test valid authentication response times
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      try {
        await this.createAuthenticatedRequest('GET', endpoint, null, {
          key: this.defaultKey
        });
      } catch (error) {
        // Ignore errors, we're measuring timing
      }
      const end = process.hrtime.bigint();
      validTimes.push(Number(end - start) / 1000000); // Convert to milliseconds
    }

    // Test invalid authentication response times
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      try {
        await this.createAuthenticatedRequest('GET', endpoint, null, {
          key: 'invalid-key'
        });
      } catch (error) {
        // Ignore errors, we're measuring timing
      }
      const end = process.hrtime.bigint();
      invalidTimes.push(Number(end - start) / 1000000); // Convert to milliseconds
    }

    return {
      validResponse: {
        mean: validTimes.reduce((a, b) => a + b, 0) / validTimes.length,
        median: this.median(validTimes),
        std: this.standardDeviation(validTimes),
        min: Math.min(...validTimes),
        max: Math.max(...validTimes)
      },
      invalidResponse: {
        mean: invalidTimes.reduce((a, b) => a + b, 0) / invalidTimes.length,
        median: this.median(invalidTimes),
        std: this.standardDeviation(invalidTimes),
        min: Math.min(...invalidTimes),
        max: Math.max(...invalidTimes)
      },
      timingDifference: Math.abs(
        (validTimes.reduce((a, b) => a + b, 0) / validTimes.length) -
        (invalidTimes.reduce((a, b) => a + b, 0) / invalidTimes.length)
      )
    };
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting(endpoint, requestCount = 50, concurrent = true) {
    const requests = [];
    const startTime = Date.now();

    if (concurrent) {
      // Concurrent requests
      const promises = Array.from({ length: requestCount }, () =>
        this.createAuthenticatedRequest('GET', endpoint, null, {
          key: this.defaultKey
        }).catch(error => error.response || error)
      );
      requests.push(...await Promise.all(promises));
    } else {
      // Sequential requests
      for (let i = 0; i < requestCount; i++) {
        try {
          const response = await this.createAuthenticatedRequest('GET', endpoint, null, {
            key: this.defaultKey
          });
          requests.push(response);
        } catch (error) {
          requests.push(error.response || error);
        }
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    return {
      totalRequests: requestCount,
      successfulRequests: requests.filter(r => r.status === 200).length,
      rateLimitedRequests: requests.filter(r => r.status === 429).length,
      authFailedRequests: requests.filter(r => r.status === 401).length,
      otherErrors: requests.filter(r => ![200, 429, 401].includes(r.status)).length,
      totalDuration: duration,
      requestsPerSecond: requestCount / (duration / 1000),
      responseTimes: requests.map(r => r.config?.metadata?.duration || 0),
      averageResponseTime: requests.reduce((sum, r) => sum + (r.config?.metadata?.duration || 0), 0) / requests.length
    };
  }

  /**
   * Test header injection attacks
   */
  async testHeaderInjection(endpoint) {
    const maliciousHeaders = [
      { 'X-ODEAL-REQUEST-KEY': 'test-key-123\r\nX-Forwarded-For: 127.0.0.1' },
      { 'X-ODEAL-REQUEST-KEY': 'test-key-123\r\nCookie: session=malicious' },
      { 'X-ODEAL-REQUEST-KEY': 'test-key-123\r\nAuthorization: Bearer fake' },
      { 'X-ODEAL-REQUEST-KEY': 'test-key-123\nX-Custom-Header: injected' },
      { 'X-ODEAL-REQUEST-KEY': 'test-key-123\tX-Tab-Header: injected' }
    ];

    const results = {};

    for (let i = 0; i < maliciousHeaders.length; i++) {
      const headers = maliciousHeaders[i];
      try {
        const response = await this.createAuthenticatedRequest('GET', endpoint, null, {
          customHeaders: headers
        });
        results[`injection_${i}`] = {
          headers,
          status: response.status,
          successful: response.status === 200,
          data: response.data
        };
      } catch (error) {
        results[`injection_${i}`] = {
          headers,
          status: error.response?.status || 'error',
          successful: false,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test brute force attack
   */
  async testBruteForce(endpoint, keyLength = 32, attempts = 1000) {
    const startTime = Date.now();
    const attemptsPerSecond = [];
    let successfulAttempts = 0;

    for (let i = 0; i < attempts; i++) {
      const attemptStart = Date.now();

      // Generate random key for brute force attempt
      const randomKey = this.generateRandomKey(keyLength);

      try {
        const response = await this.createAuthenticatedRequest('GET', endpoint, null, {
          key: randomKey
        });

        if (response.status === 200) {
          successfulAttempts++;
        }
      } catch (error) {
        // Brute force attempts are expected to fail
      }

      const attemptEnd = Date.now();
      attemptsPerSecond.push(1000 / (attemptEnd - attemptStart));
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    return {
      totalAttempts: attempts,
      successfulAttempts,
      successRate: successfulAttempts / attempts,
      totalDuration,
      averageAttemptsPerSecond: attempts / (totalDuration / 1000),
      maxAttemptsPerSecond: Math.max(...attemptsPerSecond),
      minAttemptsPerSecond: Math.min(...attemptsPerSecond),
      averageResponseTime: attemptsPerSecond.reduce((a, b) => a + b, 0) / attemptsPerSecond.length
    };
  }

  /**
   * Test token expiration and refresh scenarios
   */
  async testTokenExpiration(endpoint, expirationScenarios = {}) {
    const scenarios = {
      valid: this.defaultKey,
      expired: 'expired-key-123',
      soonToExpire: 'soon-expire-key-123',
      malformed: '',
      ...expirationScenarios
    };

    const results = {};

    for (const [scenarioName, token] of Object.entries(scenarios)) {
      try {
        const response = await this.createAuthenticatedRequest('GET', endpoint, null, {
          key: token
        });

        results[scenarioName] = {
          token,
          status: response.status,
          successful: response.status === 200,
          data: response.data
        };
      } catch (error) {
        results[scenarioName] = {
          token,
          status: error.response?.status || 'error',
          successful: false,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Generate random key for testing
   */
  generateRandomKey(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Statistical helper functions
   */
  median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  standardDeviation(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Generate comprehensive security test report
   */
  async generateSecurityReport(endpoint) {
    const report = {
      endpoint,
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Run all security tests
    report.tests.authentication = await this.testAuthentication(endpoint);
    report.tests.timingAttack = await this.testTimingAttack(endpoint);
    report.tests.rateLimiting = await this.testRateLimiting(endpoint);
    report.tests.headerInjection = await this.testHeaderInjection(endpoint);
    report.tests.bruteForce = await this.testBruteForce(endpoint);
    report.tests.tokenExpiration = await this.testTokenExpiration(endpoint);

    // Analyze results
    report.analysis = this.analyzeSecurityResults(report.tests);

    return report;
  }

  /**
   * Analyze security test results
   */
  analyzeSecurityResults(tests) {
    const analysis = {
      vulnerabilities: [],
      strengths: [],
      recommendations: []
    };

    // Analyze authentication
    if (tests.authentication && tests.authentication.valid?.status === 200) {
      analysis.strengths.push('Valid authentication working correctly');
    }
    if (tests.authentication && tests.authentication.missing?.status === 401) {
      analysis.strengths.push('Missing authentication properly rejected');
    }
    if (tests.authentication && tests.authentication.invalid?.status === 401) {
      analysis.strengths.push('Invalid authentication properly rejected');
    }

    // Analyze timing attack
    if (tests.timingAttack && tests.timingAttack.timingDifference > 5) {
      analysis.vulnerabilities.push({
        type: 'Timing Attack',
        severity: 'medium',
        description: 'Response time difference between valid and invalid authentication may leak information'
      });
    } else {
      analysis.strengths.push('Timing attack protection appears effective');
    }

    // Analyze rate limiting
    if (tests.rateLimiting && tests.rateLimiting.rateLimitedRequests > 0) {
      analysis.strengths.push('Rate limiting is working');
    } else {
      analysis.recommendations.push('Consider implementing rate limiting');
    }

    // Analyze header injection
    const injectionResults = Object.values(tests.headerInjection || {});
    if (injectionResults.some(r => r.successful)) {
      analysis.vulnerabilities.push({
        type: 'Header Injection',
        severity: 'high',
        description: 'Header injection attacks may be possible'
      });
    } else {
      analysis.strengths.push('Header injection attacks appear to be blocked');
    }

    // Analyze brute force
    if (tests.bruteForce && tests.bruteForce.successRate > 0.001) {
      analysis.vulnerabilities.push({
        type: 'Brute Force',
        severity: 'high',
        description: 'Brute force attacks may be successful'
      });
    } else {
      analysis.strengths.push('Brute force attacks appear to be blocked');
    }

    return analysis;
  }
}

/**
 * Factory function to create authentication test clients
 */
export function createAuthTestClient(config = {}) {
  return new AuthTestClient(config);
}

/**
 * Pre-configured test clients for different scenarios
 */
export const AuthTestClients = {
  // Local development client
  local: () => createAuthTestClient({
    baseURL: 'http://localhost:3000',
    defaultKey: 'test-key-123'
  }),

  // Vercel deployment client
  vercel: (deploymentUrl) => createAuthTestClient({
    baseURL: deploymentUrl,
    defaultKey: process.env.ODEAL_REQUEST_KEY || 'test-key-123'
  }),

  // Supabase edge functions client
  supabase: (supabaseUrl) => createAuthTestClient({
    baseURL: supabaseUrl,
    defaultKey: process.env.ODEAL_REQUEST_KEY || 'test-key-123'
  }),

  // Security testing client with enhanced features
  security: (baseURL) => createAuthTestClient({
    baseURL,
    defaultKey: 'test-key-123',
    requestSigning: true,
    securityHeaders: {
      'X-Security-Test': 'true',
      'X-Test-Client': 'Ödeal-Security-Tester'
    }
  })
};

export default AuthTestClient;