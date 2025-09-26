#!/bin/bash

# Ödeal Adapter Netlify Setup Script
# Author: Netlify Migration Team
# Date: 2025-09-22
# Purpose: Setup Netlify CLI and deploy Ödeal functions

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Ödeal Adapter Netlify Setup                    ║${NC}"
echo -e "${BLUE}║                      $(date)                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

# Function to print section headers
print_section() {
    echo -e "\n${CYAN}=== $1 ===${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js version
check_node_version() {
    print_section "Checking Node.js Version"
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        REQUIRED_VERSION="20"
        if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
            echo -e "${GREEN}✅ Node.js $NODE_VERSION is compatible${NC}"
        else
            echo -e "${YELLOW}⚠️  Node.js $NODE_VERSION detected. Version 20+ recommended.${NC}"
        fi
    else
        echo -e "${RED}❌ Node.js is not installed${NC}"
        echo -e "${YELLOW}💡 Please install Node.js 20+ from https://nodejs.org/${NC}"
        exit 1
    fi
}

# Check Netlify CLI
check_netlify_cli() {
    print_section "Checking Netlify CLI"
    if command_exists netlify; then
        echo -e "${GREEN}✅ Netlify CLI is installed${NC}"
        NETLIFY_VERSION=$(netlify --version)
        echo -e "   Version: $NETLIFY_VERSION"
    else
        echo -e "${YELLOW}⚠️  Netlify CLI is not installed${NC}"
        echo -e "${BLUE}📦 Installing Netlify CLI...${NC}"
        npm install -g netlify-cli
        if command_exists netlify; then
            echo -e "${GREEN}✅ Netlify CLI installed successfully${NC}"
        else
            echo -e "${RED}❌ Failed to install Netlify CLI${NC}"
            echo -e "${YELLOW}💡 Try: npm install -g netlify-cli${NC}"
            exit 1
        fi
    fi
}

# Check if we're in the correct directory
check_directory() {
    print_section "Checking Directory"
    if [ ! -f "netlify.toml" ]; then
        echo -e "${RED}❌ netlify.toml not found${NC}"
        echo -e "${YELLOW}💡 Please run this script from the odeal_adapter directory${NC}"
        exit 1
    fi
    if [ ! -d "netlify/functions" ]; then
        echo -e "${RED}❌ netlify/functions directory not found${NC}"
        echo -e "${YELLOW}💡 Please run this script from the odeal_adapter directory${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ In correct directory (odeal_adapter)${NC}"
}

# Login to Netlify
netlify_login() {
    print_section "Netlify Login"
    echo -e "${YELLOW}🔑 Checking Netlify login status...${NC}"

    # Check if already logged in
    if netlify status >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Already logged in to Netlify${NC}"
        return
    fi

    echo -e "${BLUE}🔑 Please login to Netlify:${NC}"
    echo -e "${YELLOW}A browser window will open for authentication${NC}"
    netlify login
}

# Setup environment variables
setup_environment() {
    print_section "Environment Variables"

    if [ -f ".env" ]; then
        echo -e "${GREEN}✅ .env file found${NC}"
        echo -e "${YELLOW}📋 Current environment variables:${NC}"
        cat .env | grep -E '^(ODEAL_REQUEST_KEY|BASKET_PROVIDER|NODE_ENV)' | while read line; do
            echo -e "   $line"
        done
    else
        echo -e "${YELLOW}⚠️  No .env file found${NC}"
    fi

    echo -e "\n${CYAN}Environment variables to set in Netlify:${NC}"
    echo -e "   🔑 ODEAL_REQUEST_KEY - Your Ödeal authentication key"
    echo -e "   🛒 BASKET_PROVIDER - 'mock' or 'rop' (default: mock)"
    echo -e "   🔧 NODE_ENV - 'production'"
    echo -e ""
    echo -e "${YELLOW}💡 You can set these using:${NC}"
    echo -e "   netlify env:set ODEAL_REQUEST_KEY 'your_key_here'"
    echo -e "   netlify env:set BASKET_PROVIDER 'mock'"
    echo -e "   netlify env:set NODE_ENV 'production'"
}

# Test local development
test_local_development() {
    print_section "Local Development Test"

    echo -e "${YELLOW}🧪 Testing local Netlify development...${NC}"
    echo -e "${BLUE}ℹ️  Starting local development server (10 seconds)...${NC}"

    # Start dev server in background
    timeout 10s netlify dev >/dev/null 2>&1 &
    DEV_PID=$!

    sleep 2

    # Test if server started
    if curl -s http://localhost:8787/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Local development server is working${NC}"
        echo -e "   URL: http://localhost:8787"
        echo -e "   Functions: http://localhost:8787/api/*"
    else
        echo -e "${RED}❌ Local development server failed to start${NC}"
    fi

    # Clean up
    kill $DEV_PID 2>/dev/null || true
}

# Main setup process
main() {
    echo -e "${BLUE}🚀 Starting Netlify setup process...${NC}"

    check_directory
    check_node_version
    check_netlify_cli
    netlify_login
    setup_environment
    test_local_development

    print_section "Setup Complete"
    echo -e "${GREEN}✅ Netlify setup completed successfully!${NC}"
    echo -e ""
    echo -e "${CYAN}Next steps:${NC}"
    echo -e "1. 🌐 Deploy to Netlify: ${YELLOW}netlify deploy --prod${NC}"
    echo -e "2. 🧪 Test deployment: ${YELLOW}node test-netlify.js${NC}"
    echo -e "3. 📊 Monitor functions: ${YELLOW}netlify logs:follow${NC}"
    echo -e "4. 📚 View documentation: ${YELLOW}cat NETLIFY_MIGRATION_GUIDE.md${NC}"
    echo -e ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    Setup Complete!                         ║${NC}"
    echo -e "${BLUE}║           Ready for Netlify deployment 🚀                   ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
}

# Run main function
main "$@"