# ABOUTME: Production monitoring infrastructure for cache performance and system metrics
# ABOUTME: Provides real-time metrics collection, performance tracking, and alerting capabilities

"""
Monitoring Infrastructure for AniManga Recommender

This module provides comprehensive monitoring capabilities for:
- Cache hit/miss rates and performance metrics
- API response times and request volumes
- Background task queue lengths and processing times
- System health and error rates
- Performance degradation detection

Key Features:
    - Real-time metrics collection with minimal overhead
    - Configurable alerting thresholds
    - Metrics export for external monitoring systems
    - Historical data tracking and analysis
    - Production-ready performance monitoring
"""

import os
import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from collections import defaultdict, deque
from contextlib import contextmanager
from functools import wraps
import threading
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logging
logger = logging.getLogger(__name__)

class MetricType(Enum):
    """Types of metrics that can be collected."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"

class AlertLevel(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class Metric:
    """Individual metric data point."""
    name: str
    value: float
    metric_type: MetricType
    timestamp: datetime
    tags: Dict[str, str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = {}

@dataclass
class Alert:
    """Alert configuration and status."""
    name: str
    condition: str
    threshold: float
    level: AlertLevel
    message: str
    enabled: bool = True
    last_triggered: Optional[datetime] = None
    cooldown_minutes: int = 15

class MetricsCollector:
    """
    Production-ready metrics collection system.
    
    Collects and aggregates metrics with minimal performance overhead.
    Thread-safe for concurrent access from multiple request handlers.
    """
    
    def __init__(self, max_history_minutes: int = 60):
        """
        Initialize metrics collector.
        
        Args:
            max_history_minutes: How long to keep metric history in memory
        """
        self.max_history_minutes = max_history_minutes
        self.metrics_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.current_metrics: Dict[str, Metric] = {}
        self.alerts: Dict[str, Alert] = {}
        self.lock = threading.RLock()
        
        # Performance counters
        self.request_counters = defaultdict(int)
        self.response_times = defaultdict(list)
        self.error_counters = defaultdict(int)
        
        # Initialize default alerts
        self._setup_default_alerts()
        
        logger.info("Metrics collector initialized")
    
    def _setup_default_alerts(self):
        """Set up default monitoring alerts."""
        default_alerts = [
            Alert(
                name="cache_hit_rate_low",
                condition="cache_hit_rate < threshold",
                threshold=0.80,
                level=AlertLevel.WARNING,
                message="Cache hit rate below 80%: {value:.1%}"
            ),
            Alert(
                name="api_response_time_high",
                condition="avg_response_time > threshold",
                threshold=1000.0,  # 1 second
                level=AlertLevel.WARNING,
                message="Average API response time above 1s: {value:.0f}ms"
            ),
            Alert(
                name="error_rate_high",
                condition="error_rate > threshold",
                threshold=0.05,  # 5%
                level=AlertLevel.ERROR,
                message="Error rate above 5%: {value:.1%}"
            ),
            Alert(
                name="queue_length_high",
                condition="queue_length > threshold",
                threshold=100,
                level=AlertLevel.WARNING,
                message="Background task queue length above 100: {value:.0f}"
            )
        ]
        
        for alert in default_alerts:
            self.alerts[alert.name] = alert
    
    def record_metric(self, name: str, value: float, metric_type: MetricType, tags: Dict[str, str] = None):
        """
        Record a metric value.
        
        Args:
            name: Metric name
            value: Metric value
            metric_type: Type of metric
            tags: Optional tags for metric categorization
        """
        with self.lock:
            metric = Metric(
                name=name,
                value=value,
                metric_type=metric_type,
                timestamp=datetime.utcnow(),
                tags=tags or {}
            )
            
            self.current_metrics[name] = metric
            self.metrics_history[name].append(metric)
            
            # Clean old metrics
            self._cleanup_old_metrics(name)
            
            # Check alerts
            self._check_alerts(metric)
    
    def _cleanup_old_metrics(self, metric_name: str):
        """Remove metrics older than max_history_minutes."""
        cutoff_time = datetime.utcnow() - timedelta(minutes=self.max_history_minutes)
        
        history = self.metrics_history[metric_name]
        while history and history[0].timestamp < cutoff_time:
            history.popleft()
    
    def _check_alerts(self, metric: Metric):
        """Check if metric triggers any alerts."""
        for alert_name, alert in self.alerts.items():
            if not alert.enabled:
                continue
                
            # Check cooldown
            if (alert.last_triggered and 
                datetime.utcnow() - alert.last_triggered < timedelta(minutes=alert.cooldown_minutes)):
                continue
            
            # Evaluate alert condition
            triggered = self._evaluate_alert_condition(alert, metric)
            
            if triggered:
                alert.last_triggered = datetime.utcnow()
                self._trigger_alert(alert, metric.value)
    
    def _evaluate_alert_condition(self, alert: Alert, metric: Metric) -> bool:
        """Evaluate whether an alert condition is met."""
        try:
            # Simple condition evaluation for common patterns
            if alert.name == "cache_hit_rate_low" and metric.name == "cache_hit_rate":
                return metric.value < alert.threshold
            elif alert.name == "api_response_time_high" and metric.name == "avg_response_time":
                return metric.value > alert.threshold
            elif alert.name == "error_rate_high" and metric.name == "error_rate":
                return metric.value > alert.threshold
            elif alert.name == "queue_length_high" and metric.name == "queue_length":
                return metric.value > alert.threshold
                
            return False
        except Exception as e:
            logger.error(f"Error evaluating alert condition {alert.name}: {e}")
            return False
    
    def _trigger_alert(self, alert: Alert, value: float):
        """Trigger an alert notification."""
        message = alert.message.format(value=value)
        logger.warning(f"ALERT [{alert.level.value.upper()}] {alert.name}: {message}")
        
        # In production, this would integrate with alerting systems like:
        # - Slack notifications
        # - Email alerts
        # - PagerDuty
        # - Monitoring dashboards
    
    def increment_counter(self, name: str, value: int = 1, tags: Dict[str, str] = None):
        """Increment a counter metric."""
        with self.lock:
            current_value = self.current_metrics.get(name, Metric(name, 0, MetricType.COUNTER, datetime.utcnow())).value
            self.record_metric(name, current_value + value, MetricType.COUNTER, tags)
    
    def set_gauge(self, name: str, value: float, tags: Dict[str, str] = None):
        """Set a gauge metric value."""
        self.record_metric(name, value, MetricType.GAUGE, tags)
    
    def record_timer(self, name: str, duration_ms: float, tags: Dict[str, str] = None):
        """Record a timing measurement."""
        self.record_metric(name, duration_ms, MetricType.TIMER, tags)
    
    @contextmanager
    def timer(self, name: str, tags: Dict[str, str] = None):
        """Context manager for timing operations."""
        start_time = time.time()
        try:
            yield
        finally:
            duration_ms = (time.time() - start_time) * 1000
            self.record_timer(name, duration_ms, tags)
    
    def get_metric_summary(self, minutes: int = 5) -> Dict[str, Any]:
        """
        Get summary of metrics for the last N minutes.
        
        Args:
            minutes: Time window for metric summary
            
        Returns:
            Dictionary containing metric summaries
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)
        summary = {}
        
        with self.lock:
            for metric_name, history in self.metrics_history.items():
                recent_metrics = [m for m in history if m.timestamp >= cutoff_time]
                
                if not recent_metrics:
                    continue
                
                values = [m.value for m in recent_metrics]
                summary[metric_name] = {
                    'count': len(values),
                    'latest': values[-1] if values else None,
                    'min': min(values) if values else None,
                    'max': max(values) if values else None,
                    'avg': sum(values) / len(values) if values else None,
                    'metric_type': recent_metrics[-1].metric_type.value
                }
        
        return summary
    
    def get_current_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Get current metric values."""
        with self.lock:
            return {
                name: {
                    'value': metric.value,
                    'timestamp': metric.timestamp.isoformat(),
                    'type': metric.metric_type.value,
                    'tags': metric.tags
                }
                for name, metric in self.current_metrics.items()
            }
    
    def export_metrics(self, format_type: str = "json") -> str:
        """
        Export metrics in specified format.
        
        Args:
            format_type: Export format (json, prometheus, etc.)
            
        Returns:
            Formatted metrics string
        """
        if format_type == "json":
            return json.dumps({
                'timestamp': datetime.utcnow().isoformat(),
                'metrics': self.get_current_metrics(),
                'summary': self.get_metric_summary()
            }, indent=2)
        elif format_type == "prometheus":
            return self._export_prometheus_format()
        else:
            raise ValueError(f"Unsupported export format: {format_type}")
    
    def _export_prometheus_format(self) -> str:
        """Export metrics in Prometheus format."""
        lines = []
        
        with self.lock:
            for name, metric in self.current_metrics.items():
                # Convert metric name to Prometheus format
                prom_name = f"animanga_{name.replace('-', '_')}"
                
                # Add help text
                lines.append(f"# HELP {prom_name} {name}")
                lines.append(f"# TYPE {prom_name} {metric.metric_type.value}")
                
                # Add metric with tags
                tags_str = ""
                if metric.tags:
                    tag_pairs = [f'{k}="{v}"' for k, v in metric.tags.items()]
                    tags_str = "{" + ",".join(tag_pairs) + "}"
                
                lines.append(f"{prom_name}{tags_str} {metric.value}")
        
        return "\n".join(lines)

# Global metrics collector instance
_metrics_collector = None

def get_metrics_collector() -> MetricsCollector:
    """Get global metrics collector instance (singleton pattern)."""
    global _metrics_collector
    if _metrics_collector is None:
        _metrics_collector = MetricsCollector()
    return _metrics_collector

# Decorator for monitoring API endpoints
def monitor_endpoint(endpoint_name: str = None):
    """
    Decorator to monitor API endpoint performance.
    
    Args:
        endpoint_name: Name for the endpoint (defaults to function name)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            collector = get_metrics_collector()
            name = endpoint_name or func.__name__
            
            # Record request
            collector.increment_counter(f"api_requests_total", tags={"endpoint": name})
            
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                
                # Record success
                collector.increment_counter(f"api_requests_success", tags={"endpoint": name})
                
                return result
                
            except Exception as e:
                # Record error
                collector.increment_counter(f"api_requests_error", tags={
                    "endpoint": name,
                    "error_type": type(e).__name__
                })
                raise
                
            finally:
                # Record response time
                duration_ms = (time.time() - start_time) * 1000
                collector.record_timer(f"api_response_time", duration_ms, tags={"endpoint": name})
                
        return wrapper
    return decorator

# Cache monitoring functions
def record_cache_hit(cache_type: str = "default"):
    """Record a cache hit."""
    collector = get_metrics_collector()
    collector.increment_counter("cache_hits_total", tags={"cache_type": cache_type})
    _update_cache_hit_rate(cache_type)

def record_cache_miss(cache_type: str = "default"):
    """Record a cache miss."""
    collector = get_metrics_collector()
    collector.increment_counter("cache_misses_total", tags={"cache_type": cache_type})
    _update_cache_hit_rate(cache_type)

def _update_cache_hit_rate(cache_type: str):
    """Update cache hit rate metric."""
    collector = get_metrics_collector()
    
    # Get recent hit/miss counts
    summary = collector.get_metric_summary(minutes=5)
    
    hits = summary.get("cache_hits_total", {}).get("latest", 0)
    misses = summary.get("cache_misses_total", {}).get("latest", 0)
    
    total = hits + misses
    if total > 0:
        hit_rate = hits / total
        collector.set_gauge("cache_hit_rate", hit_rate, tags={"cache_type": cache_type})

# Queue monitoring functions
def record_queue_length(queue_name: str, length: int):
    """Record background task queue length."""
    collector = get_metrics_collector()
    collector.set_gauge("queue_length", length, tags={"queue": queue_name})

def record_task_processing_time(task_name: str, duration_ms: float, status: str = "success"):
    """Record task processing time."""
    collector = get_metrics_collector()
    collector.record_timer("task_processing_time", duration_ms, tags={
        "task": task_name,
        "status": status
    })

# System health monitoring
def record_system_health():
    """Record system health metrics."""
    collector = get_metrics_collector()
    
    try:
        import psutil
        
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        collector.set_gauge("system_cpu_percent", cpu_percent)
        
        # Memory usage
        memory = psutil.virtual_memory()
        collector.set_gauge("system_memory_percent", memory.percent)
        collector.set_gauge("system_memory_available_bytes", memory.available)
        
        # Disk usage
        disk = psutil.disk_usage('/')
        collector.set_gauge("system_disk_percent", disk.percent)
        
    except ImportError:
        logger.warning("psutil not available for system health monitoring")
    except Exception as e:
        logger.error(f"Error recording system health: {e}")

# Monitoring configuration
class MonitoringConfig:
    """Configuration for monitoring system."""
    
    CACHE_HIT_RATE_WARNING_THRESHOLD = float(os.getenv("MONITOR_CACHE_HIT_RATE_THRESHOLD", "0.80"))
    API_RESPONSE_TIME_WARNING_MS = float(os.getenv("MONITOR_API_RESPONSE_TIME_THRESHOLD", "1000"))
    ERROR_RATE_WARNING_THRESHOLD = float(os.getenv("MONITOR_ERROR_RATE_THRESHOLD", "0.05"))
    QUEUE_LENGTH_WARNING_THRESHOLD = float(os.getenv("MONITOR_QUEUE_LENGTH_THRESHOLD", "100"))
    
    METRICS_RETENTION_MINUTES = int(os.getenv("MONITOR_METRICS_RETENTION_MINUTES", "60"))
    ALERT_COOLDOWN_MINUTES = int(os.getenv("MONITOR_ALERT_COOLDOWN_MINUTES", "15"))
    
    ENABLE_SYSTEM_HEALTH = os.getenv("MONITOR_ENABLE_SYSTEM_HEALTH", "true").lower() == "true"
    ENABLE_PROMETHEUS_EXPORT = os.getenv("MONITOR_ENABLE_PROMETHEUS", "false").lower() == "true"

# Initialize monitoring on module import
def initialize_monitoring():
    """Initialize monitoring system with production configuration."""
    collector = get_metrics_collector()
    
    # Update alert thresholds from configuration
    if "cache_hit_rate_low" in collector.alerts:
        collector.alerts["cache_hit_rate_low"].threshold = MonitoringConfig.CACHE_HIT_RATE_WARNING_THRESHOLD
    
    if "api_response_time_high" in collector.alerts:
        collector.alerts["api_response_time_high"].threshold = MonitoringConfig.API_RESPONSE_TIME_WARNING_MS
    
    if "error_rate_high" in collector.alerts:
        collector.alerts["error_rate_high"].threshold = MonitoringConfig.ERROR_RATE_WARNING_THRESHOLD
    
    if "queue_length_high" in collector.alerts:
        collector.alerts["queue_length_high"].threshold = MonitoringConfig.QUEUE_LENGTH_WARNING_THRESHOLD
    
    logger.info("Monitoring system initialized with production configuration")

# Auto-initialize on import
initialize_monitoring()