#!/usr/bin/env python3
"""
Performance Baseline Tests for AniManga Recommender Backend

Establishes and monitors performance baselines for production deployment.
Measures response times, throughput, and resource utilization.

Usage:
    # Establish baseline
    TARGET_URL=https://animanga-backend.onrender.com python scripts/performance_baseline.py --establish
    
    # Compare against baseline
    TARGET_URL=https://animanga-backend.onrender.com python scripts/performance_baseline.py --compare
    
    # Generate report
    TARGET_URL=https://animanga-backend.onrender.com python scripts/performance_baseline.py --report

Output:
    Creates performance_baseline.json with metrics and thresholds
"""

import os
import sys
import time
import json
import statistics
import concurrent.futures
import requests
import argparse
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from urllib.parse import urljoin
from dataclasses import dataclass, asdict

# Configuration
TARGET_URL = os.getenv('TARGET_URL', 'http://localhost:5000')
PERF_TIMEOUT = int(os.getenv('PERF_TIMEOUT', '30'))
CONCURRENT_USERS = int(os.getenv('CONCURRENT_USERS', '10'))
REQUESTS_PER_USER = int(os.getenv('REQUESTS_PER_USER', '5'))
BASELINE_FILE = 'performance_baseline.json'

# Performance thresholds (milliseconds)
THRESHOLDS = {
    'public_api': {
        'p50': 200,   # 50th percentile
        'p95': 500,   # 95th percentile
        'p99': 1000,  # 99th percentile
        'max': 2000   # Maximum acceptable
    },
    'auth_api': {
        'p50': 300,
        'p95': 800,
        'p99': 1500,
        'max': 3000
    },
    'health_check': {
        'p50': 100,
        'p95': 200,
        'p99': 300,
        'max': 500
    },
    'recommendations': {
        'p50': 500,
        'p95': 1500,
        'p99': 3000,
        'max': 5000
    }
}


@dataclass
class PerformanceMetrics:
    """Container for performance metrics."""
    endpoint: str
    category: str
    samples: int
    mean: float
    median: float
    stdev: float
    min: float
    max: float
    p50: float
    p75: float
    p90: float
    p95: float
    p99: float
    error_rate: float
    throughput: float


@dataclass
class EndpointTest:
    """Configuration for endpoint performance test."""
    path: str
    method: str
    category: str
    name: str
    auth_required: bool = False
    payload: Optional[Dict] = None


# Test endpoints configuration
TEST_ENDPOINTS = [
    EndpointTest('/api/health', 'GET', 'health_check', 'Health Check'),
    EndpointTest('/api/items', 'GET', 'public_api', 'Items List'),
    EndpointTest('/api/items?per_page=10', 'GET', 'public_api', 'Items Paginated'),
    EndpointTest('/api/items?media_type=anime', 'GET', 'public_api', 'Items Filtered'),
    EndpointTest('/api/items?search=naruto', 'GET', 'public_api', 'Items Search'),
    EndpointTest('/api/recommendations/1', 'GET', 'recommendations', 'Recommendations'),
    EndpointTest('/api/auth/dashboard', 'GET', 'auth_api', 'Dashboard', auth_required=True),
]


class PerformanceTester:
    """Performance testing and baseline management."""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.auth_token: Optional[str] = None
        self.results: Dict[str, PerformanceMetrics] = {}
        self.raw_data: Dict[str, List[float]] = {}
        
    def test_endpoint(self, endpoint: EndpointTest, iterations: int = 10) -> PerformanceMetrics:
        """Test a single endpoint multiple times."""
        url = urljoin(self.base_url, endpoint.path)
        response_times = []
        errors = 0
        
        print(f"Testing {endpoint.name}...", end=" ")
        
        headers = {}
        if endpoint.auth_required and self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
        
        for _ in range(iterations):
            try:
                start = time.time()
                
                if endpoint.method == 'GET':
                    response = requests.get(url, headers=headers, timeout=PERF_TIMEOUT)
                elif endpoint.method == 'POST':
                    response = requests.post(url, json=endpoint.payload, headers=headers, timeout=PERF_TIMEOUT)
                else:
                    response = requests.request(endpoint.method, url, headers=headers, timeout=PERF_TIMEOUT)
                
                elapsed = (time.time() - start) * 1000  # Convert to milliseconds
                
                if response.status_code < 500:
                    response_times.append(elapsed)
                else:
                    errors += 1
                    
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError):
                errors += 1
            except Exception:
                errors += 1
        
        # Calculate metrics
        if response_times:
            metrics = self._calculate_metrics(
                endpoint.name,
                endpoint.category,
                response_times,
                errors,
                iterations
            )
            print(f"✅ Mean: {metrics.mean:.0f}ms, P95: {metrics.p95:.0f}ms")
        else:
            metrics = self._create_error_metrics(endpoint.name, endpoint.category)
            print(f"❌ All requests failed")
        
        self.results[endpoint.name] = metrics
        self.raw_data[endpoint.name] = response_times
        
        return metrics
    
    def test_concurrent_load(self, endpoint: EndpointTest, users: int, requests_per_user: int) -> Dict:
        """Test endpoint under concurrent load."""
        url = urljoin(self.base_url, endpoint.path)
        
        print(f"\nLoad testing {endpoint.name} ({users} users, {requests_per_user} requests each)...")
        
        def make_request():
            try:
                start = time.time()
                response = requests.get(url, timeout=PERF_TIMEOUT)
                elapsed = (time.time() - start) * 1000
                return elapsed if response.status_code < 500 else None
            except:
                return None
        
        # Execute concurrent requests
        all_times = []
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=users) as executor:
            futures = []
            for _ in range(users):
                for _ in range(requests_per_user):
                    futures.append(executor.submit(make_request))
            
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                if result:
                    all_times.append(result)
        
        total_time = time.time() - start_time
        
        # Calculate load test metrics
        successful = len(all_times)
        total_requests = users * requests_per_user
        error_rate = (total_requests - successful) / total_requests * 100
        throughput = successful / total_time
        
        if all_times:
            load_metrics = {
                'users': users,
                'total_requests': total_requests,
                'successful': successful,
                'error_rate': error_rate,
                'throughput': throughput,
                'mean_response': statistics.mean(all_times),
                'median_response': statistics.median(all_times),
                'p95_response': self._percentile(all_times, 95),
                'p99_response': self._percentile(all_times, 99),
                'max_response': max(all_times),
                'total_time': total_time
            }
            
            print(f"  Throughput: {throughput:.1f} req/s")
            print(f"  Mean Response: {load_metrics['mean_response']:.0f}ms")
            print(f"  P95 Response: {load_metrics['p95_response']:.0f}ms")
            print(f"  Error Rate: {error_rate:.1f}%")
        else:
            load_metrics = {
                'users': users,
                'total_requests': total_requests,
                'successful': 0,
                'error_rate': 100.0,
                'throughput': 0,
                'total_time': total_time
            }
            print(f"  ❌ All requests failed")
        
        return load_metrics
    
    def establish_baseline(self) -> Dict:
        """Establish performance baseline for all endpoints."""
        print("\n🎯 Establishing Performance Baseline")
        print("=" * 60)
        
        baseline = {
            'timestamp': datetime.now().isoformat(),
            'target_url': self.base_url,
            'endpoints': {},
            'load_tests': {},
            'thresholds': THRESHOLDS
        }
        
        # Test individual endpoints
        print("\n📊 Individual Endpoint Tests:")
        for endpoint in TEST_ENDPOINTS:
            if not endpoint.auth_required:  # Skip auth endpoints for baseline
                metrics = self.test_endpoint(endpoint, iterations=20)
                baseline['endpoints'][endpoint.name] = asdict(metrics)
        
        # Load tests for critical endpoints
        print("\n🔥 Load Testing:")
        critical_endpoints = [
            EndpointTest('/api/items', 'GET', 'public_api', 'Items API'),
            EndpointTest('/api/health', 'GET', 'health_check', 'Health Check')
        ]
        
        for endpoint in critical_endpoints:
            load_metrics = self.test_concurrent_load(
                endpoint,
                CONCURRENT_USERS,
                REQUESTS_PER_USER
            )
            baseline['load_tests'][endpoint.name] = load_metrics
        
        # Save baseline
        self._save_baseline(baseline)
        
        return baseline
    
    def compare_with_baseline(self) -> Dict:
        """Compare current performance with baseline."""
        print("\n📊 Comparing with Baseline")
        print("=" * 60)
        
        # Load baseline
        baseline = self._load_baseline()
        if not baseline:
            print("❌ No baseline found. Run with --establish first.")
            return {}
        
        comparison = {
            'timestamp': datetime.now().isoformat(),
            'baseline_timestamp': baseline['timestamp'],
            'target_url': self.base_url,
            'endpoints': {},
            'degradations': [],
            'improvements': []
        }
        
        # Test endpoints and compare
        print("\n📊 Endpoint Comparison:")
        for endpoint in TEST_ENDPOINTS:
            if not endpoint.auth_required:
                current = self.test_endpoint(endpoint, iterations=10)
                
                if endpoint.name in baseline['endpoints']:
                    baseline_metrics = baseline['endpoints'][endpoint.name]
                    
                    # Calculate percentage changes
                    mean_change = ((current.mean - baseline_metrics['mean']) / baseline_metrics['mean']) * 100
                    p95_change = ((current.p95 - baseline_metrics['p95']) / baseline_metrics['p95']) * 100
                    
                    comparison['endpoints'][endpoint.name] = {
                        'current': asdict(current),
                        'baseline': baseline_metrics,
                        'mean_change': mean_change,
                        'p95_change': p95_change
                    }
                    
                    # Check against thresholds
                    category = endpoint.category
                    if category in THRESHOLDS:
                        thresholds = THRESHOLDS[category]
                        
                        violations = []
                        if current.p50 > thresholds['p50']:
                            violations.append(f"P50 {current.p50:.0f}ms > {thresholds['p50']}ms")
                        if current.p95 > thresholds['p95']:
                            violations.append(f"P95 {current.p95:.0f}ms > {thresholds['p95']}ms")
                        if current.p99 > thresholds['p99']:
                            violations.append(f"P99 {current.p99:.0f}ms > {thresholds['p99']}ms")
                        
                        if violations:
                            comparison['degradations'].append({
                                'endpoint': endpoint.name,
                                'violations': violations
                            })
                    
                    # Track improvements/degradations
                    if mean_change > 20:
                        comparison['degradations'].append(
                            f"{endpoint.name}: {mean_change:.1f}% slower"
                        )
                    elif mean_change < -20:
                        comparison['improvements'].append(
                            f"{endpoint.name}: {abs(mean_change):.1f}% faster"
                        )
        
        return comparison
    
    def generate_report(self) -> str:
        """Generate performance report."""
        baseline = self._load_baseline()
        if not baseline:
            return "No baseline data available."
        
        report = []
        report.append("\n" + "=" * 60)
        report.append("📊 PERFORMANCE BASELINE REPORT")
        report.append("=" * 60)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Target: {self.base_url}")
        report.append(f"Baseline Date: {baseline['timestamp'][:10]}")
        
        # Endpoint performance
        report.append("\n📈 Endpoint Performance Baselines:")
        report.append("-" * 40)
        
        for name, metrics in baseline['endpoints'].items():
            report.append(f"\n{name}:")
            report.append(f"  Mean: {metrics['mean']:.0f}ms")
            report.append(f"  P50: {metrics['p50']:.0f}ms")
            report.append(f"  P95: {metrics['p95']:.0f}ms")
            report.append(f"  P99: {metrics['p99']:.0f}ms")
            report.append(f"  Max: {metrics['max']:.0f}ms")
            
            # Check against thresholds
            category = metrics['category']
            if category in THRESHOLDS:
                thresholds = THRESHOLDS[category]
                status = "✅" if metrics['p95'] <= thresholds['p95'] else "⚠️"
                report.append(f"  Status: {status}")
        
        # Load test results
        if baseline.get('load_tests'):
            report.append("\n🔥 Load Test Results:")
            report.append("-" * 40)
            
            for name, load_metrics in baseline['load_tests'].items():
                report.append(f"\n{name}:")
                report.append(f"  Users: {load_metrics['users']}")
                report.append(f"  Total Requests: {load_metrics['total_requests']}")
                report.append(f"  Throughput: {load_metrics['throughput']:.1f} req/s")
                report.append(f"  Mean Response: {load_metrics['mean_response']:.0f}ms")
                report.append(f"  P95 Response: {load_metrics['p95_response']:.0f}ms")
                report.append(f"  Error Rate: {load_metrics['error_rate']:.1f}%")
        
        # Performance grades
        report.append("\n🏆 Performance Grades:")
        report.append("-" * 40)
        
        grades = self._calculate_grades(baseline['endpoints'])
        for category, grade in grades.items():
            report.append(f"  {category}: {grade}")
        
        report.append("\n" + "=" * 60)
        
        return "\n".join(report)
    
    def _calculate_metrics(self, name: str, category: str, times: List[float], 
                          errors: int, total: int) -> PerformanceMetrics:
        """Calculate performance metrics from response times."""
        times.sort()
        
        return PerformanceMetrics(
            endpoint=name,
            category=category,
            samples=len(times),
            mean=statistics.mean(times),
            median=statistics.median(times),
            stdev=statistics.stdev(times) if len(times) > 1 else 0,
            min=min(times),
            max=max(times),
            p50=self._percentile(times, 50),
            p75=self._percentile(times, 75),
            p90=self._percentile(times, 90),
            p95=self._percentile(times, 95),
            p99=self._percentile(times, 99),
            error_rate=(errors / total) * 100,
            throughput=1000 / statistics.mean(times)  # requests per second
        )
    
    def _create_error_metrics(self, name: str, category: str) -> PerformanceMetrics:
        """Create metrics for failed endpoint."""
        return PerformanceMetrics(
            endpoint=name,
            category=category,
            samples=0,
            mean=0,
            median=0,
            stdev=0,
            min=0,
            max=0,
            p50=0,
            p75=0,
            p90=0,
            p95=0,
            p99=0,
            error_rate=100,
            throughput=0
        )
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile from sorted data."""
        if not data:
            return 0
        index = int(len(data) * percentile / 100)
        if index >= len(data):
            index = len(data) - 1
        return data[index]
    
    def _save_baseline(self, baseline: Dict):
        """Save baseline to file."""
        with open(BASELINE_FILE, 'w') as f:
            json.dump(baseline, f, indent=2)
        print(f"\n✅ Baseline saved to {BASELINE_FILE}")
    
    def _load_baseline(self) -> Optional[Dict]:
        """Load baseline from file."""
        if not os.path.exists(BASELINE_FILE):
            return None
        
        with open(BASELINE_FILE, 'r') as f:
            return json.load(f)
    
    def _calculate_grades(self, endpoints: Dict) -> Dict[str, str]:
        """Calculate performance grades by category."""
        grades = {}
        
        for category in ['public_api', 'health_check', 'recommendations']:
            category_times = []
            
            for metrics in endpoints.values():
                if metrics['category'] == category:
                    category_times.append(metrics['p95'])
            
            if category_times:
                avg_p95 = statistics.mean(category_times)
                
                if category in THRESHOLDS:
                    threshold = THRESHOLDS[category]['p95']
                    
                    if avg_p95 <= threshold * 0.5:
                        grades[category] = "A+ (Excellent)"
                    elif avg_p95 <= threshold * 0.75:
                        grades[category] = "A (Very Good)"
                    elif avg_p95 <= threshold:
                        grades[category] = "B (Good)"
                    elif avg_p95 <= threshold * 1.5:
                        grades[category] = "C (Fair)"
                    else:
                        grades[category] = "D (Poor)"
        
        return grades


def main():
    """Main performance testing execution."""
    parser = argparse.ArgumentParser(description='Performance baseline testing')
    parser.add_argument('--establish', action='store_true', help='Establish new baseline')
    parser.add_argument('--compare', action='store_true', help='Compare with baseline')
    parser.add_argument('--report', action='store_true', help='Generate report')
    
    args = parser.parse_args()
    
    # Create tester
    tester = PerformanceTester(TARGET_URL)
    
    # Check service availability
    print(f"🎯 Target: {TARGET_URL}")
    try:
        response = requests.get(TARGET_URL, timeout=5)
        print(f"✅ Service is reachable\n")
    except:
        print(f"❌ Cannot connect to {TARGET_URL}")
        return 1
    
    # Execute requested action
    if args.establish:
        baseline = tester.establish_baseline()
        print("\n✅ Baseline established successfully!")
        
    elif args.compare:
        comparison = tester.compare_with_baseline()
        
        if comparison:
            print("\n" + "=" * 60)
            print("📊 COMPARISON RESULTS")
            print("=" * 60)
            
            if comparison['degradations']:
                print("\n⚠️ Performance Degradations:")
                for deg in comparison['degradations']:
                    print(f"  - {deg}")
            
            if comparison['improvements']:
                print("\n✅ Performance Improvements:")
                for imp in comparison['improvements']:
                    print(f"  - {imp}")
            
            if not comparison['degradations'] and not comparison['improvements']:
                print("\n✅ Performance is stable")
    
    elif args.report:
        report = tester.generate_report()
        print(report)
    
    else:
        # Default: run quick performance check
        print("\n📊 Quick Performance Check")
        print("=" * 60)
        
        for endpoint in TEST_ENDPOINTS[:3]:  # Test first 3 endpoints
            if not endpoint.auth_required:
                tester.test_endpoint(endpoint, iterations=5)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())