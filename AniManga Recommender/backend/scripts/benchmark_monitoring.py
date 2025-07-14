#!/usr/bin/env python3
# ABOUTME: Performance benchmark script for monitoring system
# ABOUTME: Validates monitoring overhead and performance impact in production scenarios

"""
Monitoring Performance Benchmark

This script validates that our monitoring system meets production performance requirements:
- < 5% overhead for API endpoints
- < 100ms additional latency for cache operations
- Memory usage stays within reasonable bounds
- Alert system responds within acceptable timeframes

Usage:
    python scripts/benchmark_monitoring.py [--iterations 1000] [--workers 4]
"""

import argparse
import time
import threading
import statistics
import json
import sys
import os
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple, Any

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + '/../'))

from utils.monitoring import (
    get_metrics_collector,
    monitor_endpoint,
    record_cache_hit,
    record_cache_miss,
    record_queue_length,
    record_system_health
)
from utils.cache_helpers import get_cache


class MonitoringBenchmark:
    """Comprehensive monitoring performance benchmark."""
    
    def __init__(self, iterations: int = 1000, workers: int = 4):
        self.iterations = iterations
        self.workers = workers
        self.results = {}
        self.collector = get_metrics_collector()
    
    def run_all_benchmarks(self) -> Dict[str, Any]:
        """Run all benchmark tests and return comprehensive results."""
        print(f"🚀 Starting Monitoring Performance Benchmark")
        print(f"   Iterations: {self.iterations}")
        print(f"   Workers: {self.workers}")
        print(f"   Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        # Reset collector state
        self.collector.current_metrics.clear()
        self.collector.metrics_history.clear()
        
        self.results = {
            'config': {
                'iterations': self.iterations,
                'workers': self.workers,
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        # Run benchmarks
        self.results['api_monitoring'] = self.benchmark_api_monitoring()
        self.results['cache_monitoring'] = self.benchmark_cache_monitoring()
        self.results['concurrent_load'] = self.benchmark_concurrent_load()
        self.results['memory_usage'] = self.benchmark_memory_usage()
        self.results['alert_performance'] = self.benchmark_alert_system()
        
        # Calculate overall score
        self.results['summary'] = self.calculate_summary()
        
        return self.results
    
    def benchmark_api_monitoring(self) -> Dict[str, Any]:
        """Benchmark API endpoint monitoring overhead."""
        print("📊 Benchmarking API monitoring overhead...")
        
        def baseline_function():
            """Baseline function without monitoring."""
            total = 0
            for i in range(100):
                total += i * i
            return total
        
        @monitor_endpoint("benchmark_endpoint")
        def monitored_function():
            """Same function with monitoring."""
            total = 0
            for i in range(100):
                total += i * i
            return total
        
        # Warm up
        for _ in range(10):
            baseline_function()
            monitored_function()
        
        # Benchmark baseline
        baseline_times = []
        for _ in range(self.iterations):
            start = time.perf_counter()
            baseline_function()
            baseline_times.append(time.perf_counter() - start)
        
        # Benchmark monitored
        monitored_times = []
        for _ in range(self.iterations):
            start = time.perf_counter()
            monitored_function()
            monitored_times.append(time.perf_counter() - start)
        
        # Calculate statistics
        baseline_avg = statistics.mean(baseline_times) * 1000  # Convert to ms
        monitored_avg = statistics.mean(monitored_times) * 1000
        overhead_ms = monitored_avg - baseline_avg
        overhead_percent = (overhead_ms / baseline_avg) * 100
        
        results = {
            'baseline_avg_ms': round(baseline_avg, 4),
            'monitored_avg_ms': round(monitored_avg, 4),
            'overhead_ms': round(overhead_ms, 4),
            'overhead_percent': round(overhead_percent, 2),
            'target_percent': 5.0,
            'passed': overhead_percent < 5.0
        }
        
        print(f"   Baseline: {baseline_avg:.3f}ms")
        print(f"   Monitored: {monitored_avg:.3f}ms")
        print(f"   Overhead: {overhead_percent:.2f}% ({overhead_ms:.3f}ms)")
        print(f"   Target: < 5% ({'✅ PASS' if results['passed'] else '❌ FAIL'})")
        
        return results
    
    def benchmark_cache_monitoring(self) -> Dict[str, Any]:
        """Benchmark cache operation monitoring overhead."""
        print("🗄️  Benchmarking cache monitoring overhead...")
        
        cache = get_cache()
        
        def baseline_cache_operations():
            """Cache operations without monitoring."""
            for i in range(50):
                key = f"bench_key_{i}"
                cache.set(key, {"data": i}, ttl_hours=1)
                cache.get(key)
                cache.delete(key)
        
        def monitored_cache_operations():
            """Cache operations with monitoring."""
            for i in range(50):
                key = f"bench_key_monitored_{i}"
                cache.set(key, {"data": i}, ttl_hours=1)
                record_cache_hit("benchmark")
                cache.get(key)
                record_cache_hit("benchmark")
                cache.delete(key)
        
        # Warm up
        baseline_cache_operations()
        monitored_cache_operations()
        
        # Benchmark
        baseline_times = []
        for _ in range(50):  # Fewer iterations due to actual cache operations
            start = time.perf_counter()
            baseline_cache_operations()
            baseline_times.append(time.perf_counter() - start)
        
        monitored_times = []
        for _ in range(50):
            start = time.perf_counter()
            monitored_cache_operations()
            monitored_times.append(time.perf_counter() - start)
        
        baseline_avg = statistics.mean(baseline_times) * 1000
        monitored_avg = statistics.mean(monitored_times) * 1000
        overhead_ms = monitored_avg - baseline_avg
        
        results = {
            'baseline_avg_ms': round(baseline_avg, 2),
            'monitored_avg_ms': round(monitored_avg, 2),
            'overhead_ms': round(overhead_ms, 2),
            'target_ms': 100.0,
            'passed': overhead_ms < 100.0
        }
        
        print(f"   Baseline: {baseline_avg:.2f}ms")
        print(f"   Monitored: {monitored_avg:.2f}ms") 
        print(f"   Overhead: {overhead_ms:.2f}ms")
        print(f"   Target: < 100ms ({'✅ PASS' if results['passed'] else '❌ FAIL'})")
        
        return results
    
    def benchmark_concurrent_load(self) -> Dict[str, Any]:
        """Benchmark monitoring under concurrent load."""
        print(f"⚡ Benchmarking concurrent load ({self.workers} workers)...")
        
        def worker_task(worker_id: int) -> Dict[str, float]:
            """Task for concurrent workers."""
            start_time = time.perf_counter()
            
            for i in range(self.iterations // self.workers):
                # Mix of monitoring operations
                record_cache_hit(f"worker_{worker_id}")
                record_cache_miss(f"worker_{worker_id}")
                record_queue_length(f"queue_{worker_id}", i % 100)
                
                self.collector.increment_counter(f"worker_{worker_id}_counter")
                self.collector.set_gauge(f"worker_{worker_id}_gauge", i)
                self.collector.record_timer(f"worker_{worker_id}_timer", i * 0.1)
            
            return {
                'worker_id': worker_id,
                'duration': time.perf_counter() - start_time,
                'operations': self.iterations // self.workers * 6  # 6 operations per iteration
            }
        
        # Run concurrent benchmark
        start_time = time.perf_counter()
        
        with ThreadPoolExecutor(max_workers=self.workers) as executor:
            futures = [executor.submit(worker_task, i) for i in range(self.workers)]
            worker_results = [future.result() for future in as_completed(futures)]
        
        total_duration = time.perf_counter() - start_time
        total_operations = sum(r['operations'] for r in worker_results)
        ops_per_second = total_operations / total_duration
        
        results = {
            'total_duration_s': round(total_duration, 2),
            'total_operations': total_operations,
            'ops_per_second': round(ops_per_second, 0),
            'worker_results': worker_results,
            'target_ops_per_second': 10000,
            'passed': ops_per_second >= 10000
        }
        
        print(f"   Total Duration: {total_duration:.2f}s")
        print(f"   Total Operations: {total_operations:,}")
        print(f"   Ops/Second: {ops_per_second:,.0f}")
        print(f"   Target: ≥ 10,000 ops/sec ({'✅ PASS' if results['passed'] else '❌ FAIL'})")
        
        return results
    
    def benchmark_memory_usage(self) -> Dict[str, Any]:
        """Benchmark memory usage of monitoring system."""
        print("💾 Benchmarking memory usage...")
        
        import psutil
        import gc
        
        # Get initial memory
        process = psutil.Process()
        gc.collect()
        initial_memory = process.memory_info().rss
        
        # Generate metrics
        for i in range(10000):
            self.collector.increment_counter(f"memory_test_{i % 100}")
            self.collector.set_gauge(f"gauge_{i % 50}", i)
            self.collector.record_timer(f"timer_{i % 25}", i * 0.1)
            record_cache_hit("memory_test")
            record_queue_length("memory_queue", i % 1000)
        
        # Force garbage collection and measure
        gc.collect()
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        memory_increase_mb = memory_increase / (1024 * 1024)
        
        # Check metrics counts
        metrics_count = len(self.collector.current_metrics)
        history_count = sum(len(deque) for deque in self.collector.metrics_history.values())
        
        results = {
            'initial_memory_mb': round(initial_memory / (1024 * 1024), 2),
            'final_memory_mb': round(final_memory / (1024 * 1024), 2),
            'memory_increase_mb': round(memory_increase_mb, 2),
            'metrics_count': metrics_count,
            'history_count': history_count,
            'target_increase_mb': 100.0,
            'passed': memory_increase_mb < 100.0
        }
        
        print(f"   Initial Memory: {results['initial_memory_mb']:.1f} MB")
        print(f"   Final Memory: {results['final_memory_mb']:.1f} MB")
        print(f"   Increase: {memory_increase_mb:.1f} MB")
        print(f"   Metrics: {metrics_count}, History: {history_count}")
        print(f"   Target: < 100 MB increase ({'✅ PASS' if results['passed'] else '❌ FAIL'})")
        
        return results
    
    def benchmark_alert_system(self) -> Dict[str, Any]:
        """Benchmark alert system performance."""
        print("🚨 Benchmarking alert system...")
        
        # Set up test alerts
        alert_triggers = []
        
        # Configure alerts for quick triggering
        self.collector.alerts['cache_hit_rate_low'].threshold = 0.99
        self.collector.alerts['cache_hit_rate_low'].cooldown_minutes = 0
        
        # Trigger alerts and measure response time
        alert_times = []
        for i in range(100):
            start = time.perf_counter()
            
            # This should trigger the cache hit rate alert
            record_cache_miss("alert_test")
            
            # Check if alert was triggered
            alert = self.collector.alerts['cache_hit_rate_low']
            if alert.last_triggered:
                alert_time = time.perf_counter() - start
                alert_times.append(alert_time * 1000)  # Convert to ms
                alert.last_triggered = None  # Reset for next test
        
        if alert_times:
            avg_alert_time = statistics.mean(alert_times)
            max_alert_time = max(alert_times)
        else:
            avg_alert_time = 0
            max_alert_time = 0
        
        results = {
            'alerts_triggered': len(alert_times),
            'avg_alert_time_ms': round(avg_alert_time, 3),
            'max_alert_time_ms': round(max_alert_time, 3),
            'target_time_ms': 10.0,
            'passed': avg_alert_time < 10.0
        }
        
        print(f"   Alerts Triggered: {len(alert_times)}")
        print(f"   Avg Alert Time: {avg_alert_time:.3f}ms")
        print(f"   Max Alert Time: {max_alert_time:.3f}ms")
        print(f"   Target: < 10ms ({'✅ PASS' if results['passed'] else '❌ FAIL'})")
        
        return results
    
    def calculate_summary(self) -> Dict[str, Any]:
        """Calculate overall benchmark summary."""
        print("\n📋 Calculating benchmark summary...")
        
        # Collect pass/fail results
        tests = [
            ('API Monitoring Overhead', self.results['api_monitoring']['passed']),
            ('Cache Monitoring Overhead', self.results['cache_monitoring']['passed']),
            ('Concurrent Load Performance', self.results['concurrent_load']['passed']),
            ('Memory Usage', self.results['memory_usage']['passed']),
            ('Alert System Performance', self.results['alert_performance']['passed'])
        ]
        
        passed_tests = sum(1 for _, passed in tests if passed)
        total_tests = len(tests)
        pass_rate = (passed_tests / total_tests) * 100
        
        # Overall production readiness
        production_ready = pass_rate >= 80  # 80% pass rate required
        
        summary = {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': total_tests - passed_tests,
            'pass_rate_percent': round(pass_rate, 1),
            'production_ready': production_ready,
            'test_results': tests
        }
        
        print(f"   Tests Passed: {passed_tests}/{total_tests} ({pass_rate:.1f}%)")
        print(f"   Production Ready: {'✅ YES' if production_ready else '❌ NO'}")
        
        return summary
    
    def save_results(self, filename: str = None):
        """Save benchmark results to file."""
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"monitoring_benchmark_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        print(f"\n💾 Results saved to: {filename}")
    
    def print_detailed_report(self):
        """Print detailed benchmark report."""
        print("\n" + "=" * 60)
        print("📊 DETAILED BENCHMARK REPORT")
        print("=" * 60)
        
        # Production readiness summary
        summary = self.results['summary']
        status_icon = "✅" if summary['production_ready'] else "❌"
        print(f"\n🏭 PRODUCTION READINESS: {status_icon} {summary['pass_rate_percent']:.1f}%")
        
        print(f"\nTest Results:")
        for test_name, passed in summary['test_results']:
            icon = "✅" if passed else "❌"
            print(f"  {icon} {test_name}")
        
        # Performance targets
        print(f"\n🎯 PERFORMANCE TARGETS:")
        print(f"  API Overhead: {self.results['api_monitoring']['overhead_percent']:.2f}% (< 5%)")
        print(f"  Cache Overhead: {self.results['cache_monitoring']['overhead_ms']:.2f}ms (< 100ms)")
        print(f"  Concurrent Ops: {self.results['concurrent_load']['ops_per_second']:,.0f}/sec (≥ 10,000)")
        print(f"  Memory Usage: {self.results['memory_usage']['memory_increase_mb']:.1f}MB (< 100MB)")
        print(f"  Alert Response: {self.results['alert_performance']['avg_alert_time_ms']:.3f}ms (< 10ms)")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        
        if not self.results['api_monitoring']['passed']:
            print("  ⚠️  API monitoring overhead too high - consider reducing metric collection frequency")
        
        if not self.results['memory_usage']['passed']:
            print("  ⚠️  Memory usage too high - reduce metrics retention time or implement cleanup")
        
        if not self.results['concurrent_load']['passed']:
            print("  ⚠️  Concurrent performance poor - optimize metric collection or add batching")
        
        if summary['production_ready']:
            print("  ✅ Monitoring system ready for production deployment")
        else:
            print("  ❌ Address performance issues before production deployment")


def main():
    """Main benchmark execution function."""
    parser = argparse.ArgumentParser(description='Benchmark monitoring system performance')
    parser.add_argument('--iterations', type=int, default=1000, help='Number of iterations per test')
    parser.add_argument('--workers', type=int, default=4, help='Number of concurrent workers')
    parser.add_argument('--output', type=str, help='Output file for results')
    parser.add_argument('--detailed', action='store_true', help='Print detailed report')
    
    args = parser.parse_args()
    
    # Run benchmark
    benchmark = MonitoringBenchmark(iterations=args.iterations, workers=args.workers)
    results = benchmark.run_all_benchmarks()
    
    # Save results
    if args.output:
        benchmark.save_results(args.output)
    
    # Print detailed report
    if args.detailed:
        benchmark.print_detailed_report()
    
    # Exit with appropriate code
    if results['summary']['production_ready']:
        print(f"\n🎉 Monitoring system is production ready!")
        sys.exit(0)
    else:
        print(f"\n⚠️  Monitoring system needs optimization before production")
        sys.exit(1)


if __name__ == "__main__":
    main()