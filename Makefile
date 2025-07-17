# Codex Clone - Development Makefile
# Common tasks for agent-driven development

.PHONY: help setup dev build test clean quality deploy

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

dev: ## Start development server
	@echo "🔧 Starting development server..."
	@$(PM) run dev

build: ## Build for production
	@echo "🏗️  Building for production..."
	@$(PM) run build

test: ## Run all tests
	@echo "🧪 Running all tests..."
	@$(PM) run test:all

test-unit: ## Run unit tests only
	@echo "🔬 Running unit tests..."
	@$(PM) run test:unit

test-e2e: ## Run E2E tests only
	@echo "🎭 Running E2E tests..."
	@$(PM) run test:e2e

test-watch: ## Run tests in watch mode
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

storybook: ## Start Storybook
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