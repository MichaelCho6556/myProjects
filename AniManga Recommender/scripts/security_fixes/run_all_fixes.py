#!/usr/bin/env python3
"""
Master Script to Run All Security Fixes

This script runs all security fix scripts in the correct order and provides
a comprehensive report of what was fixed.
"""

import os
import sys
import subprocess
import argparse
from datetime import datetime
import json
from typing import Tuple, List

# Security fix scripts in order of priority
SECURITY_FIXES = [
    {
        'name': 'Incomplete Sanitization',
        'script': 'fix_incomplete_sanitization.py',
        'description': 'Fixes incomplete multi-character sanitization (~7,733 issues)',
        'severity': 'High'
    },
    {
        'name': 'URL Validation',
        'script': 'fix_url_validation.py',
        'description': 'Fixes incomplete URL scheme validation (~4,833 issues)',
        'severity': 'High'
    },
    {
        'name': 'Exception Exposure',
        'script': 'fix_exception_exposure.py',
        'description': 'Fixes information exposure through exceptions (~579 issues)',
        'severity': 'Medium'
    },
    {
        'name': 'Reflected XSS',
        'script': 'fix_reflected_xss.py',
        'description': 'Fixes reflected XSS vulnerabilities (~966 issues)',
        'severity': 'Medium'
    }
]

def run_fix_script(script_path: str, target_dir: str, dry_run: bool = False, verbose: bool = False) -> Tuple[bool, str]:
    """Run a single fix script and capture output"""
    cmd = [sys.executable, script_path, target_dir]
    
    if dry_run:
        cmd.append('--dry-run')
    if verbose:
        cmd.append('--verbose')
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, f"Error: {e.stderr}\n{e.stdout}"
    except Exception as e:
        return False, f"Error running script: {str(e)}"

def generate_report(results: List[dict], output_file: str):
    """Generate a comprehensive report of all fixes"""
    report = f"""# Security Fix Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary

Total scripts run: {len(results)}
Successful: {sum(1 for r in results if r['success'])}
Failed: {sum(1 for r in results if not r['success'])}

## Detailed Results

"""
    
    for result in results:
        status = "Success" if result['success'] else "Failed"
        report += f"""### {result['name']} ({result['severity']})
Status: {status}
Description: {result['description']}

Output:
```
{result['output']}
```

---

"""
    
    # Add recommendations
    report += """## Recommendations

1. **Review all changes**: Check the backup files and test functionality
2. **Run tests**: Execute your test suite to ensure nothing is broken
3. **Update dependencies**: Some fixes add new utility functions that may need to be imported
4. **Monitor for issues**: Watch for any unexpected behavior after applying fixes
5. **Set up prevention**: Configure ESLint and pre-commit hooks to prevent new vulnerabilities

## Next Steps

1. Commit the security fixes in logical groups
2. Update your CI/CD pipeline to include security scanning
3. Train developers on secure coding practices
4. Regular security audits using CodeQL or similar tools
"""
    
    with open(output_file, 'w') as f:
        f.write(report)
    
    print(f"\nReport saved to: {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Run all security fix scripts')
    parser.add_argument('directory', help='Directory to fix (usually project root)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be fixed without making changes')
    parser.add_argument('--verbose', action='store_true', help='Show detailed output')
    parser.add_argument('--skip', nargs='+', help='Skip specific fixes by name')
    parser.add_argument('--only', nargs='+', help='Only run specific fixes by name')
    
    args = parser.parse_args()
    
    # Get the directory containing the fix scripts
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    print(f"{'DRY RUN: ' if args.dry_run else ''}Running security fixes on: {args.directory}")
    print("=" * 60)
    
    results = []
    
    for fix in SECURITY_FIXES:
        # Check if we should skip this fix
        if args.skip and fix['name'] in args.skip:
            print(f"\nSkipping: {fix['name']}")
            continue
        
        if args.only and fix['name'] not in args.only:
            continue
        
        print(f"\nRunning: {fix['name']}")
        print(f"Description: {fix['description']}")
        print("-" * 40)
        
        script_path = os.path.join(script_dir, fix['script'])
        
        if not os.path.exists(script_path):
            print(f"ERROR: Script not found: {script_path}")
            results.append({
                'name': fix['name'],
                'severity': fix['severity'],
                'description': fix['description'],
                'success': False,
                'output': f"Script not found: {script_path}"
            })
            continue
        
        success, output = run_fix_script(script_path, args.directory, args.dry_run, args.verbose)
        
        results.append({
            'name': fix['name'],
            'severity': fix['severity'],
            'description': fix['description'],
            'success': success,
            'output': output
        })
        
        if success:
            print("Completed successfully")
        else:
            print("Failed")
            print(output)
    
    # Generate report
    report_file = os.path.join(
        args.directory,
        f"security_fix_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    )
    generate_report(results, report_file)
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total fixes run: {len(results)}")
    print(f"Successful: {sum(1 for r in results if r['success'])}")
    print(f"Failed: {sum(1 for r in results if not r['success'])}")
    
    if args.dry_run:
        print("\nThis was a DRY RUN - no files were modified")
        print("Run without --dry-run to apply the fixes")
    else:
        print("\nFixes have been applied!")
        print("Backup files created with .backup.timestamp extension")
        print("Please review changes and test thoroughly!")
    
    return 0 if all(r['success'] for r in results) else 1

if __name__ == '__main__':
    sys.exit(main())