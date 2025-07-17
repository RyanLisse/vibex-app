#!/bin/bash

# Codex Clone - Remote Environment Setup Script
# Prepares the project for agentic coding tools with proper error handling

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect package manager preference
detect_package_manager() {
    if [ -f "bun.lock" ] && command_exists bun; then
        echo "bun"
    elif [ -f "package-lock.json" ] && command_exists npm; then
        echo "npm"
    elif [ -f "yarn.lock" ] && command_exists yarn; then
        echo "yarn"
    elif command_exists bun; then
        echo "bun"
    elif command_exists npm; then
        echo "npm"
    else
        log_error "No package manager found. Please install Node.js or Bun."
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    local pm=$1
    log_info "Installing dependencies with $pm..."
    
    case $pm in
        bun)
            bun install --frozen-lockfile || bun install
            ;;
        npm)
            npm ci || npm install
            ;;
        yarn)
            yarn install --frozen-lockfile || yarn install
            ;;
    esac
}

# Setup development environment
setup_environment() {
    log_info "Setting up development environment..."
    
    # Create .env.local if .env.example exists
    if [ -f ".env.example" ] && [ ! -f ".env.local" ]; then
        cp .env.example .env.local
        log_info "Created .env.local from .env.example"
    fi
    
    # Install Playwright browsers if needed
    if [ -f "playwright.config.ts" ]; then
        log_info "Installing Playwright browsers..."
        $PACKAGE_MANAGER dlx playwright install >/dev/null 2>&1 || {
            log_warning "Failed to install Playwright browsers automatically"
        }
    fi
    
    # Initialize Husky if .husky directory doesn't exist
    if [ -f "package.json" ] && [ ! -d ".husky" ]; then
        log_info "Initializing Husky git hooks..."
        $PACKAGE_MANAGER dlx husky install >/dev/null 2>&1 || {
            log_warning "Failed to initialize Husky"
        }
    fi
}

# Verify setup
verify_setup() {
    log_info "Verifying setup..."
    
    # Check if TypeScript compiles
    if command_exists tsc; then
        $PACKAGE_MANAGER run type-check >/dev/null 2>&1 || {
            log_warning "TypeScript compilation has issues"
        }
    fi
    
    # Check if linting passes
    $PACKAGE_MANAGER run format:check >/dev/null 2>&1 || {
        log_info "Auto-formatting code..."
        $PACKAGE_MANAGER run format >/dev/null 2>&1
    }
    
    # Run a quick test to verify test setup
    log_info "Running quick test verification..."
    timeout 30 $PACKAGE_MANAGER run test --run --reporter=basic >/dev/null 2>&1 || {
        log_warning "Some tests may need attention"
    }
}

# Main setup function
main() {
    log_info "Starting Codex Clone setup..."
    
    # Check Node.js version
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            log_error "Node.js 18+ required. Current version: $(node --version)"
            exit 1
        fi
    fi
    
    # Detect and set package manager
    PACKAGE_MANAGER=$(detect_package_manager)
    log_info "Using package manager: $PACKAGE_MANAGER"
    
    # Install dependencies
    install_dependencies "$PACKAGE_MANAGER"
    log_success "Dependencies installed"
    
    # Setup environment
    setup_environment
    log_success "Environment configured"
    
    # Verify setup
    verify_setup
    log_success "Setup verification complete"
    
    echo ""
    log_success "Setup complete! 🚀"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Review .env.local for environment variables"
    echo "  2. Run '$PACKAGE_MANAGER run dev' to start development"
    echo "  3. Run '$PACKAGE_MANAGER run test:all' to verify tests"
    echo "  4. Open http://localhost:3000 in your browser"
    echo ""
    echo -e "${BLUE}Available commands:${NC}"
    echo "  $PACKAGE_MANAGER run dev          # Start development server"
    echo "  $PACKAGE_MANAGER run test:all     # Run all tests"
    echo "  $PACKAGE_MANAGER run quality      # Full quality check"
    echo "  $PACKAGE_MANAGER run build        # Production build"
}

# Run main function
main "$@"