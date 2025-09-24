# Netlify Environment Variables Setup

## Required Variables

Set these in your Netlify dashboard under Site Settings > Environment Variables:

### Authentication
- `ODEAL_REQUEST_KEY` - Your Ödeal API authentication key
- `NODE_ENV` - Set to `production`

### Optional Variables

#### ROP Integration
- `ROP_BASE_URL` - ROP API base URL
- `DEVICE_ID` - Your device ID
- `RESTAURANT_ID` - Your restaurant ID
- `DEVICE_KEY` - Your device authentication key
- `ROUTE_ROP_AUTOSYNC` - Set to `true` to enable automatic payment status sync

#### Basket Configuration
- `BASKET_PROVIDER` - Set to `rop` or `mock` (default: `mock`)
- `BASKET_DEFAULT_TOTAL` - Default total for mock basket (default: `100.00`)

#### Rate Limiting
- `RATE_LIMIT_MAX_PER_MIN` - Maximum requests per minute (default: `120`)

## Setting Environment Variables in Netlify

### Via Netlify Dashboard
1. Go to your Netlify site dashboard
2. Navigate to Site Settings > Environment Variables
3. Add each variable with its value
4. Deploy your site

### Via Netlify CLI
```bash
# Set individual variables
netlify env:set ODEAL_REQUEST_KEY "your_key_here"
netlify env:set NODE_ENV "production"
netlify env:set BASKET_PROVIDER "mock"

# Set multiple variables at once
netlify env:import .env.production
```

### Production vs Development
- Use different environment variable sets for different deploy contexts
- Test with mock provider first, then switch to ROP when verified
- Always keep development keys separate from production keys