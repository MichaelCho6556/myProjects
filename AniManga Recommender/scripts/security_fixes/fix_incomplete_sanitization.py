#!/usr/bin/env python3
"""
Fix Incomplete Multi-Character Sanitization Issues

This script finds and fixes patterns where .replace() is used without proper
iteration, which allows bypass through patterns like <<script>>
"""

import os
import re
import sys
from typing import List, Tuple
import argparse
import shutil
from datetime import datetime

# Patterns that indicate incomplete sanitization
VULNERABLE_PATTERNS = [
    # Simple replace without global flag or iteration
    (r'\.replace\s*\(\s*["\']<["\'],\s*["\']["\']\s*\)', 'HTML bracket replacement'),
    (r'\.replace\s*\(\s*["\']>["\'],\s*["\']["\']\s*\)', 'HTML bracket replacement'),
    (r'\.replace\s*\(\s*["\']javascript:["\'],\s*["\']["\']\s*\)', 'JavaScript protocol replacement'),
    (r'\.replace\s*\(\s*["\']<!--["\'],\s*["\']["\']\s*\)', 'HTML comment replacement'),
    (r'\.replace\s*\(\s*["\']-->["\'],\s*["\']["\']\s*\)', 'HTML comment replacement'),
    (r'\.replace\s*\(\s*["\']\{\{["\'],\s*["\']["\']\s*\)', 'Template injection replacement'),
    (r'\.replace\s*\(\s*["\']\}\}["\'],\s*["\']["\']\s*\)', 'Template injection replacement'),
]

# File extensions to process
EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx']

def backup_file(filepath: str) -> str:
    """Create a backup of the file before modifying"""
    backup_path = f"{filepath}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(filepath, backup_path)
    return backup_path

def find_vulnerable_files(directory: str) -> List[Tuple[str, List[str]]]:
    """Find files with potential vulnerable patterns"""
    vulnerable_files = []
    
    for root, dirs, files in os.walk(directory):
        # Skip node_modules and other build directories
        dirs[:] = [d for d in dirs if d not in ['node_modules', 'build', 'dist', '.git', '__pycache__']]
        
        for file in files:
            if any(file.endswith(ext) for ext in EXTENSIONS):
                filepath = os.path.join(root, file)
                vulnerabilities = check_file_vulnerabilities(filepath)
                if vulnerabilities:
                    vulnerable_files.append((filepath, vulnerabilities))
    
    return vulnerable_files

def check_file_vulnerabilities(filepath: str) -> List[str]:
    """Check a single file for vulnerable patterns"""
    vulnerabilities = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        for pattern, description in VULNERABLE_PATTERNS:
            if re.search(pattern, content):
                vulnerabilities.append(description)
    
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    
    return vulnerabilities

def fix_sanitization_in_file(filepath: str, dry_run: bool = False) -> bool:
    """Fix sanitization issues in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix 1: Convert simple .replace() chains to use /g flag
        # Before: .replace('<', '').replace('>', '')
        # After: .replace(/[<>]/g, '')
        content = re.sub(
            r'\.replace\s*\(\s*["\']<["\']\s*,\s*["\']["\']\s*\)\s*\.replace\s*\(\s*["\']>["\']\s*,\s*["\']["\']\s*\)',
            ".replace(/[<>]/g, '')",
            content
        )
        
        # Fix 2: Add global flag to regex replacements that don't have it
        # Before: .replace(/javascript:/i, '')
        # After: .replace(/javascript:/gi, '')
        content = re.sub(
            r'\.replace\s*\(\s*/([^/]+)/([^g]*)\s*,',
            lambda m: f".replace(/{m.group(1)}/{m.group(2)}g,".replace('gg', 'g'),
            content
        )
        
        # Fix 3: Wrap sanitization in a do-while loop for complete removal
        # This is more complex and requires understanding the context
        # For now, we'll add a comment to review these manually
        if '.replace(' in content and 'sanitize' in content.lower():
            # Find sanitization functions
            function_pattern = r'(function\s+\w+|const\s+\w+\s*=.*?function|\w+\s*:\s*function)\s*\([^)]*\)\s*(?::\s*\w+\s*)?\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}'
            
            def add_loop_to_sanitization(match):
                func_def = match.group(1)
                func_body = match.group(2)
                
                # Check if this function does sanitization
                if '.replace(' in func_body and any(pattern in func_body for pattern, _ in VULNERABLE_PATTERNS):
                    # Check if already has a loop
                    if 'while' not in func_body and 'do' not in func_body:
                        # Add TODO comment
                        return f"// TODO: Review for iterative sanitization\n{match.group(0)}"
                
                return match.group(0)
            
            content = re.sub(function_pattern, add_loop_to_sanitization, content, flags=re.MULTILINE | re.DOTALL)
        
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
    parser = argparse.ArgumentParser(description='Fix incomplete sanitization vulnerabilities')
    parser.add_argument('directory', help='Directory to scan and fix')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be fixed without making changes')
    parser.add_argument('--verbose', action='store_true', help='Show detailed output')
    
    args = parser.parse_args()
    
    print(f"Scanning for incomplete sanitization vulnerabilities in: {args.directory}")
    
    # Find vulnerable files
    vulnerable_files = find_vulnerable_files(args.directory)
    
    if not vulnerable_files:
        print("No vulnerable files found!")
        return 0
    
    print(f"\nFound {len(vulnerable_files)} files with potential vulnerabilities:")
    
    fixed_count = 0
    
    for filepath, vulnerabilities in vulnerable_files:
        if args.verbose:
            print(f"\n{filepath}:")
            for vuln in set(vulnerabilities):
                print(f"  - {vuln}")
        
        if fix_sanitization_in_file(filepath, args.dry_run):
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