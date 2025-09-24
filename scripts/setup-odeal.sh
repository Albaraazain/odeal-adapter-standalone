#!/bin/bash

# Ödeal Configuration Setup Script
# This script handles the complete setup process for Ödeal integration

set -e  # Exit on any error

echo "🚀 Ödeal Integration Setup"
echo "=========================="
echo ""

# Change to odeal_adapter directory
cd "$(dirname "$0")/.."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check environment
check_environment() {
    echo "🔍 Checking environment..."

    # Check Node.js
    if ! command_exists node; then
        echo "❌ Node.js not found. Please install Node.js 20.x"
        exit 1
    fi

    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"

    # Check npm
    if ! command_exists npm; then
        echo "❌ npm not found. Please install npm"
        exit 1
    fi

    # Check if .env exists
    if [[ ! -f .env ]]; then
        echo "⚠️  .env file not found, using defaults"
    else
        echo "✅ Environment file found"
    fi

    echo ""
}

# Function to install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
}

# Function to verify Netlify deployment
verify_deployment() {
    echo "🌐 Verifying Netlify deployment..."

    # Test health endpoint
    echo "  Testing health endpoint..."
    if curl -s -f "https://odeal-adapter.netlify.app/api/health" > /dev/null; then
        echo "  ✅ Health endpoint accessible"
    else
        echo "  ❌ Health endpoint failed"
        echo "  Please ensure Netlify functions are deployed"
        exit 1
    fi

    # Test basket endpoint
    echo "  Testing basket endpoint..."
    if curl -s -f -H "X-ODEAL-REQUEST-KEY: test_key_for_development" \
        "https://odeal-adapter.netlify.app/api/app2app/baskets/test_123" > /dev/null; then
        echo "  ✅ Basket endpoint accessible"
    else
        echo "  ❌ Basket endpoint failed"
        echo "  Please check authentication and deployment"
        exit 1
    fi

    echo "✅ Netlify deployment verified"
    echo ""
}

# Function to register configuration
register_configuration() {
    echo "🔧 Registering Ödeal configuration..."

    if node scripts/register-odeal-config.cjs; then
        echo "✅ Configuration registered successfully"
    else
        echo "❌ Configuration registration failed"
        echo "Please check the logs and try again"
        exit 1
    fi

    echo ""
}

# Function to verify configuration
verify_configuration() {
    echo "🔍 Verifying configuration..."

    if node scripts/verify-odeal-config.cjs; then
        echo "✅ Configuration verified successfully"
    else
        echo "⚠️  Configuration verification found issues"
        echo "Please review the verification report above"
    fi

    echo ""
}

# Function to show next steps
show_next_steps() {
    echo "🎉 Setup Complete!"
    echo "================="
    echo ""
    echo "📝 Next Steps:"
    echo "1. Test payment flow with Ödeal device"
    echo "2. Monitor for resolution of error 2056"
    echo "3. Check logs: odeal-config-registration.log"
    echo ""
    echo "🔧 Available Commands:"
    echo "  npm run config:register  - Register configuration"
    echo "  npm run config:verify    - Verify configuration"
    echo ""
    echo "📚 Documentation:"
    echo "  scripts/README.md        - Complete setup guide"
    echo ""
}

# Main execution
main() {
    # Parse command line arguments
    SKIP_DEPS=false
    SKIP_DEPLOY_CHECK=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-deploy-check)
                SKIP_DEPLOY_CHECK=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-deps           Skip npm install"
                echo "  --skip-deploy-check   Skip Netlify deployment verification"
                echo "  -h, --help           Show this help message"
                echo ""
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Execute setup steps
    check_environment

    if [[ "$SKIP_DEPS" != "true" ]]; then
        install_dependencies
    fi

    if [[ "$SKIP_DEPLOY_CHECK" != "true" ]]; then
        verify_deployment
    fi

    register_configuration
    verify_configuration
    show_next_steps
}

# Execute main function with all arguments
main "$@"