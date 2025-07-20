#!/bin/bash

echo "🔍 Checking Test Framework Status..."
echo "===================================="

# Check for test files
echo -e "\n📁 Test Files Found:"
echo "Unit Tests: $(find lib src stores -name "*.test.*" -type f 2>/dev/null | wc -l | tr -d ' ') files"
echo "Component Tests: $(find components hooks app -name "*.test.*" -type f 2>/dev/null | wc -l | tr -d ' ') files"
echo "Integration Tests: $(find tests/integration -name "*.test.*" -type f 2>/dev/null | wc -l | tr -d ' ') files"
echo "E2E Tests: $(find tests/e2e -name "*.spec.*" -type f 2>/dev/null | wc -l | tr -d ' ') files"

# Check configurations
echo -e "\n⚙️  Configuration Files:"
for config in vitest.config.ts vitest.components.config.ts vitest.integration.config.ts vitest.browser.config.ts vitest.shared.config.ts; do
  if [ -f "$config" ]; then
    echo "✅ $config exists"
  else
    echo "❌ $config missing"
  fi
done

# Check setup files
echo -e "\n🛠️  Setup Files:"
for setup in tests/setup/unit-node.ts tests/setup/components.ts tests/setup/integration.ts tests/setup/browser.ts; do
  if [ -f "$setup" ]; then
    echo "✅ $setup exists"
  else
    echo "❌ $setup missing"
  fi
done

# Check environment
echo -e "\n🌍 Environment:"
if [ -f ".env.test" ]; then
  echo "✅ .env.test exists"
else
  echo "❌ .env.test missing"
fi

# Check for deprecated files
echo -e "\n🗑️  Deprecated Files:"
if [ -f "vitest.workspace.ts" ]; then
  echo "⚠️  vitest.workspace.ts still exists (should be removed)"
else
  echo "✅ No deprecated workspace file"
fi

# Check for skipped tests
echo -e "\n⏭️  Skipped Tests:"
SKIPPED=$(grep -r "\.skip\|describe\.skip\|it\.skip\|test\.skip" --include="*.test.*" --include="*.spec.*" . 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v "expect.*skipped" | wc -l | tr -d ' ')
if [ "$SKIPPED" -eq 0 ]; then
  echo "✅ No skipped tests found"
else
  echo "⚠️  $SKIPPED skipped tests found"
  grep -r "\.skip\|describe\.skip\|it\.skip\|test\.skip" --include="*.test.*" --include="*.spec.*" . 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v "expect.*skipped" | head -5
fi

echo -e "\n✨ Test framework configuration check complete!"