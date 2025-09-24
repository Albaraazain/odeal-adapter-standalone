#!/bin/bash

# Render.com Deployment Script for Ödeal Adapter
# This script guides through deploying to Render.com

set -e

echo "🚀 Ödeal Adapter - Render.com Deployment Guide"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "src/server.js" ]; then
    echo "❌ Error: Please run this script from the odeal_adapter directory"
    exit 1
fi

echo ""
echo "✅ Deployment files ready:"
echo "   - Express.js server: src/server.js"
echo "   - Dependencies: package.json updated"
echo "   - Configuration: render.yaml created"
echo "   - Docker: Dockerfile ready"
echo ""

echo "📋 Next Steps (Manual):"
echo ""
echo "1. Go to https://render.com and sign up/login"
echo ""
echo "2. Click 'New' → 'Web Service'"
echo ""
echo "3. Connect your Git repository or upload these files"
echo ""
echo "4. Configure the service:"
echo "   - Name: odeal-adapter"
echo "   - Runtime: Node"
echo "   - Build Command: npm install"
echo "   - Start Command: npm start"
echo "   - Instance Type: Free (testing) or Starter ($7/month)"
echo ""
echo "5. Set Environment Variables in Render dashboard:"
echo "   ODEAL_REQUEST_KEY=test_key_for_development"
echo "   BASKET_PROVIDER=mock"
echo "   NODE_ENV=production"
echo "   RATE_LIMIT_MAX_PER_MIN=120"
echo "   ROUTE_ROP_AUTOSYNC=false"
echo ""
echo "6. Deploy and wait for build to complete"
echo ""
echo "7. Your service will be available at:"
echo "   https://odeal-adapter.onrender.com"
echo ""
echo "8. Test deployment:"
echo "   curl -s 'https://odeal-adapter.onrender.com/health' | jq ."
echo ""
echo "9. Update Flutter app configuration with new URL:"
echo "   ODEAL_BASKET_BASE_URL=https://odeal-adapter.onrender.com/app2app/baskets"
echo "   ODEAL_INTENT_HOST=odeal-adapter.onrender.com"
echo ""

echo "🔧 Local Testing (Optional):"
echo "PORT=3001 npm start"
echo "curl -s 'http://localhost:3001/health' | jq ."
echo ""

echo "📚 More Details:"
echo "- Full Railway guide: RAILWAY_MIGRATION_GUIDE.md"
echo "- Render details: RENDER_ALTERNATIVE.md"
echo "- Complete summary: DEPLOYMENT_SUMMARY.md"
echo ""

echo "✨ Migration preparation complete! Follow the manual steps above."