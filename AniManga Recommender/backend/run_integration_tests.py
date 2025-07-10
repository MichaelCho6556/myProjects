#!/usr/bin/env python3
# ABOUTME: Script to run integration tests with proper environment setup
# ABOUTME: Loads test environment variables and ensures test database is ready

"""
Integration Test Runner for AniManga Recommender

This script sets up the test environment and runs integration tests with proper
configuration. It ensures that test databases and services are available before
running tests.

Usage:
    python run_integration_tests.py                    # Run all integration tests
    python run_integration_tests.py test_specific.py  # Run specific test file
    python run_integration_tests.py -k test_name      # Run specific test by name
"""

import os
import sys
import subprocess
import time
from pathlib import Path
from dotenv import load_dotenv

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_status(message, status="info"):
    """Print colored status messages."""
    if status == "success":
        print(f"{GREEN}✓ {message}{RESET}")
    elif status == "error":
        print(f"{RED}✗ {message}{RESET}")
    elif status == "warning":
        print(f"{YELLOW}⚠ {message}{RESET}")
    else:
        print(f"{BLUE}→ {message}{RESET}")

def load_test_environment():
    """Load test environment variables."""
    print_status("Loading test environment variables...")
    
    # Find and load .env.test file
    env_test_path = Path(__file__).parent / '.env.test'
    if env_test_path.exists():
        load_dotenv(env_test_path, override=True)
        print_status(f"Loaded environment from {env_test_path}", "success")
    else:
        print_status(".env.test file not found, using defaults", "warning")
    
    # Set additional test environment variables
    os.environ['TESTING'] = 'true'
    os.environ['FLASK_ENV'] = 'testing'
    
    # Ensure test database URL is used
    if 'TEST_DATABASE_URL' in os.environ:
        os.environ['DATABASE_URL'] = os.environ['TEST_DATABASE_URL']

def check_postgres_connection():
    """Check if PostgreSQL test database is accessible."""
    print_status("Checking PostgreSQL connection...")
    
    db_url = os.environ.get('TEST_DATABASE_URL', '')
    if not db_url:
        print_status("TEST_DATABASE_URL not set", "error")
        return False
    
    # Try to connect using psycopg
    try:
        import psycopg
        conn = psycopg.connect(db_url)
        conn.close()
        print_status("PostgreSQL connection successful", "success")
        return True
    except ImportError:
        print_status("psycopg not installed, skipping database check", "warning")
        return True
    except Exception as e:
        print_status(f"PostgreSQL connection failed: {e}", "error")
        return False

def check_redis_connection():
    """Check if Redis test server is accessible."""
    print_status("Checking Redis connection...")
    
    redis_url = os.environ.get('TEST_REDIS_URL', '')
    if not redis_url:
        print_status("TEST_REDIS_URL not set", "error")
        return False
    
    # Try to connect using redis-py
    try:
        import redis
        r = redis.from_url(redis_url)
        r.ping()
        print_status("Redis connection successful", "success")
        return True
    except ImportError:
        print_status("redis not installed, skipping Redis check", "warning")
        return True
    except Exception as e:
        print_status(f"Redis connection failed: {e}", "error")
        return False

def run_integration_tests(test_args):
    """Run integration tests with pytest."""
    print_status("Running integration tests...")
    
    # Build pytest command
    pytest_cmd = [
        sys.executable, '-m', 'pytest',
        '-c', 'pytest.integration.ini',
        '-v',
        '--tb=short',
        '--color=yes'
    ]
    
    # Add any additional arguments passed to the script
    if test_args:
        pytest_cmd.extend(test_args)
    else:
        # Default to running all integration tests
        pytest_cmd.append('tests_integration/')
    
    print_status(f"Command: {' '.join(pytest_cmd)}")
    
    # Run pytest
    result = subprocess.run(pytest_cmd)
    
    return result.returncode

def main():
    """Main function to orchestrate test execution."""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}AniManga Recommender - Integration Test Runner{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    # Load test environment
    load_test_environment()
    
    # Check dependencies
    print_status("\nChecking test dependencies...")
    
    postgres_ok = check_postgres_connection()
    redis_ok = check_redis_connection()
    
    if not postgres_ok or not redis_ok:
        print_status("\nSome test dependencies are not available", "error")
        print_status("Make sure PostgreSQL and Redis test servers are running", "warning")
        print_status("You can start them with: docker-compose -f docker-compose.test.yml up -d", "info")
        
        # Ask user if they want to continue anyway
        response = input(f"\n{YELLOW}Continue anyway? (y/N): {RESET}")
        if response.lower() != 'y':
            print_status("Test run cancelled", "warning")
            return 1
    else:
        print_status("\nAll test dependencies are available", "success")
    
    # Run tests
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Running Integration Tests{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    # Get test arguments from command line
    test_args = sys.argv[1:] if len(sys.argv) > 1 else []
    
    # Run the tests
    exit_code = run_integration_tests(test_args)
    
    # Print summary
    print(f"\n{BLUE}{'='*60}{RESET}")
    if exit_code == 0:
        print_status("Integration tests completed successfully!", "success")
    else:
        print_status(f"Integration tests failed with exit code {exit_code}", "error")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())