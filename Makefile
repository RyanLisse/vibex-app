# Codex Clone - Development Makefile
# Common tasks for agent-driven development

# Common ports used by the application
DEV_PORT := 3000
STORYBOOK_PORT := 6006
E2E_PORT := 3001

# Determine OS and set kill command
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
    KILL_CMD := kill -9
    FIND_PID_CMD = lsof -ti:$(1) || true
else ifeq ($(UNAME_S),Darwin)
    KILL_CMD := kill -9
    FIND_PID_CMD = lsof -ti:$(1) || true
else
    # Windows
    KILL_CMD := taskkill /F /PID
    FIND_PID_CMD = for /f "tokens=5" %a in ('netstat -aon ^| findstr :$(1) ^| findstr LISTENING') do @echo %a
endif

.PHONY: help setup dev build test clean quality deploy kill-ports

# Default target
help: ## Show this help message
	@echo "Codex Clone - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Use 'make <command>' to run a command."

# Detect package manager
PM := $(shell command -v bun >/dev/null 2>&1 && echo "bun" || echo "npm")

setup: ## Run full project setup
	@echo "🚀 Setting up project..."
	@chmod +x SETUP.sh
	@./SETUP.sh

dev: kill-ports ## Start development server with Inngest
	@echo "🔧 Starting development servers..."
	@if [ "$(PM)" = "bun" ]; then \
		echo "🚀 Starting Inngest dev server and Next.js with Bun..."; \
		bunx concurrently --names "NEXT,INNGEST" --prefix-colors "blue,green" \
			"bun run dev" \
			"bunx inngest-cli@latest dev"; \
	else \
		echo "🚀 Starting Inngest dev server and Next.js with npm..."; \
		npx concurrently --names "NEXT,INNGEST" --prefix-colors "blue,green" \
			"npm run dev" \
			"npx inngest-cli@latest dev"; \
	fi

dev-next: kill-ports ## Start only Next.js development server
	@echo "🔧 Starting Next.js development server..."
	@$(PM) run dev

dev-inngest: ## Start only Inngest dev server
	@echo "🚀 Starting Inngest dev server..."
	@if [ "$(PM)" = "bun" ]; then \
		bunx inngest-cli@latest dev; \
	else \
		npx inngest-cli@latest dev; \
	fi

build: ## Build for production
	@echo "🏗️  Building for production..."
	@$(PM) run build

kill-ports: ## Kill processes on common development ports
	@echo "🔫 Killing processes on ports $(DEV_PORT), $(STORYBOOK_PORT), $(E2E_PORT)..."
	@-$(foreach port,$(DEV_PORT) $(STORYBOOK_PORT) $(E2E_PORT),\
		PIDS=$$($(call FIND_PID_CMD,$(port))); \
		[ -n "$$PIDS" ] && echo "Killing processes on port $(port): $$PIDS" && $(KILL_CMD) $$PIDS 2>/dev/null || true; \
	)

# Test targets
test: kill-ports ## Run all tests
	@echo "🧪 Running all tests..."
	@$(PM) run test:all

test-unit: kill-ports ## Run unit tests only
	@echo "🔬 Running unit tests..."
	@$(PM) run test:unit

test-e2e: kill-ports ## Run E2E tests only
	@echo "🎭 Running E2E tests..."
	@$(PM) run test:e2e

test-watch: kill-ports ## Run tests in watch mode
	@echo "👀 Running tests in watch mode..."
	@$(PM) run test:watch

quality: ## Run full quality check
	@echo "✨ Running quality checks..."
	@$(PM) run quality

format: ## Format code with Biome
	@echo "🎨 Formatting code..."
	@$(PM) run format

lint: ## Lint code with Biome
	@echo "🔍 Linting code..."
	@$(PM) run lint

type-check: ## Check TypeScript types
	@echo "📝 Checking types..."
	@$(PM) run type-check

storybook: kill-ports ## Start Storybook
	@echo "📚 Starting Storybook..."
	@$(PM) run storybook

clean: ## Clean build artifacts and dependencies
	@echo "🧹 Cleaning project..."
	@rm -rf .next
	@rm -rf node_modules
	@rm -rf coverage
	@rm -rf playwright-report
	@rm -rf storybook-static
	@rm -f *.tsbuildinfo

install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	@$(PM) install

update: ## Update dependencies
	@echo "⬆️  Updating dependencies..."
	@$(PM) run deps:update

security: ## Run security audit
	@echo "🛡️  Running security audit..."
	@$(PM) run security

analyze: ## Analyze bundle size
	@echo "📊 Analyzing bundle size..."
	@$(PM) run analyze

deps-check: ## Check for unused dependencies
	@echo "🔍 Checking dependencies..."
	@$(PM) run deps:check

ci: ## Run CI checks locally
	@echo "🤖 Running CI checks..."
	@make quality
	@make test
	@make build

# Helper function to check if port is in use
check-port-%:
	@echo "Checking port $*..."
	@if [ "$(UNAME_S)" = "Darwin" ] || [ "$(UNAME_S)" = "Linux" ]; then \
		lsof -i :$* >/dev/null 2>&1 && echo "Port $* is in use" || echo "Port $* is available"; \
	else \
		echo "Port check not implemented for Windows"; \
	fi

# Development helpers
reset: clean install ## Reset project (clean + install)
	@echo "🔄 Project reset complete"

quick-test: ## Run quick tests (unit only)
	@echo "⚡ Running quick tests..."
	@$(PM) run test:unit

fix: ## Auto-fix linting and formatting issues
	@echo "🔧 Auto-fixing issues..."
	@$(PM) run format
	@$(PM) run lint:fix

status: ## Show project status
	@echo "📊 Project Status:"
	@echo "  Package Manager: $(PM)"
	@echo "  Node Version: $$(node --version 2>/dev/null || echo 'Not installed')"
	@echo "  Git Status: $$(git status --porcelain | wc -l) modified files"
	@echo "  Tests: $$(find . -name '*.test.*' -o -name '*.spec.*' | wc -l) test files"