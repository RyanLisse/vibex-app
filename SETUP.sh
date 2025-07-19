#!/bin/bash

# SETUP.sh - Idempotent setup script for Codex-Clone project
# This script can be run multiple times safely

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="codex-clone"
MIN_NODE_VERSION="18.0.0"
MIN_BUN_VERSION="1.0.0"
DB_NAME="${PROJECT_NAME}_dev"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Compare version numbers
version_ge() {
    printf '%s\n%s' "$2" "$1" | sort -C -V
}

# Check and install Bun
check_bun() {
    log_info "Checking Bun installation..."
    
    if command_exists bun; then
        local bun_version
        bun_version=$(bun --version)
        log_info "Found Bun version: $bun_version"
        
        if version_ge "$bun_version" "$MIN_BUN_VERSION"; then
            log_success "Bun version is compatible"
            return 0
        else
            log_warning "Bun version $bun_version is below minimum required $MIN_BUN_VERSION"
        fi
    else
        log_warning "Bun not found"
    fi
    
    log_info "Installing/updating Bun..."
    if command_exists curl; then
        curl -fsSL https://bun.sh/install | bash
        export PATH="$HOME/.bun/bin:$PATH"
        log_success "Bun installed successfully"
    else
        log_error "curl not found. Please install curl and retry."
        return 1
    fi
}

# Check Node.js
check_node() {
    log_info "Checking Node.js installation..."
    
    if command_exists node; then
        local node_version
        node_version=$(node --version | sed 's/v//')
        log_info "Found Node.js version: $node_version"
        
        if version_ge "$node_version" "$MIN_NODE_VERSION"; then
            log_success "Node.js version is compatible"
            return 0
        else
            log_warning "Node.js version $node_version is below minimum required $MIN_NODE_VERSION"
            log_info "Please update Node.js to version $MIN_NODE_VERSION or higher"
            return 1
        fi
    else
        log_error "Node.js not found. Please install Node.js $MIN_NODE_VERSION or higher"
        return 1
    fi
}

# Check PostgreSQL
check_postgresql() {
    log_info "Checking PostgreSQL installation..."
    
    if command_exists psql; then
        local pg_version
        pg_version=$(psql --version | grep -oE '[0-9]+\.[0-9]+')
        log_success "Found PostgreSQL version: $pg_version"
        return 0
    else
        log_warning "PostgreSQL not found"
        log_info "Please install PostgreSQL 14+ for database functionality"
        log_info "macOS: brew install postgresql"
        log_info "Ubuntu: sudo apt-get install postgresql postgresql-contrib"
        return 1
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing project dependencies..."
    
    if [ -f "package.json" ]; then
        if command_exists bun; then
            log_info "Installing dependencies with Bun..."
            bun install
            log_success "Dependencies installed with Bun"
        elif command_exists npm; then
            log_info "Installing dependencies with npm..."
            npm install
            log_success "Dependencies installed with npm"
        else
            log_error "No package manager found. Please install Bun or npm."
            return 1
        fi
    else
        log_error "package.json not found. Are you in the correct directory?"
        return 1
    fi
}

# Setup environment file
setup_environment() {
    log_info "Setting up environment configuration..."
    
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            log_success "Created .env.local from .env.example"
            log_warning "Please update .env.local with your actual API keys and database URL"
        else
            log_warning ".env.example not found. Creating basic .env.local"
            cat > .env.local << EOF
# Database Configuration
DATABASE_URL=postgresql://localhost:5432/${DB_NAME}
ELECTRIC_URL=postgresql://localhost:5432/${DB_NAME}

# AI Service API Keys (update with your keys)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Authentication
AUTH_SECRET=your_auth_secret_here

# Logging
LOGGING_LEVEL=info
SERVICE_NAME=${PROJECT_NAME}
SERVICE_VERSION=1.0.0

# Development
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
            log_success "Created basic .env.local"
        fi
    else
        log_success ".env.local already exists"
    fi
}

# Setup database
setup_database() {
    log_info "Setting up database..."
    
    if command_exists psql; then
        # Check if database exists
        if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
            log_success "Database '$DB_NAME' already exists"
        else
            log_info "Creating database '$DB_NAME'..."
            createdb "$DB_NAME" 2>/dev/null || {
                log_warning "Could not create database. It may already exist or you may need permissions."
            }
        fi
        
        # Run migrations if available
        if [ -f "db/cli.ts" ] && command_exists bun; then
            log_info "Running database migrations..."
            bun run db:migrate || log_warning "Migration failed. Database may need manual setup."
            
            # Initialize Electric if script exists
            if [ -f "db/cli.ts" ]; then
                log_info "Initializing ElectricSQL..."
                bun run db:init || log_warning "ElectricSQL initialization failed."
            fi
        elif [ -f "package.json" ]; then
            # Check if migration scripts exist in package.json
            if grep -q "db:migrate" package.json; then
                log_info "Running database migrations..."
                if command_exists bun; then
                    bun run db:migrate || log_warning "Migration failed"
                elif command_exists npm; then
                    npm run db:migrate || log_warning "Migration failed"
                fi
            fi
        fi
    else
        log_warning "PostgreSQL not available. Skipping database setup."
    fi
}

# Verify setup
verify_setup() {
    log_info "Verifying setup..."
    
    local success=true
    
    # Check if we can run basic commands
    if command_exists bun; then
        if bun run type-check > /dev/null 2>&1; then
            log_success "TypeScript compilation successful"
        else
            log_warning "TypeScript compilation failed"
            success=false
        fi
        
        # Test basic functionality
        if [ -f "test-minimal.test.tsx" ]; then
            if bun test test-minimal.test.tsx > /dev/null 2>&1; then
                log_success "Basic tests passing"
            else
                log_warning "Basic tests failing"
                success=false
            fi
        fi
    fi
    
    # Check database connection if available
    if command_exists psql && [ -f ".env.local" ]; then
        if command_exists bun && grep -q "db:health" package.json; then
            if bun run db:health > /dev/null 2>&1; then
                log_success "Database connection verified"
            else
                log_warning "Database connection failed"
                success=false
            fi
        fi
    fi
    
    if [ "$success" = true ]; then
        log_success "Setup verification completed successfully!"
    else
        log_warning "Setup completed with some warnings. Check logs above."
    fi
    
    return 0
}

# Display next steps
show_next_steps() {
    echo
    log_info "Setup completed! Next steps:"
    echo
    echo "1. Update your .env.local file with actual API keys:"
    echo "   - OpenAI API key from: https://platform.openai.com/api-keys"
    echo "   - Anthropic API key (optional)"
    echo "   - GitHub OAuth credentials (if using auth)"
    echo
    echo "2. Start the development server:"
    echo "   bun run dev:all    # Start all services"
    echo "   # OR"
    echo "   bun run dev        # Start just the Next.js server"
    echo
    echo "3. Run tests to verify everything works:"
    echo "   bun run test"
    echo
    echo "4. Check the database:"
    echo "   bun run db:health"
    echo "   bun run db:studio  # Open database browser"
    echo
    echo "5. View the application:"
    echo "   http://localhost:3000"
    echo
    log_success "Happy coding! 🚀"
}

# Main setup function
main() {
    echo
    log_info "Starting Codex-Clone project setup..."
    echo
    
    # Check prerequisites
    log_info "Checking prerequisites..."
    check_node || log_warning "Node.js check failed"
    check_bun || { log_error "Bun installation failed"; exit 1; }
    check_postgresql || log_warning "PostgreSQL not available"
    
    echo
    
    # Setup project
    install_dependencies || { log_error "Dependency installation failed"; exit 1; }
    setup_environment
    setup_database
    
    echo
    
    # Verify and finish
    verify_setup
    show_next_steps
}

# Run main function
main "$@"