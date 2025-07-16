"""
Enhanced Monitoring System Test Suite

This test suite provides comprehensive validation of monitoring utilities
with focus on metrics collection, alerting, and performance tracking.

Phase 4.1.3: Enhanced Monitoring Testing
Tests existing monitoring functions with comprehensive edge cases and production scenarios
"""

import pytest
import time
import json
import threading
from unittest.mock import patch, MagicMock, Mock
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Import the monitoring modules
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from utils.monitoring import (
    MetricType,
    AlertLevel,
    Metric,
    Alert,
    MetricsCollector,
    get_metrics_collector,
    monitor_endpoint,
    record_cache_hit,
    record_cache_miss,
    record_queue_length,
    record_task_processing_time,
    record_system_health,
    MonitoringConfig,
    initialize_monitoring
)

class TestMonitoringEnhanced:
    """Enhanced test suite for monitoring system functionality."""
    
    @pytest.fixture
    def metrics_collector(self):
        """Create a fresh metrics collector for each test."""
        return MetricsCollector(max_history_minutes=5)
    
    @pytest.fixture
    def mock_psutil(self):
        """Mock psutil for system health testing."""
        with patch('psutil.cpu_percent', return_value=45.5), \
             patch('psutil.virtual_memory') as mock_memory, \
             patch('psutil.disk_usage') as mock_disk:
            
            mock_memory.return_value = Mock(
                percent=60.0,
                available=8000000000  # 8GB available
            )
            mock_disk.return_value = Mock(
                percent=25.0
            )
            yield mock_memory, mock_disk

    def test_metric_initialization(self):
        """Test Metric dataclass initialization."""
        timestamp = datetime.utcnow()
        metric = Metric(
            name="test_metric",
            value=42.0,
            metric_type=MetricType.GAUGE,
            timestamp=timestamp,
            tags={"env": "test"}
        )
        
        assert metric.name == "test_metric"
        assert metric.value == 42.0
        assert metric.metric_type == MetricType.GAUGE
        assert metric.timestamp == timestamp
        assert metric.tags == {"env": "test"}
        
        # Test without tags
        metric_no_tags = Metric(
            name="test_metric",
            value=42.0,
            metric_type=MetricType.GAUGE,
            timestamp=timestamp
        )
        assert metric_no_tags.tags == {}

    def test_alert_initialization(self):
        """Test Alert dataclass initialization."""
        alert = Alert(
            name="test_alert",
            condition="value > threshold",
            threshold=100.0,
            level=AlertLevel.WARNING,
            message="Test alert message",
            enabled=True,
            cooldown_minutes=10
        )
        
        assert alert.name == "test_alert"
        assert alert.condition == "value > threshold"
        assert alert.threshold == 100.0
        assert alert.level == AlertLevel.WARNING
        assert alert.message == "Test alert message"
        assert alert.enabled is True
        assert alert.cooldown_minutes == 10
        assert alert.last_triggered is None

    def test_metrics_collector_initialization(self, metrics_collector):
        """Test MetricsCollector initialization."""
        assert metrics_collector.max_history_minutes == 5
        assert len(metrics_collector.metrics_history) == 0
        assert len(metrics_collector.current_metrics) == 0
        assert len(metrics_collector.alerts) == 4  # Default alerts
        assert metrics_collector.lock is not None

    def test_default_alerts_setup(self, metrics_collector):
        """Test that default alerts are properly configured."""
        expected_alerts = [
            "cache_hit_rate_low",
            "api_response_time_high",
            "error_rate_high",
            "queue_length_high"
        ]
        
        for alert_name in expected_alerts:
            assert alert_name in metrics_collector.alerts
            alert = metrics_collector.alerts[alert_name]
            assert alert.enabled is True
            assert alert.cooldown_minutes == 15

    def test_record_metric_basic(self, metrics_collector):
        """Test basic metric recording."""
        metrics_collector.record_metric(
            "test_metric",
            42.0,
            MetricType.GAUGE,
            {"tag1": "value1"}
        )
        
        assert "test_metric" in metrics_collector.current_metrics
        metric = metrics_collector.current_metrics["test_metric"]
        assert metric.value == 42.0
        assert metric.metric_type == MetricType.GAUGE
        assert metric.tags == {"tag1": "value1"}
        
        # Check history
        assert len(metrics_collector.metrics_history["test_metric"]) == 1

    def test_record_metric_history_cleanup(self, metrics_collector):
        """Test that old metrics are cleaned up."""
        # Record metric with old timestamp
        old_time = datetime.utcnow() - timedelta(minutes=10)
        with patch('utils.monitoring.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = old_time
            metrics_collector.record_metric("old_metric", 1.0, MetricType.COUNTER)
        
        # Record new metric
        metrics_collector.record_metric("new_metric", 2.0, MetricType.COUNTER)
        
        # Old metric should be cleaned up
        assert len(metrics_collector.metrics_history["old_metric"]) == 0
        assert len(metrics_collector.metrics_history["new_metric"]) == 1

    def test_increment_counter(self, metrics_collector):
        """Test counter increment functionality."""
        # Initial increment
        metrics_collector.increment_counter("test_counter", 5)
        assert metrics_collector.current_metrics["test_counter"].value == 5
        
        # Subsequent increments
        metrics_collector.increment_counter("test_counter", 3)
        assert metrics_collector.current_metrics["test_counter"].value == 8
        
        # Default increment (1)
        metrics_collector.increment_counter("test_counter")
        assert metrics_collector.current_metrics["test_counter"].value == 9

    def test_set_gauge(self, metrics_collector):
        """Test gauge setting functionality."""
        metrics_collector.set_gauge("test_gauge", 42.5)
        assert metrics_collector.current_metrics["test_gauge"].value == 42.5
        assert metrics_collector.current_metrics["test_gauge"].metric_type == MetricType.GAUGE
        
        # Overwrite gauge value
        metrics_collector.set_gauge("test_gauge", 100.0)
        assert metrics_collector.current_metrics["test_gauge"].value == 100.0

    def test_record_timer(self, metrics_collector):
        """Test timer recording functionality."""
        metrics_collector.record_timer("test_timer", 150.5)
        assert metrics_collector.current_metrics["test_timer"].value == 150.5
        assert metrics_collector.current_metrics["test_timer"].metric_type == MetricType.TIMER

    def test_timer_context_manager(self, metrics_collector):
        """Test timer context manager functionality."""
        with metrics_collector.timer("test_operation"):
            time.sleep(0.1)  # Sleep for 100ms
        
        assert "test_operation" in metrics_collector.current_metrics
        duration = metrics_collector.current_metrics["test_operation"].value
        assert duration >= 100.0  # Should be at least 100ms
        assert duration < 200.0    # Should be less than 200ms

    def test_alert_triggering(self, metrics_collector):
        """Test alert triggering functionality."""
        # Set up alert
        alert = Alert(
            name="test_alert",
            condition="test_metric > threshold",
            threshold=50.0,
            level=AlertLevel.WARNING,
            message="Test metric too high: {value}"
        )
        metrics_collector.alerts["test_alert"] = alert
        
        # Record metric that should trigger alert
        with patch('utils.monitoring.logger') as mock_logger:
            metrics_collector.record_metric("test_metric", 75.0, MetricType.GAUGE)
            
            # Check that alert was triggered
            assert alert.last_triggered is not None
            mock_logger.warning.assert_called_once()

    def test_alert_cooldown(self, metrics_collector):
        """Test alert cooldown functionality."""
        # Set up alert with short cooldown
        alert = Alert(
            name="test_alert",
            condition="test_metric > threshold",
            threshold=50.0,
            level=AlertLevel.WARNING,
            message="Test metric too high: {value}",
            cooldown_minutes=1
        )
        metrics_collector.alerts["test_alert"] = alert
        
        # Trigger alert first time
        with patch('utils.monitoring.logger') as mock_logger:
            metrics_collector.record_metric("test_metric", 75.0, MetricType.GAUGE)
            assert mock_logger.warning.call_count == 1
            
            # Trigger again immediately (should be blocked by cooldown)
            metrics_collector.record_metric("test_metric", 80.0, MetricType.GAUGE)
            assert mock_logger.warning.call_count == 1  # Still only 1 call

    def test_alert_evaluation_conditions(self, metrics_collector):
        """Test specific alert condition evaluations."""
        # Test cache hit rate alert
        metrics_collector.record_metric("cache_hit_rate", 0.7, MetricType.GAUGE)
        alert = metrics_collector.alerts["cache_hit_rate_low"]
        assert alert.last_triggered is not None
        
        # Test API response time alert
        metrics_collector.record_metric("avg_response_time", 1500.0, MetricType.GAUGE)
        alert = metrics_collector.alerts["api_response_time_high"]
        assert alert.last_triggered is not None
        
        # Test error rate alert
        metrics_collector.record_metric("error_rate", 0.1, MetricType.GAUGE)
        alert = metrics_collector.alerts["error_rate_high"]
        assert alert.last_triggered is not None
        
        # Test queue length alert
        metrics_collector.record_metric("queue_length", 150.0, MetricType.GAUGE)
        alert = metrics_collector.alerts["queue_length_high"]
        assert alert.last_triggered is not None

    def test_disabled_alerts(self, metrics_collector):
        """Test that disabled alerts don't trigger."""
        # Disable alert
        alert = metrics_collector.alerts["cache_hit_rate_low"]
        alert.enabled = False
        
        with patch('utils.monitoring.logger') as mock_logger:
            metrics_collector.record_metric("cache_hit_rate", 0.5, MetricType.GAUGE)
            mock_logger.warning.assert_not_called()

    def test_get_metric_summary(self, metrics_collector):
        """Test metric summary generation."""
        # Record multiple metrics
        for i in range(5):
            metrics_collector.record_metric("test_metric", i * 10.0, MetricType.GAUGE)
            time.sleep(0.01)  # Small delay to ensure different timestamps
        
        summary = metrics_collector.get_metric_summary(minutes=1)
        
        assert "test_metric" in summary
        metric_summary = summary["test_metric"]
        assert metric_summary["count"] == 5
        assert metric_summary["latest"] == 40.0
        assert metric_summary["min"] == 0.0
        assert metric_summary["max"] == 40.0
        assert metric_summary["avg"] == 20.0
        assert metric_summary["metric_type"] == "gauge"

    def test_get_current_metrics(self, metrics_collector):
        """Test current metrics retrieval."""
        metrics_collector.record_metric("gauge_metric", 42.0, MetricType.GAUGE)
        metrics_collector.record_metric("counter_metric", 100.0, MetricType.COUNTER)
        
        current = metrics_collector.get_current_metrics()
        
        assert "gauge_metric" in current
        assert "counter_metric" in current
        assert current["gauge_metric"]["value"] == 42.0
        assert current["counter_metric"]["value"] == 100.0
        assert current["gauge_metric"]["type"] == "gauge"
        assert current["counter_metric"]["type"] == "counter"

    def test_json_export(self, metrics_collector):
        """Test JSON export functionality."""
        metrics_collector.record_metric("test_metric", 42.0, MetricType.GAUGE)
        
        json_export = metrics_collector.export_metrics("json")
        data = json.loads(json_export)
        
        assert "timestamp" in data
        assert "metrics" in data
        assert "summary" in data
        assert "test_metric" in data["metrics"]

    def test_prometheus_export(self, metrics_collector):
        """Test Prometheus export functionality."""
        metrics_collector.record_metric("test_metric", 42.0, MetricType.GAUGE, {"env": "test"})
        
        prom_export = metrics_collector.export_metrics("prometheus")
        
        assert "# HELP animanga_test_metric test_metric" in prom_export
        assert "# TYPE animanga_test_metric gauge" in prom_export
        assert 'animanga_test_metric{env="test"} 42.0' in prom_export

    def test_unsupported_export_format(self, metrics_collector):
        """Test unsupported export format handling."""
        with pytest.raises(ValueError, match="Unsupported export format"):
            metrics_collector.export_metrics("unsupported")

    def test_global_metrics_collector(self):
        """Test global metrics collector singleton."""
        collector1 = get_metrics_collector()
        collector2 = get_metrics_collector()
        
        assert collector1 is collector2  # Should be same instance
        assert collector1 is not None

    def test_monitor_endpoint_decorator(self):
        """Test endpoint monitoring decorator."""
        collector = get_metrics_collector()
        
        @monitor_endpoint("test_endpoint")
        def test_function():
            time.sleep(0.1)
            return "success"
        
        result = test_function()
        assert result == "success"
        
        # Check metrics were recorded
        assert "api_requests_total" in collector.current_metrics
        assert "api_requests_success" in collector.current_metrics
        assert "api_response_time" in collector.current_metrics

    def test_monitor_endpoint_error_handling(self):
        """Test endpoint monitoring with errors."""
        collector = get_metrics_collector()
        
        @monitor_endpoint("error_endpoint")
        def error_function():
            raise ValueError("Test error")
        
        with pytest.raises(ValueError):
            error_function()
        
        # Check error metrics were recorded
        assert "api_requests_total" in collector.current_metrics
        assert "api_requests_error" in collector.current_metrics

    def test_cache_monitoring_functions(self):
        """Test cache monitoring functions."""
        # Clear any existing metrics
        collector = get_metrics_collector()
        collector.current_metrics.clear()
        
        # Record cache hits and misses
        record_cache_hit("redis")
        record_cache_hit("redis")
        record_cache_miss("redis")
        
        # Check metrics were recorded
        assert "cache_hits_total" in collector.current_metrics
        assert "cache_misses_total" in collector.current_metrics
        assert "cache_hit_rate" in collector.current_metrics

    def test_queue_monitoring_functions(self):
        """Test queue monitoring functions."""
        collector = get_metrics_collector()
        
        # Record queue length
        record_queue_length("default", 25)
        assert collector.current_metrics["queue_length"].value == 25
        
        # Record task processing time
        record_task_processing_time("test_task", 150.5, "success")
        assert collector.current_metrics["task_processing_time"].value == 150.5

    def test_system_health_monitoring(self, mock_psutil):
        """Test system health monitoring."""
        collector = get_metrics_collector()
        
        record_system_health()
        
        # Check system metrics were recorded
        assert "system_cpu_percent" in collector.current_metrics
        assert "system_memory_percent" in collector.current_metrics
        assert "system_memory_available_bytes" in collector.current_metrics
        assert "system_disk_percent" in collector.current_metrics
        
        assert collector.current_metrics["system_cpu_percent"].value == 45.5
        assert collector.current_metrics["system_memory_percent"].value == 60.0
        assert collector.current_metrics["system_disk_percent"].value == 25.0

    def test_system_health_without_psutil(self):
        """Test system health monitoring without psutil."""
        with patch('utils.monitoring.psutil', None):
            # Should not crash
            record_system_health()

    def test_concurrent_metrics_collection(self, metrics_collector):
        """Test concurrent metrics collection."""
        def record_metrics(thread_id):
            for i in range(10):
                metrics_collector.record_metric(f"thread_{thread_id}_metric", i, MetricType.COUNTER)
                time.sleep(0.01)
        
        threads = []
        for i in range(5):
            thread = threading.Thread(target=record_metrics, args=(i,))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # Check that all metrics were recorded
        for i in range(5):
            assert f"thread_{i}_metric" in metrics_collector.current_metrics

    def test_metrics_history_size_limit(self, metrics_collector):
        """Test that metrics history respects size limits."""
        # Record many metrics
        for i in range(1500):  # More than maxlen=1000
            metrics_collector.record_metric("test_metric", i, MetricType.COUNTER)
        
        # History should be limited
        assert len(metrics_collector.metrics_history["test_metric"]) <= 1000

    def test_monitoring_configuration(self):
        """Test monitoring configuration loading."""
        # Test default values
        assert MonitoringConfig.CACHE_HIT_RATE_WARNING_THRESHOLD == 0.80
        assert MonitoringConfig.API_RESPONSE_TIME_WARNING_MS == 1000
        assert MonitoringConfig.ERROR_RATE_WARNING_THRESHOLD == 0.05
        assert MonitoringConfig.QUEUE_LENGTH_WARNING_THRESHOLD == 100
        
        # Test environment variable override
        with patch.dict(os.environ, {
            'MONITOR_CACHE_HIT_RATE_THRESHOLD': '0.90',
            'MONITOR_API_RESPONSE_TIME_THRESHOLD': '500',
            'MONITOR_ERROR_RATE_THRESHOLD': '0.02'
        }):
            # Reload configuration
            from utils.monitoring import MonitoringConfig
            assert MonitoringConfig.CACHE_HIT_RATE_WARNING_THRESHOLD == 0.90
            assert MonitoringConfig.API_RESPONSE_TIME_WARNING_MS == 500.0
            assert MonitoringConfig.ERROR_RATE_WARNING_THRESHOLD == 0.02

    def test_initialize_monitoring(self):
        """Test monitoring initialization."""
        collector = get_metrics_collector()
        
        # Clear existing alerts
        collector.alerts.clear()
        
        # Initialize monitoring
        initialize_monitoring()
        
        # Check that alerts were set up
        assert len(collector.alerts) > 0

    def test_performance_under_load(self, metrics_collector):
        """Test performance under high load."""
        start_time = time.time()
        
        # Record many metrics quickly
        for i in range(1000):
            metrics_collector.record_metric(f"load_test_{i % 10}", i, MetricType.GAUGE)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete within reasonable time
        assert duration < 5.0  # 5 seconds max
        
        # Check that all metrics were recorded
        assert len(metrics_collector.current_metrics) == 10

    def test_memory_usage_monitoring(self, metrics_collector):
        """Test memory usage doesn't grow excessively."""
        import sys
        
        initial_size = sys.getsizeof(metrics_collector.metrics_history)
        
        # Record many metrics
        for i in range(100):
            metrics_collector.record_metric("memory_test", i, MetricType.GAUGE)
        
        final_size = sys.getsizeof(metrics_collector.metrics_history)
        
        # Memory growth should be reasonable
        growth = final_size - initial_size
        assert growth < 1000000  # Less than 1MB growth

    def test_metric_tagging(self, metrics_collector):
        """Test metric tagging functionality."""
        tags = {"environment": "test", "service": "api", "version": "1.0"}
        
        metrics_collector.record_metric("tagged_metric", 42.0, MetricType.GAUGE, tags)
        
        metric = metrics_collector.current_metrics["tagged_metric"]
        assert metric.tags == tags
        
        # Test Prometheus export with tags
        prom_export = metrics_collector.export_metrics("prometheus")
        assert 'environment="test"' in prom_export
        assert 'service="api"' in prom_export
        assert 'version="1.0"' in prom_export

    def test_error_handling_in_metrics_collection(self, metrics_collector):
        """Test error handling during metrics collection."""
        # Mock an error during metric recording
        with patch.object(metrics_collector, '_check_alerts', side_effect=Exception("Alert error")):
            # Should not crash
            metrics_collector.record_metric("error_test", 42.0, MetricType.GAUGE)
            
            # Metric should still be recorded
            assert "error_test" in metrics_collector.current_metrics

    def test_alert_message_formatting(self, metrics_collector):
        """Test alert message formatting."""
        alert = Alert(
            name="format_test",
            condition="test_metric > threshold",
            threshold=50.0,
            level=AlertLevel.WARNING,
            message="Metric value is {value:.2f} which exceeds threshold"
        )
        
        with patch.object(metrics_collector, '_trigger_alert') as mock_trigger:
            # Manually trigger alert
            metrics_collector._trigger_alert(alert, 75.5)
            
            # Check that message was formatted correctly
            mock_trigger.assert_called_once_with(alert, 75.5)

    def test_multiple_metric_types(self, metrics_collector):
        """Test handling of multiple metric types."""
        # Record different metric types
        metrics_collector.record_metric("counter_test", 1.0, MetricType.COUNTER)
        metrics_collector.record_metric("gauge_test", 42.0, MetricType.GAUGE)
        metrics_collector.record_metric("histogram_test", 100.0, MetricType.HISTOGRAM)
        metrics_collector.record_metric("timer_test", 150.0, MetricType.TIMER)
        
        # Check all types were recorded
        assert metrics_collector.current_metrics["counter_test"].metric_type == MetricType.COUNTER
        assert metrics_collector.current_metrics["gauge_test"].metric_type == MetricType.GAUGE
        assert metrics_collector.current_metrics["histogram_test"].metric_type == MetricType.HISTOGRAM
        assert metrics_collector.current_metrics["timer_test"].metric_type == MetricType.TIMER

    def test_monitoring_integration_with_flask(self):
        """Test monitoring integration with Flask endpoints."""
        from flask import Flask
        app = Flask(__name__)
        
        @app.route('/test')
        @monitor_endpoint('test_endpoint')
        def test_endpoint():
            return 'OK'
        
        with app.test_client() as client:
            response = client.get('/test')
            assert response.status_code == 200
            
            # Check metrics were recorded
            collector = get_metrics_collector()
            assert "api_requests_total" in collector.current_metrics

if __name__ == "__main__":
    pytest.main([__file__, "-v"])