#!/usr/bin/env python3
"""
Production Smoke Tests for AniManga Recommender Backend

Quick validation tests to run immediately after deployment.
These tests verify core functionality in under 30 seconds.

Usage:
    # Test production
    TARGET_URL=https://animanga-backend.onrender.com python scripts/production_smoke_tests.py
    
    # Test with custom timeout
    TARGET_URL=https://animanga-backend.onrender.com SMOKE_TIMEOUT=10 python scripts/production_smoke_tests.py

Exit Codes:
    0: All smoke tests passed
    1: Critical failure detected
    2: Warning-level issues detected
"""

import os
import sys
import time
import json
import requests
from typing import Dict, List, Tuple
from datetime import datetime
from urllib.parse import urljoin

# Configuration
TARGET_URL = os.getenv('TARGET_URL', 'http://localhost:5000')
SMOKE_TIMEOUT = int(os.getenv('SMOKE_TIMEOUT', '5'))
CRITICAL_ENDPOINTS = [
    ('/', 'Root', True),
    ('/api/health', 'Health Check', True),
    ('/api/items', 'Items API', True),
    ('/api/items?per_page=1', 'Items Pagination', False),
    ('/api/recommendations/1', 'Recommendations', False)
]

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


class SmokeTestResult:
    """Container for smoke test results."""
    
    def __init__(self):
        self.passed: List[str] = []
        self.failed: List[str] = []
        self.warnings: List[str] = []
        self.response_times: Dict[str, float] = {}
        self.start_time = time.time()
        self.critical_failure = False


def print_header():
    """Print test header."""
    print(f"\n{BLUE}{'=' * 60}{RESET}")
    print(f"{BLUE}🚀 PRODUCTION SMOKE TESTS{RESET}")
    print(f"{BLUE}{'=' * 60}{RESET}")
    print(f"Target: {TARGET_URL}")
    print(f"Timeout: {SMOKE_TIMEOUT}s")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{BLUE}{'=' * 60}{RESET}\n")


def test_endpoint(url: str, name: str, critical: bool, result: SmokeTestResult) -> bool:
    """Test a single endpoint."""
    try:
        print(f"Testing {name}...", end=" ")
        start = time.time()
        response = requests.get(url, timeout=SMOKE_TIMEOUT)
        elapsed = time.time() - start
        
        result.response_times[name] = elapsed
        
        if response.status_code == 200:
            result.passed.append(name)
            print(f"{GREEN}✅ PASS{RESET} ({elapsed:.2f}s)")
            return True
        elif response.status_code == 404 and not critical:
            result.warnings.append(f"{name}: 404 Not Found")
            print(f"{YELLOW}⚠️  WARN{RESET} (404)")
            return True
        else:
            result.failed.append(f"{name}: HTTP {response.status_code}")
            if critical:
                result.critical_failure = True
            print(f"{RED}❌ FAIL{RESET} (HTTP {response.status_code})")
            return False
            
    except requests.exceptions.Timeout:
        error = f"{name}: Timeout after {SMOKE_TIMEOUT}s"
        result.failed.append(error)
        if critical:
            result.critical_failure = True
        print(f"{RED}❌ TIMEOUT{RESET}")
        return False
        
    except requests.exceptions.ConnectionError as e:
        error = f"{name}: Connection failed"
        result.failed.append(error)
        if critical:
            result.critical_failure = True
        print(f"{RED}❌ CONNECTION ERROR{RESET}")
        return False
        
    except Exception as e:
        error = f"{name}: {str(e)}"
        result.failed.append(error)
        if critical:
            result.critical_failure = True
        print(f"{RED}❌ ERROR{RESET} ({e.__class__.__name__})")
        return False


def test_health_details(base_url: str, result: SmokeTestResult):
    """Test health endpoint in detail."""
    url = urljoin(base_url, '/api/health')
    
    try:
        print(f"\nDetailed Health Check:")
        response = requests.get(url, timeout=SMOKE_TIMEOUT)
        
        if response.status_code == 200:
            data = response.json()
            
            # Overall status
            status = data.get('status', 'unknown')
            status_color = GREEN if status == 'healthy' else YELLOW if status == 'degraded' else RED
            print(f"  Overall Status: {status_color}{status}{RESET}")
            
            # Component status
            components = data.get('components', {})
            
            # Database
            db_status = components.get('database', {}).get('status', 'unknown')
            db_color = GREEN if db_status == 'healthy' else RED
            print(f"  Database: {db_color}{db_status}{RESET}")
            
            # Cache
            cache_status = components.get('cache', {}).get('status', 'unknown')
            cache_color = GREEN if cache_status == 'healthy' else YELLOW
            print(f"  Cache: {cache_color}{cache_status}{RESET}")
            
            # Compute endpoints
            if 'compute_endpoints' in components:
                compute_status = components['compute_endpoints'].get('status', 'unknown')
                compute_color = GREEN if compute_status == 'healthy' else YELLOW
                print(f"  Compute: {compute_color}{compute_status}{RESET}")
            
            # Warnings for degraded components
            if status == 'degraded':
                result.warnings.append("System health is degraded")
            
            # Critical failure for unhealthy database
            if db_status == 'unhealthy':
                result.critical_failure = True
                result.failed.append("Database is unhealthy")
                
    except Exception as e:
        result.warnings.append(f"Could not parse health details: {e}")


def test_cors_headers(base_url: str, result: SmokeTestResult):
    """Quick CORS validation."""
    url = urljoin(base_url, '/api/items')
    
    try:
        print(f"\nCORS Validation:")
        headers = {'Origin': 'https://animanga-recommender.vercel.app'}
        response = requests.get(url, headers=headers, timeout=SMOKE_TIMEOUT)
        
        if 'Access-Control-Allow-Origin' in response.headers:
            origin = response.headers['Access-Control-Allow-Origin']
            print(f"  {GREEN}✅{RESET} CORS headers present")
            print(f"  Allowed origin: {origin}")
            result.passed.append("CORS Headers")
        else:
            print(f"  {YELLOW}⚠️{RESET} CORS headers missing")
            result.warnings.append("CORS headers not found")
            
    except Exception as e:
        result.warnings.append(f"CORS test failed: {e}")


def test_data_availability(base_url: str, result: SmokeTestResult):
    """Test that data is available in the system."""
    url = urljoin(base_url, '/api/items?per_page=1')
    
    try:
        print(f"\nData Availability:")
        response = requests.get(url, timeout=SMOKE_TIMEOUT)
        
        if response.status_code == 200:
            data = response.json()
            total_items = data.get('total', 0)
            
            if total_items > 0:
                print(f"  {GREEN}✅{RESET} Data available: {total_items} items")
                result.passed.append("Data Availability")
            else:
                print(f"  {YELLOW}⚠️{RESET} No data found in database")
                result.warnings.append("Database appears empty")
        else:
            print(f"  {RED}❌{RESET} Could not check data availability")
            result.warnings.append("Data availability check failed")
            
    except Exception as e:
        result.warnings.append(f"Data availability test failed: {e}")


def calculate_performance_grade(response_times: Dict[str, float]) -> str:
    """Calculate performance grade based on response times."""
    if not response_times:
        return "N/A"
    
    avg_time = sum(response_times.values()) / len(response_times)
    
    if avg_time < 0.5:
        return f"{GREEN}A+ (Excellent){RESET}"
    elif avg_time < 1.0:
        return f"{GREEN}A (Very Good){RESET}"
    elif avg_time < 2.0:
        return f"{YELLOW}B (Good){RESET}"
    elif avg_time < 3.0:
        return f"{YELLOW}C (Fair){RESET}"
    else:
        return f"{RED}D (Poor){RESET}"


def print_summary(result: SmokeTestResult):
    """Print test summary."""
    total_time = time.time() - result.start_time
    
    print(f"\n{BLUE}{'=' * 60}{RESET}")
    print(f"{BLUE}📊 SMOKE TEST SUMMARY{RESET}")
    print(f"{BLUE}{'=' * 60}{RESET}")
    
    # Test results
    total_tests = len(result.passed) + len(result.failed)
    print(f"\nTests Run: {total_tests}")
    print(f"  {GREEN}✅ Passed: {len(result.passed)}{RESET}")
    print(f"  {RED}❌ Failed: {len(result.failed)}{RESET}")
    print(f"  {YELLOW}⚠️  Warnings: {len(result.warnings)}{RESET}")
    
    # Performance
    if result.response_times:
        avg_time = sum(result.response_times.values()) / len(result.response_times)
        max_time = max(result.response_times.values())
        min_time = min(result.response_times.values())
        
        print(f"\nPerformance:")
        print(f"  Average Response: {avg_time:.2f}s")
        print(f"  Fastest: {min_time:.2f}s")
        print(f"  Slowest: {max_time:.2f}s")
        print(f"  Grade: {calculate_performance_grade(result.response_times)}")
    
    # Failed tests details
    if result.failed:
        print(f"\n{RED}Failed Tests:{RESET}")
        for failure in result.failed:
            print(f"  - {failure}")
    
    # Warnings details
    if result.warnings:
        print(f"\n{YELLOW}Warnings:{RESET}")
        for warning in result.warnings:
            print(f"  - {warning}")
    
    # Overall status
    print(f"\n{BLUE}{'=' * 60}{RESET}")
    print(f"Total Time: {total_time:.2f}s")
    
    if result.critical_failure:
        print(f"{RED}🚨 CRITICAL FAILURE - Deployment has major issues!{RESET}")
    elif result.failed:
        print(f"{RED}❌ FAILED - Some tests failed{RESET}")
    elif result.warnings:
        print(f"{YELLOW}⚠️  PASSED WITH WARNINGS{RESET}")
    else:
        print(f"{GREEN}✅ ALL SMOKE TESTS PASSED!{RESET}")
    
    print(f"{BLUE}{'=' * 60}{RESET}\n")


def main():
    """Main smoke test execution."""
    result = SmokeTestResult()
    
    # Print header
    print_header()
    
    # Verify service is reachable
    print("Checking service availability...")
    try:
        response = requests.get(TARGET_URL, timeout=SMOKE_TIMEOUT)
        print(f"{GREEN}✅ Service is reachable{RESET}\n")
    except requests.exceptions.ConnectionError:
        print(f"{RED}❌ Cannot connect to {TARGET_URL}{RESET}")
        print(f"{RED}Service appears to be down!{RESET}\n")
        return 1
    except requests.exceptions.Timeout:
        print(f"{RED}❌ Service timeout at {TARGET_URL}{RESET}")
        print(f"{RED}Service is not responding!{RESET}\n")
        return 1
    
    # Run endpoint tests
    print("Running endpoint tests:")
    for endpoint, name, critical in CRITICAL_ENDPOINTS:
        url = urljoin(TARGET_URL, endpoint)
        test_endpoint(url, name, critical, result)
    
    # Additional detailed tests
    test_health_details(TARGET_URL, result)
    test_cors_headers(TARGET_URL, result)
    test_data_availability(TARGET_URL, result)
    
    # Print summary
    print_summary(result)
    
    # Determine exit code
    if result.critical_failure:
        return 1  # Critical failure
    elif result.failed:
        return 1  # Regular failure
    elif result.warnings:
        return 2  # Warnings only
    else:
        return 0  # Success


if __name__ == "__main__":
    sys.exit(main())