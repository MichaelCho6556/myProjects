#!/usr/bin/env python3
"""
Celery Worker Startup Script for AniManga Recommender

This script starts Celery workers to process background recommendation tasks.
Supports different configurations for development and production environments
with optimal settings for performance and reliability.

UPDATED: Added Windows-specific optimizations to prevent process handle errors.

Usage:
    python scripts/start_worker.py [--mode dev|prod] [--queues queue1,queue2] [--concurrency N]

Examples:
    # Start development worker with all queues
    python scripts/start_worker.py --mode dev
    
    # Start production worker with specific queues
    python scripts/start_worker.py --mode prod --queues recommendations,cache_warming --concurrency 8
    
    # Start worker for specific queue only
    python scripts/start_worker.py --queues recommendations
"""

import os
import sys
import argparse
import subprocess
import signal
import platform
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

def setup_environment():
    """Set up environment variables for Celery worker"""
    # Ensure Redis connection variables are set
    if not os.getenv('REDIS_HOST'):
        os.environ['REDIS_HOST'] = 'localhost'
    if not os.getenv('REDIS_PORT'):
        os.environ['REDIS_PORT'] = '6379'
    if not os.getenv('REDIS_DB'):
        os.environ['REDIS_DB'] = '0'
    
    # Set Celery configuration
    os.environ['CELERY_BROKER_URL'] = f"redis://{os.getenv('REDIS_HOST')}:{os.getenv('REDIS_PORT')}/{os.getenv('REDIS_DB')}"
    os.environ['CELERY_RESULT_BACKEND'] = f"redis://{os.getenv('REDIS_HOST')}:{os.getenv('REDIS_PORT')}/{int(os.getenv('REDIS_DB')) + 1}"

def get_worker_config(mode='dev', queues=None, concurrency=None):
    """
    Get Celery worker configuration based on mode and parameters.
    
    Args:
        mode (str): 'dev' for development, 'prod' for production
        queues (str): Comma-separated list of queues to process
        concurrency (int): Number of concurrent worker processes
        
    Returns:
        list: Celery command arguments
    """
    
    # Base command
    cmd = ['celery', '-A', 'celery_app.celery_app', 'worker']
    
    # Queue configuration
    if queues:
        queue_list = queues
    elif mode == 'dev':
        queue_list = 'recommendations,cache_warming,scheduling,maintenance'
    else:  # production
        queue_list = 'recommendations,cache_warming'  # Focus on core tasks
    
    cmd.extend(['--queues', queue_list])
    
    # Concurrency configuration
    if concurrency:
        worker_concurrency = concurrency
    elif mode == 'dev':
        worker_concurrency = 2  # Light for development
    else:  # production
        worker_concurrency = 4  # Optimize for production load
    
    cmd.extend(['--concurrency', str(worker_concurrency)])
    
    # Logging configuration
    if mode == 'dev':
        cmd.extend(['--loglevel', 'info'])
    else:
        cmd.extend(['--loglevel', 'warning'])
    
    # Windows-specific optimizations to prevent handle errors
    is_windows = platform.system().lower() == 'windows'
    
    if is_windows:
        # Use thread pool instead of process pool on Windows
        cmd.extend(['--pool', 'threads'])
        print("🪟 Windows detected: Using thread pool to prevent handle errors")
    else:
        # Use process pool on Unix systems
        cmd.extend(['--pool', 'prefork'])
    
    # Performance optimizations
    base_optimizations = [
        '--prefetch-multiplier', '1',  # Prevent memory issues
        '--max-tasks-per-child', '1000',  # Restart workers periodically
        '--time-limit', '300',  # 5 minute task timeout
    ]
    
    # Add soft timeout only for non-Windows systems
    if not is_windows:
        base_optimizations.extend(['--soft-time-limit', '240'])  # 4 minute soft timeout
    else:
        print("🪟 Skipping soft timeout (not supported on Windows)")
    
    cmd.extend(base_optimizations)
    
    # Additional production optimizations
    if mode == 'prod':
        cmd.extend(['--optimization', 'fair'])
        
        # Windows-specific production settings
        if is_windows:
            # Lower concurrency for thread pool stability
            if not concurrency:
                cmd[-1] = '2'  # Override concurrency to 2 for Windows prod
            print("🪟 Windows production: Using lower concurrency for stability")
    
    return cmd

def test_redis_connection():
    """Test Redis connection before starting worker"""
    try:
        import redis
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        
        r = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        r.ping()
        print(f"✅ Redis connection successful: {redis_host}:{redis_port}")
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print("Please ensure Redis server is running before starting workers.")
        return False

def test_imports():
    """Test that required modules can be imported"""
    try:
        from celery_app import celery_app
        from tasks.recommendation_tasks import precompute_user_recommendations
        from tasks.scheduling_tasks import schedule_recommendation_updates
        print("✅ All required modules imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Please ensure all dependencies are installed and app.py is accessible.")
        return False

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    print(f"\n🛑 Received signal {signum}. Shutting down worker gracefully...")
    sys.exit(0)

def main():
    """Main worker startup function"""
    parser = argparse.ArgumentParser(description='Start Celery worker for AniManga Recommender')
    parser.add_argument('--mode', choices=['dev', 'prod'], default='dev',
                       help='Worker mode: dev for development, prod for production')
    parser.add_argument('--queues', type=str,
                       help='Comma-separated list of queues to process')
    parser.add_argument('--concurrency', type=int,
                       help='Number of concurrent worker processes')
    parser.add_argument('--test-only', action='store_true',
                       help='Only test connections and imports, don\'t start worker')
    parser.add_argument('--force-threads', action='store_true',
                       help='Force use of thread pool (recommended for Windows)')
    
    args = parser.parse_args()
    
    # Show platform information
    print("🚀 Starting AniManga Recommender Celery Worker")
    print(f"Platform: {platform.system()} {platform.release()}")
    print(f"Mode: {args.mode}")
    print(f"Queues: {args.queues or 'default for mode'}")
    print(f"Concurrency: {args.concurrency or 'default for mode'}")
    print("-" * 50)
    
    # Set up environment
    setup_environment()
    
    # Test connections and imports
    print("🔍 Testing system requirements...")
    
    if not test_redis_connection():
        sys.exit(1)
    
    if not test_imports():
        sys.exit(1)
    
    if args.test_only:
        print("✅ All tests passed! Worker is ready to start.")
        return
    
    # Get worker configuration
    worker_cmd = get_worker_config(args.mode, args.queues, args.concurrency)
    
    # Force threads if requested
    if args.force_threads:
        # Replace any existing pool setting
        for i, arg in enumerate(worker_cmd):
            if arg == '--pool':
                worker_cmd[i + 1] = 'threads'
                break
        else:
            worker_cmd.extend(['--pool', 'threads'])
        print("🧵 Forced thread pool mode")
    
    print("🎯 Worker Configuration:")
    print(f"Command: {' '.join(worker_cmd)}")
    print("-" * 50)
    
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        print("🔄 Starting Celery worker...")
        print("Press Ctrl+C to stop the worker gracefully")
        print("=" * 50)
        
        # Start the worker
        subprocess.run(worker_cmd, check=True)
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Worker failed to start: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Worker shutdown requested by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)
    
    print("✅ Worker shutdown complete")

if __name__ == '__main__':
    main()