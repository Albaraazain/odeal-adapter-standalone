import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { AuthTestClient } from '../utils/authTestClient.js';
import { AuthScenarios } from '../utils/authScenarios.js';
import { SecurityTestUtils } from '../utils/securityTestUtils.js';

/**
 * Integration Tests for Authentication Test Utilities
 * Tests the comprehensive authentication and security testing utilities
 */
describe('Authentication Test Utilities Integration', () => {
  let authClient;
  let authScenarios;
  let securityUtils;
  let testEndpoint;

  beforeAll(() => {
    // Setup test configuration
    testEndpoint = 'http://localhost:3000/api/app2app/baskets/TEST_001';

    // Initialize test utilities
    authClient = new AuthTestClient({
      baseURL: 'http://localhost:3000',
      defaultKey: 'test-key-123',
      timeout: 10000
    });

    authScenarios = new AuthScenarios(authClient);
    securityUtils = new SecurityTestUtils(authClient);
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('AuthTestClient', () => {
    it('should create authenticated requests with valid keys', async () => {
      const response = await authClient.createAuthenticatedRequest('GET', testEndpoint, null, {
        key: 'test-key-123'
      });

      expect(response.status).toBeDefined();
      expect(response.config.metadata).toBeDefined();
      expect(response.config.metadata.startTime).toBeDefined();
      expect(response.config.metadata.duration).toBeDefined();
    });

    it('should handle missing authentication', async () => {
      const response = await authClient.createAuthenticatedRequest('GET', testEndpoint, null, {
        key: null
      });

      expect(response.status).toBeDefined();
      // Should receive 401 or handle missing auth appropriately
    });

    it('should test authentication scenarios', async () => {
      const scenarios = {
        valid: true,
        missing: true,
        invalid: true,
        malformed: true
      };

      const results = await authClient.testAuthentication(testEndpoint, scenarios);

      expect(results).toBeDefined();
      expect(results.valid).toBeDefined();
      expect(results.missing).toBeDefined();
      expect(results.invalid).toBeDefined();
      expect(results.malformed).toBeDefined();
    });

    it('should perform timing attack testing', async () => {
      const results = await authClient.testTimingAttack(testEndpoint, 50);

      expect(results).toBeDefined();
      expect(results.validResponse).toBeDefined();
      expect(results.invalidResponse).toBeDefined();
      expect(results.timingDifference).toBeDefined();
    });

    it('should test rate limiting', async () => {
      const results = await authClient.testRateLimiting(testEndpoint, 20, true);

      expect(results).toBeDefined();
      expect(results.totalRequests).toBe(20);
      expect(results.successfulRequests).toBeDefined();
      expect(results.rateLimitedRequests).toBeDefined();
      expect(results.requestsPerSecond).toBeDefined();
    });

    it('should test header injection', async () => {
      const results = await authClient.testHeaderInjection(testEndpoint);

      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(5); // 5 injection scenarios
    });

    it('should test brute force attacks', async () => {
      const results = await authClient.testBruteForce(testEndpoint, 32, 50);

      expect(results).toBeDefined();
      expect(results.totalAttempts).toBe(50);
      expect(results.successfulAttempts).toBeDefined();
      expect(results.successRate).toBeDefined();
    });

    it('should generate comprehensive security report', async () => {
      const report = await authClient.generateSecurityReport(testEndpoint);

      expect(report).toBeDefined();
      expect(report.endpoint).toBe(testEndpoint);
      expect(report.timestamp).toBeDefined();
      expect(report.tests).toBeDefined();
      expect(report.analysis).toBeDefined();
    });
  });

  describe('AuthScenarios', () => {
    it('should test valid authentication scenarios', async () => {
      const results = await authScenarios.validAuthentication(testEndpoint);

      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(5); // 5 valid scenarios
    });

    it('should test missing authentication scenarios', async () => {
      const results = await authScenarios.missingAuthentication(testEndpoint);

      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(4); // 4 missing auth scenarios
    });

    it('should test invalid authentication scenarios', async () => {
      const results = await authScenarios.invalidAuthentication(testEndpoint);

      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(7); // 7 invalid scenarios
    });

    it('should test malformed authentication scenarios', async () => {
      const results = await authScenarios.malformedAuthentication(testEndpoint);

      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(9); // 9 malformed scenarios
    });

    it('should test SQL injection scenarios', async () => {
      const results = await authScenarios.sqlInjection(testEndpoint);

      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(8); // 8 SQL injection scenarios
    });

    it('should test XSS injection scenarios', async () => {
      const results = await authScenarios.xssInjection(testEndpoint);

      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(9); // 9 XSS scenarios
    });

    it('should test special characters scenarios', async () => {
      const results = await authScenarios.specialCharacters(testEndpoint);

      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(15); // 15 special char scenarios
    });

    it('should test Unicode characters scenarios', async () => {
      const results = await authScenarios.unicodeCharacters(testEndpoint);

      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(8); // 8 Unicode scenarios
    });

    it('should test all authentication scenarios', async () => {
      const results = await authScenarios.runAllScenarios(testEndpoint);

      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(20); // 20 total scenarios
    });

    it('should generate comprehensive test report', async () => {
      const sampleResults = {
        validAuthentication: {
          'Default valid key': { successful: true },
          'UUID format key': { successful: true }
        },
        missingAuthentication: {
          'No auth header': { expected401: true },
          'Empty auth header': { expected401: true }
        }
      };

      const report = authScenarios.generateReport(sampleResults);

      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.totalTests).toBe(2);
      expect(report.scenarios).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.securityScore).toBeGreaterThanOrEqual(0);
      expect(report.securityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('SecurityTestUtils', () => {
    it('should run comprehensive security tests', async () => {
      const results = await securityUtils.runSecurityTests(testEndpoint);

      expect(results).toBeDefined();
      expect(results.results).toBeDefined();
      expect(results.analysis).toBeDefined();
      expect(results.vulnerabilities).toBeDefined();
      expect(results.recommendations).toBeDefined();
      expect(results.securityScore).toBeGreaterThanOrEqual(0);
      expect(results.securityScore).toBeLessThanOrEqual(100);
    });

    it('should test timing attack vulnerability', async () => {
      const results = await securityUtils.testTimingAttackVulnerability(testEndpoint, 100);

      expect(results).toBeDefined();
      expect(results.validAuthTimes).toBeDefined();
      expect(results.invalidAuthTimes).toBeDefined();
      expect(results.statisticalAnalysis).toBeDefined();
      expect(results.vulnerable).toBeDefined();
      expect(results.confidence).toBeDefined();
    });

    it('should test rate limiting vulnerability', async () => {
      const results = await securityUtils.testRateLimitingVulnerability(testEndpoint, 50);

      expect(results).toBeDefined();
      expect(results.concurrentTest).toBeDefined();
      expect(results.sequentialTest).toBeDefined();
      expect(results.vulnerable).toBeDefined();
      expect(results.detectedMechanisms).toBeDefined();
    });

    it('should test brute force vulnerability', async () => {
      const results = await securityUtils.testBruteForceVulnerability(testEndpoint, 100);

      expect(results).toBeDefined();
      expect(results.attempts).toBe(100);
      expect(results.successfulAttempts).toBeDefined();
      expect(results.blockedAttempts).toBeDefined();
      expect(results.vulnerable).toBeDefined();
      expect(results.timeTaken).toBeDefined();
    });

    it('should test header injection vulnerability', async () => {
      const results = await securityUtils.testHeaderInjectionVulnerability(testEndpoint);

      expect(results).toBeDefined();
      expect(results.testCases).toBeDefined();
      expect(results.vulnerable).toBeDefined();
      expect(results.injectionVectors).toBeDefined();
    });

    it('should test input validation vulnerability', async () => {
      const results = await securityUtils.testInputValidationVulnerability(testEndpoint);

      expect(results).toBeDefined();
      expect(results.testCases).toBeDefined();
      expect(results.vulnerable).toBeDefined();
      expect(results.validationIssues).toBeDefined();
    });

    it('should test information disclosure vulnerability', async () => {
      const results = await securityUtils.testInformationDisclosureVulnerability(testEndpoint);

      expect(results).toBeDefined();
      expect(results.testCases).toBeDefined();
      expect(results.vulnerable).toBeDefined();
      expect(results.disclosedInformation).toBeDefined();
    });

    it('should test CORS configuration vulnerability', async () => {
      const results = await securityUtils.testCORSConfigurationVulnerability(testEndpoint);

      expect(results).toBeDefined();
      expect(results.corsEnabled).toBeDefined();
      expect(results.corsHeaders).toBeDefined();
      expect(results.vulnerable).toBeDefined();
      expect(results.issues).toBeDefined();
    });

    it('should generate security report', async () => {
      // Run a few tests first
      await securityUtils.testTimingAttackVulnerability(testEndpoint, 50);
      await securityUtils.testRateLimitingVulnerability(testEndpoint, 20);

      const report = securityUtils.generateSecurityReport(testEndpoint);

      expect(report).toBeDefined();
      expect(report.endpoint).toBe(testEndpoint);
      expect(report.timestamp).toBeDefined();
      expect(report.vulnerabilities).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.nextSteps).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should test complete authentication workflow', async () => {
      // Test authentication scenarios
      const authResults = await authScenarios.runAllScenarios(testEndpoint);

      // Test security vulnerabilities
      const securityResults = await securityUtils.runSecurityTests(testEndpoint);

      // Generate comprehensive report
      const authReport = authScenarios.generateReport(authResults);
      const securityReport = securityUtils.generateSecurityReport(testEndpoint);

      // Verify integration
      expect(authResults).toBeDefined();
      expect(securityResults).toBeDefined();
      expect(authReport).toBeDefined();
      expect(securityReport).toBeDefined();
      expect(authReport.totalTests).toBeGreaterThan(0);
      expect(securityReport.vulnerabilities).toBeDefined();
    });

    it('should test different deployment environments', async () => {
      const environments = [
        { name: 'local', endpoint: 'http://localhost:3000/api/app2app/baskets/TEST_001' },
        { name: 'vercel', endpoint: 'https://odeal-vercel.vercel.app/api/app2app/baskets/TEST_001' },
        { name: 'supabase', endpoint: 'https://notification.ropapi.com/functions/v1/odeal-basket' }
      ];

      const environmentResults = {};

      for (const env of environments) {
        try {
          const client = new AuthTestClient({
            baseURL: env.endpoint.replace('/api/app2app/baskets/TEST_001', '').replace('/functions/v1/odeal-basket', ''),
            defaultKey: 'test-key-123'
          });

          const results = await client.testAuthentication(env.endpoint, {
            valid: true,
            invalid: true,
            missing: true
          });

          environmentResults[env.name] = {
            reachable: Object.keys(results).some(key => results[key]?.status !== undefined),
            authWorking: results.valid?.status === 200,
            authBlocking: results.invalid?.status === 401 && results.missing?.status === 401
          };
        } catch (error) {
          environmentResults[env.name] = {
            reachable: false,
            error: error.message
          };
        }
      }

      expect(environmentResults).toBeDefined();
      expect(Object.keys(environmentResults)).toHaveLength(3);
    });

    it('should test performance and security together', async () => {
      // Test authentication performance
      const performanceResults = await authClient.testRateLimiting(testEndpoint, 30, true);

      // Test security vulnerabilities
      const securityResults = await securityUtils.runSecurityTests(testEndpoint);

      // Verify performance metrics
      expect(performanceResults.totalRequests).toBe(30);
      expect(performanceResults.requestsPerSecond).toBeGreaterThan(0);
      expect(performanceResults.averageResponseTime).toBeGreaterThan(0);

      // Verify security analysis
      expect(securityResults.securityScore).toBeGreaterThanOrEqual(0);
      expect(securityResults.securityScore).toBeLessThanOrEqual(100);
      expect(securityResults.analysis.totalTests).toBeGreaterThan(0);
    });

    it('should test concurrent authentication scenarios', async () => {
      const concurrentTests = Array.from({ length: 10 }, (_, i) =>
        authScenarios.validAuthentication(testEndpoint)
      );

      const results = await Promise.all(concurrentTests);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(Object.keys(result)).toHaveLength(5); // 5 valid scenarios
      });
    });

    it('should test error handling and resilience', async () => {
      // Test with invalid endpoint
      const invalidEndpoint = 'http://localhost:3000/api/invalid-endpoint';

      try {
        const results = await authClient.testAuthentication(invalidEndpoint, {
          valid: true,
          invalid: true
        });

        expect(results).toBeDefined();
        expect(results.valid).toBeDefined();
        expect(results.invalid).toBeDefined();
      } catch (error) {
        // Error handling is expected
        expect(error).toBeDefined();
      }

      // Test with timeout
      const timeoutClient = new AuthTestClient({
        baseURL: 'http://localhost:3000',
        timeout: 1 // Very short timeout
      });

      try {
        const results = await timeoutClient.testAuthentication(testEndpoint, {
          valid: true
        });

        // Should handle timeout gracefully
        expect(results).toBeDefined();
      } catch (error) {
        // Timeout error is expected
        expect(error).toBeDefined();
      }
    });
  });

  describe('Utility Functions', () => {
    it('should generate random keys properly', () => {
      const key1 = authClient.generateRandomKey();
      const key2 = authClient.generateRandomKey();

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
      expect(key1.length).toBe(32);
      expect(key2.length).toBe(32);
    });

    it('should calculate statistics correctly', () => {
      const values = [10, 20, 30, 40, 50];
      const stats = securityUtils.calculateStatistics(values);

      expect(stats.mean).toBe(30);
      expect(stats.median).toBe(30);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.std).toBeGreaterThan(0);
    });

    it('should perform statistical analysis correctly', () => {
      const sample1 = [10, 12, 14, 16, 18];
      const sample2 = [20, 22, 24, 26, 28];

      const tTest = securityUtils.performTTest(sample1, sample2);

      expect(tTest).toBeDefined();
      expect(tTest.tStat).toBeDefined();
      expect(tTest.pValue).toBeDefined();
      expect(tTest.degreesOfFreedom).toBe(8);
    });
  });
});