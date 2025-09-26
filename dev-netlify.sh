#!/bin/bash

# Ödeal Netlify Development Script

set -e

echo "🛠️  Starting Ödeal adapter in development mode..."

# Build the project
echo "🔨 Building project..."
node build-netlify.js

# Start Netlify dev server
echo "🚀 Starting Netlify dev server..."
cd dist
netlify dev

echo "✅ Development server stopped!"
