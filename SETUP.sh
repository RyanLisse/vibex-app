#!/bin/bash

# SETUP.sh - Idempotent setup script for Vibex project
# This script can be run multiple times safely

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="vibex"
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
        # Add to PATH for current session
        export PATH="$HOME/.bun/bin:$PATH"
        # Add to shell profile for persistence
        if [ -f "$HOME/.bashrc" ]; then
            echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$HOME/.bashrc"
        elif [ -f "$HOME/.zshrc" ]; then
            echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$HOME/.zshrc"
        fi
        log_success "Bun installed successfully"
    else
        log_error "curl not found. Please install curl and retry."
        return 1
    fi
}

# Check and install qlty CLI for code quality analysis
check_qlty() {
    log_info "Checking qlty CLI installation..."
    
    if command_exists qlty; then
        local qlty_version
        qlty_version=$(qlty --version 2>/dev/null | head -n1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
        log_success "Found qlty version: $qlty_version"
        return 0
    else
        log_warning "qlty CLI not found"
    fi
    
    log_info "Installing qlty CLI..."
    if command_exists curl; then
        # Install qlty CLI with proper error handling for remote environments
        if curl -fsSL https://qlty.sh | bash; then
            # Add to PATH for current session
            export PATH="$HOME/.qlty/bin:$PATH"
            # Source shell profile to update PATH
            if [ -f "$HOME/.bashrc" ]; then
                source "$HOME/.bashrc" 2>/dev/null || true
            elif [ -f "$HOME/.zshrc" ]; then
                source "$HOME/.zshrc" 2>/dev/null || true
            fi
            # Verify installation
            if command_exists qlty; then
                log_success "qlty CLI installed successfully"
                # Initialize qlty in the project if not already done
                if [ ! -f ".qlty/qlty.toml" ] && [ -d ".git" ]; then
                    log_info "Initializing qlty in project..."
                    qlty init || log_warning "qlty initialization failed - can be done manually later"
                fi
            else
                log_warning "qlty installation completed but command not immediately available. You may need to restart your shell."
            fi
        else
            log_warning "qlty installation failed. Code quality analysis will not be available."
            return 1
        fi
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

# Setup Terragon setup script for cloud sandbox environments
setup_terragon_script() {
    log_info "Setting up Terragon environment setup script..."
    
    if [ ! -f "terragon-setup.sh" ]; then
        log_info "Creating terragon-setup.sh for Terragon cloud sandbox..."
        cat > terragon-setup.sh << 'EOF'
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
    echo "  • View app: http://localhost:3000"
}

main "$@"
EOF
        
        # Make the script executable
        chmod +x terragon-setup.sh
        log_success "Created executable terragon-setup.sh"
        log_info "This script will run automatically in Terragon cloud sandbox environments"
    else
        log_success "terragon-setup.sh already exists"
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
        if bun run typecheck > /dev/null 2>&1; then
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
        
        # Check linting
        if bun run lint > /dev/null 2>&1; then
            log_success "Code linting passed"
        else
            log_warning "Code linting failed"
            success=false
        fi
    fi
    
    # Check qlty CLI functionality
    if command_exists qlty; then
        if [ -f ".qlty/qlty.toml" ]; then
            log_success "qlty CLI configured and ready"
        else
            log_warning "qlty CLI installed but not initialized"
        fi
    else
        log_warning "qlty CLI not available - code quality analysis limited"
    fi
    
    # Check Terragon setup script
    if [ -f "terragon-setup.sh" ] && [ -x "terragon-setup.sh" ]; then
        log_success "Terragon setup script ready"
    else
        log_warning "Terragon setup script not found or not executable"
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
    echo "   bun run test:all   # Run all tests"
    echo "   bun run test:unit  # Unit tests only"
    echo
    echo "4. Run code quality checks:"
    echo "   qlty smells --all  # Check for code smells"
    echo "   qlty check --all   # Run linters on all files"
    echo "   qlty fmt           # Auto-format code"
    echo
    echo "5. Check the database:"
    echo "   bun run db:health"
    echo "   bun run db:studio  # Open database browser"
    echo
    echo "6. View the application:"
    echo "   http://localhost:3000"
    echo
    echo "7. For Terragon cloud sandbox environments:"
    echo "   ./terragon-setup.sh  # Run the Terragon-specific setup"
    echo "   # (This runs automatically in Terragon cloud environments)"
    echo
    log_success "Happy coding! 🚀"
}

# Main setup function
main() {
    echo
    log_info "Starting Vibex project setup..."
    echo
    
    # Check prerequisites
    log_info "Checking prerequisites..."
    check_node || log_warning "Node.js check failed"
    check_bun || { log_error "Bun installation failed"; exit 1; }
    check_qlty || log_warning "qlty CLI installation failed - code quality analysis will be limited"
    check_postgresql || log_warning "PostgreSQL not available"
    
    echo
    
    # Setup project
    install_dependencies || { log_error "Dependency installation failed"; exit 1; }
    setup_environment
    setup_terragon_script
    setup_database
    
    echo
    
    # Verify and finish
    verify_setup
    show_next_steps
}

# Run main function
main "$@"