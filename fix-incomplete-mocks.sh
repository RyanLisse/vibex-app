#!/bin/bash

# Fix incomplete vi.mock comments

echo "Fixing incomplete vi.mock comments..."

# Find files with potentially incomplete comments
files=$(find . -name "*.test.ts*" -o -name "*.spec.ts*" | grep -v node_modules)

for file in $files; do
    # Check if file has incomplete mock comments (lines after // vi.mock that aren't comments)
    if grep -A 5 "^// vi\.mock(" "$file" | grep -E "^\s+(default:|[a-zA-Z]+:)" > /dev/null 2>&1; then
        echo "Fixing: $file"
        
        # Use perl for multi-line replacements
        perl -i -0pe 's/(\/\/ vi\.mock\([^)]+\), \(\) => \(\{)\n(\s+)(default:)/\1\n\2\/\/ \3/g' "$file"
        perl -i -0pe 's/(\/\/ vi\.mock\([^)]+\), \(\) => \(\{)\n(\s+)([a-zA-Z]+:)/\1\n\2\/\/ \3/g' "$file"
        
        # Fix closing braces
        perl -i -0pe 's/^(\})\)\);$/\/\/ \1));/gm' "$file"
    fi
done

echo "Done fixing incomplete mocks"