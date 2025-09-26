# Ödeal Adapter - Netlify Migration Guide

## Overview

This guide will help you migrate the Ödeal Vercel functions to Netlify Functions and deploy them using the Netlify CLI.

## Migration Status: ✅ COMPLETED

The agents have successfully created the Netlify migration:

- ✅ **Netlify Configuration** (`netlify.toml`) - Complete configuration with redirects and headers
- ✅ **Netlify Functions** (`netlify/functions/`) - All endpoints converted to Netlify format
- ✅ **Environment Setup** (`netlify-env-setup.md`) - Complete environment variable guide
- ✅ **Testing Scripts** (`test-netlify.js`) - Netlify-specific testing
- ✅ **Documentation** - Comprehensive migration and deployment guides

## Quick Start

### 1. Install Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Or install locally
npm install netlify-cli --save-dev
```

### 2. Login to Netlify

```bash
# Login to your Netlify account
netlify login
```

### 3. Setup Environment Variables

```bash
# Set required environment variables
netlify env:set ODEAL_REQUEST_KEY "your_odeal_key_here"
netlify env:set NODE_ENV "production"
netlify env:set BASKET_PROVIDER "mock"  # or "rop"

# Optional ROP integration variables
netlify env:set ROP_BASE_URL "https://your-rop-api.com"
netlify env:set DEVICE_ID "your_device_id"
netlify env:set RESTAURANT_ID "your_restaurant_id"
netlify env:set DEVICE_KEY "your_device_key"
```

### 4. Deploy to Netlify

```bash
# Deploy from the odeal_adapter directory
cd odeal_adapter
netlify deploy --prod

# Or deploy with manual site selection
netlify deploy --prod --site=your-site-name
```

## Netlify Functions Structure

The following functions have been created:

```
netlify/functions/
├── app2app-baskets.js                # GET /api/app2app/baskets/:referenceCode
├── webhooks-odeal-payment-succeeded.js # POST /api/webhooks/odeal/payment-succeeded
├── webhooks-odeal-payment-failed.js    # POST /api/webhooks/odeal/payment-failed
├── webhooks-odeal-payment-cancelled.js # POST /api/webhooks/odeal/payment-cancelled
└── health.js                         # GET /api/health
```

## Endpoints

All endpoints maintain the same URL structure as Vercel:

- **Basket Endpoint**: `GET /api/app2app/baskets/:referenceCode`
- **Webhook Endpoints**:
  - `POST /api/webhooks/odeal/payment-succeeded`
  - `POST /api/webhooks/odeal/payment-failed`
  - `POST /api/webhooks/odeal/payment-cancelled`
- **Health Check**: `GET /api/health`

## Testing Netlify Deployment

### Local Development

```bash
# Start Netlify dev server
cd odeal_adapter
netlify dev

# The server will run on http://localhost:8787
# Functions will be available at:
# - http://localhost:8787/api/app2app/baskets/test
# - http://localhost:8787/api/webhooks/odeal/payment-succeeded
```

### Run Netlify Tests

```bash
# Run Netlify-specific tests
cd odeal_adapter
node test-netlify.js
```

### Test with Existing Scripts

```bash
# Update the existing test script to use Netlify URL
cd /Users/albaraa/Developer/Projects/rop_version_1

# Test against local Netlify dev server
NETLIFY_URL=http://localhost:8787 \
ODEAL_REQUEST_KEY=your_key \
./test_odeal_vercel_functions.sh

# Test against deployed Netlify functions
NETLIFY_URL=https://your-site-name.netlify.app \
ODEAL_REQUEST_KEY=your_key \
./test_odeal_vercel_functions.sh
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ODEAL_REQUEST_KEY` | Ödeal API authentication key | `your_odeal_key_here` |
| `NODE_ENV` | Environment | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASKET_PROVIDER` | Basket provider (`mock` or `rop`) | `mock` |
| `ROP_BASE_URL` | ROP API base URL | - |
| `DEVICE_ID` | Device ID for ROP integration | - |
| `RESTAURANT_ID` | Restaurant ID for ROP integration | - |
| `DEVICE_KEY` | Device authentication key | - |
| `ROUTE_ROP_AUTOSYNC` | Enable automatic payment sync | `false` |

## Deployment Commands

### Development Deployment

```bash
# Deploy to development branch
cd odeal_adapter
netlify deploy
```

### Production Deployment

```bash
# Deploy to production
cd odeal_adapter
netlify deploy --prod
```

### Deploy with Specific Settings

```bash
# Deploy with custom site name
netlify deploy --prod --site=your-site-name

# Deploy with functions directory override
netlify deploy --prod --functions=netlify/functions
```

## Monitoring and Logs

### View Function Logs

```bash
# View real-time logs
netlify logs:follow

# View function-specific logs
netlify logs:follow --functions=app2app-baskets
netlify logs:follow --functions=webhooks-odeal-payment-succeeded
```

### Monitor Deployments

```bash
# View deployment status
netlify status

# View site information
netlify sites:list
```

## Troubleshooting

### Common Issues

1. **Function Not Found**
   - Check `netlify.toml` functions directory setting
   - Ensure functions are in `netlify/functions/` directory

2. **Environment Variables Missing**
   - Verify variables are set in Netlify dashboard
   - Use `netlify env:list` to check current variables

3. **CORS Issues**
   - The `netlify.toml` includes CORS headers
   - Check browser console for CORS errors

4. **Authentication Failures**
   - Verify `ODEAL_REQUEST_KEY` is correctly set
   - Check function logs for authentication errors

### Debug Mode

```bash
# Run Netlify dev with debug output
DEBUG=netlify:* netlify dev

# Run with verbose logging
netlify dev --debug
```

## Migration Benefits

✅ **Simplified Deployment**: No need for Vercel configuration
✅ **Better Build Times**: Netlify builds are typically faster
✅ **Integrated CI/CD**: Built-in continuous deployment
✅ **Free Tier**: Generous free tier for testing and development
✅ **Form Handling**: Built-in form handling and processing
✅ **Edge Functions**: Global edge network for better performance

## Next Steps

1. **Deploy**: Use `netlify deploy --prod` to deploy your functions
2. **Test**: Run the test scripts against your deployed functions
3. **Monitor**: Set up monitoring and check function logs
4. **Scale**: Configure custom domains and SSL certificates as needed

## Support

- Netlify Documentation: https://docs.netlify.com/
- Netlify Functions: https://docs.netlify.com/functions/
- Netlify CLI: https://docs.netlify.com/cli/