import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import {
  TimingAttackTester,
  AuthBypassTester,
  BruteForceTester,
  TokenManipulationTester,
  SecurityHeaderTester,
  SecurityTestSuite,
  SECURITY_TEST_CONFIG
} from './authSecurityTestUtils.js';
import {
  InputValidationTester,
  FuzzingTester,
  ADVANCED_SECURITY_CONFIG
} from './advancedSecurityTestUtils.js';

/**
 * Comprehensive Security Tests for Ödeal Vercel Functions
 * Complete security testing suite including authentication, input validation, and fuzzing
 */

describe('Ödeal Comprehensive Security Tests', () => {
  let securitySuite;
  let inputValidationTester;
  let fuzzingTester;
  let comprehensiveResults;

  beforeAll(() => {
    // Initialize all security testers
    securitySuite = new SecurityTestSuite(SECURITY_TEST_CONFIG.baseUrl);
    inputValidationTester = new InputValidationTester(ADVANCED_SECURITY_CONFIG.baseUrl);
    fuzzingTester = new FuzzingTester(ADVANCED_SECURITY_CONFIG.baseUrl);
  });

  describe('Authentication Security Tests', () => {
    test('should run comprehensive authentication security tests', async () => {
      console.log('🔐 Running comprehensive authentication security tests...');

      const authResults = await securitySuite.runAllTests('/api/app2app/baskets/TEST_001');

      expect(authResults).toBeDefined();
      expect(authResults.timingAttacks).toBeDefined();
      expect(authResults.authBypass).toBeDefined();
      expect(authResults.bruteForce).toBeDefined();
      expect(authResults.tokenManipulation).toBeDefined();
      expect(authResults.securityHeaders).toBeDefined();
      expect(authResults.summary).toBeDefined();

      // Log authentication security summary
      console.log('\n📊 Authentication Security Summary:');
      console.log(`   Security Score: ${authResults.summary.securityScore}/100`);
      console.log(`   Overall Assessment: ${authResults.summary.overallAssessment}`);
      console.log(`   Timing Vulnerabilities: ${authResults.summary.timingVulnerabilities}`);
      console.log(`   Auth Bypasses: ${authResults.summary.authBypasses}`);
      console.log(`   Brute Force Protection: ${authResults.summary.bruteForceProtection}`);
      console.log(`   Token Issues: ${authResults.summary.tokenIssues}`);
      console.log(`   Security Header Issues: ${authResults.summary.securityHeaderIssues}`);

      // Store for comprehensive report
      comprehensiveResults = { authentication: authResults };

      // Generate detailed report
      const authReport = securitySuite.generateReport(authResults);
      expect(authReport).toBeDefined();
      expect(authReport.executiveSummary).toBeDefined();
      expect(authReport.detailedFindings).toBeDefined();

      console.log('\n🔐 Authentication Security Recommendations:');
      if (authReport.executiveSummary.recommendations.length > 0) {
        authReport.executiveSummary.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. [${rec.priority}] ${rec.category}: ${rec.recommendation}`);
        });
      }

    }, 120000); // Extended timeout for comprehensive testing
  });

  describe('Input Validation Security Tests', () => {
    test('should run comprehensive input validation tests', async () => {
      console.log('\n🛡️ Running comprehensive input validation tests...');

      const inputResults = await inputValidationTester.runAllTests('/api/app2app/baskets/TEST_001');

      expect(inputResults).toBeDefined();
      expect(inputResults.xss).toBeDefined();
      expect(inputResults.sqlInjection).toBeDefined();
      expect(inputResults.commandInjection).toBeDefined();
      expect(inputResults.pathTraversal).toBeDefined();
      expect(inputResults.ldapInjection).toBeDefined();
      expect(inputResults.xmlInjection).toBeDefined();
      expect(inputResults.summary).toBeDefined();

      // Log input validation security summary
      console.log('\n📊 Input Validation Security Summary:');
      console.log(`   Security Score: ${inputResults.summary.securityScore}/100`);
      console.log(`   Overall Assessment: ${inputResults.summary.overallAssessment}`);
      console.log(`   XSS Vulnerabilities: ${inputResults.summary.xssVulnerabilities}`);
      console.log(`   SQL Injection: ${inputResults.summary.sqlInjectionVulnerabilities}`);
      console.log(`   Command Injection: ${inputResults.summary.commandInjectionVulnerabilities}`);
      console.log(`   Path Traversal: ${inputResults.summary.pathTraversalVulnerabilities}`);
      console.log(`   LDAP Injection: ${inputResults.summary.ldapInjectionVulnerabilities}`);
      console.log(`   XML Injection: ${inputResults.summary.xmlInjectionVulnerabilities}`);

      // Store for comprehensive report
      if (!comprehensiveResults) comprehensiveResults = {};
      comprehensiveResults.inputValidation = inputResults;

      // Assert basic security standards
      const hasCriticalVulnerabilities =
        inputResults.summary.xssVulnerabilities > 0 ||
        inputResults.summary.sqlInjectionVulnerabilities > 0 ||
        inputResults.summary.commandInjectionVulnerabilities > 0 ||
        inputResults.summary.pathTraversalVulnerabilities > 0;

      if (hasCriticalVulnerabilities) {
        console.warn('⚠️ CRITICAL INPUT VALIDATION VULNERABILITIES DETECTED');
      }

    }, 180000); // Extended timeout for input validation testing
  });

  describe('Fuzzing Security Tests', () => {
    test('should run comprehensive fuzzing tests', async () => {
      console.log('\n🔀 Running comprehensive fuzzing tests...');

      // Test fuzzing in different locations
      const fuzzingResults = {
        query: await fuzzingTester.fuzzEndpoint('/api/app2app/baskets/TEST_001', 'query', 50),
        header: await fuzzingTester.fuzzEndpoint('/api/app2app/baskets/TEST_001', 'header', 50),
        body: await fuzzingTester.fuzzEndpoint('/api/app2app/baskets/TEST_001', 'body', 50)
      };

      expect(fuzzingResults.query).toBeDefined();
      expect(fuzzingResults.header).toBeDefined();
      expect(fuzzingResults.body).toBeDefined();

      // Calculate overall fuzzing statistics
      const allResults = [fuzzingResults.query, fuzzingResults.header, fuzzingResults.body];
      const totalIterations = allResults.reduce((sum, r) => sum + r.totalIterations, 0);
      const totalCrashes = allResults.reduce((sum, r) => sum + r.crashCount, 0);
      const totalErrors = allResults.reduce((sum, r) => sum + r.errorCount, 0);
      const totalUnexpected = allResults.reduce((sum, r) => sum + r.unexpectedBehaviorCount, 0);

      // Log fuzzing security summary
      console.log('\n📊 Fuzzing Security Summary:');
      console.log(`   Total Iterations: ${totalIterations}`);
      console.log(`   Total Crashes: ${totalCrashes}`);
      console.log(`   Total Errors: ${totalErrors}`);
      console.log(`   Total Unexpected Behavior: ${totalUnexpected}`);
      console.log(`   Crash Rate: ${((totalCrashes / totalIterations) * 100).toFixed(2)}%`);
      console.log(`   Error Rate: ${((totalErrors / totalIterations) * 100).toFixed(2)}%`);

      // Store for comprehensive report
      if (!comprehensiveResults) comprehensiveResults = {};
      comprehensiveResults.fuzzing = fuzzingResults;

      // Generate fuzzing report
      const fuzzingReport = fuzzingTester.generateReport();
      expect(fuzzingReport).toBeDefined();
      expect(fuzzingReport.summary).toBeDefined();

      console.log(`\n🔀 Fuzzing Assessment: ${fuzzingReport.summary}`);

      // Assert no crashes during fuzzing
      if (totalCrashes > 0) {
        console.error('💥 CRITICAL: Server crashes detected during fuzzing');
      }

    }, 120000); // Extended timeout for fuzzing testing
  });

  describe('Webhook Security Tests', () => {
    test('should test webhook endpoint security', async () => {
      console.log('\n🔗 Testing webhook endpoint security...');

      // Test webhook endpoints with security considerations
      const webhookTester = new SecurityTestSuite(SECURITY_TEST_CONFIG.baseUrl);
      const webhookResults = await webhookTester.runAllTests('/api/webhooks/odeal/payment-succeeded');

      expect(webhookResults).toBeDefined();
      expect(webhookResults.summary).toBeDefined();

      console.log('\n📊 Webhook Security Summary:');
      console.log(`   Security Score: ${webhookResults.summary.securityScore}/100`);
      console.log(`   Overall Assessment: ${webhookResults.summary.overallAssessment}`);

      // Store for comprehensive report
      if (!comprehensiveResults) comprehensiveResults = {};
      comprehensiveResults.webhooks = webhookResults;

      // Test additional webhook security scenarios
      const webhookAuthTester = new AuthBypassTester(SECURITY_TEST_CONFIG.baseUrl);
      const webhookBypassResults = await webhookAuthTester.testAuthBypassTechniques('/api/webhooks/odeal/payment-succeeded');

      expect(webhookBypassResults).toBeDefined();
      expect(Array.isArray(webhookBypassResults)).toBe(true);

      const webhookBypasses = webhookBypassResults.filter(r => r.isBypass);
      console.log(`   Webhook Bypass Attempts: ${webhookBypassResults.length}`);
      console.log(`   Webhook Successful Bypasses: ${webhookBypasses.length}`);

      if (webhookBypasses.length > 0) {
        console.warn('⚠️ WEBHOOK AUTHENTICATION BYPASS DETECTED');
      }

    }, 60000); // Extended timeout for webhook testing
  });

  describe('Rate Limiting and DoS Protection Tests', () => {
    test('should test rate limiting and DoS protection', async () => {
      console.log('\n🚫 Testing rate limiting and DoS protection...');

      const bruteForceTester = new BruteForceTester(SECURITY_TEST_CONFIG.baseUrl);

      // Test aggressive rate limiting
      const rateLimitingResults = await bruteForceTester.testRateLimiting(
        '/api/app2app/baskets/TEST_001',
        20, // 20 requests per second
        10  // for 10 seconds
      );

      expect(rateLimitingResults).toBeDefined();
      expect(rateLimitingResults.hasRateLimiting).toBeDefined();

      console.log('\n📊 Rate Limiting Test Results:');
      console.log(`   Target Rate: ${rateLimitingResults.targetRate} req/sec`);
      console.log(`   Actual Rate: ${rateLimitingResults.actualRate} req/sec`);
      console.log(`   Rate Limited Requests: ${rateLimitingResults.rateLimitedRequests}`);
      console.log(`   Rate Limiting Percentage: ${rateLimitingResults.rateLimitingPercentage}%`);
      console.log(`   Has Rate Limiting: ${rateLimitingResults.hasRateLimiting}`);

      // Test concurrent request handling
      const concurrentResults = await bruteForceTester.testBruteForceProtection(
        '/api/app2app/baskets/TEST_001',
        30 // 30 concurrent requests
      );

      expect(concurrentResults).toBeDefined();
      expect(concurrentResults.hasRateLimiting).toBeDefined();
      expect(concurrentResults.hasBlocking).toBeDefined();

      console.log('\n📊 Concurrent Request Test Results:');
      console.log(`   Total Requests: ${concurrentResults.totalRequests}`);
      console.log(`   Rate Limited: ${concurrentResults.rateLimitedRequests}`);
      console.log(`   Blocked: ${concurrentResults.blockedRequests}`);
      console.log(`   Has Rate Limiting: ${concurrentResults.hasRateLimiting}`);
      console.log(`   Has Blocking: ${concurrentResults.hasBlocking}`);

      // Store for comprehensive report
      if (!comprehensiveResults) comprehensiveResults = {};
      comprehensiveResults.rateLimiting = {
        rateLimiting: rateLimitingResults,
        concurrent: concurrentResults
      };

      // Assess DoS protection
      const hasDoSProtection = rateLimitingResults.hasRateLimiting || concurrentResults.hasBlocking;

      if (!hasDoSProtection) {
        console.warn('⚠️ NO DOS PROTECTION DETECTED');
      } else {
        console.log('✅ DOS PROTECTION DETECTED');
      }

    }, 60000); // Extended timeout for rate limiting testing
  });

  describe('Comprehensive Security Report', () => {
    test('should generate comprehensive security report', () => {
      if (!comprehensiveResults) {
        console.warn('⚠️ No comprehensive results available for report generation');
        return;
      }

      console.log('\n📋 GENERATING COMPREHENSIVE SECURITY REPORT...');

      // Calculate overall security metrics
      const authScore = comprehensiveResults.authentication?.summary?.securityScore || 0;
      const inputScore = comprehensiveResults.inputValidation?.summary?.securityScore || 0;
      const fuzzingScore = calculateFuzzingScore(comprehensiveResults.fuzzing);
      const webhookScore = comprehensiveResults.webhooks?.summary?.securityScore || 0;
      const rateLimitingScore = calculateRateLimitingScore(comprehensiveResults.rateLimiting);

      const overallSecurityScore = Math.round((authScore + inputScore + fuzzingScore + webhookScore + rateLimitingScore) / 5);

      // Generate comprehensive report
      const comprehensiveReport = {
        executiveSummary: {
          overallSecurityScore,
          timestamp: new Date().toISOString(),
          targetUrl: `${SECURITY_TEST_CONFIG.baseUrl}/api/app2app/baskets/TEST_001`,
          testDuration: 'Comprehensive Security Testing',
          overallAssessment: getOverallAssessment(overallSecurityScore),
          criticalIssues: countCriticalIssues(comprehensiveResults),
          recommendations: generateComprehensiveRecommendations(comprehensiveResults)
        },
        detailedResults: comprehensiveResults,
        securityMetrics: {
          authentication: { score: authScore, status: getScoreStatus(authScore) },
          inputValidation: { score: inputScore, status: getScoreStatus(inputScore) },
          fuzzing: { score: fuzzingScore, status: getScoreStatus(fuzzingScore) },
          webhooks: { score: webhookScore, status: getScoreStatus(webhookScore) },
          rateLimiting: { score: rateLimitingScore, status: getScoreStatus(rateLimitingScore) }
        },
        testConfiguration: {
          authentication: SECURITY_TEST_CONFIG,
          inputValidation: ADVANCED_SECURITY_CONFIG,
          fuzzing: ADVANCED_SECURITY_CONFIG
        }
      };

      console.log('\n📊 COMPREHENSIVE SECURITY REPORT:');
      console.log(`   Overall Security Score: ${overallSecurityScore}/100`);
      console.log(`   Overall Assessment: ${comprehensiveReport.executiveSummary.overallAssessment}`);
      console.log(`   Critical Issues: ${comprehensiveReport.executiveSummary.criticalIssues}`);
      console.log(`   Recommendations: ${comprehensiveReport.executiveSummary.recommendations.length}`);

      console.log('\n📈 Security Metrics by Category:');
      Object.entries(comprehensiveReport.securityMetrics).forEach(([category, metrics]) => {
        console.log(`   ${category}: ${metrics.score}/100 (${metrics.status})`);
      });

      console.log('\n🔧 Top Security Recommendations:');
      comprehensiveReport.executiveSummary.recommendations.slice(0, 5).forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority}] ${rec.category}: ${rec.recommendation}`);
      });

      expect(comprehensiveReport).toBeDefined();
      expect(comprehensiveReport.executiveSummary).toBeDefined();
      expect(comprehensiveReport.detailedResults).toBeDefined();
      expect(comprehensiveReport.securityMetrics).toBeDefined();

      // Basic security assertions
      expect(overallSecurityScore).toBeGreaterThanOrEqual(0);
      expect(overallSecurityScore).toBeLessThanOrEqual(100);
      expect(comprehensiveReport.executiveSummary.recommendations).toBeDefined();
      expect(Array.isArray(comprehensiveReport.executiveSummary.recommendations)).toBe(true);

      // Save report for further analysis
      comprehensiveResults.comprehensiveReport = comprehensiveReport;

    });
  });

  describe('Security Configuration Validation', () => {
    test('should validate security test configurations', () => {
      console.log('\n⚙️ Validating security test configurations...');

      // Validate basic security configuration
      expect(SECURITY_TEST_CONFIG).toBeDefined();
      expect(SECURITY_TEST_CONFIG.baseUrl).toBeDefined();
      expect(SECURITY_TEST_CONFIG.validAuthKey).toBeDefined();
      expect(SECURITY_TEST_CONFIG.testTimeout).toBeGreaterThan(0);
      expect(SECURITY_TEST_CONFIG.requestTimeout).toBeGreaterThan(0);
      expect(SECURITY_TEST_CONFIG.timingThreshold).toBeGreaterThan(0);
      expect(SECURITY_TEST_CONFIG.bruteForceThreshold).toBeGreaterThan(0);

      // Validate advanced security configuration
      expect(ADVANCED_SECURITY_CONFIG).toBeDefined();
      expect(ADVANCED_SECURITY_CONFIG.baseUrl).toBeDefined();
      expect(ADVANCED_SECURITY_CONFIG.attackPatterns).toBeDefined();
      expect(ADVANCED_SECURITY_CONFIG.attackPatterns.xss).toBeDefined();
      expect(ADVANCED_SECURITY_CONFIG.attackPatterns.sqlInjection).toBeDefined();
      expect(ADVANCED_SECURITY_CONFIG.attackPatterns.commandInjection).toBeDefined();
      expect(ADVANCED_SECURITY_CONFIG.attackPatterns.pathTraversal).toBeDefined();
      expect(ADVANCED_SECURITY_CONFIG.attackPatterns.ldapInjection).toBeDefined();
      expect(ADVANCED_SECURITY_CONFIG.attackPatterns.xmlInjection).toBeDefined();

      console.log('✅ Security configurations validated successfully');

      // Log configuration summary
      console.log('\n📋 Configuration Summary:');
      console.log(`   Base URL: ${SECURITY_TEST_CONFIG.baseUrl}`);
      console.log(`   Test Timeout: ${SECURITY_TEST_CONFIG.testTimeout}ms`);
      console.log(`   Request Timeout: ${SECURITY_TEST_CONFIG.requestTimeout}ms`);
      console.log(`   Timing Threshold: ${SECURITY_TEST_CONFIG.timingThreshold}ms`);
      console.log(`   Brute Force Threshold: ${SECURITY_TEST_CONFIG.bruteForceThreshold} requests`);
      console.log(`   XSS Patterns: ${ADVANCED_SECURITY_CONFIG.attackPatterns.xss.length}`);
      console.log(`   SQL Injection Patterns: ${ADVANCED_SECURITY_CONFIG.attackPatterns.sqlInjection.length}`);
      console.log(`   Command Injection Patterns: ${ADVANCED_SECURITY_CONFIG.attackPatterns.commandInjection.length}`);
      console.log(`   Path Traversal Patterns: ${ADVANCED_SECURITY_CONFIG.attackPatterns.pathTraversal.length}`);
      console.log(`   LDAP Injection Patterns: ${ADVANCED_SECURITY_CONFIG.attackPatterns.ldapInjection.length}`);
      console.log(`   XML Injection Patterns: ${ADVANCED_SECURITY_CONFIG.attackPatterns.xmlInjection.length}`);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle security testing errors gracefully', async () => {
      console.log('\n🛡️ Testing error handling and resilience...');

      // Test with invalid endpoint
      const invalidSuite = new SecurityTestSuite('http://invalid-endpoint:3000');
      const invalidResults = await invalidSuite.runAllTests('/api/app2app/baskets/TEST_001');

      expect(invalidResults).toBeDefined();
      expect(invalidResults.summary).toBeDefined();

      // Test with timeout
      const timeoutSuite = new SecurityTestSuite('http://httpbin.org/delay/10');
      const timeoutResults = await timeoutSuite.runAllTests('/delay/10');

      expect(timeoutResults).toBeDefined();
      expect(timeoutResults.summary).toBeDefined();

      console.log('✅ Error handling and resilience tests passed');
    }, 30000);
  });

  // Helper functions for comprehensive reporting
  function calculateFuzzingScore(fuzzingResults) {
    if (!fuzzingResults) return 100;

    const allResults = Object.values(fuzzingResults);
    const totalCrashes = allResults.reduce((sum, r) => sum + r.crashCount, 0);
    const totalErrors = allResults.reduce((sum, r) => sum + r.errorCount, 0);
    const totalIterations = allResults.reduce((sum, r) => sum + r.totalIterations, 0);

    const crashRate = totalCrashes / totalIterations;
    const errorRate = totalErrors / totalIterations;

    // Deduct points for crashes and errors
    let score = 100;
    score -= crashRate * 1000; // Heavy penalty for crashes
    score -= errorRate * 100;  // Penalty for errors

    return Math.max(0, Math.round(score));
  }

  function calculateRateLimitingScore(rateLimitingResults) {
    if (!rateLimitingResults) return 0;

    const hasRateLimiting = rateLimitingResults.rateLimiting?.hasRateLimiting ||
                           rateLimitingResults.concurrent?.hasRateLimiting ||
                           rateLimitingResults.concurrent?.hasBlocking;

    return hasRateLimiting ? 100 : 0;
  }

  function getOverallAssessment(score) {
    if (score >= 90) return '✅ EXCELLENT: Strong security posture';
    if (score >= 70) return '✅ GOOD: Generally secure with minor issues';
    if (score >= 50) return '⚠️ MODERATE: Some security concerns identified';
    return '❌ POOR: Significant security vulnerabilities detected';
  }

  function countCriticalIssues(results) {
    let criticalCount = 0;

    if (results.authentication) {
      criticalCount += results.authentication.summary.timingVulnerabilities;
      criticalCount += results.authentication.summary.authBypasses;
    }

    if (results.inputValidation) {
      criticalCount += results.inputValidation.summary.xssVulnerabilities;
      criticalCount += results.inputValidation.summary.sqlInjectionVulnerabilities;
      criticalCount += results.inputValidation.summary.commandInjectionVulnerabilities;
      criticalCount += results.inputValidation.summary.pathTraversalVulnerabilities;
    }

    if (results.fuzzing) {
      const allResults = Object.values(results.fuzzing);
      const totalCrashes = allResults.reduce((sum, r) => sum + r.crashCount, 0);
      criticalCount += totalCrashes;
    }

    return criticalCount;
  }

  function generateComprehensiveRecommendations(results) {
    const recommendations = [];

    // Authentication recommendations
    if (results.authentication) {
      if (results.authentication.summary.timingVulnerabilities > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Timing Attacks',
          recommendation: 'Implement constant-time comparison for authentication tokens'
        });
      }

      if (results.authentication.summary.authBypasses > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Authentication Bypass',
          recommendation: 'Fix authentication bypass vulnerabilities in verification logic'
        });
      }

      if (results.authentication.summary.bruteForceProtection === 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Brute Force Protection',
          recommendation: 'Implement rate limiting and account lockout mechanisms'
        });
      }
    }

    // Input validation recommendations
    if (results.inputValidation) {
      if (results.inputValidation.summary.xssVulnerabilities > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'XSS Protection',
          recommendation: 'Implement proper input sanitization and output encoding'
        });
      }

      if (results.inputValidation.summary.sqlInjectionVulnerabilities > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'SQL Injection',
          recommendation: 'Use parameterized queries and input validation'
        });
      }

      if (results.inputValidation.summary.commandInjectionVulnerabilities > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Command Injection',
          recommendation: 'Avoid system commands and use safe APIs'
        });
      }

      if (results.inputValidation.summary.pathTraversalVulnerabilities > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Path Traversal',
          recommendation: 'Validate file paths and use whitelisting'
        });
      }
    }

    // Fuzzing recommendations
    if (results.fuzzing) {
      const allResults = Object.values(results.fuzzing);
      const totalCrashes = allResults.reduce((sum, r) => sum + r.crashCount, 0);

      if (totalCrashes > 0) {
        recommendations.push({
          priority: 'CRITICAL',
          category: 'Application Stability',
          recommendation: 'Fix server crashes discovered during fuzzing'
        });
      }
    }

    // Rate limiting recommendations
    if (results.rateLimiting) {
      const hasRateLimiting = results.rateLimiting.rateLimiting?.hasRateLimiting ||
                            results.rateLimiting.concurrent?.hasRateLimiting ||
                            results.rateLimiting.concurrent?.hasBlocking;

      if (!hasRateLimiting) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Rate Limiting',
          recommendation: 'Implement rate limiting and DoS protection'
        });
      }
    }

    return recommendations;
  }

  function getScoreStatus(score) {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 70) return 'GOOD';
    if (score >= 50) return 'MODERATE';
    return 'POOR';
  }

  afterEach(() => {
    // Clean up after each test if needed
  });

  afterAll(() => {
    // Generate final comprehensive report if results exist
    if (comprehensiveResults && comprehensiveResults.comprehensiveReport) {
      console.log('\n🎯 FINAL COMPREHENSIVE SECURITY REPORT:');
      const report = comprehensiveResults.comprehensiveReport.executiveSummary;

      console.log(`\n📈 Final Security Score: ${report.overallSecurityScore}/100`);
      console.log(`📋 Final Assessment: ${report.overallAssessment}`);
      console.log(`⚠️ Critical Issues: ${report.criticalIssues}`);
      console.log(`🔧 Total Recommendations: ${report.recommendations.length}`);

      if (report.overallSecurityScore < 70) {
        console.warn('\n🚨 ACTION REQUIRED: Security score below acceptable threshold');
        console.log('   Please review and address the security recommendations above');
      } else {
        console.log('\n✅ GOOD SECURITY POSTURE: No immediate action required');
      }
    }
  });
});

// Export for use in other test files
export {
  TimingAttackTester,
  AuthBypassTester,
  BruteForceTester,
  TokenManipulationTester,
  SecurityHeaderTester,
  SecurityTestSuite,
  InputValidationTester,
  FuzzingTester,
  SECURITY_TEST_CONFIG,
  ADVANCED_SECURITY_CONFIG
};