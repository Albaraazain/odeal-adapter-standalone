# Ödeal Configuration Scripts

## Overview

This directory contains utilities for managing Ödeal payment terminal configuration, specifically to resolve error 2056 ("sepet çalışan referans kodu bulunamadı" - working reference code not found for basket).

## Problem Statement

**Root Cause**: Our Netlify basket URL `https://odeal-adapter.netlify.app/api/app2app/baskets` was never registered with Ödeal's configuration API, causing error 2056 when payment terminals try to resolve basket references.

**Solution**: Register our basket URL and webhook endpoints with Ödeal's configuration API using the `register-odeal-config.js` script.

## Usage

### Prerequisites

1. Ensure Netlify functions are deployed and accessible
2. Set `ODEAL_REQUEST_KEY` in your environment (or `.env` file)
3. Install Node.js dependencies: `npm install`

### Registration Process

```bash
# Navigate to odeal_adapter directory
cd odeal_adapter

# Run the configuration registration script
node scripts/register-odeal-config.js
```

### Expected Output

```
🚀 Ödeal Configuration Registration Tool
==========================================

📋 STEP 1: Checking current configuration
🔍 Verifying current Ödeal configuration...
📡 Configuration check status: 200
📄 Current configuration: {"intentUrl":"..."}

📋 STEP 2: Testing basket URL accessibility
🧪 Testing basket URL accessibility...
🔗 Basket URL test: 200
📄 Response: {"referenceCode":"test_1695648000123"...

📋 STEP 3: Registering configuration with Ödeal
🔧 Ödeal Configuration Registration Starting...
📋 Configuration payload:
{
  "basketType": "EXTERNAL_BASKET_WITH_APP",
  "basketUrl": "https://odeal-adapter.netlify.app/api/app2app/baskets",
  "intentUrl": "https://odeal-adapter.netlify.app/.netlify/functions/odeal-a2a-result",
  "paymentSucceededUrl": "https://odeal-adapter.netlify.app/api/webhooks/odeal/payment-succeeded",
  "paymentFailedUrl": "https://odeal-adapter.netlify.app/api/webhooks/odeal/payment-failed",
  "paymentCancelledUrl": "https://odeal-adapter.netlify.app/api/webhooks/odeal/payment-cancelled",
  "odealRequestKey": "test_key_for_development"
}

📡 HTTP Response Status: 200
✅ Configuration registered successfully!

📋 STEP 4: Verifying registration success
🔍 Verifying current Ödeal configuration...
📡 Configuration check status: 200
📄 Current configuration: {"basketUrl":"https://odeal-adapter.netlify.app/api/app2app/baskets"...}

🎉 SUCCESS: Ödeal configuration registration completed!

📝 Next steps:
1. Test payment flow with Ödeal device
2. Monitor logs for error 2056 resolution
3. Check odeal-config-registration.log for details
```

## Configuration Details

The script registers the following endpoints with Ödeal:

| Field | Value | Purpose |
|-------|-------|---------|
| `basketType` | `EXTERNAL_BASKET_WITH_APP` | Indicates external basket with app integration |
| `basketUrl` | `https://odeal-adapter.netlify.app/api/app2app/baskets` | Basket retrieval endpoint |
| `intentUrl` | `https://odeal-adapter.netlify.app/.netlify/functions/odeal-a2a-result` | Payment result callback |
| `paymentSucceededUrl` | `https://odeal-adapter.netlify.app/api/webhooks/odeal/payment-succeeded` | Success webhook |
| `paymentFailedUrl` | `https://odeal-adapter.netlify.app/api/webhooks/odeal/payment-failed` | Failure webhook |
| `paymentCancelledUrl` | `https://odeal-adapter.netlify.app/api/webhooks/odeal/payment-cancelled` | Cancellation webhook |
| `odealRequestKey` | From environment variable | Authentication key |

## Troubleshooting

### Common Issues

1. **HTTP 401 Unauthorized**
   - Check `ODEAL_REQUEST_KEY` is valid
   - Contact Ödeal support to verify key permissions

2. **HTTP 404 Not Found**
   - Verify Netlify functions are deployed
   - Check basket URL is accessible: `https://odeal-adapter.netlify.app/api/app2app/baskets/test_123`

3. **Network Errors**
   - Verify internet connectivity
   - Check firewall settings
   - Ensure Ödeal API endpoint is accessible

4. **Basket URL Not Accessible**
   - Run: `curl -H "X-ODEAL-REQUEST-KEY: your_key" https://odeal-adapter.netlify.app/api/app2app/baskets/test_123`
   - Verify CORS headers are properly configured

### Verification Steps

After registration, verify the configuration worked:

```bash
# Test basket endpoint directly
curl -H "X-ODEAL-REQUEST-KEY: test_key_for_development" \
     https://odeal-adapter.netlify.app/api/app2app/baskets/test_123

# Check Netlify function logs
netlify logs:follow

# Test payment flow with Ödeal device
# (Monitor for absence of error 2056)
```

## Logging

The script creates `odeal-config-registration.log` with detailed execution logs including:
- Configuration payload sent
- API responses received
- Error details (if any)
- Timestamps for audit trail

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ODEAL_REQUEST_KEY` | Yes | `test_key_for_development` | Ödeal API authentication key |
| `NODE_ENV` | No | `development` | Environment setting |

## Integration Testing

After successful registration:

1. **Ödeal Device Test**: Attempt payment flow and verify error 2056 no longer occurs
2. **Webhook Verification**: Monitor webhook endpoints receive payment events
3. **Basket Resolution**: Verify Ödeal can successfully retrieve basket data
4. **Directcharge Fallback**: Test directcharge scenarios work correctly

## Support

If issues persist after configuration registration:

1. Check `odeal-config-registration.log` for detailed error information
2. Verify all Netlify functions are deployed and accessible
3. Contact Ödeal technical support with registration details
4. Review Ödeal official documentation at https://docs.odeal.com/

## Related Files

- `../netlify/functions/app2app-baskets.js` - Basket retrieval endpoint
- `../api/webhooks/odeal/` - Webhook handler implementations
- `../.env` - Environment configuration
- `../netlify.toml` - Netlify deployment configuration