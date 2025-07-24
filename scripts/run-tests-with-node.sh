#!/bin/bash

# Run Tests with Node.js Instead of Bun
# This script runs Vitest with Node.js to avoid Bun compatibility issues

echo "🚀 Running tests with Node.js for better Vitest compatibility..."
echo ""

# Export NODE environment
export NODE_ENV=test

# Run unit tests with Node
echo "📦 Running unit tests..."
NODE_OPTIONS="--max-old-space-size=4096" npx vitest run --config=vitest.config.ts --reporter=verbose

# Check exit code
if [ $? -eq 0 ]; then
    echo "✅ Unit tests passed!"
else
    echo "❌ Unit tests failed!"
    exit 1
fi

# Run integration tests with Node
echo ""
echo "🔗 Running integration tests..."
NODE_OPTIONS="--max-old-space-size=4096" npx vitest run --config=vitest.integration.config.ts --reporter=verbose

# Check exit code
if [ $? -eq 0 ]; then
    echo "✅ Integration tests passed!"
else
    echo "❌ Integration tests failed!"
    exit 1
fi

echo ""
echo "✨ All tests completed!"