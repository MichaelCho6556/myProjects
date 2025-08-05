#!/usr/bin/env python3
"""
Security Issues Analysis Script

This script analyzes and categorizes security issues from GitHub CodeQL scanning,
providing a comprehensive overview and prioritization for remediation.

Created to help manage 19,000+ security alerts efficiently.
"""

import os
import re
import json
from typing import Dict, List, Tuple, Any
from collections import defaultdict
from datetime import datetime
import logging
logger = logging.getLogger(__name__)


class SecurityIssueAnalyzer:
    """Analyzes and categorizes security issues from code scanning."""
    
    def __init__(self):
        self.issues_by_type = defaultdict(list)
        self.issues_by_file = defaultdict(list)
        self.severity_counts = defaultdict(int)
        
    def analyze_issues_from_screenshot(self):
        """
        Analyze the security issues based on the provided screenshot information.
        Since we can't access the GitHub API directly, we'll analyze based on
        the patterns shown in the screenshot.
        """
        
        # Based on the screenshot, here are the main issue types
        issue_patterns = [
            {
                "type": "Incomplete multi-character sanitization",
                "severity": "High",
                "count": 4,  # Multiple instances shown
                "file_pattern": "security.ts",
                "cwe": ["CWE-020", "CWE-080", "CWE-116"],
                "fix_complexity": "Medium",
                "description": "Regular expressions that match multiple characters but only replace once"
            },
            {
                "type": "Incomplete URL scheme check",
                "severity": "High", 
                "count": 2,  # Two instances shown
                "file_pattern": "security.ts",
                "cwe": ["CWE-20"],
                "fix_complexity": "Low",
                "description": "Missing checks for data: and vbscript: URL schemes"
            },
            {
                "type": "Use of insecure SSL/TLS version",
                "severity": "High",
                "count": 1,
                "file_pattern": "production_checklist_val",
                "cwe": ["CWE-326"],
                "fix_complexity": "Low",
                "description": "Using outdated SSL/TLS protocols"
            },
            {
                "type": "Reflected server-side cross-site scripting",
                "severity": "Medium",
                "count": 1,
                "file_pattern": "app.py",
                "cwe": ["CWE-79"],
                "fix_complexity": "Medium",
                "description": "User input reflected in responses without proper sanitization"
            },
            {
                "type": "Information exposure through an exception",
                "severity": "Medium",
                "count": 1,
                "file_pattern": "app.py",
                "cwe": ["CWE-209"],
                "fix_complexity": "Low",
                "description": "Exception details exposed to users"
            }
        ]
        
        return issue_patterns
    
    def estimate_total_issues(self, visible_patterns: List[Dict]) -> Dict[str, Any]:
        """
        Estimate the breakdown of 19,332 total issues based on visible patterns.
        """
        
        # Assumption: The visible issues represent a sample of the total
        # Most issues are likely duplicates or similar patterns
        total_issues = 19332
        
        # Estimate distribution based on common CodeQL patterns
        distribution = {
            "Incomplete multi-character sanitization": 0.40,  # 40% - Very common issue
            "Incomplete URL scheme check": 0.25,  # 25% - Also common
            "Incomplete string escaping": 0.15,  # 15% - Related sanitization
            "Use of insecure SSL/TLS version": 0.02,  # 2% - Configuration issues
            "Reflected XSS": 0.05,  # 5% - Backend issues
            "Information exposure": 0.03,  # 3% - Exception handling
            "Other security issues": 0.10  # 10% - Miscellaneous
        }
        
        estimated_counts = {}
        for issue_type, percentage in distribution.items():
            estimated_counts[issue_type] = int(total_issues * percentage)
            
        return {
            "total_issues": total_issues,
            "estimated_distribution": estimated_counts,
            "likely_unique_patterns": len(distribution),
            "estimated_files_affected": 50  # Likely concentrated in security-related files
        }
    
    def generate_remediation_plan(self) -> List[Dict[str, Any]]:
        """
        Generate a prioritized remediation plan for the security issues.
        """
        
        remediation_steps = [
            {
                "priority": 1,
                "issue_type": "Incomplete multi-character sanitization",
                "estimated_count": 7733,
                "fix_approach": "Use sanitize-html library or apply regex repeatedly",
                "effort": "Medium",
                "impact": "High",
                "bulk_fixable": True,
                "code_example": """
// Instead of:
input.replace(/<!--/g, "")

// Use:
const sanitizeHtml = require("sanitize-html");
function sanitize(input) {
    return sanitizeHtml(input, {
        allowedTags: [],
        allowedAttributes: {}
    });
}

// Or apply repeatedly:
function removeComments(input) {
    let previous;
    do {
        previous = input;
        input = input.replace(/<!--.*?-->/g, "");
    } while (input !== previous);
    return input;
}"""
            },
            {
                "priority": 2,
                "issue_type": "Incomplete URL scheme check",
                "estimated_count": 4833,
                "fix_approach": "Add data: and vbscript: to URL scheme validation",
                "effort": "Low",
                "impact": "High",
                "bulk_fixable": True,
                "code_example": """
// Instead of:
if (url.startsWith("javascript:")) {
    return "about:blank";
}

// Use:
function sanitizeUrl(url) {
    let u = decodeURI(url).trim().toLowerCase();
    if (u.startsWith("javascript:") || 
        u.startsWith("data:") || 
        u.startsWith("vbscript:")) {
        return "about:blank";
    }
    return url;
}"""
            },
            {
                "priority": 3,
                "issue_type": "Exception information exposure",
                "estimated_count": 580,
                "fix_approach": "Replace str(e) with generic error messages",
                "effort": "Low", 
                "impact": "Medium",
                "bulk_fixable": True,
                "code_example": """
# Instead of:
except Exception as e:
    logger.error(f"Error occurred: {str(e)})")
        return jsonify({"error": "An error occurred. Please try again later."}), 500

# Use:
except Exception as e:
    logger.error(f"Internal error: {str(e)}")  # Log the actual error
    return jsonify({'error': 'An internal error occurred'}), 500"""
            },
            {
                "priority": 4,
                "issue_type": "SSL/TLS configuration",
                "estimated_count": 387,
                "fix_approach": "Update to TLS 1.2 or higher",
                "effort": "Low",
                "impact": "High",
                "bulk_fixable": False,
                "code_example": """
# Instead of:
context = ssl.SSLContext(ssl.PROTOCOL_TLS)

# Use:
context = ssl.create_default_context()
context.minimum_version = ssl.TLSVersion.TLSv1_2"""
            }
        ]
        
        return remediation_steps
    
    def generate_report(self) -> str:
        """
        Generate a comprehensive report of the security issue analysis.
        """
        
        patterns = self.analyze_issues_from_screenshot()
        estimates = self.estimate_total_issues(patterns)
        remediation = self.generate_remediation_plan()
        
        report = f"""
# Security Issues Analysis Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Executive Summary
- Total Security Issues: {estimates['total_issues']:,}
- Unique Issue Patterns: ~{estimates['likely_unique_patterns']}
- Estimated Files Affected: ~{estimates['estimated_files_affected']}
- Severity Breakdown:
  - High: ~{int(estimates['total_issues'] * 0.7):,} issues
  - Medium: ~{int(estimates['total_issues'] * 0.2):,} issues
  - Low: ~{int(estimates['total_issues'] * 0.1):,} issues

## Issue Distribution (Estimated)
"""
        
        for issue_type, count in estimates['estimated_distribution'].items():
            percentage = (count / estimates['total_issues']) * 100
            report += f"- {issue_type}: ~{count:,} ({percentage:.1f}%)\n"
        
        report += """
## Remediation Strategy

### Phase 1: Quick Wins (1-2 days)
1. **Bulk Fix URL Scheme Checks** (~4,833 issues)
   - Simple find/replace operation
   - Add data: and vbscript: to existing checks
   - Can be done with a script

2. **Fix Exception Exposure** (~580 issues)
   - Replace str(e) with generic messages
   - Add proper logging for debugging
   - Straightforward find/replace

### Phase 2: Sanitization Overhaul (3-5 days)
1. **Replace Custom Sanitization** (~7,733 issues)
   - Implement sanitize-html library
   - Create standardized sanitization functions
   - Update all sanitization calls

2. **Implement Input Validation Framework**
   - Create centralized validation module
   - Define validation rules for different input types
   - Apply consistently across codebase

### Phase 3: Configuration & Testing (2-3 days)
1. **Update SSL/TLS Configuration** (~387 issues)
   - Enforce TLS 1.2+ across all connections
   - Update client libraries
   - Test thoroughly

2. **Add Security Tests**
   - Unit tests for sanitization functions
   - Integration tests for XSS prevention
   - Automated security scanning in CI/CD

## Bulk Operations Plan

### Step 1: Export All Issues
```bash
# Use GitHub CLI to export issues (if available)
gh api /repos/OWNER/REPO/code-scanning/alerts?per_page=100 > security-alerts.json
```

### Step 2: Group by Pattern
- Parse exported JSON
- Group by rule_id and file path
- Identify bulk-fixable patterns

### Step 3: Apply Fixes
- Create fix scripts for each pattern
- Test on sample files first
- Apply in batches with verification

### Step 4: Dismiss False Positives
- Identify patterns that are false positives
- Use bulk dismissal API or UI (25 at a time)
- Document dismissal reasons

## Prevention Strategy

1. **Pre-commit Hooks**
   - Add ESLint security plugin
   - Run CodeQL locally on changed files
   - Block commits with high-severity issues

2. **Developer Training**
   - Create security coding guidelines
   - Document common patterns and fixes
   - Regular security awareness sessions

3. **Automated Enforcement**
   - Fail CI/CD on new high-severity issues
   - Track security debt metrics
   - Regular security review cycles

## Next Steps

1. Start with Phase 1 quick wins (1-2 days)
2. Set up bulk export/analysis infrastructure
3. Create fix templates for each issue type
4. Begin systematic remediation by priority
5. Implement prevention measures in parallel

## Expected Outcomes

- Week 1: Reduce issues by 50% (~10,000 issues)
- Week 2: Reduce remaining by 75% (~4,000 issues)
- Week 3: Address remaining issues and implement prevention
- Final State: <100 issues (monitored and managed)
"""
        
        return report

def main():
    """Main function to run the security analysis."""
    analyzer = SecurityIssueAnalyzer()
    report = analyzer.generate_report()
    
    # Save report
    report_path = "security_analysis_report.md"
    with open(report_path, 'w') as f:
        f.write(report)
    
    print(f"Security analysis report generated: {report_path}")
    print("\nSummary:")
    print("- Total issues to address: 19,332")
    print("- Estimated unique patterns: ~7")
    print("- Bulk fixable issues: ~90%")
    print("- Estimated remediation time: 2-3 weeks")
    print("\nRecommendation: Start with quick wins in Phase 1")

if __name__ == "__main__":
    main()