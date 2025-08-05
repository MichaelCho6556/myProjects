#!/usr/bin/env python3
"""
Fix Incomplete URL Scheme Validation Issues

This script finds and fixes URL validation that doesn't check for dangerous
schemes like data: and vbscript:
"""

import os
import re
import sys
from typing import List, Tuple, Set
import argparse
import shutil
from datetime import datetime

# Dangerous URL schemes that should be blocked
DANGEROUS_SCHEMES = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'about:', 
    'chrome:', 'chrome-extension:', 'ms-appx:', 'ms-appx-web:',
    'ms-local-stream:', 'res:', 'ie.http:', 'mk:', 'mhtml:',
    'view-source:', 'ws:', 'wss:', 'ftp:', 'intent:',
    'web+app:', 'web+action:'
]

# Patterns that indicate URL validation
URL_VALIDATION_PATTERNS = [
    r'(href|src|url)\s*=\s*["\']?\s*\{[^}]+\}',  # Dynamic URLs in JSX/React
    r'window\.location\s*=',  # Location assignment
    r'window\.open\s*\(',  # Window.open calls
    r'\.href\s*=',  # href assignment
    r'isValidUrl|validateUrl|checkUrl|sanitizeUrl',  # URL validation functions
]

# File extensions to process
EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx']

def backup_file(filepath: str) -> str:
    """Create a backup of the file before modifying"""
    backup_path = f"{filepath}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(filepath, backup_path)
    return backup_path

def find_files_with_urls(directory: str) -> List[Tuple[str, List[str]]]:
    """Find files that handle URLs"""
    files_with_urls = []
    
    for root, dirs, files in os.walk(directory):
        # Skip node_modules and other build directories
        dirs[:] = [d for d in dirs if d not in ['node_modules', 'build', 'dist', '.git', '__pycache__']]
        
        for file in files:
            if any(file.endswith(ext) for ext in EXTENSIONS):
                filepath = os.path.join(root, file)
                url_contexts = check_file_for_urls(filepath)
                if url_contexts:
                    files_with_urls.append((filepath, url_contexts))
    
    return files_with_urls

def check_file_for_urls(filepath: str) -> List[str]:
    """Check if a file handles URLs"""
    url_contexts = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        for pattern in URL_VALIDATION_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                url_contexts.append(pattern)
    
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    
    return url_contexts

def has_url_validation(content: str) -> bool:
    """Check if content already has URL validation"""
    # Check for existing validation of dangerous schemes
    for scheme in ['javascript:', 'data:', 'vbscript:']:
        if scheme in content:
            return True
    
    # Check for existing sanitizeUrl or validateUrl functions
    if re.search(r'(sanitizeUrl|validateUrl|isValidUrl)', content):
        return True
    
    return False

def add_url_validation_function(content: str) -> str:
    """Add URL validation function if not present"""
    if 'sanitizeUrl' in content or 'validateUrl' in content:
        return content
    
    # Find a good place to insert the function
    # Look for existing utility functions or imports
    import_match = re.search(r'(import\s+.*?\s+from\s+["\'].*?["\'];?\s*\n)+', content)
    
    url_validation_function = '''
// URL Sanitization - Prevents XSS through dangerous URL schemes
export const sanitizeUrl = (url) => {
  if (!url) return '';
  
  // Decode URL to catch encoded attacks
  let decodedUrl = url;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }
  
  const lowerUrl = decodedUrl.trim().toLowerCase();
  
  // Dangerous schemes to block
  const dangerousSchemes = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'about:',
    'chrome:', 'chrome-extension:', 'ms-appx:', 'ms-appx-web:',
    'ms-local-stream:', 'res:', 'ie.http:', 'mk:', 'mhtml:',
    'view-source:', 'ws:', 'wss:', 'ftp:', 'intent:',
    'web+app:', 'web+action:'
  ];
  
  // Check if URL starts with any dangerous scheme
  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return 'about:blank';
    }
  }
  
  // Additional check for encoded attempts
  if (lowerUrl.includes('javascript:') || 
      lowerUrl.includes('data:') || 
      lowerUrl.includes('vbscript:')) {
    return 'about:blank';
  }
  
  return url;
};

'''
    
    if import_match:
        # Insert after imports
        insert_pos = import_match.end()
        content = content[:insert_pos] + url_validation_function + content[insert_pos:]
    else:
        # Insert at the beginning after any initial comments
        content = url_validation_function + content
    
    return content

def fix_url_usage_in_file(filepath: str, dry_run: bool = False) -> bool:
    """Fix URL usage in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        modified = False
        
        # Skip if already has comprehensive URL validation
        if has_url_validation(content):
            return False
        
        # Add URL validation function if file handles URLs
        if any(re.search(pattern, content, re.IGNORECASE) for pattern in URL_VALIDATION_PATTERNS):
            content = add_url_validation_function(content)
            modified = True
            
            # Fix href={url} patterns to use sanitizeUrl
            content = re.sub(
                r'(href|src)\s*=\s*\{([^}]+)\}',
                r'\1={sanitizeUrl(\2)}',
                content
            )
            
            # Fix window.location assignments
            content = re.sub(
                r'window\.location\s*=\s*([^;]+);',
                r'window.location = sanitizeUrl(\1);',
                content
            )
            
            # Fix window.open calls
            content = re.sub(
                r'window\.open\s*\(([^,)]+)',
                r'window.open(sanitizeUrl(\1)',
                content
            )
        
        if modified and content != original_content:
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
    parser = argparse.ArgumentParser(description='Fix incomplete URL validation vulnerabilities')
    parser.add_argument('directory', help='Directory to scan and fix')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be fixed without making changes')
    parser.add_argument('--verbose', action='store_true', help='Show detailed output')
    
    args = parser.parse_args()
    
    print(f"Scanning for URL validation vulnerabilities in: {args.directory}")
    
    # Find files that handle URLs
    files_with_urls = find_files_with_urls(args.directory)
    
    if not files_with_urls:
        print("No files with URL handling found!")
        return 0
    
    print(f"\nFound {len(files_with_urls)} files that handle URLs:")
    
    fixed_count = 0
    
    for filepath, contexts in files_with_urls:
        if args.verbose:
            print(f"\n{filepath}:")
            for context in set(contexts):
                print(f"  - Matches pattern: {context}")
        
        if fix_url_usage_in_file(filepath, args.dry_run):
            fixed_count += 1
            print(f"{'Would fix' if args.dry_run else 'Fixed'}: {filepath}")
    
    print(f"\n{'Would fix' if args.dry_run else 'Fixed'} {fixed_count} out of {len(files_with_urls)} files")
    
    if args.dry_run:
        print("\nRun without --dry-run to apply fixes")
    else:
        print("\nBackup files created with .backup.timestamp extension")
        print("Review the changes and test thoroughly!")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())