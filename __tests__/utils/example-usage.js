#!/usr/bin/env node

/**
 * Ödeal Vercel Functions Test Utilities - Example Usage
 *
 * This file demonstrates how to use the comprehensive test utilities
 * for testing Ödeal Vercel functions.
 *
 * @author Test Utilities Specialist
 * @date 2025-09-22
 * @version 1.0.0
 */

const {
  OdealTestUtilities,
  TestHttpClient,
  TestDataFactory,
  PerformanceTestUtils,
  TestResultValidator
} = require('./test-http-client');

/**
 * Example 1: Basic Test Usage
 */
async function basicTestExample() {
  console.log('🧪 Example 1: Basic Test Usage\n');

  // Initialize test utilities
  const testUtils = new OdealTestUtilities('local');

  // Create test data
  const basket = testUtils.testDataFactory.createBasket({
    referenceCode: 'EXAMPLE_001',
    total: 150.00
  });

  console.log('📦 Created test basket:', basket.referenceCode);

  // Test basket endpoint
  try {
    const response = await testUtils.httpClient.getBasket(basket.referenceCode);
    console.log('✅ Basket response status:', response.status);

    // Validate response
    const errors = testUtils.resultValidator.validateBasketResponse(response);
    if (errors.length === 0) {
      console.log('✅ Basket validation passed');
    } else {
      console.log('❌ Basket validation errors:', errors);
    }
  } catch (error) {
    console.log('❌ Basket test failed:', error.message);
  }

  // Test webhook endpoint
  const webhook = testUtils.testDataFactory.createWebhookPayload(
    'payment-succeeded',
    basket.referenceCode,
    { amount: 150.00 }
  );

  try {
    const response = await testUtils.httpClient.postWebhook('payment-succeeded', webhook);
    console.log('✅ Webhook response status:', response.status);

    // Validate response
    const errors = testUtils.resultValidator.validateWebhookResponse(response);
    if (errors.length === 0) {
      console.log('✅ Webhook validation passed');
    } else {
      console.log('❌ Webhook validation errors:', errors);
    }
  } catch (error) {
    console.log('❌ Webhook test failed:', error.message);
  }
}

/**
 * Example 2: Authentication Testing
 */
async function authenticationTestExample() {
  console.log('\n🔐 Example 2: Authentication Testing\n');

  const client = new TestHttpClient('local');
  const referenceCode = TestDataFactory.generateReferenceCode('AUTH');

  // Test valid authentication
  console.log('🔑 Testing valid authentication...');
  try {
    const response = await client.getBasket(referenceCode);
    console.log('✅ Valid auth - Status:', response.status);
  } catch (error) {
    console.log('❌ Valid auth failed:', error.message);
  }

  // Test invalid authentication
  console.log('🔑 Testing invalid authentication...');
  client.config.odealRequestKey = 'invalid_key';
  try {
    const response = await client.getBasket(referenceCode);
    console.log('❌ Should have failed with invalid auth');
  } catch (error) {
    console.log('✅ Invalid auth correctly rejected - Status:', error.response?.status);
  }

  // Test no authentication
  console.log('🔑 Testing no authentication...');
  client.config.odealRequestKey = null;
  try {
    const response = await client.getBasket(referenceCode);
    console.log('❌ Should have failed with no auth');
  } catch (error) {
    console.log('✅ No auth correctly rejected - Status:', error.response?.status);
  }
}

/**
 * Example 3: Performance Testing
 */
async function performanceTestExample() {
  console.log('\n⚡ Example 3: Performance Testing\n');

  const client = new TestHttpClient('local');
  const referenceCode = TestDataFactory.generateReferenceCode('PERF');

  // Single request performance
  console.log('📏 Testing single request performance...');
  const result = await PerformanceTestUtils.measureResponseTime(async () => {
    return await client.getBasket(referenceCode);
  });

  console.log(`⏱️  Single request time: ${result.duration}ms`);

  // Load testing
  console.log('📊 Testing load performance...');
  const loadResult = await PerformanceTestUtils.runLoadTest(async () => {
    return await client.getBasket(TestDataFactory.generateReferenceCode('LOAD'));
  }, 5); // 5 concurrent requests

  console.log(`📈 Load test results:`);
  console.log(`   Total requests: ${loadResult.totalRequests}`);
  console.log(`   Successful: ${loadResult.successful}`);
  console.log(`   Failed: ${loadResult.failed}`);
  console.log(`   Success rate: ${(loadResult.successRate * 100).toFixed(2)}%`);
  console.log(`   Average response time: ${loadResult.averageResponseTime.toFixed(2)}ms`);
}

/**
 * Example 4: Test Data Factory Usage
 */
async function testDataFactoryExample() {
  console.log('\n🏭 Example 4: Test Data Factory Usage\n');

  // Create various types of test data
  console.log('📦 Creating test data...');

  // Basic basket
  const basicBasket = TestDataFactory.createBasket();
  console.log('🛒 Basic basket:', basicBasket.referenceCode);

  // Large basket
  const largeBasket = TestDataFactory.createLargeBasket(10);
  console.log('🛒 Large basket with items:', largeBasket.products.length);

  // Basket with special characters
  const specialBasket = TestDataFactory.createBasketWithSpecialCharacters();
  console.log('🛒 Special characters basket:', specialBasket.referenceCode);

  // Webhook payloads
  const successWebhook = TestDataFactory.createWebhookPayload('payment-succeeded', 'TEST_123');
  console.log('🔔 Success webhook:', successWebhook.paymentId);

  const failedWebhook = TestDataFactory.createWebhookPayload('payment-failed', 'TEST_123');
  console.log('🔔 Failed webhook:', failedWebhook.errorCode);

  const cancelledWebhook = TestDataFactory.createWebhookPayload('payment-cancelled', 'TEST_123');
  console.log('🔔 Cancelled webhook:', cancelledWebhook.reason);

  console.log('✅ Test data creation complete');
}

/**
 * Example 5: Error Scenario Testing
 */
async function errorScenarioExample() {
  console.log('\n⚠️  Example 5: Error Scenario Testing\n');

  const client = new TestHttpClient('local');

  // Test non-existent reference code
  console.log('🔍 Testing non-existent reference code...');
  try {
    const response = await client.getBasket('NONEXISTENT_999');
    console.log('📄 Response status:', response.status);
    console.log('📄 Response data:', response.data);
  } catch (error) {
    console.log('⚠️  Non-existent test error:', error.message);
  }

  // Test invalid webhook payload
  console.log('🔍 Testing invalid webhook payload...');
  try {
    const response = await client.postWebhook('payment-succeeded', { invalid: 'data' });
    console.log('📄 Response status:', response.status);
  } catch (error) {
    console.log('⚠️  Invalid webhook error:', error.message);
  }

  // Test malformed JSON
  console.log('🔍 Testing malformed JSON...');
  try {
    const response = await client.postWebhook('payment-succeeded', 'invalid json');
    console.log('📄 Response status:', response.status);
  } catch (error) {
    console.log('⚠️  Malformed JSON error:', error.message);
  }
}

/**
 * Example 6: Integration Testing
 */
async function integrationTestExample() {
  console.log('\n🔗 Example 6: Integration Testing\n');

  const testUtils = new OdealTestUtilities('local');

  // Create complete test scenario
  const scenario = {
    basket: testUtils.testDataFactory.createBasket({
      referenceCode: 'INTEGRATION_001',
      total: 200.00
    }),
    webhook: testUtils.testDataFactory.createWebhookPayload(
      'payment-succeeded',
      'INTEGRATION_001',
      { amount: 200.00 }
    )
  };

  console.log('🔄 Testing complete integration flow...');

  // Step 1: Test basket retrieval
  console.log('  Step 1: Basket retrieval...');
  try {
    const basketResponse = await testUtils.httpClient.getBasket(scenario.basket.referenceCode);
    console.log(`  ✅ Basket status: ${basketResponse.status}`);
  } catch (error) {
    console.log(`  ❌ Basket failed: ${error.message}`);
    return;
  }

  // Step 2: Test webhook processing
  console.log('  Step 2: Webhook processing...');
  try {
    const webhookResponse = await testUtils.httpClient.postWebhook(
      'payment-succeeded',
      scenario.webhook
    );
    console.log(`  ✅ Webhook status: ${webhookResponse.status}`);
  } catch (error) {
    console.log(`  ❌ Webhook failed: ${error.message}`);
    return;
  }

  // Step 3: Test duplicate webhook (idempotency)
  console.log('  Step 3: Idempotency test...');
  try {
    const duplicateResponse = await testUtils.httpClient.postWebhook(
      'payment-succeeded',
      scenario.webhook
    );
    console.log(`  ✅ Duplicate webhook status: ${duplicateResponse.status}`);
  } catch (error) {
    console.log(`  ❌ Duplicate webhook failed: ${error.message}`);
  }

  console.log('✅ Integration test completed');
}

/**
 * Example 7: Environment Testing
 */
async function environmentTestExample() {
  console.log('\n🌍 Example 7: Environment Testing\n');

  const environments = ['local', 'staging', 'production'];

  for (const env of environments) {
    console.log(`🧪 Testing ${env} environment...`);

    try {
      const testUtils = new OdealTestUtilities(env);
      const referenceCode = TestDataFactory.generateReferenceCode(`ENV_${env.toUpperCase()}`);

      const response = await testUtils.httpClient.getBasket(referenceCode);
      console.log(`  ✅ ${env}: Status ${response.status}`);

      // Test configuration
      console.log(`  📊 ${env} config:`);
      console.log(`     - Vercel URL: ${testUtils.config.vercelUrl || 'N/A'}`);
      console.log(`     - Supabase URL: ${testUtils.config.supabaseUrl}`);
      console.log(`     - Basket Provider: ${testUtils.config.basketProvider}`);
    } catch (error) {
      console.log(`  ❌ ${env}: ${error.message}`);
    }
  }
}

/**
 * Example 8: Complete Test Suite
 */
async function completeTestSuiteExample() {
  console.log('\n🎯 Example 8: Complete Test Suite\n');

  const testUtils = new OdealTestUtilities('local');

  console.log('🚀 Running complete test suite...');

  // Run all test types
  const results = {
    basic: await testUtils.runBasicTests(),
    auth: await testUtils.runAuthenticationTests(),
    performance: await testUtils.runPerformanceTests()
  };

  // Generate comprehensive report
  const report = testUtils.generateTestReport(
    results.basic,
    results.auth,
    results.performance
  );

  console.log('📊 Test Suite Results:');
  console.log(`   Basic Tests: ${report.summary.basic.passed}/${report.summary.basic.total} passed`);
  console.log(`   Auth Tests: ${report.summary.auth.passed}/${report.summary.auth.total} passed`);
  console.log(`   Performance: ${report.summary.performance.successRate}`);

  // Display detailed results
  console.log('\n📋 Detailed Results:');
  console.log(JSON.stringify(report.details, null, 2));

  return report;
}

/**
 * Main function to run all examples
 */
async function runExamples() {
  console.log('🎭 Ödeal Vercel Functions Test Utilities - Examples\n');
  console.log('This script demonstrates various ways to use the test utilities.\n');

  try {
    // Run examples
    await basicTestExample();
    await authenticationTestExample();
    await performanceTestExample();
    await testDataFactoryExample();
    await errorScenarioExample();
    await integrationTestExample();
    await environmentTestExample();
    await completeTestSuiteExample();

    console.log('\n🎉 All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Examples failed:', error);
    process.exit(1);
  }
}

// Run examples if called directly
if (require.main === module) {
  runExamples().catch(console.error);
}

module.exports = {
  basicTestExample,
  authenticationTestExample,
  performanceTestExample,
  testDataFactoryExample,
  errorScenarioExample,
  integrationTestExample,
  environmentTestExample,
  completeTestSuiteExample,
  runExamples
};