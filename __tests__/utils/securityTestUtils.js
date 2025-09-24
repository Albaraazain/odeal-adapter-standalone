import { jest } from '@jest/globals';
import crypto from 'crypto';
import { AuthTestClient } from './authTestClient.js';

/**
 * Security Testing Utilities for Ödeal Vercel Functions
 * Provides comprehensive security testing capabilities including
 * timing attacks, rate limiting testing, and vulnerability detection
 */
export class SecurityTestUtils {
  constructor(client = null) {
    this.client = client || new AuthTestClient();
    this.vulnerabilities = [];
    this.recommendations = [];
  }

  /**
   * Run comprehensive security tests
   */
  async runSecurityTests(endpoint) {
    const results = {
      timingAttack: await this.testTimingAttackVulnerability(endpoint),
      rateLimiting: await this.testRateLimitingVulnerability(endpoint),
      bruteForce: await this.testBruteForceVulnerability(endpoint),
      headerInjection: await this.testHeaderInjectionVulnerability(endpoint),
      requestSmuggling: await this.testRequestSmugglingVulnerability(endpoint),
      sslValidation: await this.testSSLValidationVulnerability(endpoint),
      inputValidation: await this.testInputValidationVulnerability(endpoint),
      informationDisclosure: await this.testInformationDisclosureVulnerability(endpoint),
      sessionManagement: await this.testSessionManagementVulnerability(endpoint),
      corsConfiguration: await this.testCORSConfigurationVulnerability(endpoint)
    };

    // Analyze results and generate recommendations
    const analysis = this.analyzeSecurityResults(results);

    return {
      results,
      analysis,
      vulnerabilities: this.vulnerabilities,
      recommendations: this.recommendations,
      timestamp: new Date().toISOString(),
      securityScore: this.calculateSecurityScore(results)
    };
  }

  /**
   * Test timing attack vulnerability
   */
  async testTimingAttackVulnerability(endpoint, iterations = 1000) {
    const results = {
      validAuthTimes: [],
      invalidAuthTimes: [],
      statisticalAnalysis: {},
      vulnerable: false,
      confidence: 0
    };

    // Test valid authentication response times
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      try {
        await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: 'test-key-123'
        });
      } catch (error) {
        // Ignore errors, we're measuring timing
      }
      const end = process.hrtime.bigint();
      results.validAuthTimes.push(Number(end - start) / 1000000); // Convert to milliseconds
    }

    // Test invalid authentication response times
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      try {
        await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: 'invalid-key-123'
        });
      } catch (error) {
        // Ignore errors, we're measuring timing
      }
      const end = process.hrtime.bigint();
      results.invalidAuthTimes.push(Number(end - start) / 1000000); // Convert to milliseconds
    }

    // Statistical analysis
    const validStats = this.calculateStatistics(results.validAuthTimes);
    const invalidStats = this.calculateStatistics(results.invalidAuthTimes);

    results.statisticalAnalysis = {
      valid: validStats,
      invalid: invalidStats,
      difference: Math.abs(validStats.mean - invalidStats.mean),
      ratio: validStats.mean / invalidStats.mean,
      standardErrorDifference: this.calculateStandardErrorDifference(validStats, invalidStats)
    };

    // Determine vulnerability based on statistical significance
    const tTest = this.performTTest(results.validAuthTimes, results.invalidAuthTimes);
    results.vulnerable = tTest.pValue < 0.05 && Math.abs(validStats.mean - invalidStats.mean) > 1;
    results.confidence = results.vulnerable ? (1 - tTest.pValue) * 100 : tTest.pValue * 100;

    if (results.vulnerable) {
      this.vulnerabilities.push({
        type: 'Timing Attack',
        severity: 'medium',
        description: 'Response time differences between valid and invalid authentication may leak information',
        confidence: results.confidence,
        recommendation: 'Implement constant-time comparison for authentication validation'
      });
    }

    return results;
  }

  /**
   * Test rate limiting vulnerability
   */
  async testRateLimitingVulnerability(endpoint, requestCount = 100) {
    const results = {
      concurrentTest: await this.performRateLimitingTest(endpoint, requestCount, true),
      sequentialTest: await this.performRateLimitingTest(endpoint, requestCount, false),
      vulnerable: false,
      detectedMechanisms: []
    };

    // Analyze rate limiting effectiveness
    const concurrent = results.concurrentTest;
    const sequential = results.sequentialTest;

    // Check if rate limiting is implemented
    if (concurrent.rateLimitedRequests > 0 || sequential.rateLimitedRequests > 0) {
      results.detectedMechanisms.push('Rate limiting detected');
    } else {
      results.vulnerable = true;
      this.vulnerabilities.push({
        type: 'Missing Rate Limiting',
        severity: 'high',
        description: 'No rate limiting detected - susceptible to brute force attacks',
        recommendation: 'Implement rate limiting for authentication endpoints'
      });
    }

    // Check for proper rate limiting behavior
    if (concurrent.successfulRequests === requestCount && concurrent.rateLimitedRequests === 0) {
      results.vulnerable = true;
      this.vulnerabilities.push({
        type: 'Ineffective Rate Limiting',
        severity: 'high',
        description: 'Rate limiting not preventing concurrent requests',
        recommendation: 'Implement proper rate limiting that works with concurrent requests'
      });
    }

    return results;
  }

  /**
   * Perform rate limiting test
   */
  async performRateLimitingTest(endpoint, requestCount, concurrent) {
    const requests = [];
    const startTime = Date.now();

    if (concurrent) {
      // Concurrent requests
      const promises = Array.from({ length: requestCount }, () =>
        this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: 'test-key-123'
        }).catch(error => error.response || error)
      );
      requests.push(...await Promise.all(promises));
    } else {
      // Sequential requests
      for (let i = 0; i < requestCount; i++) {
        try {
          const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
            key: 'test-key-123'
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
      serverErrors: requests.filter(r => r.status >= 500).length,
      totalDuration: duration,
      requestsPerSecond: requestCount / (duration / 1000),
      averageResponseTime: requests.reduce((sum, r) => sum + (r.config?.metadata?.duration || 0), 0) / requests.length
    };
  }

  /**
   * Test brute force vulnerability
   */
  async testBruteForceVulnerability(endpoint, attempts = 1000) {
    const results = {
      attempts: attempts,
      successfulAttempts: 0,
      blockedAttempts: 0,
      averageTimePerAttempt: 0,
      maxAttemptsPerSecond: 0,
      vulnerable: false,
      timeTaken: 0
    };

    const startTime = Date.now();
    const attemptsPerSecond = [];

    for (let i = 0; i < attempts; i++) {
      const attemptStart = Date.now();

      // Generate random key for brute force attempt
      const randomKey = this.generateRandomKey(32);

      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: randomKey
        });

        if (response.status === 200) {
          results.successfulAttempts++;
        } else if (response.status === 429) {
          results.blockedAttempts++;
        }
      } catch (error) {
        if (error.response?.status === 429) {
          results.blockedAttempts++;
        }
      }

      const attemptEnd = Date.now();
      const attemptTime = attemptEnd - attemptStart;
      attemptsPerSecond.push(1000 / attemptTime);
    }

    const endTime = Date.now();
    results.timeTaken = endTime - startTime;
    results.averageTimePerAttempt = results.timeTaken / attempts;
    results.maxAttemptsPerSecond = Math.max(...attemptsPerSecond);

    // Determine vulnerability
    const successRate = results.successfulAttempts / attempts;
    if (successRate > 0.001) {
      results.vulnerable = true;
      this.vulnerabilities.push({
        type: 'Brute Force',
        severity: 'critical',
        description: `Brute force attack success rate: ${(successRate * 100).toFixed(2)}%`,
        recommendation: 'Implement account lockout or progressive delays after failed attempts'
      });
    }

    return results;
  }

  /**
   * Test header injection vulnerability
   */
  async testHeaderInjectionVulnerability(endpoint) {
    const results = {
      testCases: [],
      vulnerable: false,
      injectionVectors: []
    };

    const injectionVectors = [
      { name: 'CRLF Injection', payload: 'test-key-123\r\nX-Injected-Header: value' },
      { name: 'Newline Injection', payload: 'test-key-123\nX-Injected-Header: value' },
      { name: 'Carriage Return Injection', payload: 'test-key-123\rX-Injected-Header: value' },
      { name: 'Tab Injection', payload: 'test-key-123\tX-Injected-Header: value' },
      { name: 'Multiple Line Injection', payload: 'test-key-123\r\nX-Header1: value1\r\nX-Header2: value2' },
      { name: 'Null Byte Injection', payload: 'test-key-123\x00X-Injected-Header: value' },
      { name: 'Backspace Injection', payload: 'test-key-123\x08X-Injected-Header: value' },
      { name: 'Vertical Tab Injection', payload: 'test-key-123\x0bX-Injected-Header: value' },
      { name: 'Form Feed Injection', payload: 'test-key-123\x0cX-Injected-Header: value' },
      { name: 'Mixed Control Characters', payload: 'test-key-123\r\n\t\x00X-Injected-Header: value' }
    ];

    for (const vector of injectionVectors) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: vector.payload
        });

        const testCase = {
          vector: vector.name,
          payload: vector.payload,
          status: response.status,
          successful: response.status === 200,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };

        // Check for evidence of successful injection
        if (testCase.successful) {
          results.injectionVectors.push(vector.name);
          results.vulnerable = true;
        }

        results.testCases.push(testCase);
      } catch (error) {
        results.testCases.push({
          vector: vector.name,
          payload: vector.payload,
          status: error.response?.status || 'error',
          successful: false,
          error: error.message
        });
      }
    }

    if (results.vulnerable) {
      this.vulnerabilities.push({
        type: 'Header Injection',
        severity: 'high',
        description: 'Header injection attacks may be possible',
        affectedVectors: results.injectionVectors,
        recommendation: 'Implement proper header validation and sanitization'
      });
    }

    return results;
  }

  /**
   * Test request smuggling vulnerability
   */
  async testRequestSmugglingVulnerability(endpoint) {
    const results = {
      testCases: [],
      vulnerable: false,
      smugglingVectors: []
    };

    const smugglingVectors = [
      { name: 'CL.TE Smuggling', headers: { 'Content-Length': '5', 'Transfer-Encoding': 'chunked' }, body: '0\r\n\r\nG' },
      { name: 'TE.CL Smuggling', headers: { 'Transfer-Encoding': 'chunked', 'Content-Length': '5' }, body: '0\r\n\r\nG' },
      { name: 'Invalid Content-Length', headers: { 'Content-Length': 'invalid' }, body: 'test' },
      { name: 'Negative Content-Length', headers: { 'Content-Length': '-1' }, body: 'test' },
      { name: 'Multiple Content-Length', headers: { 'Content-Length': ['5', '10'] }, body: 'test' },
      { name: 'Chunked Encoding without Content-Length', headers: { 'Transfer-Encoding': 'chunked' }, body: '5\r\nhello\r\n0\r\n\r\n' }
    ];

    for (const vector of smugglingVectors) {
      try {
        const response = await this.client.createAuthenticatedRequest('POST', endpoint, vector.body, {
          key: 'test-key-123',
          customHeaders: vector.headers
        });

        const testCase = {
          vector: vector.name,
          headers: vector.headers,
          body: vector.body,
          status: response.status,
          successful: response.status < 400,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };

        // Check for evidence of request smuggling
        if (testCase.successful && (vector.name.includes('Smuggling') || vector.name.includes('Invalid'))) {
          results.smugglingVectors.push(vector.name);
          results.vulnerable = true;
        }

        results.testCases.push(testCase);
      } catch (error) {
        results.testCases.push({
          vector: vector.name,
          headers: vector.headers,
          body: vector.body,
          status: error.response?.status || 'error',
          successful: false,
          error: error.message
        });
      }
    }

    if (results.vulnerable) {
      this.vulnerabilities.push({
        type: 'Request Smuggling',
        severity: 'high',
        description: 'Request smuggling attacks may be possible',
        affectedVectors: results.smugglingVectors,
        recommendation: 'Implement proper request parsing and validation'
      });
    }

    return results;
  }

  /**
   * Test SSL/TLS validation vulnerability
   */
  async testSSLValidationVulnerability(endpoint) {
    const results = {
      sslValidation: true,
      certificateValidation: true,
      hostnameValidation: true,
      vulnerable: false,
      issues: []
    };

    // Note: This is a simplified test for SSL validation
    // In a real-world scenario, you would need to test with actual SSL certificates
    try {
      // Test with invalid SSL certificate (if possible)
      const testEndpoint = endpoint.replace('http://', 'https://');
      if (testEndpoint !== endpoint) {
        try {
          await this.client.createAuthenticatedRequest('GET', testEndpoint, null, {
            key: 'test-key-123'
          });
        } catch (error) {
          if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
              error.code === 'CERT_UNTRUSTED' ||
              error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
            results.sslValidation = false;
            results.issues.push('SSL certificate validation failed');
          }
        }
      }
    } catch (error) {
      results.issues.push(`SSL validation test failed: ${error.message}`);
    }

    if (!results.sslValidation) {
      results.vulnerable = true;
      this.vulnerabilities.push({
        type: 'SSL Validation',
        severity: 'medium',
        description: 'SSL/TLS certificate validation issues detected',
        issues: results.issues,
        recommendation: 'Ensure proper SSL certificate validation is implemented'
      });
    }

    return results;
  }

  /**
   * Test input validation vulnerability
   */
  async testInputValidationVulnerability(endpoint) {
    const results = {
      testCases: [],
      vulnerable: false,
      validationIssues: []
    };

    const maliciousInputs = [
      { name: 'SQL Injection', payload: "'; DROP TABLE users; --" },
      { name: 'XSS Injection', payload: '<script>alert("XSS")</script>' },
      { name: 'Command Injection', payload: '; ls -la #' },
      { name: 'Path Traversal', payload: '../../../etc/passwd' },
      { name: 'Null Byte Injection', payload: 'test\x00' },
      { name: 'Buffer Overflow', payload: 'A'.repeat(10000) },
      { name: 'Unicode Overflow', payload: '测试'.repeat(1000) },
      { name: 'XML Injection', payload: '<!DOCTYPE xxe [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>' },
      { name: 'LDAP Injection', payload: '*)(uid=*))' },
      { name: 'NoSQL Injection', payload: '{"$gt": ""}' }
    ];

    for (const input of maliciousInputs) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', `${endpoint}?input=${encodeURIComponent(input.payload)}`, null, {
          key: 'test-key-123'
        });

        const testCase = {
          vector: input.name,
          payload: input.payload,
          status: response.status,
          successful: response.status === 200,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };

        // Check if malicious input was processed successfully
        if (testCase.successful) {
          results.validationIssues.push(input.name);
          results.vulnerable = true;
        }

        results.testCases.push(testCase);
      } catch (error) {
        results.testCases.push({
          vector: input.name,
          payload: input.payload,
          status: error.response?.status || 'error',
          successful: false,
          error: error.message
        });
      }
    }

    if (results.vulnerable) {
      this.vulnerabilities.push({
        type: 'Input Validation',
        severity: 'high',
        description: 'Input validation vulnerabilities detected',
        affectedVectors: results.validationIssues,
        recommendation: 'Implement proper input validation and sanitization'
      });
    }

    return results;
  }

  /**
   * Test information disclosure vulnerability
   */
  async testInformationDisclosureVulnerability(endpoint) {
    const results = {
      testCases: [],
      vulnerable: false,
      disclosedInformation: []
    };

    const disclosureTests = [
      { name: 'Error Details', method: 'GET', path: `${endpoint}/nonexistent` },
      { name: 'Stack Trace', method: 'POST', path: endpoint, body: { invalid: 'data' } },
      { name: 'Server Information', method: 'OPTIONS', path: endpoint },
      { name: 'Debug Information', method: 'GET', path: `${endpoint}?debug=true` },
      { name: 'Configuration Information', method: 'GET', path: `${endpoint}?config=show` }
    ];

    for (const test of disclosureTests) {
      try {
        const response = await this.client.createAuthenticatedRequest(test.method, test.path, test.body, {
          key: 'test-key-123'
        });

        const testCase = {
          testType: test.name,
          status: response.status,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data,
          headers: response.headers
        };

        // Check for information disclosure
        const responseData = JSON.stringify(response.data).toLowerCase();
        const responseHeaders = JSON.stringify(response.headers).toLowerCase();

        const sensitiveInfo = [
          'stack trace', 'exception', 'error', 'debug', 'server',
          'apache', 'nginx', 'node.js', 'express', 'password',
          'secret', 'key', 'token', 'database', 'sql'
        ];

        const foundSensitiveInfo = sensitiveInfo.filter(info =>
          responseData.includes(info) || responseHeaders.includes(info)
        );

        if (foundSensitiveInfo.length > 0) {
          results.disclosedInformation.push({
            test: test.name,
            information: foundSensitiveInfo
          });
          results.vulnerable = true;
        }

        results.testCases.push(testCase);
      } catch (error) {
        const errorData = error.response?.data || error.message;
        const errorStr = JSON.stringify(errorData).toLowerCase();

        const sensitiveInfo = [
          'stack trace', 'exception', 'error', 'debug', 'server',
          'apache', 'nginx', 'node.js', 'express', 'password',
          'secret', 'key', 'token', 'database', 'sql'
        ];

        const foundSensitiveInfo = sensitiveInfo.filter(info => errorStr.includes(info));

        if (foundSensitiveInfo.length > 0) {
          results.disclosedInformation.push({
            test: test.name,
            information: foundSensitiveInfo
          });
          results.vulnerable = true;
        }

        results.testCases.push({
          testType: test.name,
          status: error.response?.status || 'error',
          error: error.message,
          data: error.response?.data
        });
      }
    }

    if (results.vulnerable) {
      this.vulnerabilities.push({
        type: 'Information Disclosure',
        severity: 'medium',
        description: 'Information disclosure vulnerabilities detected',
        disclosedInfo: results.disclosedInformation,
        recommendation: 'Implement proper error handling and remove sensitive information from responses'
      });
    }

    return results;
  }

  /**
   * Test session management vulnerability
   */
  async testSessionManagementVulnerability(endpoint) {
    const results = {
      sessionFixation: false,
      sessionTimeout: false,
      concurrentSessions: false,
      vulnerable: false,
      issues: []
    };

    // Test session fixation (simplified)
    try {
      const response1 = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
        key: 'test-key-123'
      });

      const response2 = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
        key: 'test-key-123'
      });

      // Check if session is properly managed
      if (response1.status === 200 && response2.status === 200) {
        // Session management test passed
      } else {
        results.sessionFixation = true;
        results.issues.push('Session fixation vulnerability detected');
      }
    } catch (error) {
      results.issues.push(`Session management test failed: ${error.message}`);
    }

    // Test concurrent session handling
    const concurrentRequests = Array.from({ length: 5 }, () =>
      this.client.createAuthenticatedRequest('GET', endpoint, null, {
        key: 'test-key-123'
      })
    );

    try {
      const concurrentResponses = await Promise.all(concurrentRequests);
      const successfulConcurrent = concurrentResponses.filter(r => r.status === 200).length;

      if (successfulConcurrent < concurrentRequests.length) {
        results.concurrentSessions = true;
        results.issues.push('Concurrent session handling issues detected');
      }
    } catch (error) {
      results.issues.push(`Concurrent session test failed: ${error.message}`);
    }

    if (results.sessionFixation || results.concurrentSessions) {
      results.vulnerable = true;
      this.vulnerabilities.push({
        type: 'Session Management',
        severity: 'medium',
        description: 'Session management vulnerabilities detected',
        issues: results.issues,
        recommendation: 'Implement proper session management and concurrent request handling'
      });
    }

    return results;
  }

  /**
   * Test CORS configuration vulnerability
   */
  async testCORSConfigurationVulnerability(endpoint) {
    const results = {
      corsEnabled: false,
      corsHeaders: {},
      vulnerable: false,
      issues: []
    };

    const origins = [
      'http://localhost:3000',
      'http://malicious.com',
      'http://localhost:4000',
      'null',
      '*'
    ];

    for (const origin of origins) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: 'test-key-123',
          customHeaders: { 'Origin': origin }
        });

        const corsHeaders = {
          'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
          'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
          'Access-Control-Allow-Headers': response.headers['access-control-allow-headers'],
          'Access-Control-Allow-Credentials': response.headers['access-control-allow-credentials']
        };

        if (corsHeaders['Access-Control-Allow-Origin']) {
          results.corsEnabled = true;
          results.corsHeaders = corsHeaders;

          // Check for insecure CORS configuration
          if (corsHeaders['Access-Control-Allow-Origin'] === '*') {
            results.issues.push('CORS allows all origins (*)');
            results.vulnerable = true;
          }

          if (corsHeaders['Access-Control-Allow-Origin'] === 'null') {
            results.issues.push('CORS allows null origin');
            results.vulnerable = true;
          }

          if (corsHeaders['Access-Control-Allow-Origin'] === 'http://malicious.com') {
            results.issues.push('CORS allows malicious origin');
            results.vulnerable = true;
          }
        }
      } catch (error) {
        results.issues.push(`CORS test failed for origin ${origin}: ${error.message}`);
      }
    }

    if (results.vulnerable) {
      this.vulnerabilities.push({
        type: 'CORS Configuration',
        severity: 'medium',
        description: 'Insecure CORS configuration detected',
        issues: results.issues,
        recommendation: 'Configure CORS to only allow trusted origins'
      });
    }

    return results;
  }

  /**
   * Analyze security results and generate recommendations
   */
  analyzeSecurityResults(results) {
    const analysis = {
      totalTests: Object.keys(results).length,
      passedTests: 0,
      failedTests: 0,
      criticalVulnerabilities: 0,
      highVulnerabilities: 0,
      mediumVulnerabilities: 0,
      lowVulnerabilities: 0,
      riskLevel: 'low'
    };

    // Count vulnerabilities by severity
    for (const vuln of this.vulnerabilities) {
      switch (vuln.severity) {
        case 'critical':
          analysis.criticalVulnerabilities++;
          break;
        case 'high':
          analysis.highVulnerabilities++;
          break;
        case 'medium':
          analysis.mediumVulnerabilities++;
          break;
        case 'low':
          analysis.lowVulnerabilities++;
          break;
      }
    }

    // Determine risk level
    if (analysis.criticalVulnerabilities > 0) {
      analysis.riskLevel = 'critical';
    } else if (analysis.highVulnerabilities > 0) {
      analysis.riskLevel = 'high';
    } else if (analysis.mediumVulnerabilities > 0) {
      analysis.riskLevel = 'medium';
    }

    // Generate recommendations
    this.generateSecurityRecommendations(results);

    return analysis;
  }

  /**
   * Calculate security score
   */
  calculateSecurityScore(results) {
    let score = 100;

    // Deduct points for vulnerabilities
    for (const vuln of this.vulnerabilities) {
      switch (vuln.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Bonus points for good security practices
    if (results.timingAttack && !results.timingAttack.vulnerable) {
      score += 5;
    }
    if (results.rateLimiting && !results.rateLimiting.vulnerable) {
      score += 5;
    }
    if (results.bruteForce && !results.bruteForce.vulnerable) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate security recommendations
   */
  generateSecurityRecommendations(results) {
    // Add general recommendations
    this.recommendations.push({
      priority: 'high',
      category: 'Security Headers',
      recommendation: 'Implement security headers like X-Content-Type-Options, X-Frame-Options, and X-XSS-Protection'
    });

    this.recommendations.push({
      priority: 'medium',
      category: 'Monitoring',
      recommendation: 'Implement comprehensive logging and monitoring for security events'
    });

    this.recommendations.push({
      priority: 'medium',
      category: 'Testing',
      recommendation: 'Perform regular security testing and vulnerability assessments'
    });

    // Add specific recommendations based on test results
    if (results.timingAttack && results.timingAttack.vulnerable) {
      this.recommendations.push({
        priority: 'high',
        category: 'Timing Attacks',
        recommendation: 'Use constant-time comparison for authentication validation'
      });
    }

    if (results.rateLimiting && results.rateLimiting.vulnerable) {
      this.recommendations.push({
        priority: 'high',
        category: 'Rate Limiting',
        recommendation: 'Implement proper rate limiting to prevent brute force attacks'
      });
    }

    if (results.bruteForce && results.bruteForce.vulnerable) {
      this.recommendations.push({
        priority: 'critical',
        category: 'Brute Force',
        recommendation: 'Implement account lockout or progressive delays after failed attempts'
      });
    }
  }

  /**
   * Helper functions for statistical analysis
   */
  calculateStatistics(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    return {
      mean,
      variance,
      std,
      min: Math.min(...values),
      max: Math.max(...values),
      median: this.median(values)
    };
  }

  median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  performTTest(sample1, sample2) {
    const mean1 = sample1.reduce((a, b) => a + b, 0) / sample1.length;
    const mean2 = sample2.reduce((a, b) => a + b, 0) / sample2.length;

    const variance1 = sample1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0) / (sample1.length - 1);
    const variance2 = sample2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0) / (sample2.length - 1);

    const pooledStd = Math.sqrt(((sample1.length - 1) * variance1 + (sample2.length - 1) * variance2) / (sample1.length + sample2.length - 2));
    const tStat = (mean1 - mean2) / (pooledStd * Math.sqrt(1 / sample1.length + 1 / sample2.length));

    const degreesOfFreedom = sample1.length + sample2.length - 2;
    const pValue = this.tDistribution(Math.abs(tStat), degreesOfFreedom);

    return { tStat, pValue, degreesOfFreedom };
  }

  tDistribution(t, df) {
    // Simplified t-distribution calculation
    return 2 * (1 - this.normalCumulative(t));
  }

  normalCumulative(x) {
    // Approximation of normal cumulative distribution
    return 0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp(-2 * x * x / Math.PI)));
  }

  calculateStandardErrorDifference(stats1, stats2) {
    const n1 = stats1.count || 100;
    const n2 = stats2.count || 100;
    return Math.sqrt((stats1.variance / n1) + (stats2.variance / n2));
  }

  generateRandomKey(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate comprehensive security report
   */
  generateSecurityReport(endpoint) {
    return {
      endpoint,
      timestamp: new Date().toISOString(),
      vulnerabilities: this.vulnerabilities,
      recommendations: this.recommendations,
      summary: {
        totalVulnerabilities: this.vulnerabilities.length,
        criticalCount: this.vulnerabilities.filter(v => v.severity === 'critical').length,
        highCount: this.vulnerabilities.filter(v => v.severity === 'high').length,
        mediumCount: this.vulnerabilities.filter(v => v.severity === 'medium').length,
        lowCount: this.vulnerabilities.filter(v => v.severity === 'low').length
      },
      nextSteps: this.generateNextSteps()
    };
  }

  /**
   * Generate next steps for security improvement
   */
  generateNextSteps() {
    const nextSteps = [];

    // Prioritize critical vulnerabilities
    const criticalVulns = this.vulnerabilities.filter(v => v.severity === 'critical');
    if (criticalVulns.length > 0) {
      nextSteps.push({
        priority: 'immediate',
        action: 'Address critical security vulnerabilities',
        details: criticalVulns.map(v => v.type)
      });
    }

    // High priority vulnerabilities
    const highVulns = this.vulnerabilities.filter(v => v.severity === 'high');
    if (highVulns.length > 0) {
      nextSteps.push({
        priority: 'high',
        action: 'Address high-priority security vulnerabilities',
        details: highVulns.map(v => v.type)
      });
    }

    // General security improvements
    nextSteps.push({
      priority: 'medium',
      action: 'Implement security monitoring and logging',
      details: ['Set up security event logging', 'Configure alerting for suspicious activities']
    });

    nextSteps.push({
      priority: 'medium',
      action: 'Regular security testing',
      details: ['Schedule regular security assessments', 'Implement automated security scanning']
    });

    return nextSteps;
  }
}

/**
 * Factory function to create security test utilities
 */
export function createSecurityTestUtils(client = null) {
  return new SecurityTestUtils(client);
}

export default SecurityTestUtils;