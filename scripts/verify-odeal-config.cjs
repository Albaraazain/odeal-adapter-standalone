#!/usr/bin/env node

/**
 * Ödeal Configuration Verification Script
 *
 * This script verifies that our Netlify basket URL is properly registered
 * with Ödeal's configuration API and tests the complete integration.
 */

const https = require('https');
require('dotenv').config();

const ODEAL_CONFIG_API = 'https://stage.odealapp.com/api/v1/configuration';
const NETLIFY_BASE_URL = 'https://odeal-adapter.netlify.app';

/**
 * Check current Ödeal configuration
 */
async function checkConfiguration() {
    console.log('🔍 Checking current Ödeal configuration...');

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'stage.odealapp.com',
            port: 443,
            path: '/api/v1/configuration',
            method: 'GET',
            headers: {
                'User-Agent': 'ROP-Odeal-Adapter/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const config = JSON.parse(data);
                    console.log(`📡 Configuration API Status: ${res.statusCode}`);
                    console.log('📋 Current Configuration:', JSON.stringify(config, null, 2));
                    console.log('');

                    resolve({
                        statusCode: res.statusCode,
                        config: config
                    });
                } catch (e) {
                    console.log(`📡 Configuration API Status: ${res.statusCode}`);
                    console.log('📋 Raw Response:', data);
                    console.log('');

                    resolve({
                        statusCode: res.statusCode,
                        config: null,
                        raw: data
                    });
                }
            });
        });

        req.on('error', (e) => {
            console.error('❌ Configuration check error:', e.message);
            reject(e);
        });

        req.end();
    });
}

/**
 * Test basket URL with various reference codes
 */
async function testBasketUrls() {
    console.log('🧪 Testing basket URL endpoints...');

    const testCases = [
        'TEST_REGULAR_12345',
        'directcharge?amount=100.0&ref=uuid-test-123',
        'ROP_987654321',
        'CHECK_ABC123'
    ];

    const results = [];

    for (const testRef of testCases) {
        console.log(`  Testing: ${testRef}`);

        const result = await testSingleBasketUrl(testRef);
        results.push({
            referenceCode: testRef,
            ...result
        });

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
}

/**
 * Test a single basket URL
 */
async function testSingleBasketUrl(referenceCode) {
    const testUrl = `${NETLIFY_BASE_URL}/api/app2app/baskets/${encodeURIComponent(referenceCode)}`;

    return new Promise((resolve) => {
        const url = new URL(testUrl);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'X-ODEAL-REQUEST-KEY': process.env.ODEAL_REQUEST_KEY || 'test_key_for_development',
                'User-Agent': 'ROP-Odeal-Adapter/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const success = res.statusCode >= 200 && res.statusCode < 300;
                console.log(`    ${success ? '✅' : '❌'} ${res.statusCode} - ${data.length} bytes`);

                resolve({
                    statusCode: res.statusCode,
                    success: success,
                    responseLength: data.length,
                    response: data.substring(0, 100) + (data.length > 100 ? '...' : '')
                });
            });
        });

        req.on('error', (e) => {
            console.log(`    ❌ Network error: ${e.message}`);
            resolve({
                statusCode: 0,
                success: false,
                error: e.message
            });
        });

        req.setTimeout(10000, () => {
            req.destroy();
            console.log(`    ⏰ Timeout`);
            resolve({
                statusCode: 0,
                success: false,
                error: 'Request timeout'
            });
        });

        req.end();
    });
}

/**
 * Test webhook endpoints
 */
async function testWebhooks() {
    console.log('🎯 Testing webhook endpoints...');

    const webhookEndpoints = [
        '/api/webhooks/odeal/payment-succeeded',
        '/api/webhooks/odeal/payment-failed',
        '/api/webhooks/odeal/payment-cancelled'
    ];

    const results = [];

    for (const endpoint of webhookEndpoints) {
        console.log(`  Testing: ${endpoint}`);

        const result = await testWebhookEndpoint(endpoint);
        results.push({
            endpoint: endpoint,
            ...result
        });

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
}

/**
 * Test a single webhook endpoint
 */
async function testWebhookEndpoint(endpoint) {
    const testUrl = `${NETLIFY_BASE_URL}${endpoint}`;
    const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        referenceCode: 'test_verification_' + Date.now()
    };

    return new Promise((resolve) => {
        const url = new URL(testUrl);
        const postData = JSON.stringify(testPayload);

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'X-ODEAL-REQUEST-KEY': process.env.ODEAL_REQUEST_KEY || 'test_key_for_development',
                'User-Agent': 'ROP-Odeal-Adapter/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const success = res.statusCode >= 200 && res.statusCode < 300;
                console.log(`    ${success ? '✅' : '❌'} ${res.statusCode} - ${data.length} bytes`);

                resolve({
                    statusCode: res.statusCode,
                    success: success,
                    responseLength: data.length,
                    response: data.substring(0, 100) + (data.length > 100 ? '...' : '')
                });
            });
        });

        req.on('error', (e) => {
            console.log(`    ❌ Network error: ${e.message}`);
            resolve({
                statusCode: 0,
                success: false,
                error: e.message
            });
        });

        req.setTimeout(10000, () => {
            req.destroy();
            console.log(`    ⏰ Timeout`);
            resolve({
                statusCode: 0,
                success: false,
                error: 'Request timeout'
            });
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Generate verification report
 */
function generateReport(configCheck, basketTests, webhookTests) {
    console.log('');
    console.log('📊 VERIFICATION REPORT');
    console.log('=====================');
    console.log('');

    // Configuration Status
    console.log('🔧 Configuration Status:');
    if (configCheck.config && configCheck.config.basketUrl) {
        console.log(`   ✅ basketUrl: ${configCheck.config.basketUrl}`);
    } else {
        console.log(`   ❌ basketUrl: NOT REGISTERED`);
    }

    if (configCheck.config && configCheck.config.intentUrl) {
        console.log(`   ✅ intentUrl: ${configCheck.config.intentUrl}`);
    } else {
        console.log(`   ❌ intentUrl: NOT REGISTERED`);
    }
    console.log('');

    // Basket URL Tests
    console.log('🧪 Basket URL Test Results:');
    const successfulBasketTests = basketTests.filter(t => t.success).length;
    console.log(`   ${successfulBasketTests}/${basketTests.length} tests passed`);

    basketTests.forEach(test => {
        const status = test.success ? '✅' : '❌';
        console.log(`   ${status} ${test.referenceCode} (${test.statusCode})`);
    });
    console.log('');

    // Webhook Tests
    console.log('🎯 Webhook Test Results:');
    const successfulWebhookTests = webhookTests.filter(t => t.success).length;
    console.log(`   ${successfulWebhookTests}/${webhookTests.length} webhooks accessible`);

    webhookTests.forEach(test => {
        const status = test.success ? '✅' : '❌';
        console.log(`   ${status} ${test.endpoint} (${test.statusCode})`);
    });
    console.log('');

    // Overall Status
    const configRegistered = configCheck.config && configCheck.config.basketUrl;
    const basketsWorking = successfulBasketTests > 0;
    const webhooksWorking = successfulWebhookTests > 0;

    console.log('🎯 Overall Status:');
    console.log(`   Configuration: ${configRegistered ? '✅ REGISTERED' : '❌ NOT REGISTERED'}`);
    console.log(`   Basket URLs: ${basketsWorking ? '✅ WORKING' : '❌ FAILING'}`);
    console.log(`   Webhooks: ${webhooksWorking ? '✅ WORKING' : '❌ FAILING'}`);
    console.log('');

    if (configRegistered && basketsWorking && webhooksWorking) {
        console.log('🎉 SUCCESS: Ödeal integration is properly configured!');
        console.log('');
        console.log('📝 Ready for production use:');
        console.log('   - Error 2056 should be resolved');
        console.log('   - Payment terminals can resolve basket references');
        console.log('   - Webhook events will be properly handled');
    } else {
        console.log('❌ ISSUES DETECTED: Integration needs attention');
        console.log('');
        console.log('🔧 Recommended actions:');
        if (!configRegistered) {
            console.log('   - Run: npm run config:register');
        }
        if (!basketsWorking) {
            console.log('   - Check Netlify function deployment');
            console.log('   - Verify ODEAL_REQUEST_KEY is correct');
        }
        if (!webhooksWorking) {
            console.log('   - Check webhook endpoint configurations');
            console.log('   - Verify CORS and authentication settings');
        }
    }

    console.log('');
    return {
        configRegistered,
        basketsWorking,
        webhooksWorking,
        overall: configRegistered && basketsWorking && webhooksWorking
    };
}

/**
 * Main execution function
 */
async function main() {
    console.log('🔍 Ödeal Configuration Verification Tool');
    console.log('========================================');
    console.log('');

    try {
        // Step 1: Check configuration
        const configCheck = await checkConfiguration();

        // Step 2: Test basket URLs
        const basketTests = await testBasketUrls();

        // Step 3: Test webhooks
        const webhookTests = await testWebhooks();

        // Step 4: Generate report
        const report = generateReport(configCheck, basketTests, webhookTests);

        process.exit(report.overall ? 0 : 1);

    } catch (error) {
        console.error('');
        console.error('💥 VERIFICATION FAILED');
        console.error('Error:', error.message);
        console.error('');
        process.exit(2);
    }
}

// Execute if run directly
if (require.main === module) {
    main();
}

module.exports = {
    checkConfiguration,
    testBasketUrls,
    testWebhooks,
    generateReport
};