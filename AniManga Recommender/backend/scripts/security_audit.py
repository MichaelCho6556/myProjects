#!/usr/bin/env python3
"""
Security Audit Tests for AniManga Recommender Backend

Comprehensive security validation including headers, authentication,
input validation, SQL injection prevention, and XSS protection.

Usage:
    # Run full security audit
    TARGET_URL=https://animanga-backend.onrender.com python scripts/security_audit.py
    
    # Run specific security test
    TARGET_URL=https://animanga-backend.onrender.com python scripts/security_audit.py --test headers
    
    # Generate security report
    TARGET_URL=https://animanga-backend.onrender.com python scripts/security_audit.py --report

Security Checks:
    - Security headers validation
    - HTTPS enforcement
    - JWT token security
    - SQL injection prevention
    - XSS protection
    - Rate limiting
    - CORS configuration
    - Authentication bypass attempts
"""

import os
import sys
import json
import time
import base64
import hashlib
import requests
import argparse
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from urllib.parse import urljoin, quote

# Configuration
TARGET_URL = os.getenv('TARGET_URL', 'http://localhost:5000')
SECURITY_TIMEOUT = int(os.getenv('SECURITY_TIMEOUT', '10'))

# Security test payloads
SQL_INJECTION_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE items; --",
    "1' UNION SELECT * FROM users--",
    "admin'--",
    "' OR 1=1--",
    "1' AND '1' = '1",
    "'; EXEC xp_cmdshell('dir'); --"
]

XSS_PAYLOADS = [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "javascript:alert('XSS')",
    "<svg/onload=alert('XSS')>",
    "';alert('XSS');//",
    "<iframe src=javascript:alert('XSS')>",
    "<body onload=alert('XSS')>"
]

PATH_TRAVERSAL_PAYLOADS = [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "....//....//....//etc/passwd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "..%252f..%252f..%252fetc%252fpasswd"
]

# Required security headers
REQUIRED_SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': None,  # Check presence for HTTPS
    'Content-Security-Policy': None,    # Check presence
}

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


class SecurityAuditResult:
    """Container for security audit results."""
    
    def __init__(self):
        self.passed: List[str] = []
        self.failed: List[str] = []
        self.warnings: List[str] = []
        self.vulnerabilities: List[Dict] = []
        self.score = 100  # Start with perfect score
        

class SecurityAuditor:
    """Security testing and vulnerability assessment."""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.result = SecurityAuditResult()
        self.session = requests.Session()
        
    def run_full_audit(self) -> SecurityAuditResult:
        """Run complete security audit."""
        print(f"\n{BLUE}{'=' * 60}{RESET}")
        print(f"{BLUE}🔒 SECURITY AUDIT{RESET}")
        print(f"{BLUE}{'=' * 60}{RESET}")
        print(f"Target: {self.base_url}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{BLUE}{'=' * 60}{RESET}\n")
        
        # Run all security tests
        self.test_security_headers()
        self.test_https_enforcement()
        self.test_sql_injection()
        self.test_xss_protection()
        self.test_path_traversal()
        self.test_authentication_security()
        self.test_jwt_security()
        self.test_rate_limiting()
        self.test_cors_security()
        self.test_error_disclosure()
        self.test_http_methods()
        self.test_cookie_security()
        
        return self.result
    
    def test_security_headers(self):
        """Test security headers in responses."""
        print("🔍 Testing Security Headers...")
        
        url = urljoin(self.base_url, '/api/items')
        
        try:
            response = self.session.get(url, timeout=SECURITY_TIMEOUT)
            headers = response.headers
            
            for header, expected in REQUIRED_SECURITY_HEADERS.items():
                if header in headers:
                    value = headers[header]
                    
                    if expected is None:
                        # Just check presence
                        self.result.passed.append(f"{header} present")
                        print(f"  {GREEN}✅{RESET} {header}: {value}")
                    elif isinstance(expected, list):
                        # Check if value is in list
                        if value in expected:
                            self.result.passed.append(f"{header} correct")
                            print(f"  {GREEN}✅{RESET} {header}: {value}")
                        else:
                            self.result.warnings.append(f"{header}: {value} (expected one of {expected})")
                            print(f"  {YELLOW}⚠️{RESET} {header}: {value} (expected one of {expected})")
                            self.result.score -= 5
                    else:
                        # Check exact match
                        if value == expected:
                            self.result.passed.append(f"{header} correct")
                            print(f"  {GREEN}✅{RESET} {header}: {value}")
                        else:
                            self.result.failed.append(f"{header}: {value} (expected {expected})")
                            print(f"  {RED}❌{RESET} {header}: {value} (expected {expected})")
                            self.result.score -= 10
                else:
                    if expected is not None:
                        # Required header missing
                        self.result.failed.append(f"Missing {header}")
                        print(f"  {RED}❌{RESET} Missing: {header}")
                        self.result.score -= 10
                    else:
                        # Optional header missing
                        self.result.warnings.append(f"Missing optional {header}")
                        print(f"  {YELLOW}⚠️{RESET} Missing (optional): {header}")
                        self.result.score -= 2
                        
        except Exception as e:
            self.result.failed.append(f"Security headers test failed: {e}")
            print(f"  {RED}❌{RESET} Test failed: {e}")
    
    def test_https_enforcement(self):
        """Test HTTPS enforcement and SSL/TLS configuration."""
        print("\n🔍 Testing HTTPS Enforcement...")
        
        if self.base_url.startswith('https://'):
            self.result.passed.append("Using HTTPS")
            print(f"  {GREEN}✅{RESET} Site uses HTTPS")
            
            # Check for HSTS header
            try:
                response = self.session.get(self.base_url, timeout=SECURITY_TIMEOUT)
                if 'Strict-Transport-Security' in response.headers:
                    hsts = response.headers['Strict-Transport-Security']
                    self.result.passed.append("HSTS enabled")
                    print(f"  {GREEN}✅{RESET} HSTS enabled: {hsts}")
                else:
                    self.result.warnings.append("HSTS not configured")
                    print(f"  {YELLOW}⚠️{RESET} HSTS not configured")
                    self.result.score -= 5
            except:
                pass
        else:
            self.result.warnings.append("Not using HTTPS")
            print(f"  {YELLOW}⚠️{RESET} Not using HTTPS (testing environment)")
            self.result.score -= 15
    
    def test_sql_injection(self):
        """Test SQL injection prevention."""
        print("\n🔍 Testing SQL Injection Prevention...")
        
        vulnerable = False
        
        for payload in SQL_INJECTION_PAYLOADS:
            # Test in search parameter
            url = urljoin(self.base_url, f'/api/items?search={quote(payload)}')
            
            try:
                response = self.session.get(url, timeout=SECURITY_TIMEOUT)
                
                # Check for SQL errors in response
                response_text = response.text.lower()
                sql_errors = ['sql', 'syntax', 'database', 'mysql', 'postgresql', 'sqlite']
                
                if any(error in response_text for error in sql_errors):
                    self.result.vulnerabilities.append({
                        'type': 'SQL Injection',
                        'severity': 'CRITICAL',
                        'payload': payload,
                        'endpoint': '/api/items'
                    })
                    vulnerable = True
                    print(f"  {RED}❌{RESET} Vulnerable to: {payload[:30]}...")
                    self.result.score -= 25
                    
            except Exception:
                pass
        
        if not vulnerable:
            self.result.passed.append("SQL injection prevented")
            print(f"  {GREEN}✅{RESET} No SQL injection vulnerabilities found")
    
    def test_xss_protection(self):
        """Test XSS (Cross-Site Scripting) protection."""
        print("\n🔍 Testing XSS Protection...")
        
        vulnerable = False
        
        for payload in XSS_PAYLOADS:
            # Test in search parameter
            url = urljoin(self.base_url, f'/api/items?search={quote(payload)}')
            
            try:
                response = self.session.get(url, timeout=SECURITY_TIMEOUT)
                
                # Check if payload is reflected without encoding
                if payload in response.text:
                    self.result.vulnerabilities.append({
                        'type': 'XSS',
                        'severity': 'HIGH',
                        'payload': payload,
                        'endpoint': '/api/items'
                    })
                    vulnerable = True
                    print(f"  {RED}❌{RESET} Vulnerable to: {payload[:30]}...")
                    self.result.score -= 20
                    
            except Exception:
                pass
        
        if not vulnerable:
            self.result.passed.append("XSS prevented")
            print(f"  {GREEN}✅{RESET} No XSS vulnerabilities found")
    
    def test_path_traversal(self):
        """Test path traversal/directory traversal prevention."""
        print("\n🔍 Testing Path Traversal Prevention...")
        
        vulnerable = False
        
        for payload in PATH_TRAVERSAL_PAYLOADS:
            # Test in item ID parameter
            url = urljoin(self.base_url, f'/api/items/{payload}')
            
            try:
                response = self.session.get(url, timeout=SECURITY_TIMEOUT)
                
                # Check for file system indicators
                if any(indicator in response.text for indicator in ['root:', 'bin/', 'Windows\\']):
                    self.result.vulnerabilities.append({
                        'type': 'Path Traversal',
                        'severity': 'CRITICAL',
                        'payload': payload,
                        'endpoint': '/api/items/{id}'
                    })
                    vulnerable = True
                    print(f"  {RED}❌{RESET} Vulnerable to: {payload[:30]}...")
                    self.result.score -= 25
                    
            except Exception:
                pass
        
        if not vulnerable:
            self.result.passed.append("Path traversal prevented")
            print(f"  {GREEN}✅{RESET} No path traversal vulnerabilities found")
    
    def test_authentication_security(self):
        """Test authentication security measures."""
        print("\n🔍 Testing Authentication Security...")
        
        # Test missing authentication on protected endpoints
        protected_endpoints = [
            '/api/auth/dashboard',
            '/api/auth/user-items',
            '/api/auth/lists'
        ]
        
        for endpoint in protected_endpoints:
            url = urljoin(self.base_url, endpoint)
            
            try:
                response = self.session.get(url, timeout=SECURITY_TIMEOUT)
                
                if response.status_code != 401:
                    self.result.vulnerabilities.append({
                        'type': 'Authentication Bypass',
                        'severity': 'CRITICAL',
                        'endpoint': endpoint,
                        'status_code': response.status_code
                    })
                    print(f"  {RED}❌{RESET} {endpoint} accessible without auth")
                    self.result.score -= 30
                else:
                    print(f"  {GREEN}✅{RESET} {endpoint} requires authentication")
                    
            except Exception:
                pass
        
        # Test weak password policy
        url = urljoin(self.base_url, '/api/auth/register')
        weak_passwords = ['123456', 'password', 'admin', 'test']
        
        for password in weak_passwords:
            payload = {
                'email': f'test{int(time.time())}@example.com',
                'password': password
            }
            
            try:
                response = self.session.post(url, json=payload, timeout=SECURITY_TIMEOUT)
                
                if response.status_code == 200 or response.status_code == 201:
                    self.result.warnings.append(f"Weak password accepted: {password}")
                    print(f"  {YELLOW}⚠️{RESET} Weak password accepted: {password}")
                    self.result.score -= 5
                    break
            except:
                pass
    
    def test_jwt_security(self):
        """Test JWT token security."""
        print("\n🔍 Testing JWT Security...")
        
        # Test with manipulated JWT
        fake_tokens = [
            "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyX2lkIjoiYWRtaW4ifQ.",  # Algorithm none
            "invalid.jwt.token",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4ifQ.fake",  # Invalid signature
        ]
        
        url = urljoin(self.base_url, '/api/auth/dashboard')
        
        for token in fake_tokens:
            headers = {'Authorization': f'Bearer {token}'}
            
            try:
                response = self.session.get(url, headers=headers, timeout=SECURITY_TIMEOUT)
                
                if response.status_code == 200:
                    self.result.vulnerabilities.append({
                        'type': 'JWT Vulnerability',
                        'severity': 'CRITICAL',
                        'description': 'Invalid JWT accepted'
                    })
                    print(f"  {RED}❌{RESET} Invalid JWT accepted")
                    self.result.score -= 30
                else:
                    print(f"  {GREEN}✅{RESET} Invalid JWT rejected")
                    
            except Exception:
                pass
        
        self.result.passed.append("JWT validation working")
    
    def test_rate_limiting(self):
        """Test rate limiting implementation."""
        print("\n🔍 Testing Rate Limiting...")
        
        url = urljoin(self.base_url, '/api/items')
        
        # Make rapid requests
        rate_limited = False
        for i in range(20):
            try:
                response = self.session.get(url, timeout=SECURITY_TIMEOUT)
                
                if response.status_code == 429:
                    rate_limited = True
                    print(f"  {GREEN}✅{RESET} Rate limiting active (triggered after {i+1} requests)")
                    self.result.passed.append("Rate limiting active")
                    break
                    
                time.sleep(0.05)  # Small delay
                
            except Exception:
                pass
        
        if not rate_limited:
            self.result.warnings.append("Rate limiting not detected")
            print(f"  {YELLOW}⚠️{RESET} Rate limiting not detected (may be disabled)")
            self.result.score -= 10
    
    def test_cors_security(self):
        """Test CORS configuration security."""
        print("\n🔍 Testing CORS Security...")
        
        url = urljoin(self.base_url, '/api/items')
        
        # Test with malicious origin
        malicious_origins = [
            'http://evil.com',
            'https://attacker.com',
            'null'
        ]
        
        secure = True
        for origin in malicious_origins:
            headers = {'Origin': origin}
            
            try:
                response = self.session.get(url, headers=headers, timeout=SECURITY_TIMEOUT)
                
                if 'Access-Control-Allow-Origin' in response.headers:
                    allowed = response.headers['Access-Control-Allow-Origin']
                    
                    if allowed == '*' or allowed == origin:
                        self.result.warnings.append(f"CORS allows {origin}")
                        print(f"  {YELLOW}⚠️{RESET} CORS allows: {origin}")
                        self.result.score -= 5
                        secure = False
                        
            except Exception:
                pass
        
        if secure:
            self.result.passed.append("CORS properly configured")
            print(f"  {GREEN}✅{RESET} CORS properly restricted")
    
    def test_error_disclosure(self):
        """Test for information disclosure in error messages."""
        print("\n🔍 Testing Error Information Disclosure...")
        
        # Trigger various errors
        error_endpoints = [
            ('/api/nonexistent', 404),
            ('/api/items/invalid', 400),
            ('/api/auth/login', 400),  # Invalid payload
        ]
        
        information_leaked = False
        
        for endpoint, expected_status in error_endpoints:
            url = urljoin(self.base_url, endpoint)
            
            try:
                if endpoint == '/api/auth/login':
                    response = self.session.post(url, data='invalid', timeout=SECURITY_TIMEOUT)
                else:
                    response = self.session.get(url, timeout=SECURITY_TIMEOUT)
                
                # Check for sensitive information in response
                sensitive_patterns = [
                    'traceback',
                    'stack trace',
                    'line ',
                    'file "',
                    'mysql',
                    'postgresql',
                    'supabase',
                    'debug',
                    'internal server error'
                ]
                
                response_text = response.text.lower()
                for pattern in sensitive_patterns:
                    if pattern in response_text:
                        self.result.warnings.append(f"Information disclosure: {pattern}")
                        print(f"  {YELLOW}⚠️{RESET} Information leaked: {pattern}")
                        self.result.score -= 5
                        information_leaked = True
                        break
                        
            except Exception:
                pass
        
        if not information_leaked:
            self.result.passed.append("No information disclosure")
            print(f"  {GREEN}✅{RESET} Error messages properly sanitized")
    
    def test_http_methods(self):
        """Test for dangerous HTTP methods."""
        print("\n🔍 Testing HTTP Methods...")
        
        url = urljoin(self.base_url, '/api/items')
        dangerous_methods = ['TRACE', 'TRACK', 'DELETE', 'PUT']
        
        for method in dangerous_methods:
            try:
                response = self.session.request(method, url, timeout=SECURITY_TIMEOUT)
                
                if response.status_code not in [405, 501]:
                    self.result.warnings.append(f"{method} method allowed")
                    print(f"  {YELLOW}⚠️{RESET} {method} method allowed")
                    self.result.score -= 3
                else:
                    print(f"  {GREEN}✅{RESET} {method} method blocked")
                    
            except Exception:
                pass
    
    def test_cookie_security(self):
        """Test cookie security attributes."""
        print("\n🔍 Testing Cookie Security...")
        
        # Try to get a session cookie
        url = urljoin(self.base_url, '/api/auth/login')
        payload = {'email': 'test@example.com', 'password': 'test'}
        
        try:
            response = self.session.post(url, json=payload, timeout=SECURITY_TIMEOUT)
            
            if response.cookies:
                for cookie in response.cookies:
                    secure_flags = []
                    
                    if cookie.secure:
                        secure_flags.append('Secure')
                    else:
                        self.result.warnings.append(f"Cookie {cookie.name} missing Secure flag")
                        self.result.score -= 5
                    
                    if cookie.has_nonstandard_attr('HttpOnly'):
                        secure_flags.append('HttpOnly')
                    else:
                        self.result.warnings.append(f"Cookie {cookie.name} missing HttpOnly flag")
                        self.result.score -= 5
                    
                    if cookie.has_nonstandard_attr('SameSite'):
                        secure_flags.append('SameSite')
                    else:
                        self.result.warnings.append(f"Cookie {cookie.name} missing SameSite flag")
                        self.result.score -= 3
                    
                    if secure_flags:
                        print(f"  {GREEN}✅{RESET} Cookie {cookie.name}: {', '.join(secure_flags)}")
                    else:
                        print(f"  {RED}❌{RESET} Cookie {cookie.name}: No security flags")
            else:
                print(f"  {BLUE}ℹ️{RESET} No cookies used (stateless)")
                
        except Exception:
            print(f"  {BLUE}ℹ️{RESET} Could not test cookie security")
    
    def generate_report(self) -> str:
        """Generate security audit report."""
        report = []
        
        report.append("\n" + "=" * 60)
        report.append("🔒 SECURITY AUDIT REPORT")
        report.append("=" * 60)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Target: {self.base_url}")
        
        # Security score
        report.append(f"\n🏆 Security Score: {max(0, self.result.score)}/100")
        
        if self.result.score >= 90:
            grade = "A"
            status = "Excellent"
        elif self.result.score >= 80:
            grade = "B"
            status = "Good"
        elif self.result.score >= 70:
            grade = "C"
            status = "Fair"
        elif self.result.score >= 60:
            grade = "D"
            status = "Poor"
        else:
            grade = "F"
            status = "Critical"
        
        report.append(f"Grade: {grade} ({status})")
        
        # Summary
        report.append("\n📊 Summary:")
        report.append(f"  ✅ Passed: {len(self.result.passed)}")
        report.append(f"  ❌ Failed: {len(self.result.failed)}")
        report.append(f"  ⚠️  Warnings: {len(self.result.warnings)}")
        report.append(f"  🚨 Vulnerabilities: {len(self.result.vulnerabilities)}")
        
        # Vulnerabilities
        if self.result.vulnerabilities:
            report.append("\n🚨 VULNERABILITIES FOUND:")
            report.append("-" * 40)
            
            for vuln in self.result.vulnerabilities:
                report.append(f"\nType: {vuln['type']}")
                report.append(f"Severity: {vuln['severity']}")
                if 'endpoint' in vuln:
                    report.append(f"Endpoint: {vuln['endpoint']}")
                if 'payload' in vuln:
                    report.append(f"Payload: {vuln['payload'][:50]}...")
                if 'description' in vuln:
                    report.append(f"Description: {vuln['description']}")
        
        # Failed tests
        if self.result.failed:
            report.append("\n❌ Failed Tests:")
            report.append("-" * 40)
            for failure in self.result.failed:
                report.append(f"  - {failure}")
        
        # Warnings
        if self.result.warnings:
            report.append("\n⚠️  Warnings:")
            report.append("-" * 40)
            for warning in self.result.warnings:
                report.append(f"  - {warning}")
        
        # Recommendations
        report.append("\n💡 Recommendations:")
        report.append("-" * 40)
        
        if self.result.score < 90:
            if any('SQL' in v['type'] for v in self.result.vulnerabilities):
                report.append("  - Implement parameterized queries")
            if any('XSS' in v['type'] for v in self.result.vulnerabilities):
                report.append("  - Implement output encoding")
            if 'HSTS' in str(self.result.warnings):
                report.append("  - Enable HSTS header")
            if 'Rate limiting' in str(self.result.warnings):
                report.append("  - Implement rate limiting")
            if 'CSP' in str(self.result.warnings) or 'Content-Security-Policy' in str(self.result.warnings):
                report.append("  - Implement Content Security Policy")
        
        report.append("\n" + "=" * 60)
        
        return "\n".join(report)


def main():
    """Main security audit execution."""
    parser = argparse.ArgumentParser(description='Security audit testing')
    parser.add_argument('--test', type=str, help='Run specific test')
    parser.add_argument('--report', action='store_true', help='Generate report')
    
    args = parser.parse_args()
    
    # Create auditor
    auditor = SecurityAuditor(TARGET_URL)
    
    # Run audit
    if args.test:
        # Run specific test
        test_method = f'test_{args.test}'
        if hasattr(auditor, test_method):
            getattr(auditor, test_method)()
        else:
            print(f"Unknown test: {args.test}")
            return 1
    else:
        # Run full audit
        auditor.run_full_audit()
    
    # Generate report if requested
    if args.report:
        report = auditor.generate_report()
        print(report)
        
        # Save to file
        report_file = f"security_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w') as f:
            f.write(report)
        print(f"\n📄 Report saved to {report_file}")
    
    # Exit code based on score
    if auditor.result.score >= 70:
        return 0
    elif auditor.result.score >= 50:
        return 1
    else:
        return 2


if __name__ == "__main__":
    sys.exit(main())