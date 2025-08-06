#!/usr/bin/env python3
"""
CORS Validation Tests for AniManga Recommender Backend

Comprehensive CORS (Cross-Origin Resource Sharing) testing to ensure
the backend properly handles requests from the Vercel frontend.

Usage:
    # Test CORS for production frontend
    TARGET_URL=https://animanga-backend.onrender.com \
    FRONTEND_URL=https://animanga-recommender.vercel.app \
    python scripts/cors_validation.py
    
    # Test CORS for preview deployments
    TARGET_URL=https://animanga-backend.onrender.com \
    FRONTEND_URL=https://preview-xyz.vercel.app \
    python scripts/cors_validation.py
    
    # Test all configured origins
    TARGET_URL=https://animanga-backend.onrender.com \
    python scripts/cors_validation.py --test-all

Tests:
    - Preflight OPTIONS requests
    - Simple CORS requests
    - Credentialed requests
    - Various HTTP methods
    - Custom headers
    - Wildcard vs specific origins
"""

import os
import sys
import json
import requests
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from urllib.parse import urljoin

# Configuration
TARGET_URL = os.getenv('TARGET_URL', 'http://localhost:5000')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://animanga-recommender.vercel.app')
CORS_TIMEOUT = int(os.getenv('CORS_TIMEOUT', '10'))

# Expected CORS origins for production
EXPECTED_ORIGINS = [
    'https://animanga-recommender.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
]

# Vercel preview deployment pattern
VERCEL_PREVIEW_PATTERN = 'https://*.vercel.app'

# HTTP methods to test
TEST_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']

# Custom headers to test
CUSTOM_HEADERS = [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Custom-Header'
]

# Color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


class CORSTestResult:
    """Container for CORS test results."""
    
    def __init__(self):
        self.passed: List[str] = []
        self.failed: List[str] = []
        self.warnings: List[str] = []
        self.details: Dict[str, Dict] = {}


class CORSValidator:
    """CORS validation and testing."""
    
    def __init__(self, base_url: str, frontend_url: str):
        self.base_url = base_url
        self.frontend_url = frontend_url
        self.result = CORSTestResult()
        
    def run_full_validation(self) -> CORSTestResult:
        """Run complete CORS validation."""
        print(f"\n{BLUE}{'=' * 60}{RESET}")
        print(f"{BLUE}🌐 CORS VALIDATION{RESET}")
        print(f"{BLUE}{'=' * 60}{RESET}")
        print(f"Backend: {self.base_url}")
        print(f"Frontend: {self.frontend_url}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{BLUE}{'=' * 60}{RESET}\n")
        
        # Run all CORS tests
        self.test_preflight_request()
        self.test_simple_cors_request()
        self.test_credentialed_request()
        self.test_http_methods()
        self.test_custom_headers()
        self.test_error_responses()
        self.test_multiple_origins()
        self.test_wildcard_subdomain()
        
        return self.result
    
    def test_preflight_request(self):
        """Test preflight OPTIONS request."""
        print("🔍 Testing Preflight Request...")
        
        url = urljoin(self.base_url, '/api/items')
        
        headers = {
            'Origin': self.frontend_url,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
        
        try:
            response = requests.options(url, headers=headers, timeout=CORS_TIMEOUT)
            
            # Check required CORS headers
            cors_headers = {
                'Access-Control-Allow-Origin': None,
                'Access-Control-Allow-Methods': None,
                'Access-Control-Allow-Headers': None,
                'Access-Control-Max-Age': None
            }
            
            for header in cors_headers:
                if header in response.headers:
                    value = response.headers[header]
                    cors_headers[header] = value
                    print(f"  {GREEN}✅{RESET} {header}: {value[:50]}...")
                else:
                    self.result.warnings.append(f"Missing {header} in preflight")
                    print(f"  {YELLOW}⚠️{RESET} Missing: {header}")
            
            # Validate origin
            allowed_origin = cors_headers.get('Access-Control-Allow-Origin')
            if allowed_origin:
                if allowed_origin == self.frontend_url or allowed_origin == '*':
                    self.result.passed.append("Preflight origin correct")
                else:
                    self.result.failed.append(f"Preflight origin mismatch: {allowed_origin}")
                    print(f"  {RED}❌{RESET} Origin mismatch: expected {self.frontend_url}, got {allowed_origin}")
            
            # Validate methods
            allowed_methods = cors_headers.get('Access-Control-Allow-Methods', '')
            for method in ['GET', 'POST', 'PUT', 'DELETE']:
                if method not in allowed_methods:
                    self.result.warnings.append(f"Method {method} not in Allow-Methods")
            
            # Validate headers
            allowed_headers = cors_headers.get('Access-Control-Allow-Headers', '').lower()
            for header in ['content-type', 'authorization']:
                if header not in allowed_headers:
                    self.result.warnings.append(f"Header {header} not in Allow-Headers")
            
            # Store details
            self.result.details['preflight'] = cors_headers
            
        except Exception as e:
            self.result.failed.append(f"Preflight request failed: {e}")
            print(f"  {RED}❌{RESET} Request failed: {e}")
    
    def test_simple_cors_request(self):
        """Test simple CORS request (GET)."""
        print("\n🔍 Testing Simple CORS Request...")
        
        url = urljoin(self.base_url, '/api/items')
        headers = {'Origin': self.frontend_url}
        
        try:
            response = requests.get(url, headers=headers, timeout=CORS_TIMEOUT)
            
            if 'Access-Control-Allow-Origin' in response.headers:
                origin = response.headers['Access-Control-Allow-Origin']
                
                if origin == self.frontend_url or origin == '*':
                    self.result.passed.append("Simple CORS request allowed")
                    print(f"  {GREEN}✅{RESET} Origin allowed: {origin}")
                else:
                    self.result.failed.append(f"Simple CORS origin mismatch: {origin}")
                    print(f"  {RED}❌{RESET} Origin mismatch: {origin}")
            else:
                self.result.failed.append("No CORS headers in simple request")
                print(f"  {RED}❌{RESET} No Access-Control-Allow-Origin header")
            
            # Check other CORS headers
            if 'Access-Control-Allow-Credentials' in response.headers:
                credentials = response.headers['Access-Control-Allow-Credentials']
                print(f"  {BLUE}ℹ️{RESET} Credentials: {credentials}")
            
            if 'Access-Control-Expose-Headers' in response.headers:
                exposed = response.headers['Access-Control-Expose-Headers']
                print(f"  {BLUE}ℹ️{RESET} Exposed headers: {exposed}")
            
        except Exception as e:
            self.result.failed.append(f"Simple CORS request failed: {e}")
            print(f"  {RED}❌{RESET} Request failed: {e}")
    
    def test_credentialed_request(self):
        """Test CORS request with credentials."""
        print("\n🔍 Testing Credentialed Request...")
        
        url = urljoin(self.base_url, '/api/items')
        headers = {
            'Origin': self.frontend_url,
            'Cookie': 'session=test123'
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=CORS_TIMEOUT)
            
            # Check credentials support
            if 'Access-Control-Allow-Credentials' in response.headers:
                allow_credentials = response.headers['Access-Control-Allow-Credentials']
                
                if allow_credentials.lower() == 'true':
                    self.result.passed.append("Credentials supported")
                    print(f"  {GREEN}✅{RESET} Credentials allowed")
                    
                    # With credentials, origin must be specific (not *)
                    origin = response.headers.get('Access-Control-Allow-Origin', '')
                    if origin == '*':
                        self.result.failed.append("Wildcard origin with credentials")
                        print(f"  {RED}❌{RESET} Security issue: wildcard origin with credentials")
                else:
                    print(f"  {YELLOW}⚠️{RESET} Credentials not allowed")
            else:
                print(f"  {BLUE}ℹ️{RESET} No credentials header (stateless API)")
            
        except Exception as e:
            self.result.failed.append(f"Credentialed request failed: {e}")
            print(f"  {RED}❌{RESET} Request failed: {e}")
    
    def test_http_methods(self):
        """Test CORS for different HTTP methods."""
        print("\n🔍 Testing HTTP Methods...")
        
        url = urljoin(self.base_url, '/api/items')
        
        for method in TEST_METHODS:
            if method == 'OPTIONS':
                continue  # Already tested
            
            # First do preflight for non-simple methods
            if method in ['PUT', 'DELETE', 'PATCH']:
                preflight_headers = {
                    'Origin': self.frontend_url,
                    'Access-Control-Request-Method': method
                }
                
                try:
                    response = requests.options(url, headers=preflight_headers, timeout=CORS_TIMEOUT)
                    
                    if 'Access-Control-Allow-Methods' in response.headers:
                        allowed = response.headers['Access-Control-Allow-Methods']
                        if method in allowed:
                            print(f"  {GREEN}✅{RESET} {method} allowed in preflight")
                        else:
                            self.result.failed.append(f"{method} not allowed")
                            print(f"  {RED}❌{RESET} {method} not in Allow-Methods")
                except:
                    pass
            
            # Test actual request
            headers = {'Origin': self.frontend_url}
            
            try:
                if method == 'GET':
                    response = requests.get(url, headers=headers, timeout=CORS_TIMEOUT)
                elif method == 'POST':
                    response = requests.post(url, headers=headers, json={}, timeout=CORS_TIMEOUT)
                elif method == 'PUT':
                    response = requests.put(url + '/1', headers=headers, json={}, timeout=CORS_TIMEOUT)
                elif method == 'DELETE':
                    response = requests.delete(url + '/1', headers=headers, timeout=CORS_TIMEOUT)
                elif method == 'PATCH':
                    response = requests.patch(url + '/1', headers=headers, json={}, timeout=CORS_TIMEOUT)
                else:
                    continue
                
                if 'Access-Control-Allow-Origin' in response.headers:
                    print(f"  {GREEN}✅{RESET} {method} request has CORS headers")
                else:
                    self.result.warnings.append(f"{method} missing CORS headers")
                    print(f"  {YELLOW}⚠️{RESET} {method} missing CORS headers")
                    
            except Exception:
                pass
    
    def test_custom_headers(self):
        """Test CORS with custom headers."""
        print("\n🔍 Testing Custom Headers...")
        
        url = urljoin(self.base_url, '/api/items')
        
        for header in CUSTOM_HEADERS:
            preflight_headers = {
                'Origin': self.frontend_url,
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': header
            }
            
            try:
                response = requests.options(url, headers=preflight_headers, timeout=CORS_TIMEOUT)
                
                if 'Access-Control-Allow-Headers' in response.headers:
                    allowed = response.headers['Access-Control-Allow-Headers'].lower()
                    if header.lower() in allowed or '*' in allowed:
                        print(f"  {GREEN}✅{RESET} {header} allowed")
                    else:
                        self.result.warnings.append(f"{header} not explicitly allowed")
                        print(f"  {YELLOW}⚠️{RESET} {header} not explicitly allowed")
                        
            except Exception:
                pass
    
    def test_error_responses(self):
        """Test CORS headers in error responses."""
        print("\n🔍 Testing Error Response CORS...")
        
        # Test 404
        url = urljoin(self.base_url, '/api/nonexistent')
        headers = {'Origin': self.frontend_url}
        
        try:
            response = requests.get(url, headers=headers, timeout=CORS_TIMEOUT)
            
            if response.status_code == 404:
                if 'Access-Control-Allow-Origin' in response.headers:
                    self.result.passed.append("CORS headers in 404 response")
                    print(f"  {GREEN}✅{RESET} 404 response includes CORS headers")
                else:
                    self.result.warnings.append("No CORS headers in 404")
                    print(f"  {YELLOW}⚠️{RESET} 404 response missing CORS headers")
        except:
            pass
        
        # Test 401
        url = urljoin(self.base_url, '/api/auth/dashboard')
        
        try:
            response = requests.get(url, headers=headers, timeout=CORS_TIMEOUT)
            
            if response.status_code == 401:
                if 'Access-Control-Allow-Origin' in response.headers:
                    self.result.passed.append("CORS headers in 401 response")
                    print(f"  {GREEN}✅{RESET} 401 response includes CORS headers")
                else:
                    self.result.warnings.append("No CORS headers in 401")
                    print(f"  {YELLOW}⚠️{RESET} 401 response missing CORS headers")
        except:
            pass
    
    def test_multiple_origins(self):
        """Test CORS with multiple allowed origins."""
        print("\n🔍 Testing Multiple Origins...")
        
        url = urljoin(self.base_url, '/api/items')
        
        test_origins = [
            ('https://animanga-recommender.vercel.app', True),
            ('http://localhost:3000', True),
            ('http://localhost:3001', True),
            ('https://evil.com', False),
            ('http://attacker.com', False)
        ]
        
        for origin, should_allow in test_origins:
            headers = {'Origin': origin}
            
            try:
                response = requests.get(url, headers=headers, timeout=CORS_TIMEOUT)
                
                if 'Access-Control-Allow-Origin' in response.headers:
                    allowed = response.headers['Access-Control-Allow-Origin']
                    
                    if should_allow:
                        if allowed == origin or allowed == '*':
                            print(f"  {GREEN}✅{RESET} {origin} allowed")
                        else:
                            self.result.failed.append(f"{origin} should be allowed")
                            print(f"  {RED}❌{RESET} {origin} should be allowed")
                    else:
                        if allowed == origin:
                            self.result.failed.append(f"{origin} should not be allowed")
                            print(f"  {RED}❌{RESET} {origin} should NOT be allowed")
                        else:
                            print(f"  {GREEN}✅{RESET} {origin} correctly blocked")
                            
            except Exception:
                pass
    
    def test_wildcard_subdomain(self):
        """Test CORS with Vercel preview deployments."""
        print("\n🔍 Testing Vercel Preview Deployments...")
        
        url = urljoin(self.base_url, '/api/items')
        
        preview_origins = [
            'https://preview-abc123.vercel.app',
            'https://animanga-pr-42.vercel.app',
            'https://staging.vercel.app'
        ]
        
        for origin in preview_origins:
            headers = {'Origin': origin}
            
            try:
                response = requests.get(url, headers=headers, timeout=CORS_TIMEOUT)
                
                if 'Access-Control-Allow-Origin' in response.headers:
                    allowed = response.headers['Access-Control-Allow-Origin']
                    
                    # Preview deployments might be allowed via wildcard or specific pattern
                    if allowed == origin or allowed == '*' or '.vercel.app' in allowed:
                        print(f"  {GREEN}✅{RESET} Preview deployment allowed: {origin}")
                        self.result.passed.append("Vercel preview deployments supported")
                    else:
                        print(f"  {YELLOW}⚠️{RESET} Preview deployment blocked: {origin}")
                        self.result.warnings.append("Vercel preview deployments may not work")
                        
            except Exception:
                pass
    
    def generate_report(self) -> str:
        """Generate CORS validation report."""
        report = []
        
        report.append("\n" + "=" * 60)
        report.append("🌐 CORS VALIDATION REPORT")
        report.append("=" * 60)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Backend: {self.base_url}")
        report.append(f"Frontend: {self.frontend_url}")
        
        # Summary
        report.append("\n📊 Summary:")
        report.append(f"  ✅ Passed: {len(self.result.passed)}")
        report.append(f"  ❌ Failed: {len(self.result.failed)}")
        report.append(f"  ⚠️  Warnings: {len(self.result.warnings)}")
        
        # Preflight details
        if 'preflight' in self.result.details:
            report.append("\n📋 Preflight Response:")
            for header, value in self.result.details['preflight'].items():
                if value:
                    report.append(f"  {header}: {value}")
        
        # Failed tests
        if self.result.failed:
            report.append("\n❌ Failed Tests:")
            for failure in self.result.failed:
                report.append(f"  - {failure}")
        
        # Warnings
        if self.result.warnings:
            report.append("\n⚠️  Warnings:")
            for warning in self.result.warnings:
                report.append(f"  - {warning}")
        
        # Recommendations
        report.append("\n💡 Recommendations:")
        
        if self.result.failed or self.result.warnings:
            if 'origin mismatch' in str(self.result.failed).lower():
                report.append("  - Update ALLOWED_ORIGINS in backend configuration")
            if 'credentials' in str(self.result.warnings).lower():
                report.append("  - Configure Access-Control-Allow-Credentials if needed")
            if 'preview deployment' in str(self.result.warnings).lower():
                report.append("  - Add wildcard pattern for Vercel preview deployments")
        else:
            report.append("  - CORS is properly configured")
        
        # Overall status
        if not self.result.failed:
            report.append("\n✅ CORS validation PASSED")
        else:
            report.append("\n❌ CORS validation FAILED")
        
        report.append("=" * 60)
        
        return "\n".join(report)


def test_all_origins():
    """Test CORS for all expected origins."""
    print(f"\n{BLUE}Testing All Configured Origins{RESET}")
    print("=" * 60)
    
    all_origins = EXPECTED_ORIGINS + [
        'https://preview-test.vercel.app',
        'https://animanga-pr-1.vercel.app'
    ]
    
    for origin in all_origins:
        print(f"\n📍 Testing origin: {origin}")
        validator = CORSValidator(TARGET_URL, origin)
        
        # Run minimal tests
        validator.test_simple_cors_request()
        
        if validator.result.failed:
            print(f"  Result: {RED}FAILED{RESET}")
        elif validator.result.warnings:
            print(f"  Result: {YELLOW}WARNINGS{RESET}")
        else:
            print(f"  Result: {GREEN}PASSED{RESET}")


def main():
    """Main CORS validation execution."""
    import argparse
    
    parser = argparse.ArgumentParser(description='CORS validation testing')
    parser.add_argument('--test-all', action='store_true', help='Test all configured origins')
    parser.add_argument('--report', action='store_true', help='Generate detailed report')
    
    args = parser.parse_args()
    
    if args.test_all:
        test_all_origins()
        return 0
    
    # Create validator
    validator = CORSValidator(TARGET_URL, FRONTEND_URL)
    
    # Run validation
    validator.run_full_validation()
    
    # Generate report if requested
    if args.report:
        report = validator.generate_report()
        print(report)
    
    # Summary
    print(f"\n{BLUE}{'=' * 60}{RESET}")
    print(f"{BLUE}CORS VALIDATION COMPLETE{RESET}")
    print(f"{BLUE}{'=' * 60}{RESET}")
    
    if not validator.result.failed:
        print(f"{GREEN}✅ All CORS tests passed!{RESET}")
        return 0
    else:
        print(f"{RED}❌ Some CORS tests failed{RESET}")
        return 1


if __name__ == "__main__":
    sys.exit(main())