#!/usr/bin/env python3
"""
Manual scheduled task runner for AniManga Recommender.

This script allows running scheduled tasks manually for testing or one-off execution.
All tasks are now synchronous API calls to compute endpoints.

Usage:
    python run_scheduled_task.py platform-stats
    python run_scheduled_task.py all-user-stats
    python run_scheduled_task.py popular-lists
    python run_scheduled_task.py cache-cleanup
    python run_scheduled_task.py all  # Run all tasks
"""

import os
import sys
import requests
import argparse
from datetime import datetime
from typing import Dict, Any, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_URL = os.getenv('API_URL', 'http://localhost:5000')
API_KEY = os.getenv('API_KEY', 'test-key')


def call_compute_endpoint(endpoint: str, method: str = 'POST') -> Dict[str, Any]:
    """Call a compute endpoint and return the response."""
    url = f"{API_URL}/api/compute/{endpoint}"
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    
    print(f"[{datetime.now()}] Calling {method} {url}")
    
    try:
        response = requests.request(method, url, headers=headers, timeout=300)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error calling {endpoint}: {e}")
        return {'error': str(e)}


def run_platform_stats():
    """Update platform-wide statistics."""
    print("Updating platform statistics...")
    result = call_compute_endpoint('platform-stats')
    if 'error' not in result:
        print(f"✓ Platform stats updated: {result.get('data', {})}")
    else:
        print(f"✗ Failed: {result['error']}")


def run_all_user_stats():
    """Update statistics for all users."""
    print("Updating all user statistics...")
    result = call_compute_endpoint('all-user-stats')
    if 'error' not in result:
        data = result.get('data', {})
        print(f"✓ Updated stats for {data.get('processed', 0)} users")
        print(f"  Failed: {data.get('failed', 0)}")
    else:
        print(f"✗ Failed: {result['error']}")


def run_popular_lists():
    """Calculate popular/trending lists."""
    print("Calculating popular lists...")
    result = call_compute_endpoint('popular-lists')
    if 'error' not in result:
        lists = result.get('data', [])
        print(f"✓ Found {len(lists)} popular lists")
    else:
        print(f"✗ Failed: {result['error']}")


def run_cache_cleanup():
    """Clean up expired cache entries."""
    print("Cleaning up expired cache...")
    result = call_compute_endpoint('cleanup-cache')
    if 'error' not in result:
        data = result.get('data', {})
        print(f"✓ Cleaned {data.get('memory_cleaned', 0)} memory entries")
        print(f"✓ Cleaned {data.get('database_cleaned', 0)} database entries")
    else:
        print(f"✗ Failed: {result['error']}")


def check_health():
    """Check compute endpoints health."""
    print("Checking compute endpoints health...")
    result = call_compute_endpoint('health', method='GET')
    if 'error' not in result:
        print(f"✓ Status: {result.get('status', 'unknown')}")
        print(f"  Active tasks: {result.get('active_tasks', 0)}")
    else:
        print(f"✗ Failed: {result['error']}")


# Task mapping
TASKS = {
    'platform-stats': run_platform_stats,
    'all-user-stats': run_all_user_stats,
    'popular-lists': run_popular_lists,
    'cache-cleanup': run_cache_cleanup,
    'health': check_health,
}


def main():
    parser = argparse.ArgumentParser(
        description='Run scheduled tasks for AniManga Recommender'
    )
    parser.add_argument(
        'task',
        choices=list(TASKS.keys()) + ['all'],
        help='Task to run (or "all" to run all tasks)'
    )
    parser.add_argument(
        '--api-url',
        default=API_URL,
        help='API URL (default: from env or localhost:5000)'
    )
    parser.add_argument(
        '--api-key',
        default=API_KEY,
        help='API key for authentication'
    )
    
    args = parser.parse_args()
    
    # Update globals if provided
    global API_URL, API_KEY
    API_URL = args.api_url
    API_KEY = args.api_key
    
    print(f"AniManga Scheduled Task Runner")
    print(f"API URL: {API_URL}")
    print(f"{'=' * 50}\n")
    
    if args.task == 'all':
        # Run all tasks except health check
        for task_name, task_func in TASKS.items():
            if task_name != 'health':
                task_func()
                print()
    else:
        # Run specific task
        task_func = TASKS[args.task]
        task_func()
    
    print(f"\n{'=' * 50}")
    print("Task execution completed")


if __name__ == '__main__':
    main()