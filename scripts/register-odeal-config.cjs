#!/usr/bin/env node

/**
 * Ödeal Configuration Registration Script
 *
 * This script registers our Netlify basket URL with Ödeal's configuration API
 * to resolve error 2056: "sepet çalışan referans kodu bulunamadı"
 * (working reference code not found for basket)
 *
 * CRITICAL: Ödeal requires basket URLs to be registered via their configuration API
 * before they can be used by payment terminals.
 */

const https = require('https');
const fs = require('fs');
require('dotenv').config();

// Configuration constants
const ODEAL_CONFIG_API = 'https://stage.odealapp.com/api/v1/configuration';
const NETLIFY_BASE_URL = 'https://odeal-adapter.netlify.app';

// Build configuration payload
const configurationPayload = {
    basketType: "EXTERNAL_BASKET_WITH_APP",
    basketUrl: `${NETLIFY_BASE_URL}/api/app2app/baskets`,
    intentUrl: `${NETLIFY_BASE_URL}/.netlify/functions/odeal-a2a-result`,
    paymentSucceededUrl: `${NETLIFY_BASE_URL}/api/webhooks/odeal/payment-succeeded`,
    paymentFailedUrl: `${NETLIFY_BASE_URL}/api/webhooks/odeal/payment-failed`,
    paymentCancelledUrl: `${NETLIFY_BASE_URL}/api/webhooks/odeal/payment-cancelled`,
    odealRequestKey: process.env.ODEAL_REQUEST_KEY || 'test_key_for_development'
};

/**
 * Register configuration with Ödeal API
 */
async function registerConfiguration() {
    console.log('🔧 Ödeal Configuration Registration Starting...');
    console.log('📋 Configuration payload:');
    console.log(JSON.stringify(configurationPayload, null, 2));
    console.log('');

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(configurationPayload);

        const options = {
            hostname: 'stage.odealapp.com',
            port: 443,
            path: '/api/v1/configuration',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'ROP-Odeal-Adapter/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`📡 HTTP Response Status: ${res.statusCode}`);
                console.log('📥 Response Headers:', res.headers);
                console.log('📄 Response Body:', data);
                console.log('');

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('✅ Configuration registered successfully!');

                    // Log success details
                    const logEntry = {
                        timestamp: new Date().toISOString(),
                        status: 'SUCCESS',
                        statusCode: res.statusCode,
                        configuration: configurationPayload,
                        response: data
                    };

                    fs.writeFileSync('odeal-config-registration.log',
                        JSON.stringify(logEntry, null, 2) + '\n', { flag: 'a' });

                    resolve({
                        success: true,
                        statusCode: res.statusCode,
                        response: data
                    });
                } else {
                    console.log('❌ Configuration registration failed!');

                    // Log failure details
                    const logEntry = {
                        timestamp: new Date().toISOString(),
                        status: 'FAILURE',
                        statusCode: res.statusCode,
                        configuration: configurationPayload,
                        response: data,
                        headers: res.headers
                    };

                    fs.writeFileSync('odeal-config-registration.log',
                        JSON.stringify(logEntry, null, 2) + '\n', { flag: 'a' });

                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => {
            console.error('❌ Network error:', e.message);

            // Log network error
            const logEntry = {
                timestamp: new Date().toISOString(),
                status: 'NETWORK_ERROR',
                configuration: configurationPayload,
                error: e.message
            };

            fs.writeFileSync('odeal-config-registration.log',
                JSON.stringify(logEntry, null, 2) + '\n', { flag: 'a' });

            reject(e);
        });

        // Send the configuration data
        req.write(postData);
        req.end();
    });
}

/**
 * Verify current configuration status
 */
async function verifyConfiguration() {
    console.log('🔍 Verifying current Ödeal configuration...');

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
                console.log(`📡 Configuration check status: ${res.statusCode}`);
                console.log('📄 Current configuration:', data);
                console.log('');

                resolve({
                    statusCode: res.statusCode,
                    response: data
                });
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
 * Test basket URL accessibility
 */
async function testBasketUrl() {
    console.log('🧪 Testing basket URL accessibility...');

    const testReferenceCode = 'test_' + Date.now();
    const testUrl = `${configurationPayload.basketUrl}/${testReferenceCode}`;

    return new Promise((resolve) => {
        const url = new URL(testUrl);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'GET',
            headers: {
                'X-ODEAL-REQUEST-KEY': configurationPayload.odealRequestKey,
                'User-Agent': 'ROP-Odeal-Adapter/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`🔗 Basket URL test: ${res.statusCode}`);
                console.log(`📄 Response: ${data.substring(0, 200)}...`);
                console.log('');

                resolve({
                    statusCode: res.statusCode,
                    accessible: res.statusCode < 500,
                    response: data.substring(0, 200)
                });
            });
        });

        req.on('error', (e) => {
            console.error('❌ Basket URL test error:', e.message);
            resolve({
                statusCode: 0,
                accessible: false,
                error: e.message
            });
        });

        req.end();
    });
}

/**
 * Main execution function
 */
async function main() {
    console.log('🚀 Ödeal Configuration Registration Tool');
    console.log('==========================================');
    console.log('');

    // Validate environment
    if (!process.env.ODEAL_REQUEST_KEY) {
        console.warn('⚠️  ODEAL_REQUEST_KEY not found in environment, using default test key');
    }

    try {
        // Step 1: Verify current configuration
        console.log('📋 STEP 1: Checking current configuration');
        await verifyConfiguration();

        // Step 2: Test basket URL accessibility
        console.log('📋 STEP 2: Testing basket URL accessibility');
        const urlTest = await testBasketUrl();
        if (!urlTest.accessible) {
            console.warn('⚠️  Basket URL may not be accessible - proceeding anyway');
        }

        // Step 3: Register configuration
        console.log('📋 STEP 3: Registering configuration with Ödeal');
        const result = await registerConfiguration();

        // Step 4: Final verification
        console.log('📋 STEP 4: Verifying registration success');
        await verifyConfiguration();

        console.log('');
        console.log('🎉 SUCCESS: Ödeal configuration registration completed!');
        console.log('');
        console.log('📝 Next steps:');
        console.log('1. Test payment flow with Ödeal device');
        console.log('2. Monitor logs for error 2056 resolution');
        console.log('3. Check odeal-config-registration.log for details');
        console.log('');

        process.exit(0);

    } catch (error) {
        console.error('');
        console.error('💥 FAILED: Configuration registration failed');
        console.error('Error:', error.message);
        console.error('');
        console.error('🔧 Troubleshooting steps:');
        console.error('1. Check ODEAL_REQUEST_KEY is valid');
        console.error('2. Verify Netlify functions are deployed and accessible');
        console.error('3. Contact Ödeal support if API issues persist');
        console.error('4. Check odeal-config-registration.log for details');
        console.error('');

        process.exit(1);
    }
}

// Execute if run directly
if (require.main === module) {
    main();
}

module.exports = {
    registerConfiguration,
    verifyConfiguration,
    testBasketUrl,
    configurationPayload
};