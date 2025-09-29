# Render.com Alternative Deployment

## Why Render.com?
- **Simple Git-based deployment**: No CLI authentication required
- **Automatic HTTPS**: SSL certificates automatically provisioned
- **Environment variable management**: Easy configuration via web interface
- **Better CORS support**: Standard web server hosting eliminates CORS issues
- **Cost-effective**: Similar pricing to Railway with generous free tier

## Deployment Steps

### 1. Prepare Repository
Ensure the project has proper configuration:

```json
// package.json - already configured correctly
{
  "name": "odeal-adapter",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js"
  },
  "engines": {
    "node": "20.x"
  }
}
```

### 2. Create Render Service
1. Go to https://render.com and sign up/login
2. Click "New" → "Web Service"
3. Connect GitHub repository or upload files
4. Configure:
   - **Name**: odeal-adapter
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (for testing) or Starter ($7/month)

### 3. Environment Variables
Set these in Render dashboard:
```
ODEAL_REQUEST_KEY=test_key_for_development
BASKET_PROVIDER=mock
NODE_ENV=production
RATE_LIMIT_MAX_PER_MIN=120
ROUTE_ROP_AUTOSYNC=false

# Ödeal employeeInfo (minimum required: ODEAL_EMPLOYEE_REF)
ODEAL_EMPLOYEE_REF=EMP001
ODEAL_EMPLOYEE_NAME=Ahmet
ODEAL_EMPLOYEE_SURNAME=Yilmaz
ODEAL_EMPLOYEE_GSM_NUMBER=905551112233
ODEAL_EMPLOYEE_IDENTITY_NUMBER=12345678901
ODEAL_EMPLOYEE_MAIL_ADDRESS=ahmet.yilmaz@example.com
ODEAL_REQUIRE_EMPLOYEE=true
```

### 4. Deploy
Render automatically deploys on git push. Your service will be available at:
`https://odeal-adapter.onrender.com`

## Expected URLs
- Health: `https://odeal-adapter.onrender.com/health`
- Basket: `https://odeal-adapter.onrender.com/app2app/baskets/{referenceCode}`
- Webhooks: `https://odeal-adapter.onrender.com/webhooks/odeal/*`

## Testing
```bash
curl -s "https://odeal-adapter.onrender.com/health" | jq .
```

## Advantages
- ✅ No CLI authentication issues
- ✅ Git-based deployment (automatic)
- ✅ Built-in SSL/HTTPS
- ✅ Environment variable management
- ✅ Free tier available
- ✅ Better uptime than serverless functions
