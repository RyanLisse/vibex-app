#!/bin/bash

# Fix files with commented closing braces

echo "Fixing files with commented closing braces..."

# Find files with commented closing braces at the end
files=$(find . -name "*.test.ts*" -o -name "*.spec.ts*" | grep -v node_modules)

for file in $files; do
    # Check if file ends with commented braces
    if tail -2 "$file" | grep -E "^//\s*\}\);?$" > /dev/null 2>&1; then
        echo "Fixing: $file"
        
        # Remove the commented closing braces and add proper ones
        sed -i '$d' "$file"  # Remove last line
        sed -i '$d' "$file"  # Remove second to last line if it's also a comment
        
        # Add proper closing
        echo "  });" >> "$file"
        echo "});" >> "$file"
    fi
done

echo "Done fixing closing braces"