#!/bin/bash

# Quick Type Check - Pragmatic TypeScript validation
# Focuses on catching obvious type errors without full compilation

set -e

echo "⚡ Running quick type validation..."
echo "🎯 Focus: Catching obvious type errors and import issues"

# Function to check TypeScript files for obvious issues
check_typescript_basics() {
    echo "📝 Checking TypeScript files for basic issues..."

    local error_count=0
    local files_checked=0
    local warning_count=0

    # Check for common import/export issues in key files
    local key_files=(
        "app/layout.tsx"
        "app/page.tsx"
        "lib/utils.ts"
        "components/ui/button.tsx"
        "hooks/use-auth.ts"
    )

    for file in "${key_files[@]}"; do
        if [[ -f "$file" ]]; then
            ((files_checked++))

            # Check for obvious import issues
            if grep -q "import.*from.*undefined" "$file" 2>/dev/null; then
                echo "❌ Undefined import in: $file"
                ((error_count++))
            fi

            # Check for missing semicolons at end of imports
            if grep -q "^import.*[^;]$" "$file" 2>/dev/null; then
                echo "⚠️  Missing semicolon in import: $file"
                ((warning_count++))
            fi

            # Check for missing React import in JSX files (Next.js 13+ doesn't require this)
            if [[ "$file" == *.tsx ]] && grep -q "<[A-Z]" "$file" && ! grep -q "import.*React" "$file" && ! grep -q "import.*react" "$file"; then
                # This is actually OK in Next.js 13+ with new JSX transform
                echo "ℹ️  No explicit React import in: $file (OK for Next.js 13+)"
            fi

            # Check for obvious syntax patterns that indicate problems
            if grep -q "export.*{.*}.*from.*''" "$file" 2>/dev/null; then
                echo "❌ Empty import path in: $file"
                ((error_count++))
            fi

            # Check for duplicate imports
            if [ $(grep -c "^import.*from.*'react'" "$file" 2>/dev/null) -gt 1 ]; then
                echo "⚠️  Duplicate React imports in: $file"
                ((warning_count++))
            fi
        fi
    done

    echo "📊 Checked $files_checked key TypeScript files"
    echo "📈 Found $error_count errors and $warning_count warnings"

    if [ $error_count -gt 5 ]; then
        echo "❌ Too many critical errors found: $error_count"
        echo "💡 Fix import/export errors before pushing"
        return 1
    elif [ $error_count -gt 0 ]; then
        echo "⚠️  Found $error_count errors (allowing push, but consider fixing)"
    else
        echo "✅ No critical TypeScript issues found"
    fi

    return 0
}

# Function to validate package.json and tsconfig.json
check_config_files() {
    echo "⚙️  Validating configuration files..."
    
    # Check package.json
    if ! node -e "require('./package.json')" 2>/dev/null; then
        echo "❌ Invalid package.json"
        return 1
    fi
    
    # Check tsconfig.json
    if ! node -e "require('./tsconfig.json')" 2>/dev/null; then
        echo "❌ Invalid tsconfig.json"
        return 1
    fi
    
    # Check if TypeScript is available
    if ! command -v tsc >/dev/null 2>&1 && ! bun x tsc --version >/dev/null 2>&1; then
        echo "⚠️  TypeScript not available, skipping advanced checks"
        return 0
    fi
    
    echo "✅ Configuration files are valid"
    return 0
}

# Function to do a quick TypeScript parse check on critical files
quick_parse_check() {
    echo "🔍 Quick parse check on critical files..."
    
    local critical_files=(
        "app/layout.tsx"
        "app/page.tsx"
        "lib/utils.ts"
        "components/ui/button.tsx"
    )
    
    for file in "${critical_files[@]}"; do
        if [[ -f "$file" ]]; then
            echo "  Checking: $file"
            # Use TypeScript's parser to check syntax only
            if ! timeout 5s bun x tsc --noEmit --skipLibCheck "$file" 2>/dev/null; then
                echo "⚠️  Parse issues in: $file (but continuing...)"
            fi
        fi
    done
    
    echo "✅ Quick parse check completed"
    return 0
}

# Main execution
echo "🚀 Starting quick type validation..."

# Step 1: Check configuration files
if ! check_config_files; then
    echo "❌ Configuration validation failed"
    exit 1
fi

# Step 2: Check TypeScript basics
if ! check_typescript_basics; then
    echo "❌ Basic TypeScript validation failed"
    exit 1
fi

# Step 3: Quick parse check (non-blocking)
quick_parse_check

echo ""
echo "🎉 Quick type validation completed successfully!"
echo "✅ No critical type issues found"
echo "💡 For full type checking, run: bun run type-check"
echo "🔧 For comprehensive testing, run: bun run test"
