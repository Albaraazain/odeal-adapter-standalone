#!/usr/bin/env node

/**
 * Authentication Testing Example Script
 * Demonstrates how to use the comprehensive authentication test utilities
 */

import { AuthTestClient } from '../__tests__/utils/authTestClient.js';
import { AuthScenarios } from '../__tests__/utils/authScenarios.js';
import { SecurityTestUtils } from '../__tests__/utils/securityTestUtils.js';

/**
 * Main authentication testing example
 */
async function runAuthTestingExample() {
  console.log('🔐 Ödeal Authentication Testing Example');
  console.log('=====================================\n');

  // Configuration
  const config = {
    endpoint: process.env.TEST_ENDPOINT || 'http://localhost:3000/api/app2app/baskets/TEST_001',
    authKey: process.env.ODEAL_REQUEST_KEY || 'test-key-123',
    iterations: parseInt(process.env.TEST_ITERATIONS) || 100,
    concurrent: process.env.TEST_CONCURRENT === 'true'
  };

  console.log('Configuration:');
  console.log(`- Endpoint: ${config.endpoint}`);
  console.log(`- Auth Key: ${config.authKey}`);
  console.log(`- Iterations: ${config.iterations}`);
  console.log(`- Concurrent: ${config.concurrent}\n`);

  try {
    // Initialize test utilities
    console.log('🚀 Initializing test utilities...');
    const authClient = new AuthTestClient({
      baseURL: config.endpoint.replace('/api/app2app/baskets/TEST_001', ''),
      defaultKey: config.authKey,
      timeout: 10000
    });

    const authScenarios = new AuthScenarios(authClient);
    const securityUtils = new SecurityTestUtils(authClient);

    console.log('✅ Test utilities initialized\n');

    // Step 1: Basic Authentication Testing
    console.log('📋 Step 1: Basic Authentication Testing');
    console.log('--------------------------------------');

    const basicAuthResults = await authClient.testAuthentication(config.endpoint, {
      valid: true,
      missing: true,
      invalid: true,
      malformed: true
    });

    console.log('Results:');
    console.log(`- Valid Authentication: ${basicAuthResults.valid?.status === 200 ? '✅ PASS' : '❌ FAIL'} (${basicAuthResults.valid?.status})`);
    console.log(`- Missing Authentication: ${basicAuthResults.missing?.status === 401 ? '✅ PASS' : '❌ FAIL'} (${basicAuthResults.missing?.status})`);
    console.log(`- Invalid Authentication: ${basicAuthResults.invalid?.status === 401 ? '✅ PASS' : '❌ FAIL'} (${basicAuthResults.invalid?.status})`);
    console.log(`- Malformed Authentication: ${basicAuthResults.malformed?.status === 401 || basicAuthResults.malformed?.status === 400 ? '✅ PASS' : '❌ FAIL'} (${basicAuthResults.malformed?.status})\n`);

    // Step 2: Authentication Scenarios Testing
    console.log('🧪 Step 2: Authentication Scenarios Testing');
    console.log('-----------------------------------------');

    console.log('Testing various authentication scenarios...');
    const scenarioResults = await authScenarios.runAllScenarios(config.endpoint);

    // Summary of scenario results
    const scenarioSummary = summarizeScenarioResults(scenarioResults);
    console.log('Scenario Summary:');
    console.log(`- Total Scenarios: ${scenarioSummary.total}`);
    console.log(`- Passed: ${scenarioSummary.passed}`);
    console.log(`- Failed: ${scenarioSummary.failed}`);
    console.log(`- Vulnerable: ${scenarioSummary.vulnerable}\n`);

    // Step 3: Security Testing
    console.log('🔒 Step 3: Security Testing');
    console.log('---------------------------');

    console.log('Running comprehensive security tests...');
    const securityResults = await securityUtils.runSecurityTests(config.endpoint);

    console.log('Security Results:');
    console.log(`- Security Score: ${securityResults.securityScore}/100`);
    console.log(`- Total Vulnerabilities: ${securityResults.vulnerabilities.length}`);
    console.log(`- Critical: ${securityResults.analysis.criticalVulnerabilities}`);
    console.log(`- High: ${securityResults.analysis.highVulnerabilities}`);
    console.log(`- Medium: ${securityResults.analysis.mediumVulnerabilities}`);
    console.log(`- Low: ${securityResults.analysis.lowVulnerabilities}`);
    console.log(`- Risk Level: ${securityResults.analysis.riskLevel.toUpperCase()}\n`);

    // Step 4: Performance Testing
    console.log('⚡ Step 4: Performance Testing');
    console.log('------------------------------');

    console.log('Testing rate limiting and performance...');
    const performanceResults = await authClient.testRateLimiting(config.endpoint, 50, config.concurrent);

    console.log('Performance Results:');
    console.log(`- Total Requests: ${performanceResults.totalRequests}`);
    console.log(`- Successful: ${performanceResults.successfulRequests}`);
    console.log(`- Rate Limited: ${performanceResults.rateLimitedRequests}`);
    console.log(`- Requests/Second: ${performanceResults.requestsPerSecond.toFixed(2)}`);
    console.log(`- Average Response Time: ${performanceResults.averageResponseTime.toFixed(2)}ms\n`);

    // Step 5: Timing Attack Testing
    console.log('⏱️  Step 5: Timing Attack Testing');
    console.log('---------------------------------');

    console.log('Testing for timing attack vulnerabilities...');
    const timingResults = await authClient.testTimingAttack(config.endpoint, config.iterations);

    console.log('Timing Attack Results:');
    console.log(`- Valid Response Time: ${timingResults.validResponse.mean.toFixed(2)}ms`);
    console.log(`- Invalid Response Time: ${timingResults.invalidResponse.mean.toFixed(2)}ms`);
    console.log(`- Time Difference: ${timingResults.timingDifference.toFixed(2)}ms`);
    console.log(`- Vulnerable: ${timingResults.timingDifference > 5 ? '⚠️  YES' : '✅ NO'}\n`);

    // Step 6: Brute Force Testing
    console.log('🔨 Step 6: Brute Force Testing');
    console.log('-----------------------------');

    console.log('Testing brute force protection...');
    const bruteForceResults = await authClient.testBruteForce(config.endpoint, 32, config.iterations);

    console.log('Brute Force Results:');
    console.log(`- Attempts: ${bruteForceResults.attempts}`);
    console.log(`- Successful: ${bruteForceResults.successfulAttempts}`);
    console.log(`- Success Rate: ${(bruteForceResults.successRate * 100).toFixed(4)}%`);
    console.log(`- Vulnerable: ${bruteForceResults.successRate > 0.001 ? '⚠️  YES' : '✅ NO'}\n`);

    // Step 7: Generate Comprehensive Report
    console.log('📊 Step 7: Comprehensive Report');
    console.log('--------------------------------');

    const authReport = authScenarios.generateReport(scenarioResults);
    const securityReport = securityUtils.generateSecurityReport(config.endpoint);

    console.log('Authentication Test Report:');
    console.log(`- Security Score: ${authReport.securityScore}/100`);
    console.log(`- Recommendations: ${authReport.recommendations.length}`);

    console.log('\nSecurity Test Report:');
    console.log(`- Security Score: ${securityResults.securityScore}/100`);
    console.log(`- Vulnerabilities: ${securityResults.vulnerabilities.length}`);
    console.log(`- Recommendations: ${securityResults.recommendations.length}`);

    // Step 8: Recommendations
    console.log('\n💡 Step 8: Recommendations');
    console.log('---------------------------');

    displayRecommendations(securityResults.vulnerabilities, securityResults.recommendations);

    // Step 9: Save Results
    console.log('\n💾 Step 9: Saving Results');
    console.log('-------------------------');

    const results = {
      config,
      timestamp: new Date().toISOString(),
      basicAuthResults,
      scenarioResults,
      securityResults,
      performanceResults,
      timingResults,
      bruteForceResults,
      authReport,
      securityReport
    };

    // Save results to file
    const fs = await import('fs');
    const resultsPath = `./auth-test-results-${Date.now()}.json`;
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`Results saved to: ${resultsPath}`);

    // Step 10: Summary
    console.log('\n🎯 Step 10: Summary');
    console.log('---------------------');

    const overallScore = Math.round((authReport.securityScore + securityResults.securityScore) / 2);
    const overallRisk = determineOverallRisk(securityResults);

    console.log('Overall Assessment:');
    console.log(`- Overall Security Score: ${overallScore}/100`);
    console.log(`- Overall Risk Level: ${overallRisk.toUpperCase()}`);
    console.log(`- Total Test Scenarios: ${scenarioSummary.total}`);
    console.log(`- Security Tests Passed: ${scenarioSummary.passed}`);
    console.log(`- Issues Found: ${scenarioSummary.failed + securityResults.vulnerabilities.length}`);

    if (overallScore >= 80) {
      console.log('\n🎉 Excellent security posture detected!');
    } else if (overallScore >= 60) {
      console.log('\n✅ Good security posture with room for improvement.');
    } else {
      console.log('\n⚠️  Security concerns detected. Address issues promptly.');
    }

    console.log('\n✅ Authentication testing completed successfully!');

  } catch (error) {
    console.error('❌ Error during authentication testing:', error);
    process.exit(1);
  }
}

/**
 * Summarize scenario results
 */
function summarizeScenarioResults(results) {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let vulnerable = 0;

  for (const [scenarioName, scenarioResults] of Object.entries(results)) {
    if (typeof scenarioResults === 'object' && scenarioResults !== null) {
      for (const [subtestName, subtestResult] of Object.entries(scenarioResults)) {
        total++;
        if (subtestResult.successful === true) {
          passed++;
        } else if (subtestResult.successful === false) {
          failed++;
        }

        // Check for potential vulnerabilities
        if (isPotentiallyVulnerable(subtestResult)) {
          vulnerable++;
        }
      }
    }
  }

  return { total, passed, failed, vulnerable };
}

/**
 * Check if a test result indicates potential vulnerability
 */
function isPotentiallyVulnerable(result) {
  if (!result || typeof result !== 'object') return false;

  // Check if injection attacks were successful
  if (result.successful === true && result.key) {
    const key = result.key.toLowerCase();
    if (key.includes('<script>') ||
        key.includes('select') ||
        key.includes('union') ||
        key.includes('drop') ||
        key.includes('../') ||
        key.includes('..\\')) {
      return true;
    }
  }

  // Check if malformed input was accepted
  if (result.successful === true && result.key) {
    const key = result.key;
    if (key.includes('\x00') ||
        key.includes('\n') ||
        key.includes('\r') ||
        key.includes('\t')) {
      return true;
    }
  }

  // Check if unexpected status codes were returned
  if (result.status && result.status >= 500) {
    return true;
  }

  return false;
}

/**
 * Determine overall risk level
 */
function determineOverallRisk(securityResults) {
  if (securityResults.analysis.criticalVulnerabilities > 0) {
    return 'critical';
  } else if (securityResults.analysis.highVulnerabilities > 0) {
    return 'high';
  } else if (securityResults.analysis.mediumVulnerabilities > 0) {
    return 'medium';
  } else if (securityResults.analysis.lowVulnerabilities > 0) {
    return 'low';
  } else {
    return 'minimal';
  }
}

/**
 * Display recommendations
 */
function displayRecommendations(vulnerabilities, recommendations) {
  if (vulnerabilities.length === 0) {
    console.log('✅ No security vulnerabilities detected.');
    return;
  }

  console.log('🚨 Security Vulnerabilities Found:');
  console.log('================================');

  for (const vuln of vulnerabilities) {
    const emoji = getSeverityEmoji(vuln.severity);
    console.log(`${emoji} ${vuln.type} (${vuln.severity.toUpperCase()})`);
    console.log(`   Description: ${vuln.description}`);
    if (vuln.recommendation) {
      console.log(`   Recommendation: ${vuln.recommendation}`);
    }
    console.log('');
  }

  console.log('💡 General Recommendations:');
  console.log('==========================');

  for (const rec of recommendations) {
    console.log(`• ${rec.recommendation} (${rec.priority} priority)`);
  }
}

/**
 * Get severity emoji
 */
function getSeverityEmoji(severity) {
  switch (severity) {
    case 'critical': return '🚨';
    case 'high': return '⚠️';
    case 'medium': return '⚡';
    case 'low': return '⚪';
    default: return '🔵';
  }
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
🔐 Ödeal Authentication Testing Example

Usage:
  node authTestingExample.js [options]

Environment Variables:
  TEST_ENDPOINT        Target endpoint to test (default: http://localhost:3000/api/app2app/baskets/TEST_001)
  ODEAL_REQUEST_KEY    Authentication key (default: test-key-123)
  TEST_ITERATIONS      Number of test iterations (default: 100)
  TEST_CONCURRENT      Run tests concurrently (default: false)

Examples:
  # Test with default settings
  node authTestingExample.js

  # Test custom endpoint
  TEST_ENDPOINT=http://localhost:3000/api/app2app/baskets/CUSTOM_001 node authTestingExample.js

  # Test with custom authentication key
  ODEAL_REQUEST_KEY=your-api-key node authTestingExample.js

  # Test with more iterations
  TEST_ITERATIONS=1000 node authTestingExample.js

  # Test concurrent requests
  TEST_CONCURRENT=true node authTestingExample.js

Features:
  ✅ Comprehensive authentication testing
  ✅ Security vulnerability scanning
  ✅ Performance testing
  ✅ Rate limiting detection
  ✅ Timing attack detection
  ✅ Brute force protection testing
  ✅ Detailed reporting and recommendations
  ✅ JSON export functionality

The script will:
  1. Test basic authentication scenarios
  2. Run comprehensive security tests
  3. Check for timing attack vulnerabilities
  4. Test brute force protection
  5. Generate detailed reports
  6. Provide security recommendations
  7. Save results to JSON file

For more information, see the documentation in the __tests__/utils/ directory.
`);
}

// Main execution
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  displayHelp();
  process.exit(0);
}

// Run the example
runAuthTestingExample().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});