# Netlify CLI Commands Quick Reference

## Installation

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login
```

## Development

```bash
# Start development server
netlify dev

# Start with specific port
netlify dev --port 8787

# Start with functions directory
netlify dev --functions netlify/functions
```

## Deployment

```bash
# Deploy to staging (creates draft URL)
netlify deploy

# Deploy to production
netlify deploy --prod

# Deploy specific directory
netlify deploy --dir=dist --functions=netlify/functions

# Deploy with draft URL
netlify deploy --dir=dist --functions=netlify/functions --draft
```

## Environment Variables

```bash
# List environment variables
netlify env:list

# Set environment variable
netlify env:set ODEAL_REQUEST_KEY "your_key_here"

# Get environment variable
netlify env:get ODEAL_REQUEST_KEY

# Delete environment variable
netlify env:unset ODEAL_REQUEST_KEY

# Import from file
netlify env:import .env.production
```

## Functions

```bash
# List functions
netlify functions:list

# Invoke function locally
netlify functions:invoke health

# Invoke function with data
netlify functions:invoke health --payload '{"test": true}'

# Build functions
netlify functions:build
```

## Site Management

```bash
# Link to existing site
netlify link

# Create new site
netlify sites:create

# List sites
netlify sites:list

# Site information
netlify sites:info
```

## Logs

```bash
# View function logs
netlify logs

# View specific function logs
netlify logs --function health

# View logs with streaming
netlify logs --follow

# View logs for specific deploy
netlify logs --deploy-id <deploy-id>
```

## Advanced

```bash
# Build project
netlify build

# Build with custom directory
netlify build --dir dist

# Check build status
netlify build:status

# Open site in browser
netlify open:site

# Open admin dashboard
netlify open:admin
```

## Common Workflows

### Setup New Project
```bash
netlify login
netlify sites:create
netlify link
netlify env:set ODEAL_REQUEST_KEY "your_key"
netlify env:set NODE_ENV "production"
```

### Deploy Changes
```bash
# Build and deploy
npm run build
netlify deploy --prod

# Quick deploy (if auto-build configured)
git push origin main
```

### Debug Functions
```bash
# Test function locally
netlify functions:invoke health

# Check logs
netlify logs --function health --follow

# Test with data
echo '{"test": true}' | netlify functions:invoke health --stdin
```