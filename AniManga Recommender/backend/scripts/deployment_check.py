#!/usr/bin/env python3
"""
Deployment readiness check for AniManga Recommender.

This script verifies that the system is ready for deployment with hybrid cache
(database + memory) instead of Redis/Celery. Run this before deploying to ensure 
all dependencies are properly configured for free-tier hosting.
"""

import os
import sys
import importlib
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'


def check(condition, description):
    """Check a condition and print result."""
    if condition:
        print(f"{GREEN}[OK]{RESET} {description}")
        return True
    else:
        print(f"{RED}[FAIL]{RESET} {description}")
        return False


def main():
    print("AniManga Recommender - Deployment Readiness Check")
    print("=" * 50)
    
    checks_passed = 0
    total_checks = 0
    
    # Check 1: No direct Redis imports (using hybrid cache instead)
    print("\n1. Checking for direct Redis dependencies...")
    total_checks += 1
    try:
        import redis
        check(False, "Redis module found - should use hybrid cache instead")
    except ImportError:
        check(True, "No direct Redis imports (using hybrid cache)")
        checks_passed += 1
    
    # Check 2: No Celery imports
    print("\n2. Checking for Celery dependencies...")
    total_checks += 1
    try:
        import celery
        check(False, "Celery module found - should be removed")
    except ImportError:
        check(True, "No Celery module found")
        checks_passed += 1
    
    # Check 3: Hybrid cache available
    print("\n3. Checking hybrid cache system...")
    total_checks += 1
    try:
        from utils.hybrid_cache import HybridCache, get_hybrid_cache
        check(True, "Hybrid cache module available")
        checks_passed += 1
    except ImportError as e:
        check(False, f"Hybrid cache module not found: {e}")
    
    # Check 4: Compute endpoints available
    print("\n4. Checking compute endpoints...")
    total_checks += 1
    try:
        from compute_endpoints import compute_bp
        check(True, "Compute endpoints module available")
        checks_passed += 1
    except ImportError as e:
        check(False, f"Compute endpoints module not found: {e}")
    
    # Check 5: Environment configuration
    print("\n5. Checking environment configuration...")
    total_checks += 1
    env_vars = [
        'SUPABASE_URL',
        'SUPABASE_KEY',
        'CACHE_MEMORY_SIZE',
        'CACHE_MEMORY_MB'
    ]
    
    missing_vars = [var for var in env_vars if not os.getenv(var)]
    if not missing_vars:
        check(True, "All required environment variables set")
        checks_passed += 1
    else:
        check(False, f"Missing environment variables: {', '.join(missing_vars)}")
    
    # Check 6: No tasks directory
    print("\n6. Checking for removed directories...")
    total_checks += 1
    tasks_dir = Path(__file__).parent.parent / 'tasks'
    if not tasks_dir.exists():
        check(True, "Tasks directory removed")
        checks_passed += 1
    else:
        check(False, "Tasks directory still exists - should be removed")
    
    # Check 7: No celery_app.py
    print("\n7. Checking for removed files...")
    total_checks += 1
    celery_file = Path(__file__).parent.parent / 'celery_app.py'
    if not celery_file.exists():
        check(True, "celery_app.py removed")
        checks_passed += 1
    else:
        check(False, "celery_app.py still exists - should be removed")
    
    # Check 8: Cache functions updated
    print("\n8. Checking cache helper functions...")
    total_checks += 1
    try:
        from utils.cache_helpers import (
            get_user_stats_from_cache,
            set_user_stats_in_cache,
            get_cache_status
        )
        check(True, "Cache helper functions available")
        checks_passed += 1
    except ImportError as e:
        check(False, f"Cache helper functions error: {e}")
    
    # Check 9: Flask app can start
    print("\n9. Checking Flask app initialization...")
    total_checks += 1
    try:
        from app import app
        check(True, "Flask app imports successfully")
        checks_passed += 1
    except Exception as e:
        check(False, f"Flask app import error: {e}")
    
    # Summary
    print("\n" + "=" * 50)
    print(f"Deployment Readiness: {checks_passed}/{total_checks} checks passed")
    
    if checks_passed == total_checks:
        print(f"{GREEN}[READY] System is ready for deployment!{RESET}")
        return 0
    else:
        print(f"{RED}[NOT READY] System is not ready for deployment.{RESET}")
        print(f"{YELLOW}Fix the issues above before deploying.{RESET}")
        return 1


if __name__ == '__main__':
    sys.exit(main())