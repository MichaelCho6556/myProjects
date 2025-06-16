#!/usr/bin/env python3
"""
Celery Beat Scheduler Startup Script for AniManga Recommender

This script starts Celery Beat scheduler to manage periodic background tasks
including recommendation updates, cache cleanup, and system monitoring.
Provides persistent scheduling that survives system restarts.

Usage:
    python scripts/start_scheduler.py [--mode dev|prod] [--schedule-file path]

Examples:
    # Start development scheduler with default settings
    python scripts/start_scheduler.py --mode dev
    
    # Start production scheduler with custom schedule file
    python scripts/start_scheduler.py --mode prod --schedule-file /var/lib/celery/beat-schedule
    
    # Test scheduler configuration without starting
    python scripts/start_scheduler.py --test-only
"""

import os
import sys
import argparse
import subprocess
import signal
import tempfile
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

def setup_environment():
    """Set up environment variables for Celery Beat scheduler"""
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

def get_scheduler_config(mode='dev', schedule_file=None):
    """
    Get Celery Beat scheduler configuration based on mode and parameters.
    
    Args:
        mode (str): 'dev' for development, 'prod' for production
        schedule_file (str): Path to persistent schedule file
        
    Returns:
        list: Celery Beat command arguments
    """
    
    # Base command
    cmd = ['celery', '-A', 'celery_app.celery_app', 'beat']
    
    # Schedule file configuration
    if schedule_file:
        beat_schedule_file = schedule_file
    elif mode == 'dev':
        # Use temporary directory for development
        temp_dir = tempfile.gettempdir()
        beat_schedule_file = os.path.join(temp_dir, 'celerybeat-schedule-dev')
    else:  # production
        # Use persistent location for production
        beat_schedule_file = '/var/lib/celery/celerybeat-schedule'
        
        # Create directory if it doesn't exist
        schedule_dir = os.path.dirname(beat_schedule_file)
        os.makedirs(schedule_dir, exist_ok=True)
    
    cmd.extend(['--schedule', beat_schedule_file])
    
    # Logging configuration
    if mode == 'dev':
        cmd.extend(['--loglevel', 'info'])
    else:
        cmd.extend(['--loglevel', 'warning'])
    
    # Scheduler configuration
    cmd.extend([
        '--scheduler', 'celery.beat:PersistentScheduler',
        '--pidfile', '',  # Don't create pidfile
    ])
    
    # Additional production configurations
    if mode == 'prod':
        # Add production-specific options
        cmd.extend([
            '--detach',  # Run in background (can be overridden)
        ])
    
    return cmd, beat_schedule_file

def test_redis_connection():
    """Test Redis connection before starting scheduler"""
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
        print("Please ensure Redis server is running before starting scheduler.")
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
        print("Please ensure all dependencies are installed and modules are accessible.")
        return False

def test_scheduled_tasks():
    """Test that scheduled tasks are properly configured"""
    try:
        from celery_app import celery_app
        
        beat_schedule = celery_app.conf.beat_schedule
        if not beat_schedule:
            print("❌ No scheduled tasks configured")
            return False
        
        print("✅ Scheduled tasks configured:")
        for task_name, config in beat_schedule.items():
            print(f"  - {task_name}: {config['task']} (schedule: {config['schedule']})")
        
        return True
    except Exception as e:
        print(f"❌ Error checking scheduled tasks: {e}")
        return False

def check_schedule_file_permissions(schedule_file):
    """Check if schedule file location is writable"""
    try:
        schedule_dir = os.path.dirname(schedule_file)
        
        # Check if directory exists and is writable
        if os.path.exists(schedule_dir):
            if not os.access(schedule_dir, os.W_OK):
                print(f"❌ Schedule directory not writable: {schedule_dir}")
                return False
        else:
            # Try to create directory
            try:
                os.makedirs(schedule_dir, exist_ok=True)
                print(f"✅ Created schedule directory: {schedule_dir}")
            except PermissionError:
                print(f"❌ Cannot create schedule directory: {schedule_dir}")
                return False
        
        # Test file creation
        test_file = f"{schedule_file}.test"
        try:
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
            print(f"✅ Schedule file location is writable: {schedule_file}")
            return True
        except Exception:
            print(f"❌ Cannot write to schedule file location: {schedule_file}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking schedule file permissions: {e}")
        return False

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    print(f"\n🛑 Received signal {signum}. Shutting down scheduler gracefully...")
    sys.exit(0)

def main():
    """Main scheduler startup function"""
    parser = argparse.ArgumentParser(description='Start Celery Beat scheduler for AniManga Recommender')
    parser.add_argument('--mode', choices=['dev', 'prod'], default='dev',
                       help='Scheduler mode: dev for development, prod for production')
    parser.add_argument('--schedule-file', type=str,
                       help='Path to persistent schedule file')
    parser.add_argument('--test-only', action='store_true',
                       help='Only test configuration and connections, don\'t start scheduler')
    parser.add_argument('--foreground', action='store_true',
                       help='Run in foreground (override production detach)')
    
    args = parser.parse_args()
    
    print("📅 Starting AniManga Recommender Celery Beat Scheduler")
    print(f"Mode: {args.mode}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 50)
    
    # Set up environment
    setup_environment()
    
    # Get scheduler configuration
    scheduler_cmd, schedule_file = get_scheduler_config(args.mode, args.schedule_file)
    
    # Override detach if foreground requested
    if args.foreground and '--detach' in scheduler_cmd:
        scheduler_cmd.remove('--detach')
    
    print("🔍 Testing system requirements...")
    
    # Test connections and imports
    if not test_redis_connection():
        sys.exit(1)
    
    if not test_imports():
        sys.exit(1)
    
    if not test_scheduled_tasks():
        sys.exit(1)
    
    if not check_schedule_file_permissions(schedule_file):
        sys.exit(1)
    
    if args.test_only:
        print("✅ All tests passed! Scheduler is ready to start.")
        print(f"Schedule file: {schedule_file}")
        return
    
    print("🎯 Scheduler Configuration:")
    print(f"Command: {' '.join(scheduler_cmd)}")
    print(f"Schedule file: {schedule_file}")
    print("-" * 50)
    
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        print("⏰ Starting Celery Beat scheduler...")
        print("Scheduled tasks will run automatically according to configuration")
        print("Press Ctrl+C to stop the scheduler gracefully")
        print("=" * 50)
        
        # Start the scheduler
        subprocess.run(scheduler_cmd, check=True)
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Scheduler failed to start: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Scheduler shutdown requested by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)
    
    print("✅ Scheduler shutdown complete")

if __name__ == '__main__':
    main()