#!/bin/bash

# Ödeal Netlify Deployment Script

set -e

echo "🚀 Deploying Ödeal adapter to Netlify..."

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Build the project
echo "🔨 Building project..."
node build-netlify.js

# Deploy to Netlify
echo "🚀 Deploying to Netlify..."
cd dist
netlify deploy --prod --dir=. --functions=netlify/functions

echo "✅ Deployment complete!"
