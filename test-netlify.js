#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🧪 Testing Ödeal adapter Netlify deployment...');

const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to run tests
function runTest(name, command, expectedExitCode = 0) {
  try {
    console.log(`\n🔍 Testing: ${name}`);
    const result = execSync(command, {
      encoding: 'utf8',
      cwd: __dirname,
      timeout: 30000
    });

    console.log(`✅ ${name} - PASSED`);
    testResults.passed.push({ name, result: result.trim() });
    return true;
  } catch (error) {
    if (error.status === expectedExitCode) {
      console.log(`✅ ${name} - PASSED (expected exit code ${expectedExitCode})`);
      testResults.passed.push({ name, result: error.stdout.trim() });
      return true;
    }

    console.error(`❌ ${name} - FAILED`);
    console.error(`   Exit code: ${error.status}`);
    console.error(`   Error: ${error.message}`);
    testResults.failed.push({ name, error: error.message });
    return false;
  }
}

// Test functions
async function runAllTests() {
  console.log('🚀 Starting Netlify deployment tests...\n');

  // Test 1: Build process
  const buildTest = runTest('Build Process', 'node build-netlify.js');

  // Test 2: Check if dist directory exists
  const distExists = existsSync(join(__dirname, 'dist'));
  if (distExists) {
    console.log('✅ Dist directory exists');
    testResults.passed.push({ name: 'Dist directory exists' });
  } else {
    console.log('❌ Dist directory missing');
    testResults.failed.push({ name: 'Dist directory missing' });
  }

  // Test 3: Check Netlify functions
  const functionsDir = join(__dirname, 'dist', 'netlify', 'functions');
  const functionsExist = existsSync(functionsDir);
  if (functionsExist) {
    console.log('✅ Netlify functions directory exists');
    testResults.passed.push({ name: 'Functions directory exists' });
  } else {
    console.log('❌ Netlify functions directory missing');
    testResults.failed.push({ name: 'Functions directory missing' });
  }

  // Test 4: Check required functions
  const requiredFunctions = [
    'health.js',
    'webhooks-odeal-payment-succeeded.js',
    'webhooks-odeal-payment-failed.js',
    'webhooks-odeal-payment-cancelled.js',
    'app2app-baskets.js'
  ];

  for (const func of requiredFunctions) {
    const funcPath = join(functionsDir, func);
    if (existsSync(funcPath)) {
      console.log(`✅ Function ${func} exists`);
      testResults.passed.push({ name: `Function ${func} exists` });
    } else {
      console.log(`❌ Function ${func} missing`);
      testResults.failed.push({ name: `Function ${func} missing` });
    }
  }

  // Test 5: Check netlify.toml
  const netlifyTomlExists = existsSync(join(__dirname, 'dist', 'netlify.toml'));
  if (netlifyTomlExists) {
    console.log('✅ netlify.toml exists');
    testResults.passed.push({ name: 'netlify.toml exists' });
  } else {
    console.log('❌ netlify.toml missing');
    testResults.failed.push({ name: 'netlify.toml missing' });
  }

  // Test 6: Check if package.json exists
  const packageJsonExists = existsSync(join(__dirname, 'dist', 'package.json'));
  if (packageJsonExists) {
    console.log('✅ package.json exists');
    testResults.passed.push({ name: 'package.json exists' });
  } else {
    console.log('❌ package.json missing');
    testResults.failed.push({ name: 'package.json missing' });
  }

  // Test 7: Check if deploy script exists
  const deployScriptExists = existsSync(join(__dirname, 'deploy-netlify.sh'));
  if (deployScriptExists) {
    console.log('✅ deploy-netlify.sh exists');
    testResults.passed.push({ name: 'deploy script exists' });
  } else {
    console.log('❌ deploy-netlify.sh missing');
    testResults.failed.push({ name: 'deploy script missing' });
  }

  // Test 8: Check if dev script exists
  const devScriptExists = existsSync(join(__dirname, 'dev-netlify.sh'));
  if (devScriptExists) {
    console.log('✅ dev-netlify.sh exists');
    testResults.passed.push({ name: 'dev script exists' });
  } else {
    console.log('❌ dev-netlify.sh missing');
    testResults.failed.push({ name: 'dev script missing' });
  }

  // Generate test report
  console.log('\n📊 Test Report');
  console.log('================');
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`⚠️  Warnings: ${testResults.warnings.length}`);

  if (testResults.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.failed.forEach((test, index) => {
      console.log(`   ${index + 1}. ${test.name}: ${test.error}`);
    });
  }

  if (testResults.passed.length > 0) {
    console.log('\n✅ Passed Tests:');
    testResults.passed.forEach((test, index) => {
      console.log(`   ${index + 1}. ${test.name}`);
    });
  }

  // Return success/failure
  return testResults.failed.length === 0;
}

// Run all tests
runAllTests().then((success) => {
  if (success) {
    console.log('\n🎉 All tests passed! Ready for Netlify deployment.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please fix the issues before deploying.');
    process.exit(1);
  }
}).catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});