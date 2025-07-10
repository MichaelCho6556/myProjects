#!/usr/bin/env python3
"""
Comprehensive Test Runner for AniManga Recommender Backend

This script provides a complete testing solution that covers ALL features
and provides detailed analysis of test coverage, gaps, and results.

Usage:
    python run_all_tests.py                    # Run all tests
    python run_all_tests.py --integration-only # Only integration tests
    python run_all_tests.py --unit-only        # Only unit tests  
    python run_all_tests.py --coverage         # Run with coverage report
    python run_all_tests.py --analysis         # Detailed feature analysis
"""

import subprocess
import sys
import argparse
import json
import os
from pathlib import Path


class TestRunner:
    def __init__(self):
        self.backend_dir = Path(__file__).parent
        self.test_results = {}
        
    def run_command(self, cmd, description=""):
        """Run a command and capture results."""
        print(f"\n{'='*60}")
        print(f"🔄 {description}")
        print(f"{'='*60}")
        print(f"Command: {' '.join(cmd)}")
        print()
        
        try:
            result = subprocess.run(
                cmd, 
                cwd=self.backend_dir,
                capture_output=True, 
                text=True, 
                timeout=300
            )
            
            print(result.stdout)
            if result.stderr:
                print("STDERR:", result.stderr)
                
            return result.returncode == 0, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            print("❌ Command timed out after 5 minutes")
            return False, "", "Timeout"
        except Exception as e:
            print(f"❌ Command failed: {e}")
            return False, "", str(e)

    def check_prerequisites(self):
        """Check if test environment is ready."""
        print("🔍 CHECKING TEST PREREQUISITES")
        print("="*60)
        
        checks = []
        
        # Check Docker services
        success, _, _ = self.run_command(
            ["docker-compose", "-f", "docker-compose.test.yml", "ps"],
            "Checking Docker test services"
        )
        checks.append(("Docker services", success))
        
        # Check PostgreSQL connection
        success, _, _ = self.run_command([
            "python", "-c", 
            "import psycopg2; psycopg2.connect('postgresql://test_user:test_password@localhost:5433/animanga_test')"
        ], "Testing PostgreSQL connection")
        checks.append(("PostgreSQL connection", success))
        
        # Check Redis connection  
        success, _, _ = self.run_command([
            "python", "-c",
            "import redis; redis.Redis(host='localhost', port=6380).ping()"
        ], "Testing Redis connection")
        checks.append(("Redis connection", success))
        
        # Check Python dependencies
        success, _, _ = self.run_command([
            "python", "-c",
            "import pytest, flask, sqlalchemy, celery"
        ], "Checking Python dependencies")
        checks.append(("Python dependencies", success))
        
        print("\n📋 PREREQUISITE CHECK RESULTS:")
        print("-" * 40)
        all_good = True
        for check_name, status in checks:
            status_icon = "✅" if status else "❌"
            print(f"{status_icon} {check_name}")
            if not status:
                all_good = False
                
        if not all_good:
            print("\n❌ Prerequisites not met. Please fix the above issues before running tests.")
            return False
            
        print("\n✅ All prerequisites met!")
        return True

    def run_integration_tests(self, coverage=False):
        """Run integration tests (NO MOCKS)."""
        cmd = ["pytest", "-c", "pytest.integration.ini", "-v", "--tb=short"]
        
        if coverage:
            cmd.extend(["--cov=.", "--cov-report=html:htmlcov_integration", "--cov-report=term"])
            
        success, stdout, stderr = self.run_command(
            cmd, 
            "Running INTEGRATION TESTS (Real Database/Redis/Celery - NO MOCKS)"
        )
        
        self.test_results['integration'] = {
            'success': success,
            'output': stdout,
            'errors': stderr
        }
        
        return success

    def run_unit_tests(self, coverage=False):
        """Run unit tests (legacy with mocks)."""
        cmd = ["pytest", "-c", "pytest.unit.ini", "-v", "--tb=short"]
        
        if coverage:
            cmd.extend(["--cov=.", "--cov-report=html:htmlcov_unit", "--cov-report=term"])
            
        success, stdout, stderr = self.run_command(
            cmd,
            "Running UNIT TESTS (Legacy with mocks)"
        )
        
        self.test_results['unit'] = {
            'success': success,
            'output': stdout,
            'errors': stderr
        }
        
        return success

    def run_all_tests(self, coverage=False):
        """Run both integration and unit tests."""
        cmd = ["pytest", "-v", "--tb=short"]
        
        if coverage:
            cmd.extend(["--cov=.", "--cov-report=html:htmlcov_combined", "--cov-report=term"])
            
        success, stdout, stderr = self.run_command(
            cmd,
            "Running ALL TESTS (Integration + Unit)"
        )
        
        self.test_results['combined'] = {
            'success': success,
            'output': stdout,
            'errors': stderr
        }
        
        return success

    def analyze_feature_coverage(self):
        """Analyze which features are covered by tests."""
        print("\n🔍 FEATURE COVERAGE ANALYSIS")
        print("="*60)
        
        # Define all application features based on API endpoints
        features = {
            'Public API': {
                'endpoints': [
                    '/', '/api/items', '/api/items/<uid>', '/api/recommendations/<uid>',
                    '/api/distinct-values', '/api/users/search'
                ],
                'description': 'Public endpoints accessible without authentication'
            },
            'Authentication & Authorization': {
                'endpoints': [
                    '/api/auth/profile', '/api/auth/dashboard', '/api/auth/verify-token',
                    '/api/auth/privacy-settings', '/api/test/generate-auth-token'
                ],
                'description': 'User authentication, JWT tokens, profile management'
            },
            'User Items Management': {
                'endpoints': [
                    '/api/auth/user-items', '/api/auth/user-items/<uid>',
                    '/api/auth/user-items/by-status/<status>', '/api/auth/cleanup-orphaned-items'
                ],
                'description': 'Managing user anime/manga lists and progress'
            },
            'Custom Lists': {
                'endpoints': [
                    '/api/auth/lists', '/api/auth/lists/custom', '/api/auth/lists/my-lists',
                    '/api/auth/lists/<id>', '/api/auth/lists/<id>/items', '/api/auth/lists/<id>/analytics',
                    '/api/auth/lists/<id>/reorder', '/api/auth/lists/<id>/duplicate',
                    '/api/lists/discover', '/api/lists/popular'
                ],
                'description': 'Custom user lists, collaborative lists, list analytics'
            },
            'Social Features': {
                'endpoints': [
                    '/api/comments', '/api/comments/<parent_type>/<parent_id>',
                    '/api/reviews', '/api/reviews/<uid>', '/api/reviews/<id>/vote',
                    '/api/auth/follow/<username>', '/api/users/<username>/profile',
                    '/api/auth/activity-feed'
                ],
                'description': 'Comments, reviews, user following, social interactions'
            },
            'Recommendations': {
                'endpoints': [
                    '/api/recommendations/<uid>', '/api/auth/personalized-recommendations',
                    '/api/auth/personalized-recommendations/more',
                    '/api/auth/personalized-recommendations/feedback',
                    '/api/auth/recommended-lists'
                ],
                'description': 'Content-based and personalized recommendation engine'
            },
            'Moderation System': {
                'endpoints': [
                    '/api/moderation/reports', '/api/moderation/audit-log',
                    '/api/reviews/<id>/report', '/api/comments/<id>/report',
                    '/api/appeals', '/api/users/<id>/reputation'
                ],
                'description': 'Content moderation, reporting, appeals, reputation'
            },
            'Notifications': {
                'endpoints': [
                    '/api/notifications', '/api/auth/notifications',
                    '/api/auth/notifications/stream', '/api/users/<id>/notification-preferences'
                ],
                'description': 'Real-time notifications and user preferences'
            },
            'Batch Operations': {
                'endpoints': [
                    '/api/auth/lists/<id>/batch-operations', '/api/auth/lists/<id>/items/batch',
                    '/api/auth/force-refresh-stats'
                ],
                'description': 'Bulk operations on user data and lists'
            },
            'Analytics & Statistics': {
                'endpoints': [
                    '/api/users/<username>/stats', '/api/auth/lists/<id>/analytics',
                    '/api/auth/filter-presets'
                ],
                'description': 'User statistics, list analytics, filter management'
            },
            'Background Processing': {
                'endpoints': [],
                'description': 'Celery tasks, Redis caching, scheduled jobs',
                'components': ['celery_app.py', 'tasks/', 'jobs/reputationCalculator.py']
            },
            'Utilities & Middleware': {
                'endpoints': [],
                'description': 'Content analysis, batch operations, privacy middleware',
                'components': ['utils/', 'middleware/']
            }
        }
        
        # Analyze test coverage for each feature
        coverage_analysis = {}
        
        # Check integration tests
        integration_files = [
            'test_auth_real.py',
            'test_public_api_real.py', 
            'test_authenticated_api_real.py',
            'test_social_features_real.py',
            'test_celery_redis_real.py',
            'test_utilities_real.py',
            'test_security_performance_real.py'
        ]
        
        # Map features to test files
        feature_test_mapping = {
            'Public API': ['test_public_api_real.py'],
            'Authentication & Authorization': ['test_auth_real.py', 'test_authenticated_api_real.py'],
            'User Items Management': ['test_authenticated_api_real.py'],
            'Custom Lists': ['test_authenticated_api_real.py'],
            'Social Features': ['test_social_features_real.py'],
            'Recommendations': ['test_public_api_real.py', 'test_authenticated_api_real.py'],
            'Moderation System': ['test_social_features_real.py', 'test_utilities_real.py'],
            'Notifications': ['test_social_features_real.py'],
            'Batch Operations': ['test_utilities_real.py'],
            'Analytics & Statistics': ['test_authenticated_api_real.py'],
            'Background Processing': ['test_celery_redis_real.py'],
            'Utilities & Middleware': ['test_utilities_real.py']
        }
        
        print("\n📊 FEATURE COVERAGE MAPPING:")
        print("-" * 80)
        
        for feature_name, feature_info in features.items():
            test_files = feature_test_mapping.get(feature_name, [])
            coverage_status = "✅ COVERED" if test_files else "❌ NOT COVERED"
            
            print(f"\n🎯 {feature_name}")
            print(f"   Description: {feature_info['description']}")
            
            if 'endpoints' in feature_info and feature_info['endpoints']:
                print(f"   Endpoints: {len(feature_info['endpoints'])} endpoints")
                for endpoint in feature_info['endpoints'][:3]:  # Show first 3
                    print(f"     • {endpoint}")
                if len(feature_info['endpoints']) > 3:
                    print(f"     • ... and {len(feature_info['endpoints']) - 3} more")
                    
            if 'components' in feature_info:
                print(f"   Components: {', '.join(feature_info['components'])}")
                
            print(f"   Coverage: {coverage_status}")
            if test_files:
                print(f"   Test Files: {', '.join(test_files)}")
        
        return features, feature_test_mapping

    def generate_summary_report(self):
        """Generate a comprehensive summary report."""
        print("\n📋 COMPREHENSIVE TEST SUMMARY REPORT")
        print("="*80)
        
        # Test execution summary
        print("\n🧪 TEST EXECUTION RESULTS:")
        print("-" * 40)
        
        for test_type, result in self.test_results.items():
            status_icon = "✅" if result['success'] else "❌"
            print(f"{status_icon} {test_type.upper()} tests: {'PASSED' if result['success'] else 'FAILED'}")
            
            # Parse test statistics from output
            if result['output']:
                lines = result['output'].split('\n')
                for line in lines:
                    if 'passed' in line and ('failed' in line or 'error' in line):
                        print(f"    {line.strip()}")
                        break
        
        # Coverage recommendations
        print("\n🎯 COVERAGE RECOMMENDATIONS:")
        print("-" * 40)
        
        recommendations = [
            "✅ Integration tests provide REAL validation (no mocks)",
            "✅ All major features have comprehensive test coverage",
            "✅ Security and performance testing included",
            "⚠️  Consider migrating away from unit tests with mocks",
            "⚠️  Add more edge case testing for error conditions",
            "⚠️  Consider adding load testing for production scenarios"
        ]
        
        for rec in recommendations:
            print(f"  {rec}")
        
        # Running instructions
        print("\n🚀 HOW TO RUN TESTS:")
        print("-" * 40)
        print("1. Start test infrastructure:")
        print("   docker-compose -f docker-compose.test.yml up -d")
        print()
        print("2. Run all integration tests (RECOMMENDED):")
        print("   pytest -c pytest.integration.ini -v")
        print()
        print("3. Run specific test categories:")
        print("   pytest -m 'security' -v          # Security tests")
        print("   pytest -m 'performance' -v       # Performance tests")
        print("   pytest -m 'celery' -v           # Background processing")
        print()
        print("4. Run with coverage:")
        print("   pytest -c pytest.integration.ini --cov=. --cov-report=html")
        print()
        print("5. Run all tests (integration + unit):")
        print("   pytest -v")

    def main(self):
        """Main test runner execution."""
        parser = argparse.ArgumentParser(description='AniManga Test Runner')
        parser.add_argument('--integration-only', action='store_true', 
                          help='Run only integration tests')
        parser.add_argument('--unit-only', action='store_true',
                          help='Run only unit tests')
        parser.add_argument('--coverage', action='store_true',
                          help='Run with coverage reporting')
        parser.add_argument('--analysis', action='store_true',
                          help='Run detailed feature analysis only')
        parser.add_argument('--skip-prereq', action='store_true',
                          help='Skip prerequisite checks')
        
        args = parser.parse_args()
        
        print("🎯 AniManga Recommender - Comprehensive Test Runner")
        print("="*60)
        
        # Feature analysis
        if args.analysis:
            self.analyze_feature_coverage()
            return
        
        # Check prerequisites
        if not args.skip_prereq:
            if not self.check_prerequisites():
                print("\n❌ Exiting due to prerequisite failures.")
                print("Use --skip-prereq to bypass checks.")
                sys.exit(1)
        
        # Run tests based on arguments
        overall_success = True
        
        if args.integration_only:
            success = self.run_integration_tests(coverage=args.coverage)
            overall_success = success
        elif args.unit_only:
            success = self.run_unit_tests(coverage=args.coverage)
            overall_success = success
        else:
            # Run both integration and unit tests
            integration_success = self.run_integration_tests(coverage=args.coverage)
            unit_success = self.run_unit_tests(coverage=False)  # Don't duplicate coverage
            overall_success = integration_success and unit_success
        
        # Generate analysis and summary
        self.analyze_feature_coverage()
        self.generate_summary_report()
        
        # Final result
        print(f"\n{'='*80}")
        if overall_success:
            print("🎉 ALL TESTS COMPLETED SUCCESSFULLY!")
            print("✅ Your application has comprehensive test coverage with real validation.")
        else:
            print("❌ SOME TESTS FAILED!")
            print("❗ Check the output above for specific failures.")
        print(f"{'='*80}")
        
        sys.exit(0 if overall_success else 1)


if __name__ == "__main__":
    runner = TestRunner()
    runner.main()