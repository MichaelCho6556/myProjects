#!/usr/bin/env python3
"""
Fix Reflected XSS Issues

This script finds and fixes patterns where user input is directly included in
responses without proper sanitization or escaping.
"""

import os
import re
import sys
from typing import List, Tuple
import argparse
import shutil
from datetime import datetime

# Patterns that indicate reflected XSS vulnerabilities
REFLECTED_XSS_PATTERNS = [
    # Python patterns - user input in error messages
    (r'["\']error["\']\s*:\s*f["\'][^"\']*\{(\w+)\}[^"\']*["\']', 'User input in f-string error'),
    (r'["\']error["\']\s*:\s*["\'][^"\']*%s[^"\']*["\']\s*%\s*\w+', 'User input with % formatting'),
    (r'["\']error["\']\s*:\s*["\'][^"\']*\{\}[^"\']*["\']\s*\.format\s*\(\s*\w+', 'User input with .format()'),
    (r'["\']message["\']\s*:\s*.*request\.\w+\.get', 'Request data in message'),
    
    # JavaScript patterns - user input in responses
    (r'res\.send\s*\(\s*[`"\'].*\$\{req\.\w+', 'Request data in template literal'),
    (r'innerHTML\s*=\s*[`"\'].*\$\{', 'Dynamic HTML injection'),
    (r'document\.write\s*\(.*req\.', 'document.write with user input'),
    (r'\.html\s*\(\s*req\.', 'jQuery html() with user input'),
]

# Common user input sources
USER_INPUT_SOURCES = [
    'request.args', 'request.form', 'request.json', 'request.data',
    'request.values', 'request.params', 'req.body', 'req.params',
    'req.query', 'req.headers', 'req.cookies'
]

# File extensions to process
EXTENSIONS = ['.py', '.js', '.ts', '.jsx', '.tsx']

def backup_file(filepath: str) -> str:
    """Create a backup of the file before modifying"""
    backup_path = f"{filepath}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(filepath, backup_path)
    return backup_path

def find_vulnerable_files(directory: str) -> List[Tuple[str, List[str]]]:
    """Find files with potential reflected XSS vulnerabilities"""
    vulnerable_files = []
    
    for root, dirs, files in os.walk(directory):
        # Skip test directories and node_modules
        dirs[:] = [d for d in dirs if d not in ['node_modules', 'build', 'dist', '.git', '__pycache__']]
        
        for file in files:
            if any(file.endswith(ext) for ext in EXTENSIONS):
                filepath = os.path.join(root, file)
                vulnerabilities = check_file_vulnerabilities(filepath)
                if vulnerabilities:
                    vulnerable_files.append((filepath, vulnerabilities))
    
    return vulnerable_files

def check_file_vulnerabilities(filepath: str) -> List[str]:
    """Check a single file for reflected XSS patterns"""
    vulnerabilities = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Check for user input sources
        has_user_input = any(source in content for source in USER_INPUT_SOURCES)
        
        if has_user_input:
            for pattern, description in REFLECTED_XSS_PATTERNS:
                if re.search(pattern, content):
                    vulnerabilities.append(description)
            
            # Additional checks for specific patterns
            if 'jsonify' in content and 'request.' in content:
                # Check for request data in jsonify responses
                if re.search(r'jsonify\s*\([^)]*request\.\w+', content):
                    vulnerabilities.append('Request data in jsonify response')
    
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    
    return vulnerabilities

def fix_reflected_xss_python(content: str) -> str:
    """Fix reflected XSS in Python files"""
    # Fix f-string patterns with user input
    # Pattern: {'error': "Invalid "}
    content = re.sub(
        r'(["\']error["\']\s*:\s*)f["\']([^"\']*)\{(\w+)\}([^"\']*)["\']',
        lambda m: f'{m.group(1)}"{m.group(2).replace("{" + m.group(3) + "}", "[value]")}{m.group(4)}"',
        content
    )
    
    # Fix specific common patterns
    # Pattern: "Missing required field", "field": field
    content = re.sub(
        r'f["\']Missing required field:\s*\{(\w+)\}["\']',
        r'"Missing required field", "field": \1',
        content
    )
    
    # Pattern: f'Invalid {something}: {value}'
    content = re.sub(
        r'f["\']Invalid\s+(\w+):\s*\{(\w+)\}["\']',
        r'"Invalid \1"',
        content
    )
    
    # Pattern: "Value must be between X and Y"
    content = re.sub(
        r'f["\'](\{[^}]+\})\s*must be\s+([^"\']+)["\']',
        lambda m: f'"Value must be {m.group(2)}"',
        content
    )
    
    # Fix % formatting patterns
    content = re.sub(
        r'(["\']error["\']\s*:\s*["\'][^"\']*)\s*%s\s*([^"\']*["\']\s*%\s*)(\w+)',
        r'\1[value]\2"[redacted]"',
        content
    )
    
    return content

def fix_reflected_xss_javascript(content: str) -> str:
    """Fix reflected XSS in JavaScript/TypeScript files"""
    # Fix template literals with user input
    content = re.sub(
        r'(res\.send\s*\(\s*)`([^`]*)\$\{(req\.\w+[.\w]*)\}([^`]*)`',
        r'\1`\2[user input]\4`',
        content
    )
    
    # Fix innerHTML assignments
    content = re.sub(
        r'(\.innerHTML\s*=\s*[`"\'])([^`"\']*)\$\{([^}]+)\}',
        lambda m: f'{m.group(1)}{m.group(2)}${{escapeHtml({m.group(3)})}}',
        content
    )
    
    # Add escapeHtml function if innerHTML is used
    if 'innerHTML' in content and 'escapeHtml' not in content:
        escape_function = '''
// HTML escape function to prevent XSS
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

'''
        # Insert after imports or at beginning
        import_match = re.search(r'((?:import\s+.*?\s+from\s+["\'].*?["\'];?\s*\n)+)', content)
        if import_match:
            insert_pos = import_match.end()
            content = content[:insert_pos] + escape_function + content[insert_pos:]
        else:
            content = escape_function + content
    
    # Fix document.write patterns
    content = re.sub(
        r'document\.write\s*\(\s*([^)]+req\.\w+[^)]*)\)',
        r'document.write(escapeHtml(\1))',
        content
    )
    
    # Fix jQuery html() patterns
    content = re.sub(
        r'\.html\s*\(\s*(req\.\w+[.\w]*)\s*\)',
        r'.text(\1)',  # Use .text() instead of .html()
        content
    )
    
    return content

def fix_reflected_xss_in_file(filepath: str, dry_run: bool = False) -> bool:
    """Fix reflected XSS in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Determine file type
        is_python = filepath.endswith('.py')
        
        if is_python:
            content = fix_reflected_xss_python(content)
        else:
            content = fix_reflected_xss_javascript(content)
        
        if content != original_content:
            if not dry_run:
                # Create backup
                backup_file(filepath)
                
                # Write fixed content
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
            
            return True
        
        return False
    
    except Exception as e:
        print(f"Error fixing {filepath}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Fix reflected XSS vulnerabilities')
    parser.add_argument('directory', help='Directory to scan and fix')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be fixed without making changes')
    parser.add_argument('--verbose', action='store_true', help='Show detailed output')
    
    args = parser.parse_args()
    
    print(f"Scanning for reflected XSS vulnerabilities in: {args.directory}")
    
    # Find vulnerable files
    vulnerable_files = find_vulnerable_files(args.directory)
    
    if not vulnerable_files:
        print("No vulnerable files found!")
        return 0
    
    print(f"\nFound {len(vulnerable_files)} files with potential reflected XSS:")
    
    fixed_count = 0
    
    for filepath, vulnerabilities in vulnerable_files:
        if args.verbose:
            print(f"\n{filepath}:")
            for vuln in set(vulnerabilities):
                print(f"  - {vuln}")
        
        if fix_reflected_xss_in_file(filepath, args.dry_run):
            fixed_count += 1
            print(f"{'Would fix' if args.dry_run else 'Fixed'}: {filepath}")
    
    print(f"\n{'Would fix' if args.dry_run else 'Fixed'} {fixed_count} out of {len(vulnerable_files)} files")
    
    if args.dry_run:
        print("\nRun without --dry-run to apply fixes")
    else:
        print("\nBackup files created with .backup.timestamp extension")
        print("Review the changes and test thoroughly!")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())