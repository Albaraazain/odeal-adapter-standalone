# Railway Migration Guide for Ödeal Adapter

## Overview
This guide provides step-by-step instructions to migrate the Ödeal payment integration from Netlify Functions to Railway hosting. The existing Express.js server is already Railway-ready and requires no code changes.

## Current Setup Analysis
✅ **Ready for Railway**: The project has a complete Express.js server (`src/server.js`)
✅ **All endpoints implemented**: `/health`, `/app2app/baskets/:referenceCode`, webhooks
✅ **Security features**: Authentication, rate limiting, CORS handling, idempotency
✅ **Environment configuration**: Uses dotenv and environment variables

## Prerequisites
1. Railway CLI installed: `npm install -g @railway/cli`
2. Railway account (sign up at https://railway.app)
3. Access to current environment variables

## Step-by-Step Migration

### 1. Authentication
```bash
# Login to Railway (requires browser/interactive mode)
railway login

# Verify login
railway whoami
```

### 2. Initialize Railway Project
```bash
cd /Users/albaraa/Developer/Projects/rop_version_1/odeal_adapter

# Initialize new Railway project
railway init

# Choose:
# - Create new project: "odeal-adapter"
# - Language: Node.js
# - Framework: Express
```

### 3. Configure Environment Variables
Set these environment variables in Railway dashboard or via CLI:

**Required Environment Variables:**
```bash
# Core configuration
railway variables set ODEAL_REQUEST_KEY="test_key_for_development"
railway variables set BASKET_PROVIDER="mock"
railway variables set NODE_ENV="production"

# Optional configuration
railway variables set RATE_LIMIT_MAX_PER_MIN="120"
railway variables set ROUTE_ROP_AUTOSYNC="false"
```

**Production Environment Variables:**
```bash
# For production deployment
railway variables set ODEAL_REQUEST_KEY="your_production_key_here"
railway variables set BASKET_PROVIDER="rop"
railway variables set NODE_ENV="production"
```

### 4. Deploy to Railway
```bash
# Deploy the application
railway deploy

# Monitor deployment
railway logs

# Check deployment status
railway status
```

### 5. Configure Custom Domain (Optional)
```bash
# Generate Railway subdomain
railway domain

# Or add custom domain
railway domain add your-custom-domain.com
```

## Expected Railway URLs
After deployment, your endpoints will be available at:

**Railway Subdomain Format**: `https://[project-name]-[environment].railway.app`

**Endpoints:**
- Health: `GET https://your-app.railway.app/health`
- Basket: `GET https://your-app.railway.app/app2app/baskets/{referenceCode}`
- Webhooks:
  - `POST https://your-app.railway.app/webhooks/odeal/payment-succeeded`
  - `POST https://your-app.railway.app/webhooks/odeal/payment-failed`
  - `POST https://your-app.railway.app/webhooks/odeal/payment-cancelled`

## Testing Railway Deployment

### Health Check Test
```bash
curl -s "https://your-app.railway.app/health" | jq .
```

### Basket Endpoint Test
```bash
curl -s "https://your-app.railway.app/app2app/baskets/test_123" \
  -H "X-ODEAL-REQUEST-KEY: test_key_for_development" | jq .
```

### Webhook Test
```bash
curl -s -X POST "https://your-app.railway.app/webhooks/odeal/payment-succeeded" \
  -H "Content-Type: application/json" \
  -H "X-ODEAL-REQUEST-KEY: test_key_for_development" \
  -d '{"test": true}' | jq .
```

## Railway Advantages over Netlify
1. **No CORS Issues**: Railway provides standard web server hosting
2. **Better Performance**: Persistent processes vs serverless cold starts
3. **Easier Monitoring**: Built-in logging and metrics
4. **Environment Management**: Better environment variable handling
5. **Custom Domains**: Easier SSL and domain configuration

## Ödeal Configuration Update
After successful Railway deployment, provide these URLs to Ödeal:

```json
{
  "basketUrl": "https://your-app.railway.app/app2app/baskets/{referenceCode}",
  "paymentSucceededUrl": "https://your-app.railway.app/webhooks/odeal/payment-succeeded",
  "paymentFailedUrl": "https://your-app.railway.app/webhooks/odeal/payment-failed",
  "paymentCancelledUrl": "https://your-app.railway.app/webhooks/odeal/payment-cancelled",
  "intentUrl": "https://your-app.railway.app/odeal/a2a-result",
  "odealRequestKey": "your_production_key_here"
}
```

## Flutter App Configuration Update
Update the `.env` file in the Flutter app:

```env
ODEAL_BASKET_BASE_URL=https://your-app.railway.app/app2app/baskets
ODEAL_REQUEST_KEY=your_production_key_here
ODEAL_INTENT_HOST=your-app.railway.app
```

Update `android/app/build.gradle.kts`:
```kotlin
manifestPlaceholders["odealIntentHost"] = "your-app.railway.app"
```

## Migration Verification Checklist
- [ ] Railway deployment successful
- [ ] All endpoints responding with 200 status
- [ ] Authentication working (401 without header)
- [ ] Environment variables configured
- [ ] Health check passing
- [ ] Basket endpoint returning mock data
- [ ] Webhooks accepting POST requests
- [ ] SSL certificate working
- [ ] Performance acceptable (&lt;2s response times)

## Rollback Plan
If issues occur, Netlify deployment remains active at:
- `https://odeal-adapter.netlify.app`

Simply revert environment variables in Flutter app to Netlify URLs.

## Troubleshooting

### Common Issues
1. **502 Bad Gateway**: Check Railway logs, likely app startup issue
2. **Environment Variables**: Verify all required vars are set in Railway
3. **Port Configuration**: Railway auto-assigns PORT, ensure app uses `process.env.PORT`
4. **Build Failures**: Check package.json start script points to `src/server.js`

### Debug Commands
```bash
# Check Railway project status
railway status

# View application logs
railway logs --follow

# Check environment variables
railway variables

# Restart service
railway redeploy
```

## Cost Considerations
- Railway Free Tier: $0/month with usage limits
- Pro Plan: $20/month for production workloads
- Much more cost-effective than Netlify Functions for persistent services

## Next Steps
1. Execute manual migration following this guide
2. Update Ödeal configuration with new URLs
3. Update Flutter app configuration
4. Test end-to-end payment flow
5. Monitor Railway deployment performance