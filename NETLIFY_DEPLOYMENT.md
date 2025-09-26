# Ödeal Adapter - Netlify Deployment Guide

This guide explains how to migrate your Ödeal adapter from Vercel to Netlify Functions.

## Overview

The Ödeal adapter has been updated to support Netlify Functions deployment while maintaining compatibility with the existing Vercel implementation. All API endpoints have been converted to work with Netlify's serverless function format.

## Architecture Changes

### Vercel → Netlify Migration

| Component | Vercel | Netlify |
|-----------|--------|---------|
| Functions | `api/` directory | `netlify/functions/` directory |
| Configuration | `vercel.json` | `netlify.toml` |
| Function Handler | `export default function handler(req, res)` | `export async function handler(event, context)` |
| Request Format | Express-style | Netlify Lambda event |
| Response Format | Express response object | Return object with statusCode, headers, body |

### API Endpoints

All existing endpoints are preserved:

- `GET /api/health` → Health check endpoint
- `POST /api/webhooks/odeal/payment-succeeded` → Payment success webhook
- `POST /api/webhooks/odeal/payment-failed` → Payment failure webhook
- `POST /api/webhooks/odeal/payment-cancelled` → Payment cancellation webhook
- `GET /api/app2app/baskets/[referenceCode]` → Basket resolution endpoint

## Quick Start

### 1. Install Dependencies

```bash
cd odeal_adapter
npm install
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run Netlify-specific tests
node test-netlify.js
```

### 3. Build for Netlify

```bash
node build-netlify.js
```

### 4. Set Environment Variables

Create a `.env` file or set variables in Netlify dashboard:

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values
nano .env
```

### 5. Deploy to Netlify

**Option A: Using deployment script**
```bash
./deploy-netlify.sh
```

**Option B: Manual deployment**
```bash
# Build the project
node build-netlify.js

# Navigate to build directory
cd dist

# Deploy using Netlify CLI
netlify deploy --prod --dir=. --functions=netlify/functions
```

## Development

### Local Development

Start the Netlify development server:

```bash
./dev-netlify.sh
```

This will start a local Netlify dev server with hot reloading.

### Testing Endpoints

Once running locally, you can test the endpoints:

```bash
# Health check
curl http://localhost:8787/api/health

# Basket resolution
curl "http://localhost:8787/api/app2app/baskets/TEST_123" \
  -H "X-ODEAL-REQUEST-KEY: your_key_here"
```

## Configuration

### Environment Variables

Required variables:
- `ODEAL_REQUEST_KEY` - Ödeal API authentication key
- `NODE_ENV` - Environment (development/production)

Optional variables:
- `BASKET_PROVIDER` - Mock or ROP integration
- `ROUTE_ROP_AUTOSYNC` - Enable payment status sync
- `ROP_BASE_URL`, `DEVICE_ID`, `RESTAURANT_ID`, `DEVICE_KEY` - ROP configuration

### Netlify.toml Configuration

The `netlify.toml` file includes:
- Build settings
- Function directory configuration
- Redirect rules to maintain API compatibility
- Security headers
- CORS configuration

## Troubleshooting

### Common Issues

1. **Function not found**
   - Ensure functions are in `netlify/functions/` directory
   - Check function naming matches exactly

2. **CORS errors**
   - Verify CORS headers are set in function responses
   - Check `netlify.toml` redirect rules

3. **Environment variables not available**
   - Set variables in Netlify dashboard
   - Redeploy after changing variables

4. **401 Unauthorized**
   - Verify `ODEAL_REQUEST_KEY` is correct
   - Check header casing (Netlify preserves case)

### Debug Mode

Enable debug logging by setting:
```bash
export DEBUG=odeal-adapter:*
```

## Migration Checklist

- [ ] Install Netlify CLI: `npm install -g netlify-cli`
- [ ] Set up environment variables in Netlify dashboard
- [ ] Run local tests: `node test-netlify.js`
- [ ] Test development server: `./dev-netlify.sh`
- [ ] Deploy to staging: `netlify deploy`
- [ ] Test staging endpoints
- [ ] Deploy to production: `./deploy-netlify.sh`

## API Reference

### Health Check
```
GET /api/health
Response: { ok: true, ts: "timestamp", platform: "netlify" }
```

### Webhook Handlers
```
POST /api/webhooks/odeal/payment-{succeeded,failed,cancelled}
Headers: { X-ODEAL-REQUEST-KEY: "your_key" }
Response: { ok: true, duplicate: false }
```

### Basket Resolution
```
GET /api/app2app/baskets/{referenceCode}
Headers: { X-ODEAL-REQUEST-KEY: "your_key" }
Response: { referenceCode, basketPrice, products, ... }
```

## Support

For issues with the Netlify migration:
1. Check the troubleshooting section
2. Run the test suite: `node test-netlify.js`
3. Review Netlify function logs
4. Check environment variable configuration