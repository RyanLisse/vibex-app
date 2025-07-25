#!/bin/bash

# Terragon Environment Setup Script for Vibex
# This script runs automatically in Terragon cloud sandbox environments
# Sandbox specs: 2 CPU, 4GB RAM, 5GB disk, Ubuntu 24.04

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[TERRAGON-SETUP]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[TERRAGON-SETUP]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[TERRAGON-SETUP]${NC} $1"
}

log_error() {
    echo -e "${RED}[TERRAGON-SETUP]${NC} $1"
}

main() {
    log_info "Starting Vibex setup for Terragon cloud sandbox..."

    # Install Node.js dependencies with Bun (pre-installed in Terragon)
    if [ -f "package.json" ]; then
        log_info "Installing Node.js dependencies with Bun..."
        bun install
        log_success "Dependencies installed"
    fi

    # Install Python dependencies if requirements.txt exists
    if [ -f "requirements.txt" ]; then
        log_info "Installing Python dependencies..."
        pip install -r requirements.txt
        log_success "Python dependencies installed"
    fi

    # Install qlty CLI for code quality (if not pre-installed)
    if ! command -v qlty >/dev/null 2>&1; then
        log_info "Installing qlty CLI for code quality..."
        curl -fsSL https://qlty.sh | bash
        export PATH="$HOME/.qlty/bin:$PATH"

        # Initialize qlty if this is a git repository
        if [ -d ".git" ] && [ ! -f ".qlty/qlty.toml" ]; then
            qlty init || log_warning "qlty initialization failed - can be done manually"
        fi
        log_success "qlty CLI ready"
    else
        log_success "qlty CLI already available"
    fi

    # Setup Claude Code enhancement tools
    setup_claude_tools
}

# Setup Claude Code enhancement tools
setup_claude_tools() {
    log_info "Setting up Claude Code enhancement tools..."

    # Check if daddy-claude configuration is already installed
    if [ ! -d "$HOME/.claude" ]; then
        log_info "Installing daddy-claude configuration (16 AI commands + security hooks)..."
        if command -v npx >/dev/null 2>&1; then
            npx daddy-claude || log_warning "daddy-claude installation failed - enhanced Claude features will be limited"
            log_success "daddy-claude configuration installed"
        else
            log_warning "npx not available - daddy-claude installation skipped"
        fi
    else
        log_success "daddy-claude configuration already exists"
    fi

    # Install ken-you-reflect MCP server globally
    if command -v npm >/dev/null 2>&1; then
        if ! npm list -g ken-you-reflect >/dev/null 2>&1; then
            log_info "Installing ken-you-reflect MCP server (brutal honesty tool)..."
            npm install -g ken-you-reflect || log_warning "ken-you-reflect installation failed - reflection features will be limited"
            log_success "ken-you-reflect MCP server installed"
        else
            log_success "ken-you-reflect already installed"
        fi
    else
        log_warning "npm not available - ken-you-reflect installation skipped"
    fi

    log_success "Claude Code enhancement tools setup complete"
    
    # Install Claude Flow for enhanced development workflow
    log_info "Setting up Claude Flow..."
    if ! command -v claude-flow >/dev/null 2>&1; then
        log_info "Installing Claude Flow..."
        npm install -g claude-flow@alpha || log_warning "Claude Flow installation failed - can be installed manually"
        
        # Initialize Claude Flow if installed successfully
        if command -v claude-flow >/dev/null 2>&1; then
            log_success "Claude Flow installed successfully"
            # Setup MCP server configuration
            log_info "Configuring Claude Flow MCP server..."
            npx claude-flow@alpha mcp init || log_warning "Claude Flow MCP initialization failed"
        fi
    else
        log_success "Claude Flow already available"
    fi
    
    # Setup environment variables for Terragon cloud environment
    if [ ! -f ".env.local" ]; then
        log_info "Creating Terragon-optimized environment configuration..."
        cat > .env.local << 'ENVEOF'
# Terragon Cloud Environment Configuration
NODE_ENV=development
SERVICE_NAME=vibex
SERVICE_VERSION=1.0.0
LOGGING_LEVEL=info

# Database (configure with your cloud database)
DATABASE_URL=postgresql://localhost:5432/vibex_dev
ELECTRIC_URL=postgresql://localhost:5432/vibex_dev

# AI Service API Keys (set via Terragon environment variables)
OPENAI_API_KEY=${OPENAI_API_KEY:-your_openai_api_key_here}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your_anthropic_api_key_here}

# Authentication
AUTH_SECRET=${AUTH_SECRET:-development_secret_change_in_production}

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENVEOF
        log_success "Environment configuration created"
    fi
    
    # Run TypeScript compilation check
    if command -v bun >/dev/null 2>&1 && [ -f "package.json" ]; then
        log_info "Running TypeScript compilation check..."
        if bun run typecheck >/dev/null 2>&1; then
            log_success "TypeScript compilation successful"
        else
            log_warning "TypeScript compilation has issues - check manually"
        fi
    fi
    
    # Run code quality check if qlty is available
    if command -v qlty >/dev/null 2>&1 && [ -f ".qlty/qlty.toml" ]; then
        log_info "Running code quality analysis..."
        qlty check --all >/dev/null 2>&1 || log_warning "Code quality issues found - check with 'qlty check'"
        log_success "Code quality analysis complete"
    fi
    
    log_success "Terragon environment setup complete! 🚀"
    log_info "Next steps:"
    echo "  • Start development: bun run dev"
    echo "  • Run tests: bun run test:all"
    echo "  • Check code quality: qlty smells --all"
    echo "  • Use Claude Flow: npx claude-flow@alpha --help"
    echo "  • Start MCP server: npx claude-flow@alpha mcp start"
    echo "  • View app: http://localhost:3000"
    echo ""
    log_info "Claude Code Enhancement Tools:"
    echo "  • 16 AI slash commands available (if daddy-claude installed)"
    echo "  • Security hooks active for code validation"
    echo "  • ken-you-reflect MCP for brutal honesty feedback"
    echo "  • Enhanced development workflow with cognitive safeguards"
}

main "$@"