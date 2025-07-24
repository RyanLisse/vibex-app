#!/usr/bin/env python3
"""Fix partial comments in test files where object properties aren't commented"""

import os
import re
import glob

def fix_partial_comments(content):
    """Fix lines that should be commented but aren't"""
    
    lines = content.split('\n')
    fixed_lines = []
    in_commented_block = False
    indent_level = 0
    
    for i, line in enumerate(lines):
        # Check if we're entering a commented mock block
        if re.match(r'^//\s*(vi\.mock|jest\.mock)', line):
            in_commented_block = True
            fixed_lines.append(line)
            continue
            
        # Check if we're exiting a commented block
        if in_commented_block and re.match(r'^//\s*\}\)\);?$', line):
            in_commented_block = False
            fixed_lines.append(line)
            continue
            
        # If we're in a commented block and the line isn't commented
        if in_commented_block and line.strip() and not line.strip().startswith('//'):
            # Add comment to the line, preserving indentation
            indent = len(line) - len(line.lstrip())
            fixed_lines.append(' ' * indent + '// ' + line.lstrip())
        else:
            fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)

def process_file(filepath):
    """Process a single file"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        original_content = content
        fixed_content = fix_partial_comments(content)
        
        if fixed_content != original_content:
            with open(filepath, 'w') as f:
                f.write(fixed_content)
            print(f"Fixed: {filepath}")
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    """Main function"""
    test_files = []
    
    # Find all test files
    for pattern in ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx']:
        test_files.extend(glob.glob(pattern, recursive=True))
    
    # Filter out node_modules
    test_files = [f for f in test_files if 'node_modules' not in f]
    
    fixed_count = 0
    for filepath in test_files:
        if process_file(filepath):
            fixed_count += 1
    
    print(f"\nFixed {fixed_count} files out of {len(test_files)} test files")

if __name__ == "__main__":
    main()