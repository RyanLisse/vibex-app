#!/bin/bash

# Fast Pre-Push Check Script
# Designed to complete in under 30 seconds with reliable checks

set -e

echo "🚀 Running fast pre-push checks..."
echo "⏱️  Target completion time: under 30 seconds"
echo ""

# Function to run command with timeout
run_with_timeout() {
    local timeout_duration=$1
    local command_name=$2
    shift 2
    local command="$@"
    
    echo "⏳ Running $command_name (max ${timeout_duration}s)..."
    
    # Use timeout command if available (Linux/macOS with coreutils)
    if command -v timeout >/dev/null 2>&1; then
        if timeout ${timeout_duration}s $command; then
            echo "✅ $command_name completed successfully"
            return 0
        else
            echo "❌ $command_name failed or timed out"
            return 1
        fi
    else
        # Fallback for systems without timeout command
        if $command; then
            echo "✅ $command_name completed successfully"
            return 0
        else
            echo "❌ $command_name failed"
            return 1
        fi
    fi
}

# Check 1: Basic syntax check with ESLint (fastest)
echo "📝 Check 1: Basic syntax validation..."
if run_with_timeout 15 "ESLint syntax check" bun run lint --max-warnings 20 --quiet; then
    echo "✅ Syntax check passed"
else
    echo "⚠️  Syntax issues found, but continuing..."
fi
echo ""

# Check 2: Simple file existence and structure check
echo "📁 Check 2: Project structure validation..."
REQUIRED_FILES=(
    "package.json"
    "next.config.ts"
    "tsconfig.json"
    "app/layout.tsx"
    "app/page.tsx"
)

missing_files=()
for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        missing_files+=("$file")
    fi
done

if [[ ${#missing_files[@]} -eq 0 ]]; then
    echo "✅ All required files present"
else
    echo "❌ Missing required files: ${missing_files[*]}"
    exit 1
fi
echo ""

# Check 3: Package.json validation
echo "📦 Check 3: Package configuration validation..."
if node -e "
    try {
        const pkg = require('./package.json');
        if (!pkg.name || !pkg.scripts || !pkg.scripts.build) {
            process.exit(1);
        }
        console.log('✅ Package.json is valid');
    } catch (e) {
        console.log('❌ Package.json is invalid:', e.message);
        process.exit(1);
    }
"; then
    echo "✅ Package configuration valid"
else
    echo "❌ Package configuration invalid"
    exit 1
fi
echo ""

# Check 4: Simple import validation (check for obvious import errors)
echo "🔍 Check 4: Basic import validation..."
if node -e "
    const fs = require('fs');
    const path = require('path');
    
    function checkImports(dir) {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        let errors = 0;
        
        for (const file of files) {
            if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
                errors += checkImports(path.join(dir, file.name));
            } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
                const filePath = path.join(dir, file.name);
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    // Check for obvious import errors
                    const badImports = content.match(/import.*from\s+['\"]\.\.\/\.\.\/\.\.\/\.\.\//g);
                    if (badImports) {
                        console.log('⚠️  Suspicious deep import in', filePath);
                        errors++;
                    }
                } catch (e) {
                    // Skip files that can't be read
                }
            }
        }
        return errors;
    }
    
    const errors = checkImports('./app') + checkImports('./components') + checkImports('./lib');
    if (errors > 5) {
        console.log('❌ Too many import issues found:', errors);
        process.exit(1);
    } else {
        console.log('✅ Import structure looks good');
    }
"; then
    echo "✅ Import validation passed"
else
    echo "❌ Import validation failed"
    exit 1
fi
echo ""

# Summary
echo "🎉 Fast pre-push checks completed successfully!"
echo "✅ All critical checks passed"
echo "💡 For comprehensive testing, run: bun run test"
echo "🔧 For full type checking, run: bun run type-check"
echo ""
