#!/usr/bin/env python3
"""
Fix Information Exposure Through Exceptions

This script finds and fixes patterns where exception details are exposed to users
in error responses instead of being logged server-side.
"""

import os
import re
import sys
from typing import List, Tuple
import argparse
import shutil
from datetime import datetime

# Patterns that indicate exception exposure
EXCEPTION_EXPOSURE_PATTERNS = [
    # Python patterns
    (r'return\s+jsonify\s*\(\s*\{[^}]*["\']error["\']\s*:\s*str\s*\(\s*e\s*\)', 'Python: str(e) in response'),
    (r'return\s+jsonify\s*\(\s*\{[^}]*["\']error["\']\s*:\s*f["\'][^"\']*\{e\}', 'Python: f-string with exception'),
    (r'return\s+jsonify\s*\(\s*\{[^}]*["\']error["\']\s*:\s*f["\'][^"\']*\{.*exception', 'Python: exception in f-string'),
    (r'return\s+jsonify\s*\(\s*\{[^}]*["\']message["\']\s*:\s*str\s*\(\s*e\s*\)', 'Python: str(e) in message'),
    (r'["\']error["\']\s*:\s*repr\s*\(\s*e\s*\)', 'Python: repr(e) in response'),
    
    # JavaScript/TypeScript patterns
    (r'res\.json\s*\(\s*\{[^}]*error\s*:\s*error\.message', 'JS: error.message in response'),
    (r'res\.json\s*\(\s*\{[^}]*error\s*:\s*err\.toString\(\)', 'JS: err.toString() in response'),
    (r'res\.send\s*\(\s*\{[^}]*error\s*:\s*e\.message', 'JS: e.message in response'),
    (r'res\.status\s*\([^)]+\)\s*\.json\s*\(\s*\{[^}]*error\s*:\s*error', 'JS: full error in response'),
    (r'return\s*\{[^}]*error\s*:\s*error\.stack', 'JS: error.stack in response'),
]

# File extensions to process
PYTHON_EXTENSIONS = ['.py']
JS_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx']

def backup_file(filepath: str) -> str:
    """Create a backup of the file before modifying"""
    backup_path = f"{filepath}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(filepath, backup_path)
    return backup_path

def find_vulnerable_files(directory: str) -> List[Tuple[str, List[str]]]:
    """Find files with potential exception exposure"""
    vulnerable_files = []
    
    for root, dirs, files in os.walk(directory):
        # Skip test directories and node_modules
        dirs[:] = [d for d in dirs if d not in ['node_modules', 'build', 'dist', '.git', '__pycache__', 'test', 'tests', '__tests__']]
        
        for file in files:
            if any(file.endswith(ext) for ext in PYTHON_EXTENSIONS + JS_EXTENSIONS):
                filepath = os.path.join(root, file)
                vulnerabilities = check_file_vulnerabilities(filepath)
                if vulnerabilities:
                    vulnerable_files.append((filepath, vulnerabilities))
    
    return vulnerable_files

def check_file_vulnerabilities(filepath: str) -> List[str]:
    """Check a single file for exception exposure patterns"""
    vulnerabilities = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        for pattern, description in EXCEPTION_EXPOSURE_PATTERNS:
            if re.search(pattern, content):
                vulnerabilities.append(description)
    
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    
    return vulnerabilities

def has_logger(content: str, is_python: bool) -> bool:
    """Check if file has logger imported/defined"""
    if is_python:
        return bool(re.search(r'(import\s+logging|from\s+\w+\s+import\s+logger|logger\s*=)', content))
    else:
        return bool(re.search(r'(require\(["\'].*log|import.*log|console\.log|logger)', content))

def add_logger_import(content: str, is_python: bool) -> str:
    """Add logger import if not present"""
    if is_python and not has_logger(content, True):
        # Add after other imports
        import_match = re.search(r'((?:from\s+\w+\s+import\s+.*?\n|import\s+\w+\n)+)', content)
        if import_match:
            insert_pos = import_match.end()
            content = content[:insert_pos] + "import logging\nlogger = logging.getLogger(__name__)\n\n" + content[insert_pos:]
        else:
            content = "import logging\nlogger = logging.getLogger(__name__)\n\n" + content
    
    return content

def fix_exception_exposure_python(content: str) -> str:
    """Fix exception exposure in Python files"""
    # Add logger if needed
    content = add_logger_import(content, True)
    
    # Fix pattern: logger.error(f"Error occurred: {str(e)})")
        return jsonify({"error": "An error occurred. Please try again later."})
    content = re.sub(
        r'return\s+jsonify\s*\(\s*\{([^}]*)["\']error["\']\s*:\s*str\s*\(\s*(\w+)\s*\)([^}]*)\}\s*\)',
        lambda m: f'logger.error(f"Error occurred: {{str({m.group(2)})}})")\n        return jsonify({{{m.group(1)}"error": "An error occurred. Please try again later."{m.group(3)}}})',
        content
    )
    
    # Fix pattern: logger.error(f"...{e}...")
        return jsonify({"error": "An error occurred. Please try again later."})
    content = re.sub(
        r'return\s+jsonify\s*\(\s*\{([^}]*)["\']error["\']\s*:\s*f["\']([^"\']*)\{(\w+)\}([^"\']*)["\']([^}]*)\}\s*\)',
        lambda m: f'logger.error(f"{m.group(2)}{{{m.group(3)}}}{m.group(4)}")\n        return jsonify({{{m.group(1)}"error": "{m.group(2).split(":")[0] if ":" in m.group(2) else "An error occurred"}. Please try again later."{m.group(5)}}})',
        content
    )
    
    # Fix pattern: 'error': "An error occurred. Please check logs."
    content = re.sub(
        r'(["\']error["\']\s*:\s*)repr\s*\(\s*(\w+)\s*\)',
        r'\1"An error occurred. Please check logs."',
        content
    )
    
    return content

def fix_exception_exposure_javascript(content: str) -> str:
    """Fix exception exposure in JavaScript/TypeScript files"""
    # Fix pattern: res.json({error: error.message})
    content = re.sub(
        r'(res\.(?:json|send)\s*\(\s*\{[^}]*error\s*:\s*)error\.message',
        r"console.error('Error:', error);\n    \1'An error occurred. Please try again later.'",
        content
    )
    
    # Fix pattern: res.json({error: err.toString()})
    content = re.sub(
        r'(res\.(?:json|send)\s*\(\s*\{[^}]*error\s*:\s*)err\.toString\(\)',
        r"console.error('Error:', err);\n    \1'An error occurred. Please try again later.'",
        content
    )
    
    # Fix pattern: res.status().json({error: error})
    content = re.sub(
        r'(res\.status\s*\([^)]+\)\s*\.json\s*\(\s*\{[^}]*error\s*:\s*)error\b',
        r"console.error('Error:', error);\n    \1'An error occurred. Please try again later.'",
        content
    )
    
    # Fix pattern: {error: error.stack}
    content = re.sub(
        r'(\{[^}]*error\s*:\s*)error\.stack',
        r"console.error('Error stack:', error.stack);\n    \1'An error occurred. Please try again later.'",
        content
    )
    
    return content

def fix_exception_exposure_in_file(filepath: str, dry_run: bool = False) -> bool:
    """Fix exception exposure in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Determine file type
        is_python = filepath.endswith('.py')
        
        if is_python:
            content = fix_exception_exposure_python(content)
        else:
            content = fix_exception_exposure_javascript(content)
        
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
    parser = argparse.ArgumentParser(description='Fix exception exposure vulnerabilities')
    parser.add_argument('directory', help='Directory to scan and fix')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be fixed without making changes')
    parser.add_argument('--verbose', action='store_true', help='Show detailed output')
    
    args = parser.parse_args()
    
    print(f"Scanning for exception exposure vulnerabilities in: {args.directory}")
    
    # Find vulnerable files
    vulnerable_files = find_vulnerable_files(args.directory)
    
    if not vulnerable_files:
        print("No vulnerable files found!")
        return 0
    
    print(f"\nFound {len(vulnerable_files)} files with potential exception exposure:")
    
    fixed_count = 0
    
    for filepath, vulnerabilities in vulnerable_files:
        if args.verbose:
            print(f"\n{filepath}:")
            for vuln in set(vulnerabilities):
                print(f"  - {vuln}")
        
        if fix_exception_exposure_in_file(filepath, args.dry_run):
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