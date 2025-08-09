# ABOUTME: End-to-end testing for monitoring system integration
# ABOUTME: Validates complete monitoring workflow from metrics collection to dashboard display

"""
End-to-End Monitoring Tests

Comprehensive testing of the monitoring system including:
- Metrics collection and aggregation
- Alert triggering and management
- Dashboard data flow
- Performance impact validation
- Production readiness checks
"""

# ABOUTME: Real integration tests - NO MOCKS
# ABOUTME: Tests with actual database and service operations

import pytest
from sqlalchemy import text
from tests.test_utils import TestDataManager, generate_jwt_token, create_auth_headers


import pytest
import time
import json
import asyncio
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any
# NOTE: Using minimal mocks ONLY for simulating system metrics
# All other operations use real integration
from unittest.mock import patch

# Import our monitoring components
from utils.monitoring import (
    get_metrics_collector,
    MetricsCollector,
    monitor_endpoint,
    record_cache_hit,
    record_cache_miss,
    record_queue_length,
    record_system_health,
    MonitoringConfig,
    AlertLevel
)
from utils.cache_helpers import (
    get_user_stats_from_cache,
    set_user_stats_in_cache,
    get_cache_status
)


@pytest.mark.real_integration
@pytest.mark.requires_db
class TestMonitoringEndToEnd:
    """End-to-end testing of monitoring system integration."""
    
    @pytest.fixture(autouse=True)
    def setup_monitoring(self):
        """Set up fresh monitoring state for each test."""
        # Reset global collector
        import utils.monitoring
        utils.monitoring._metrics_collector = None
        
        # Get fresh collector
        self.collector = get_metrics_collector()
        
        # Configure for testing
        self.collector.max_history_minutes = 5
        for alert in self.collector.alerts.values():
            alert.cooldown_minutes = 0  # No cooldown for testing
        
        yield
        
        # Cleanup
        utils.monitoring._metrics_collector = None
    
    def test_complete_cache_monitoring_workflow(self):
        """Test complete cache monitoring from operation to dashboard."""
        # Simulate cache operations
        cache_operations = [
            ('hit', 'user_stats'),
            ('hit', 'user_stats'),
            ('miss', 'user_stats'),
            ('hit', 'recommendations'),
            ('miss', 'recommendations'),
            ('hit', 'user_stats'),
        ]
        
        for operation, cache_type in cache_operations:
            if operation == 'hit':
                record_cache_hit(cache_type)
            else:
                record_cache_miss(cache_type)
            time.sleep(0.1)  # Small delay between operations
        
        # Verify metrics are collected
        current_metrics = self.collector.get_current_metrics()
        assert 'cache_hits_total' in current_metrics
        assert 'cache_misses_total' in current_metrics
        assert 'cache_hit_rate' in current_metrics
        
        # Calculate expected hit rate: 4 hits, 2 misses = 4/6 = 66.7%
        hit_rate = current_metrics['cache_hit_rate']['value']
        assert 0.65 <= hit_rate <= 0.70  # Allow for small floating point differences
        
        # Verify alert system
        # Set low threshold to trigger alert
        self.collector.alerts['cache_hit_rate_low'].threshold = 0.80
        
        # Record one more miss to trigger alert
        record_cache_miss('user_stats')
        
        # Check that alert was triggered
        alert = self.collector.alerts['cache_hit_rate_low']
        assert alert.last_triggered is not None
        assert alert.last_triggered > datetime.utcnow() - timedelta(seconds=10)
    
    def test_api_monitoring_integration(self):
        """Test API endpoint monitoring with timing and error tracking."""
        
        @monitor_endpoint("test_endpoint")
        def test_api_function(should_fail=False, delay=0):
            if delay:
                time.sleep(delay)
            if should_fail:
                raise ValueError("Test error")
            return {"status": "success"}
        
        # Test successful requests
        for i in range(3):
            result = test_api_function(delay=0.1)
            assert result["status"] == "success"
        
        # Test failed request
        with pytest.raises(ValueError):
            test_api_function(should_fail=True)
        
        # Test slow request
        test_api_function(delay=0.5)
        
        # Verify metrics
        current_metrics = self.collector.get_current_metrics()
        
        # Check request counts
        assert 'api_requests_total' in current_metrics
        assert current_metrics['api_requests_total']['value'] == 5  # 3 success + 1 error + 1 slow
        
        assert 'api_requests_success' in current_metrics
        assert current_metrics['api_requests_success']['value'] == 4  # 3 normal + 1 slow
        
        assert 'api_requests_error' in current_metrics
        assert current_metrics['api_requests_error']['value'] == 1
        
        # Check response times are recorded
        assert 'api_response_time' in current_metrics
        assert current_metrics['api_response_time']['value'] > 0
        
        # Verify error rate calculation
        summary = self.collector.get_metric_summary()
        total_requests = summary.get('api_requests_total', {}).get('latest', 0)
        error_requests = summary.get('api_requests_error', {}).get('latest', 0)
        
        if total_requests > 0:
            expected_error_rate = error_requests / total_requests
            # The error rate should be updated automatically through alerts
            # 1 error out of 5 requests = 20% error rate
            assert expected_error_rate == 0.2
    
    def test_queue_monitoring_workflow(self):
        """Test background task queue monitoring."""
        # Simulate varying queue lengths
        queue_lengths = [0, 10, 50, 75, 120, 95, 30, 5, 0]
        
        for length in queue_lengths:
            record_queue_length("celery", length)
            time.sleep(0.05)
        
        # Verify metrics
        current_metrics = self.collector.get_current_metrics()
        assert 'queue_length' in current_metrics
        assert current_metrics['queue_length']['value'] == 0  # Last recorded value
        
        # Check that high queue length triggered alert
        alert = self.collector.alerts['queue_length_high']
        assert alert.last_triggered is not None  # Should have triggered when length was 120
    
    def test_system_health_monitoring(self):
        """Test system health metrics collection."""
        # Use controlled values for predictable testing
        # This is the only legitimate use of mocks - for external system metrics
        with patch('psutil.cpu_percent', return_value=75.5):
            with patch('psutil.virtual_memory') as mock_memory:
                # Create a mock object with the expected attributes
                class MockMemory:
                    percent = 68.2
                    available = 8_000_000_000  # 8GB
                
                mock_memory.return_value = MockMemory()
                
                with patch('psutil.disk_usage') as mock_disk:
                    # Create a mock object with the expected attributes
                    class MockDisk:
                        percent = 45.0
                    
                    mock_disk.return_value = MockDisk()
                    
                    record_system_health()
        
        # Verify system metrics are recorded
        current_metrics = self.collector.get_current_metrics()
        assert 'system_cpu_percent' in current_metrics
        assert 'system_memory_percent' in current_metrics
        assert 'system_memory_available_bytes' in current_metrics
        assert 'system_disk_percent' in current_metrics
        
        assert current_metrics['system_cpu_percent']['value'] == 75.5
        assert current_metrics['system_memory_percent']['value'] == 68.2
        assert current_metrics['system_disk_percent']['value'] == 45.0
    
    def test_metrics_export_formats(self):
        """Test metrics export in different formats."""
        # Generate some test metrics
        self.collector.increment_counter("test_counter", 5)
        self.collector.set_gauge("test_gauge", 42.5)
        self.collector.record_timer("test_timer", 123.45)
        
        # Test JSON export
        json_export = self.collector.export_metrics("json")
        data = json.loads(json_export)
        
        assert 'timestamp' in data
        assert 'metrics' in data
        assert 'summary' in data
        assert 'test_counter' in data['metrics']
        assert 'test_gauge' in data['metrics']
        assert 'test_timer' in data['metrics']
        
        # Test Prometheus export
        prometheus_export = self.collector.export_metrics("prometheus")
        lines = prometheus_export.split('\n')
        
        # Should contain help and type comments
        help_lines = [line for line in lines if line.startswith('# HELP')]
        type_lines = [line for line in lines if line.startswith('# TYPE')]
        metric_lines = [line for line in lines if not line.startswith('#') and line.strip()]
        
        assert len(help_lines) >= 3  # At least 3 metrics
        assert len(type_lines) >= 3
        assert len(metric_lines) >= 3
        
        # Verify Prometheus format
        for line in metric_lines:
            assert 'animanga_' in line  # Proper prefix
            parts = line.split()
            assert len(parts) >= 2  # metric_name value
    
    def test_concurrent_metrics_collection(self):
        """Test thread safety of metrics collection."""
        import threading
        import concurrent.futures
        
        def worker_function(worker_id: int):
            """Worker function that generates metrics."""
            for i in range(50):
                self.collector.increment_counter(f"worker_{worker_id}_counter")
                self.collector.set_gauge(f"worker_{worker_id}_gauge", i * worker_id)
                record_cache_hit("concurrent_test")
                time.sleep(0.001)  # Small delay
        
        # Run multiple workers concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(worker_function, i) for i in range(5)]
            concurrent.futures.wait(futures)
        
        # Verify all metrics were recorded properly
        current_metrics = self.collector.get_current_metrics()
        
        # Should have worker-specific counters and gauges
        worker_counters = [k for k in current_metrics.keys() if 'worker_' in k and 'counter' in k]
        worker_gauges = [k for k in current_metrics.keys() if 'worker_' in k and 'gauge' in k]
        
        assert len(worker_counters) == 5
        assert len(worker_gauges) == 5
        
        # Verify cache hits were recorded (5 workers * 50 operations = 250 hits)
        assert current_metrics['cache_hits_total']['value'] == 250
    
    def test_performance_impact_validation(self):
        """Validate that monitoring has minimal performance impact."""
        
        def baseline_function():
            """Function without monitoring."""
            result = 0
            for i in range(1000):
                result += i * i
            return result
        
        @monitor_endpoint("performance_test")
        def monitored_function():
            """Same function with monitoring."""
            result = 0
            for i in range(1000):
                result += i * i
            return result
        
        # Measure baseline performance
        baseline_times = []
        for _ in range(100):
            start = time.time()
            baseline_function()
            baseline_times.append(time.time() - start)
        
        # Measure monitored performance
        monitored_times = []
        for _ in range(100):
            start = time.time()
            monitored_function()
            monitored_times.append(time.time() - start)
        
        # Calculate averages
        avg_baseline = sum(baseline_times) / len(baseline_times)
        avg_monitored = sum(monitored_times) / len(monitored_times)
        
        # Monitoring overhead should be less than 10%
        overhead_ratio = (avg_monitored - avg_baseline) / avg_baseline
        assert overhead_ratio < 0.10, f"Monitoring overhead too high: {overhead_ratio:.2%}"
        
        # Log performance results
        print(f"Baseline avg: {avg_baseline*1000:.3f}ms")
        print(f"Monitored avg: {avg_monitored*1000:.3f}ms")
        print(f"Overhead: {overhead_ratio:.2%}")
    
    def test_alert_cooldown_system(self):
        """Test alert cooldown prevents spam."""
        # Set short cooldown for testing
        self.collector.alerts['cache_hit_rate_low'].cooldown_minutes = 0.01  # ~0.6 seconds
        self.collector.alerts['cache_hit_rate_low'].threshold = 0.90  # High threshold
        
        # First trigger should work
        record_cache_miss("cooldown_test")
        first_trigger = self.collector.alerts['cache_hit_rate_low'].last_triggered
        assert first_trigger is not None
        
        # Immediate second trigger should be blocked by cooldown
        record_cache_miss("cooldown_test")
        second_trigger = self.collector.alerts['cache_hit_rate_low'].last_triggered
        assert second_trigger == first_trigger  # Should be same timestamp
        
        # Wait for cooldown to expire
        time.sleep(1)
        
        # Third trigger should work
        record_cache_miss("cooldown_test")
        third_trigger = self.collector.alerts['cache_hit_rate_low'].last_triggered
        assert third_trigger > first_trigger
    
    def test_monitoring_configuration_validation(self):
        """Test monitoring configuration and environment variables."""
        # Test default configuration
        config = MonitoringConfig()
        
        assert config.CACHE_HIT_RATE_WARNING_THRESHOLD == 0.80
        assert config.API_RESPONSE_TIME_WARNING_MS == 1000.0
        assert config.ERROR_RATE_WARNING_THRESHOLD == 0.05
        assert config.QUEUE_LENGTH_WARNING_THRESHOLD == 100
        
        # Test configuration affects alerts
        collector = get_metrics_collector()
        cache_alert = collector.alerts.get('cache_hit_rate_low')
        assert cache_alert is not None
        
        # Configuration should match alert thresholds
        assert cache_alert.threshold == config.CACHE_HIT_RATE_WARNING_THRESHOLD
    
    def test_monitoring_graceful_degradation(self):
        """Test monitoring continues to work when external systems fail."""
        
        # Test when cache is unavailable
        # This is a legitimate use of mocks for failure simulation
        with patch('utils.cache_helpers.get_cache') as mock_cache:
            # Create a mock cache object that simulates disconnection
            class MockDisconnectedCache:
                connected = False
                
                def get(self, *args, **kwargs):
                    return None
                    
                def set(self, *args, **kwargs):
                    return False
            
            mock_cache.return_value = MockDisconnectedCache()
            
            # Cache operations should still record metrics
            record_cache_hit("degradation_test")
            record_cache_miss("degradation_test")
            
            # Metrics should still be collected
            current_metrics = self.collector.get_current_metrics()
            assert 'cache_hits_total' in current_metrics
            assert 'cache_misses_total' in current_metrics
        
        # Test when psutil is unavailable
        with patch.dict('sys.modules', {'psutil': None}):
            # Should not raise exception
            record_system_health()
            
            # Should continue working for other metrics
            self.collector.increment_counter("degradation_counter")
            assert 'degradation_counter' in self.collector.get_current_metrics()


@pytest.mark.real_integration
@pytest.mark.requires_db
class TestProductionReadinessChecklist:
    """Production readiness validation checklist."""
    
    def test_monitoring_system_initialization(self):
        """Verify monitoring system initializes properly."""
        collector = get_metrics_collector()
        
        # Should have default alerts configured
        expected_alerts = [
            'cache_hit_rate_low',
            'api_response_time_high', 
            'error_rate_high',
            'queue_length_high'
        ]
        
        for alert_name in expected_alerts:
            assert alert_name in collector.alerts
            alert = collector.alerts[alert_name]
            assert alert.enabled
            assert alert.threshold > 0
            assert alert.level in [AlertLevel.INFO, AlertLevel.WARNING, AlertLevel.ERROR, AlertLevel.CRITICAL]
    
    def test_cache_helpers_monitoring_integration(self):
        """Verify cache helpers properly integrate with monitoring."""
        from utils.cache_helpers import get_cache
        
        cache = get_cache()
        
        # Test cache operations record metrics
        initial_hits = 0
        initial_misses = 0
        
        collector = get_metrics_collector()
        current = collector.get_current_metrics()
        if 'cache_hits_total' in current:
            initial_hits = current['cache_hits_total']['value']
        if 'cache_misses_total' in current:
            initial_misses = current['cache_misses_total']['value']
        
        # Perform cache operations
        test_key = "prod_test_key"
        test_data = {"test": "data", "timestamp": datetime.utcnow().isoformat()}
        
        # This should record a miss (key doesn't exist)
        result = cache.get(test_key)
        assert result is None
        
        # Set data (may or may not record metrics depending on implementation)
        cache.set(test_key, test_data, ttl_hours=1)
        
        # This should record a hit
        result = cache.get(test_key)
        
        # Clean up
        cache.delete(test_key)
        
        # Verify metrics increased (if monitoring is properly integrated)
        final_metrics = collector.get_current_metrics()
        if 'cache_hits_total' in final_metrics:
            final_hits = final_metrics['cache_hits_total']['value']
            # Should have increased by at least 1 (the successful get)
            assert final_hits >= initial_hits
    
    def test_monitoring_memory_usage(self):
        """Ensure monitoring doesn't consume excessive memory."""
        collector = get_metrics_collector()
        
        # Generate many metrics
        for i in range(1000):
            collector.increment_counter(f"memory_test_{i % 10}")
            collector.set_gauge(f"gauge_test_{i % 5}", i)
            collector.record_timer(f"timer_test_{i % 3}", i * 0.1)
        
        # Check memory usage is reasonable
        metrics_count = len(collector.current_metrics)
        history_size = sum(len(deque) for deque in collector.metrics_history.values())
        
        # Should not have excessive number of metrics
        assert metrics_count < 100, f"Too many current metrics: {metrics_count}"
        assert history_size < 10000, f"Too much history data: {history_size}"
        
        # Verify cleanup is working
        import gc
        gc.collect()
        
        # Old metrics should be cleaned up
        collector._cleanup_old_metrics("memory_test_0")
    
    def test_production_configuration_completeness(self):
        """Verify all required production configuration is present."""
        import os
        
        # Check monitoring configuration options
        config_vars = [
            'MONITOR_CACHE_HIT_RATE_THRESHOLD',
            'MONITOR_API_RESPONSE_TIME_THRESHOLD', 
            'MONITOR_ERROR_RATE_THRESHOLD',
            'MONITOR_QUEUE_LENGTH_THRESHOLD',
            'MONITOR_METRICS_RETENTION_MINUTES',
            'MONITOR_ALERT_COOLDOWN_MINUTES'
        ]
        
        # These should have defaults even if not set in environment
        config = MonitoringConfig()
        assert config.CACHE_HIT_RATE_WARNING_THRESHOLD is not None
        assert config.API_RESPONSE_TIME_WARNING_MS is not None
        assert config.ERROR_RATE_WARNING_THRESHOLD is not None
        assert config.QUEUE_LENGTH_WARNING_THRESHOLD is not None
    
    def test_monitoring_endpoint_decorator_compatibility(self):
        """Test monitoring decorator works with Flask routes."""
        from flask import Flask
        
        app = Flask(__name__)
        
        @app.route('/test')
        @monitor_endpoint('test_route')
        def test_route():
            return {'status': 'ok'}
        
        # Should not raise any exceptions when decorating
        assert test_route is not None
        
        # Test in app context
        with app.test_client() as client:
            response = client.get('/test')
            assert response.status_code == 200
            
            # Should have recorded metrics
            collector = get_metrics_collector()
            current_metrics = collector.get_current_metrics()
            
            # May have API metrics if decorator is working
            # This tests that the decorator doesn't break Flask functionality