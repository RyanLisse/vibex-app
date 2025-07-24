#!/usr/bin/env python3
"""Fix all vi.mock calls in test files by properly commenting them out"""

import os
import re
import glob

def fix_vi_mocks(content):
    """Fix vi.mock calls by commenting them out properly"""
    
    # Pattern to match vi.mock calls that might span multiple lines
    # This will match from vi.mock( to the closing }));
    pattern = r'(^|\n)(vi\.mock\([^)]+\),\s*\(\)\s*=>\s*\(\{[^}]*\}\)\);)'
    
    # First, fix any already partially commented mocks
    # Replace lines that start with // vi.mock
    content = re.sub(
        r'^// (vi\.mock\([^)]+\),\s*\(\)\s*=>\s*\(\{)\n',
        r'// \1\n',
        content,
        flags=re.MULTILINE
    )
    
    # Comment out any remaining default: or property: lines that follow // vi.mock
    lines = content.split('\n')
    fixed_lines = []
    in_commented_mock = False
    
    for i, line in enumerate(lines):
        if line.strip().startswith('// vi.mock('):
            in_commented_mock = True
            fixed_lines.append(line)
        elif in_commented_mock:
            if line.strip().startswith('}));'):
                fixed_lines.append('// ' + line if not line.strip().startswith('//') else line)
                in_commented_mock = False
            elif (line.strip().startswith('default:') or 
                  line.strip().startswith('}') or 
                  re.match(r'^\s*[a-zA-Z]+:', line)):
                fixed_lines.append('// ' + line if not line.strip().startswith('//') else line)
            else:
                fixed_lines.append(line)
        else:
            fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)

def process_file(filepath):
    """Process a single file"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        original_content = content
        fixed_content = fix_vi_mocks(content)
        
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