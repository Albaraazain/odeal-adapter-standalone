#!/usr/bin/env node

/**
 * Ödeal Vercel Functions Test Runner
 *
 * This script provides a comprehensive test runner for the Ödeal Vercel functions
 * with support for different test suites and environments.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  testTypes: {
    unit: {
      command: 'npm run test:unit',
      description: 'Run unit tests for individual modules',
      timeout: 30000,
    },
    integration: {
      command: 'npm run test:integration',
      description: 'Run integration tests for API endpoints',
      timeout: 60000,
    },
    performance: {
      command: 'npm run test:performance',
      description: 'Run performance and load tests',
      timeout: 120000,
    },
    e2e: {
      command: 'npm run test:e2e',
      description: 'Run end-to-end tests',
      timeout: 90000,
    },
    all: {
      command: 'npm test',
      description: 'Run all tests',
      timeout: 180000,
    },
    coverage: {
      command: 'npm run test:coverage',
      description: 'Run tests with coverage report',
      timeout: 120000,
    },
  },
  environments: {
    local: {
      description: 'Local development environment',
      envFile: '.env.test',
    },
    vercel: {
      description: 'Vercel deployment environment',
      envFile: '.env.vercel',
    },
    supabase: {
      description: 'Supabase Edge Functions environment',
      envFile: '.env.supabase',
    },
  },
};

class TestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const types = {
      info: '\x1b[36m%s\x1b[0m',
      success: '\x1b[32m%s\x1b[0m',
      warning: '\x1b[33m%s\x1b[0m',
      error: '\x1b[31m%s\x1b[0m',
    };
    console.log(`[${timestamp}] ${types[type] || types.info}`, message);
  }

  async runCommand(command, timeout, env = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { shell: true, stdio: 'pipe', env: { ...process.env, ...env } });
      let stdout = '';
      let stderr = '';

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  async loadEnvironment(envFile) {
    try {
      const envPath = path.join(__dirname, envFile);
      const envContent = await fs.readFile(envPath, 'utf8');
      const envVars = {};

      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          envVars[key] = value.replace(/^["']|["']$/g, '');
        }
      });

      return envVars;
    } catch (error) {
      this.log(`Warning: Could not load environment file ${envFile}: ${error.message}`, 'warning');
      return {};
    }
  }

  async runTest(testType, environment = 'local') {
    const testConfig = TEST_CONFIG.testTypes[testType];
    const envConfig = TEST_CONFIG.environments[environment];

    if (!testConfig) {
      throw new Error(`Unknown test type: ${testType}`);
    }

    if (!envConfig) {
      throw new Error(`Unknown environment: ${environment}`);
    }

    this.log(`Running ${testType} tests in ${environment} environment...`);
    this.log(`Description: ${testConfig.description}`);
    this.log(`Environment: ${envConfig.description}`);

    // Load environment variables
    const envVars = await this.loadEnvironment(envConfig.envFile);

    // Add test-specific environment variables
    envVars.NODE_ENV = 'test';
    envVars.TEST_TYPE = testType;
    envVars.TEST_ENVIRONMENT = environment;

    try {
      const result = await this.runCommand(testConfig.command, testConfig.timeout, envVars);

      this.results.push({
        testType,
        environment,
        success: result.success,
        duration: Date.now() - this.startTime,
        output: result.stdout,
        error: result.stderr,
      });

      if (result.success) {
        this.log(`${testType} tests completed successfully`, 'success');
      } else {
        this.log(`${testType} tests failed with exit code ${result.code}`, 'error');
        if (result.stderr) {
          this.log(`Error output: ${result.stderr}`, 'error');
        }
      }

      return result.success;
    } catch (error) {
      this.log(`${testType} tests failed: ${error.message}`, 'error');

      this.results.push({
        testType,
        environment,
        success: false,
        duration: Date.now() - this.startTime,
        error: error.message,
      });

      return false;
    }
  }

  async runMultipleTests(testTypes, environment = 'local') {
    this.log(`Running multiple test suites in ${environment} environment...`);

    let allPassed = true;
    for (const testType of testTypes) {
      const passed = await this.runTest(testType, environment);
      allPassed = allPassed && passed;
    }

    return allPassed;
  }

  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.filter(r => !r.success).length;
    const totalTests = this.results.length;

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total duration: ${totalDuration}ms`);
    console.log(`Tests passed: ${passedTests}/${totalTests}`);
    console.log(`Tests failed: ${failedTests}/${totalTests}`);

    if (totalTests > 0) {
      const successRate = (passedTests / totalTests) * 100;
      console.log(`Success rate: ${successRate.toFixed(1)}%`);
    }

    console.log('\nTest Results:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`${index + 1}. ${status} ${result.testType} [${result.environment}]${duration}`);
    });

    console.log('='.repeat(60));
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
      },
    };

    const reportPath = path.join(__dirname, 'test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    this.log(`Test report saved to: ${reportPath}`, 'info');

    return report;
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const testRunner = new TestRunner();

  try {
    if (args.length === 0) {
      // Default: run unit and integration tests
      const success = await testRunner.runMultipleTests(['unit', 'integration'], 'local');
      testRunner.printSummary();
      await testRunner.generateReport();
      process.exit(success ? 0 : 1);
    }

    const command = args[0];
    const testType = args[1];
    const environment = args[2] || 'local';

    switch (command) {
      case 'run':
        const success = await testRunner.runTest(testType, environment);
        testRunner.printSummary();
        await testRunner.generateReport();
        process.exit(success ? 0 : 1);

      case 'run-multiple':
        const testTypes = args[1].split(',');
        const multiSuccess = await testRunner.runMultipleTests(testTypes, environment);
        testRunner.printSummary();
        await testRunner.generateReport();
        process.exit(multiSuccess ? 0 : 1);

      case 'list':
        console.log('Available test types:');
        Object.entries(TEST_CONFIG.testTypes).forEach(([key, config]) => {
          console.log(`  ${key}: ${config.description}`);
        });
        console.log('\nAvailable environments:');
        Object.entries(TEST_CONFIG.environments).forEach(([key, config]) => {
          console.log(`  ${key}: ${config.description}`);
        });
        break;

      default:
        console.error('Unknown command:', command);
        console.log('Usage:');
        console.log('  node test-runner.js                          # Run default tests');
        console.log('  node test-runner.js run <testType> [env]   # Run specific test type');
        console.log('  node test-runner.js run-multiple <types> [env] # Run multiple test types');
        console.log('  node test-runner.js list                    # List available tests');
        process.exit(1);
    }
  } catch (error) {
    testRunner.log(`Test runner error: ${error.message}`, 'error');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default TestRunner;