#!/usr/bin/env python3
# ABOUTME: Production readiness validation for monitoring system
# ABOUTME: Comprehensive checklist and automated validation for production deployment

"""
Production Readiness Validation

This script performs comprehensive validation checks for production deployment:
- Configuration validation
- Dependency verification  
- Security assessment
- Performance validation
- Integration testing
- Monitoring system readiness

Usage:
    python scripts/validate_production_readiness.py [--fix-issues] [--verbose]
"""

import argparse
import os
import sys
import json
import importlib
import subprocess
import time
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + '/../'))


class CheckStatus(Enum):
    """Status of validation checks."""
    PASS = "✅ PASS"
    FAIL = "❌ FAIL"  
    WARNING = "⚠️  WARNING"
    INFO = "ℹ️  INFO"


@dataclass
class ValidationResult:
    """Result of a validation check."""
    name: str
    status: CheckStatus
    message: str
    details: Optional[str] = None
    fixable: bool = False
    fix_command: Optional[str] = None


class ProductionValidator:
    """Comprehensive production readiness validator."""
    
    def __init__(self, verbose: bool = False, fix_issues: bool = False):
        self.verbose = verbose
        self.fix_issues = fix_issues
        self.results: List[ValidationResult] = []
    
    def run_all_validations(self) -> Dict[str, Any]:
        """Run all validation checks."""
        print("🔍 Running Production Readiness Validation")
        print("=" * 50)
        
        # Core system validations
        self.validate_python_environment()
        self.validate_dependencies()
        self.validate_configuration()
        self.validate_security_settings()
        
        # Monitoring system validations
        self.validate_monitoring_system()
        self.validate_cache_configuration()
        self.validate_database_connectivity()
        
        # Performance validations
        self.validate_performance_settings()
        self.validate_error_handling()
        
        # Integration validations
        self.validate_api_endpoints()
        self.validate_background_tasks()
        
        return self.generate_report()
    
    def validate_python_environment(self):
        """Validate Python environment and version."""
        print("🐍 Validating Python Environment...")
        
        # Python version check
        python_version = sys.version_info
        if python_version >= (3, 8):
            self.add_result("Python Version", CheckStatus.PASS, 
                          f"Python {python_version.major}.{python_version.minor}.{python_version.micro}")
        else:
            self.add_result("Python Version", CheckStatus.FAIL,
                          f"Python {python_version.major}.{python_version.minor} < 3.8 (unsupported)",
                          fixable=True, fix_command="pyenv install 3.11.0 && pyenv global 3.11.0")
        
        # Virtual environment check
        if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
            self.add_result("Virtual Environment", CheckStatus.PASS, 
                          "Running in virtual environment")
        else:
            self.add_result("Virtual Environment", CheckStatus.WARNING,
                          "Not running in virtual environment",
                          "Consider using virtual environment for dependency isolation",
                          fixable=True, fix_command="python -m venv venv && source venv/bin/activate")
    
    def validate_dependencies(self):
        """Validate required dependencies."""
        print("📦 Validating Dependencies...")
        
        required_packages = [
            ('flask', '3.0.0'),
            # ('redis', '4.0.0'),  # No longer needed - using hybrid cache
            # ('celery', '5.0.0'),  # No longer needed - using compute endpoints
            ('pandas', '1.5.0'),
            ('scikit-learn', '1.0.0'),
            ('psutil', '5.8.0'),
        ]
        
        for package, min_version in required_packages:
            try:
                module = importlib.import_module(package)
                version = getattr(module, '__version__', 'unknown')
                self.add_result(f"Package: {package}", CheckStatus.PASS,
                              f"Version {version} installed")
            except ImportError:
                self.add_result(f"Package: {package}", CheckStatus.FAIL,
                              f"Package not installed",
                              fixable=True, fix_command=f"pip install {package}>={min_version}")
    
    def validate_configuration(self):
        """Validate environment configuration."""
        print("⚙️  Validating Configuration...")
        
        required_env_vars = [
            'SUPABASE_URL',
            'SUPABASE_KEY',
            'JWT_SECRET_KEY',
            'SECRET_KEY',
            # 'REDIS_URL',  # No longer needed - using hybrid cache
        ]
        
        optional_env_vars = [
            'CELERY_BROKER_URL',
            'CELERY_RESULT_BACKEND',
            'FLASK_ENV',
            'DEBUG',
        ]
        
        # Check required variables
        for var in required_env_vars:
            if os.getenv(var):
                self.add_result(f"Env Var: {var}", CheckStatus.PASS, "Set")
            else:
                self.add_result(f"Env Var: {var}", CheckStatus.FAIL,
                              "Not set", fixable=True,
                              fix_command=f"export {var}=your_value_here")
        
        # Check optional variables
        for var in optional_env_vars:
            if os.getenv(var):
                self.add_result(f"Env Var: {var}", CheckStatus.PASS, "Set")
            else:
                self.add_result(f"Env Var: {var}", CheckStatus.INFO,
                              "Not set (optional)")
        
        # Validate SECRET_KEY strength
        secret_key = os.getenv('SECRET_KEY', '')
        if len(secret_key) >= 32:
            self.add_result("SECRET_KEY Strength", CheckStatus.PASS,
                          f"Length: {len(secret_key)} characters")
        elif len(secret_key) >= 16:
            self.add_result("SECRET_KEY Strength", CheckStatus.WARNING,
                          f"Length: {len(secret_key)} characters (recommend 32+)")
        else:
            self.add_result("SECRET_KEY Strength", CheckStatus.FAIL,
                          f"Length: {len(secret_key)} characters (too short)",
                          fixable=True, fix_command="python -c \"import secrets; print(secrets.token_hex(32))\"")
    
    def validate_security_settings(self):
        """Validate security configuration."""
        print("🔒 Validating Security Settings...")
        
        # Check DEBUG setting
        debug = os.getenv('DEBUG', 'False').lower()
        if debug in ['false', '0', 'no']:
            self.add_result("Debug Mode", CheckStatus.PASS, "Disabled")
        else:
            self.add_result("Debug Mode", CheckStatus.FAIL,
                          "Enabled (security risk in production)",
                          fixable=True, fix_command="export DEBUG=False")
        
        # Check FLASK_ENV
        flask_env = os.getenv('FLASK_ENV', 'production')
        if flask_env == 'production':
            self.add_result("Flask Environment", CheckStatus.PASS, "Production")
        else:
            self.add_result("Flask Environment", CheckStatus.WARNING,
                          f"Set to '{flask_env}' (should be 'production')",
                          fixable=True, fix_command="export FLASK_ENV=production")
        
        # Validate JWT settings
        jwt_secret = os.getenv('JWT_SECRET_KEY', '')
        if len(jwt_secret) >= 32:
            self.add_result("JWT Secret Strength", CheckStatus.PASS,
                          "Strong secret key")
        else:
            self.add_result("JWT Secret Strength", CheckStatus.FAIL,
                          "Weak JWT secret key",
                          fixable=True, fix_command="python -c \"import secrets; print(secrets.token_hex(32))\"")
    
    def validate_monitoring_system(self):
        """Validate monitoring system configuration."""
        print("📊 Validating Monitoring System...")
        
        try:
            from utils.monitoring import get_metrics_collector, MonitoringConfig
            
            collector = get_metrics_collector()
            config = MonitoringConfig()
            
            # Check collector initialization
            self.add_result("Metrics Collector", CheckStatus.PASS,
                          "Successfully initialized")
            
            # Check default alerts
            expected_alerts = ['cache_hit_rate_low', 'api_response_time_high', 
                             'error_rate_high', 'queue_length_high']
            
            for alert_name in expected_alerts:
                if alert_name in collector.alerts:
                    alert = collector.alerts[alert_name]
                    if alert.enabled:
                        self.add_result(f"Alert: {alert_name}", CheckStatus.PASS,
                                      f"Enabled, threshold: {alert.threshold}")
                    else:
                        self.add_result(f"Alert: {alert_name}", CheckStatus.WARNING,
                                      "Disabled")
                else:
                    self.add_result(f"Alert: {alert_name}", CheckStatus.FAIL,
                                  "Not configured")
            
            # Check monitoring configuration
            thresholds = [
                ('Cache Hit Rate', config.CACHE_HIT_RATE_WARNING_THRESHOLD, 0.80),
                ('API Response Time', config.API_RESPONSE_TIME_WARNING_MS, 1000.0),
                ('Error Rate', config.ERROR_RATE_WARNING_THRESHOLD, 0.05),
                ('Queue Length', config.QUEUE_LENGTH_WARNING_THRESHOLD, 100),
            ]
            
            for name, value, expected in thresholds:
                if value == expected:
                    self.add_result(f"Threshold: {name}", CheckStatus.PASS,
                                  f"Default: {value}")
                else:
                    self.add_result(f"Threshold: {name}", CheckStatus.INFO,
                                  f"Custom: {value} (default: {expected})")
            
        except Exception as e:
            self.add_result("Monitoring System", CheckStatus.FAIL,
                          f"Failed to initialize: {e}")
    
    def validate_cache_configuration(self):
        """Validate hybrid cache configuration (database + memory)."""
        print("🗄️  Validating Hybrid Cache Configuration...")
        
        try:
            from utils.cache_helpers import get_cache, get_cache_status
            
            cache = get_cache()
            
            if cache.connected:
                self.add_result("Hybrid Cache Connection", CheckStatus.PASS,
                              "Connected successfully (Memory + Database)")
                
                # Get cache status
                status = get_cache_status()
                if 'memory_tier' in status:
                    memory_info = status.get('memory_tier', {})
                    self.add_result("Memory Cache", CheckStatus.INFO,
                                  f"Size: {memory_info.get('size', 0)}, "
                                  f"Hit Rate: {memory_info.get('hit_rate', 0)}%")
                
                if 'database_tier' in status:
                    db_info = status.get('database_tier', {})
                    self.add_result("Database Cache", CheckStatus.INFO,
                                  f"Connected: {db_info.get('connected', False)}")
                
                if 'hit_rate' in status:
                    hit_rate = status['hit_rate']
                    if hit_rate >= 90:
                        self.add_result("Overall Cache Hit Rate", CheckStatus.PASS,
                                      f"{hit_rate}%")
                    elif hit_rate >= 70:
                        self.add_result("Overall Cache Hit Rate", CheckStatus.WARNING,
                                      f"{hit_rate}% (low)")
                    else:
                        self.add_result("Overall Cache Hit Rate", CheckStatus.FAIL,
                                      f"{hit_rate}% (very low)")
                
            else:
                self.add_result("Hybrid Cache Connection", CheckStatus.FAIL,
                              "Cannot connect to cache system",
                              details="Check database connection and cache configuration",
                              fixable=True)
                
        except Exception as e:
            self.add_result("Cache System", CheckStatus.FAIL,
                          f"Cache validation failed: {e}")
    
    def validate_database_connectivity(self):
        """Validate database connectivity."""
        print("🗃️  Validating Database Connectivity...")
        
        try:
            from supabase_client import SupabaseClient
            
            client = SupabaseClient()
            
            # Test connection with a simple query
            result = client.table('items').select('id').limit(1).execute()
            
            if result.data:
                self.add_result("Database Connection", CheckStatus.PASS,
                              "Connected to Supabase")
            else:
                self.add_result("Database Connection", CheckStatus.WARNING,
                              "Connected but no data returned")
                
        except Exception as e:
            self.add_result("Database Connection", CheckStatus.FAIL,
                          f"Database connection failed: {e}",
                          details="Check SUPABASE_URL and SUPABASE_KEY")
    
    def validate_performance_settings(self):
        """Validate performance-related settings."""
        print("⚡ Validating Performance Settings...")
        
        # Check pagination settings
        max_items = os.getenv('MAX_ITEMS_PER_PAGE', '50')
        try:
            max_items_int = int(max_items)
            if max_items_int <= 100:
                self.add_result("Pagination Limit", CheckStatus.PASS,
                              f"Max items per page: {max_items_int}")
            else:
                self.add_result("Pagination Limit", CheckStatus.WARNING,
                              f"High limit: {max_items_int} (may impact performance)")
        except ValueError:
            self.add_result("Pagination Limit", CheckStatus.FAIL,
                          f"Invalid value: {max_items}")
        
        # Check rate limiting
        rate_limit = os.getenv('API_RATE_LIMIT', '10')
        try:
            rate_limit_int = int(rate_limit)
            if rate_limit_int >= 10:
                self.add_result("Rate Limiting", CheckStatus.PASS,
                              f"Rate limit: {rate_limit_int} req/min")
            else:
                self.add_result("Rate Limiting", CheckStatus.WARNING,
                              f"Low rate limit: {rate_limit_int} req/min")
        except ValueError:
            self.add_result("Rate Limiting", CheckStatus.FAIL,
                          f"Invalid rate limit: {rate_limit}")
    
    def validate_error_handling(self):
        """Validate error handling and logging."""
        print("🚨 Validating Error Handling...")
        
        # Check if logging is configured
        import logging
        
        root_logger = logging.getLogger()
        if root_logger.handlers:
            self.add_result("Logging Configuration", CheckStatus.PASS,
                          f"{len(root_logger.handlers)} handlers configured")
        else:
            self.add_result("Logging Configuration", CheckStatus.WARNING,
                          "No logging handlers configured")
        
        # Check log level
        log_level = root_logger.level
        if log_level <= logging.INFO:
            self.add_result("Log Level", CheckStatus.PASS,
                          f"Level: {logging.getLevelName(log_level)}")
        else:
            self.add_result("Log Level", CheckStatus.WARNING,
                          f"Level: {logging.getLevelName(log_level)} (may miss important logs)")
    
    def validate_api_endpoints(self):
        """Validate critical API endpoints."""
        print("🌐 Validating API Endpoints...")
        
        try:
            from app import app
            
            with app.test_client() as client:
                # Test health endpoint
                response = client.get('/')
                if response.status_code == 200:
                    self.add_result("Health Endpoint", CheckStatus.PASS,
                                  "Responds correctly")
                else:
                    self.add_result("Health Endpoint", CheckStatus.FAIL,
                                  f"HTTP {response.status_code}")
                
                # Test API endpoints
                endpoints_to_test = [
                    ('/api/items', 'Items API'),
                    ('/api/auth/dashboard', 'Dashboard API'),
                ]
                
                for endpoint, name in endpoints_to_test:
                    try:
                        response = client.get(endpoint)
                        if response.status_code in [200, 401]:  # 401 is OK for auth endpoints
                            self.add_result(name, CheckStatus.PASS,
                                          f"HTTP {response.status_code}")
                        else:
                            self.add_result(name, CheckStatus.WARNING,
                                          f"HTTP {response.status_code}")
                    except Exception as e:
                        self.add_result(name, CheckStatus.FAIL,
                                      f"Endpoint error: {e}")
                        
        except Exception as e:
            self.add_result("API Validation", CheckStatus.FAIL,
                          f"Failed to test APIs: {e}")
    
    def validate_background_tasks(self):
        """Validate background task system."""
        print("⏰ Validating Background Tasks...")
        
        try:
            from celery_app import celery_app
            
            # Check Celery configuration
            if celery_app.conf.broker_url:
                self.add_result("Celery Broker", CheckStatus.PASS,
                              "Configured")
            else:
                self.add_result("Celery Broker", CheckStatus.FAIL,
                              "No broker URL configured")
            
            # Test task discovery
            registered_tasks = list(celery_app.tasks.keys())
            task_count = len(registered_tasks)
            
            if task_count > 0:
                self.add_result("Celery Tasks", CheckStatus.PASS,
                              f"{task_count} tasks registered")
            else:
                self.add_result("Celery Tasks", CheckStatus.WARNING,
                              "No tasks registered")
                
        except Exception as e:
            self.add_result("Background Tasks", CheckStatus.FAIL,
                          f"Celery validation failed: {e}")
    
    def add_result(self, name: str, status: CheckStatus, message: str, 
                   details: str = None, fixable: bool = False, 
                   fix_command: str = None):
        """Add a validation result."""
        result = ValidationResult(
            name=name,
            status=status,
            message=message,
            details=details,
            fixable=fixable,
            fix_command=fix_command
        )
        
        self.results.append(result)
        
        if self.verbose or status in [CheckStatus.FAIL, CheckStatus.WARNING]:
            print(f"  {status.value} {name}: {message}")
            if details and self.verbose:
                print(f"    {details}")
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive validation report."""
        
        # Count results by status
        status_counts = {
            CheckStatus.PASS: 0,
            CheckStatus.FAIL: 0,
            CheckStatus.WARNING: 0,
            CheckStatus.INFO: 0
        }
        
        for result in self.results:
            status_counts[result.status] += 1
        
        # Calculate readiness score
        total_checks = len(self.results)
        critical_checks = status_counts[CheckStatus.PASS] + status_counts[CheckStatus.FAIL]
        readiness_score = (status_counts[CheckStatus.PASS] / critical_checks * 100) if critical_checks > 0 else 0
        
        # Determine production readiness
        production_ready = (
            status_counts[CheckStatus.FAIL] == 0 and
            readiness_score >= 90
        )
        
        report = {
            'timestamp': datetime.utcnow().isoformat(),
            'total_checks': total_checks,
            'status_counts': {s.name: count for s, count in status_counts.items()},
            'readiness_score': round(readiness_score, 1),
            'production_ready': production_ready,
            'results': [asdict(result) for result in self.results],
            'fixable_issues': [asdict(r) for r in self.results if r.fixable and r.status == CheckStatus.FAIL]
        }
        
        return report
    
    def print_summary(self, report: Dict[str, Any]):
        """Print validation summary."""
        print("\n" + "=" * 50)
        print("📋 PRODUCTION READINESS SUMMARY")
        print("=" * 50)
        
        # Overall status
        if report['production_ready']:
            print(f"🎉 PRODUCTION READY: ✅")
        else:
            print(f"⚠️  NOT PRODUCTION READY: ❌")
        
        print(f"\nReadiness Score: {report['readiness_score']:.1f}%")
        
        # Status breakdown
        status_counts = report['status_counts']
        print(f"\nValidation Results:")
        print(f"  ✅ Passed: {status_counts['PASS']}")
        print(f"  ❌ Failed: {status_counts['FAIL']}")
        print(f"  ⚠️  Warnings: {status_counts['WARNING']}")
        print(f"  ℹ️  Info: {status_counts['INFO']}")
        
        # Fixable issues
        fixable_issues = report['fixable_issues']
        if fixable_issues:
            print(f"\n🔧 Fixable Issues ({len(fixable_issues)}):")
            for issue in fixable_issues:
                print(f"  • {issue['name']}: {issue['message']}")
                if issue['fix_command'] and self.verbose:
                    print(f"    Fix: {issue['fix_command']}")
        
        # Next steps
        print(f"\n📋 Next Steps:")
        if report['production_ready']:
            print("  ✅ System is ready for production deployment")
            print("  ✅ All critical checks passed")
            print("  ✅ Consider monitoring system performance after deployment")
        else:
            print("  ❌ Address failed checks before deployment")
            print("  ❌ Fix security and configuration issues")
            print("  ❌ Re-run validation after fixes")
    
    def auto_fix_issues(self, report: Dict[str, Any]):
        """Attempt to automatically fix issues."""
        if not self.fix_issues:
            return
        
        fixable_issues = report['fixable_issues']
        if not fixable_issues:
            print("\n✅ No fixable issues found")
            return
        
        print(f"\n🔧 Attempting to fix {len(fixable_issues)} issues...")
        
        for issue in fixable_issues:
            if issue['fix_command']:
                print(f"  Fixing: {issue['name']}")
                try:
                    subprocess.run(issue['fix_command'], shell=True, check=True)
                    print(f"    ✅ Fixed")
                except subprocess.CalledProcessError as e:
                    print(f"    ❌ Fix failed: {e}")


def main():
    """Main validation function."""
    parser = argparse.ArgumentParser(description='Validate production readiness')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--fix-issues', action='store_true', help='Attempt to fix issues automatically')
    parser.add_argument('--output', type=str, help='Save report to file')
    
    args = parser.parse_args()
    
    # Run validation
    validator = ProductionValidator(verbose=args.verbose, fix_issues=args.fix_issues)
    report = validator.run_all_validations()
    
    # Print summary
    validator.print_summary(report)
    
    # Auto-fix if requested
    validator.auto_fix_issues(report)
    
    # Save report
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n💾 Report saved to: {args.output}")
    
    # Exit with appropriate code
    if report['production_ready']:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()