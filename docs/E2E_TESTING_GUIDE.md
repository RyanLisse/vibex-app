# E2E Testing Guide - Consolidated Hybrid Framework

## Overview

The Vibex App uses a consolidated hybrid E2E testing framework that combines **Playwright** for standard browser automation and **Stagehand** for AI-powered testing scenarios.

## Architecture

### Test Runners
- **Playwright**: Standard E2E tests, cross-browser compatibility, performance testing
- **Stagehand**: AI-powered browser automation, complex user interactions, accessibility analysis

### Configuration Files
- `playwright.config.ts`: Main configuration supporting both standard and AI-powered tests
- `tests/e2e/setup/global-setup.ts`: Global setup for enhanced E2E environment

## Test Categories

### 1. Standard Playwright Tests
- **Location**: `tests/e2e/*.spec.ts` (excluding AI-specific files)
- **Purpose**: Basic functionality, navigation, form interactions
- **Browsers**: Chromium, Firefox, WebKit
- **Command**: `bun run test:e2e:standard`

### 2. AI-Powered Stagehand Tests
- **Location**: `tests/e2e/ai-powered-*.spec.ts`, `tests/e2e/visual-regression-*.spec.ts`
- **Purpose**: Complex user interactions, accessibility analysis, visual regression
- **Browser**: Chromium (optimized for AI operations)
- **Command**: `bun run test:e2e:stagehand`

## Available Commands

```bash
# Run all E2E tests
bun run test:e2e

# Run standard Playwright tests only
bun run test:e2e:standard

# Run AI-powered tests
bun run test:e2e:ai
bun run test:e2e:visual
bun run test:e2e:stagehand

# Debug modes
bun run test:e2e:headed
bun run test:e2e:debug
bun run test:e2e:stagehand:debug
```

## Configuration Features

### Playwright Configuration
- **Timeout Settings**: Extended timeouts for AI operations (2 minutes for Stagehand tests)
- **Browser Optimization**: Special launch options for AI compatibility
- **Parallel Execution**: Disabled during Stagehand debugging
- **Enhanced Reporting**: HTML, JSON, and line reporters with debugging support

### Stagehand Integration
- **Dedicated Project**: `stagehand-ai` project for AI-specific tests
- **Fallback Mode**: Tests run with mock data when no OpenAI API key is provided
- **Debug Support**: `STAGEHAND_DEBUG=true` for detailed AI operation logging

## Environment Setup

### Required Environment Variables
```bash
# Optional: For full AI functionality
OPENAI_API_KEY=your_openai_api_key
# or
STAGEHAND_API_KEY=your_stagehand_api_key

# Optional: For debugging
STAGEHAND_DEBUG=true
```

### Dependencies
- `@playwright/test`: Standard browser automation
- `@browserbasehq/stagehand`: AI-powered browser automation
- `@vitejs/plugin-react`: React component support
- `vite-tsconfig-paths`: TypeScript path resolution

## Test Results

### Standard Tests
- **6 tests** across 3 browsers (Chromium, Firefox, WebKit)
- **Execution Time**: ~1.8 minutes
- **Coverage**: Basic functionality, navigation, homepage loading

### AI-Powered Tests
- **6 advanced tests** for complex interactions
- **5 visual regression tests** for UI consistency
- **Execution Time**: ~1.5-1.7 minutes
- **Coverage**: Accessibility, responsive design, form interactions, navigation analysis

## Best Practices

1. **Use Standard Tests** for basic functionality and cross-browser compatibility
2. **Use AI Tests** for complex user workflows and accessibility validation
3. **Set API Keys** for full AI functionality in CI/CD environments
4. **Enable Debug Mode** when developing new AI-powered tests
5. **Monitor Timeouts** as AI operations may take longer than standard tests

## Troubleshooting

### Common Issues
- **Hanging Tests**: Check for proper API key configuration
- **Timeout Errors**: Increase timeout settings for complex AI operations
- **Browser Launch Failures**: Verify browser installation and launch options

### Debug Commands
```bash
# Debug specific AI test
STAGEHAND_DEBUG=true bun run test:e2e:stagehand:debug

# View test reports
npx playwright show-report

# Check test results
cat test-results/results.json
```

## Integration with Consolidated Testing Framework

The E2E testing framework is fully integrated with the consolidated hybrid testing approach:
- **No Conflicts**: Works alongside Vitest unit/integration tests
- **Unified Reporting**: Consistent reporting across all test types
- **Shared Configuration**: Uses common TypeScript and build configurations
- **CI/CD Ready**: Optimized for continuous integration environments
