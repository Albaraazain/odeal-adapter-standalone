#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Building Ödeal adapter for Netlify deployment...');

try {
  // Create dist directory
  const distDir = join(__dirname, 'dist');
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  // Copy static files
  console.log('📦 Copying static files...');
  const filesToCopy = [
    'netlify.toml',
    'package.json',
    'README.md',
    'src/basketProvider.js',
    'src/ropClient.js',
    'src/idempotencyStore.js',
    'api/_lib/verify.js',
    'api/_lib/bridge.js',
    '.env.example'
  ];

  for (const file of filesToCopy) {
    const src = join(__dirname, file);
    const dest = join(distDir, file);

    if (existsSync(src)) {
      try {
        // Create directory structure if needed
        const destDir = dirname(dest);
        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true });
        }
        execSync(`cp "${src}" "${dest}"`, { stdio: 'inherit' });
        console.log(`  ✓ Copied ${file}`);
      } catch (err) {
        console.warn(`  ⚠ Warning: Could not copy ${file}: ${err.message}`);
      }
    }
  }

  // Copy Netlify functions
  console.log('🔧 Setting up Netlify functions...');
  const netlifyFunctionsDir = join(distDir, 'netlify', 'functions');
  if (!existsSync(netlifyFunctionsDir)) {
    mkdirSync(netlifyFunctionsDir, { recursive: true });
  }

  const sourceFunctionsDir = join(__dirname, 'netlify', 'functions');
  if (existsSync(sourceFunctionsDir)) {
    try {
      const functions = execSync('ls', { cwd: sourceFunctionsDir, encoding: 'utf8' }).trim().split('\n').filter(f => f);
      for (const func of functions) {
        const src = join(sourceFunctionsDir, func);
        const dest = join(netlifyFunctionsDir, func);
        try {
          execSync(`cp "${src}" "${dest}"`, { stdio: 'inherit' });
          console.log(`  ✓ Copied function ${func}`);
        } catch (err) {
          console.warn(`  ⚠ Warning: Could not copy function ${func}: ${err.message}`);
        }
      }
    } catch (err) {
      console.warn(`  ⚠ Warning: Could not list functions: ${err.message}`);
    }
  } else {
    console.warn(`  ⚠ Warning: Functions directory not found: ${sourceFunctionsDir}`);
  }

  // Create a minimal package.json for the functions if needed
  const functionsPackageJson = {
    name: "odeal-adapter-netlify",
    version: "0.1.0",
    type: "module",
    engines: {
      "node": "20.x"
    }
  };

  writeFileSync(join(netlifyFunctionsDir, 'package.json'), JSON.stringify(functionsPackageJson, null, 2));
  console.log('  ✓ Created functions package.json');

  // Create deployment script
  const deployScript = `#!/bin/bash

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
`;

  writeFileSync(join(__dirname, 'deploy-netlify.sh'), deployScript);
  execSync(`chmod +x "${join(__dirname, 'deploy-netlify.sh')}"`);

  // Create a development script for local testing
  const devScript = `#!/bin/bash

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
`;

  writeFileSync(join(__dirname, 'dev-netlify.sh'), devScript);
  execSync(`chmod +x "${join(__dirname, 'dev-netlify.sh')}"`);

  console.log('✅ Build completed successfully!');
  console.log('📁 Build output available in: dist/');
  console.log('🚀 Deploy with: ./deploy-netlify.sh');
  console.log('🛠️  Test locally with: ./dev-netlify.sh');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}