#!/usr/bin/env python3
"""
Celery Task Management and Monitoring Tool for AniManga Recommender

Administrative tool for managing background tasks, monitoring system health,
and performing maintenance operations on the Celery task system.

Usage:
    python scripts/manage_tasks.py <command> [options]

Commands:
    status          - Show system status and active tasks
    purge           - Purge task queues
    trigger         - Manually trigger specific tasks
    monitor         - Real-time task monitoring
    health          - System health check
    stats           - Performance statistics

Examples:
    # Check system status
    python scripts/manage_tasks.py status
    
    # Manually trigger recommendation updates for specific user
    python scripts/manage_tasks.py trigger --task recommendations --user-id 123
    
    # Purge all queues
    python scripts/manage_tasks.py purge --all
    
    # Real-time monitoring
    python scripts/manage_tasks.py monitor --interval 5
"""

import os
import sys
import argparse
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

def setup_environment():
    """Set up environment variables"""
    if not os.getenv('REDIS_HOST'):
        os.environ['REDIS_HOST'] = 'localhost'
    if not os.getenv('REDIS_PORT'):
        os.environ['REDIS_PORT'] = '6379'
    if not os.getenv('REDIS_DB'):
        os.environ['REDIS_DB'] = '0'

def get_celery_app():
    """Get configured Celery application"""
    try:
        from celery_app import celery_app
        return celery_app
    except ImportError as e:
        print(f"❌ Failed to import Celery app: {e}")
        sys.exit(1)

def get_redis_client():
    """Get Redis client for direct operations"""
    try:
        import redis
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        redis_db = int(os.getenv('REDIS_DB', 0))
        
        return redis.Redis(host=redis_host, port=redis_port, db=redis_db, decode_responses=True)
    except Exception as e:
        print(f"❌ Failed to connect to Redis: {e}")
        sys.exit(1)

def show_system_status():
    """Show overall system status"""
    print("🔍 AniManga Recommender Task System Status")
    print("=" * 50)
    
    celery_app = get_celery_app()
    redis_client = get_redis_client()
    
    # Test Redis connection
    try:
        redis_client.ping()
        print("✅ Redis: Connected")
    except Exception as e:
        print(f"❌ Redis: Connection failed - {e}")
        return
    
    # Check active workers
    try:
        inspect = celery_app.control.inspect()
        active_workers = inspect.active()
        
        if active_workers:
            print(f"✅ Workers: {len(active_workers)} active")
            for worker_name, tasks in active_workers.items():
                print(f"  - {worker_name}: {len(tasks)} active tasks")
        else:
            print("⚠️  Workers: No active workers found")
    except Exception as e:
        print(f"❌ Workers: Cannot inspect - {e}")
    
    # Check queue lengths
    try:
        queues = ['recommendations', 'cache_warming', 'scheduling', 'maintenance', 'monitoring']
        print("\n📊 Queue Status:")
        
        total_queued = 0
        for queue in queues:
            length = redis_client.llen(queue)
            total_queued += length
            status = "✅" if length == 0 else "⚠️" if length < 10 else "❌"
            print(f"  {status} {queue}: {length} tasks")
        
        print(f"\nTotal queued tasks: {total_queued}")
    except Exception as e:
        print(f"❌ Queue status: Cannot check - {e}")
    
    # Check scheduled tasks
    try:
        scheduled = inspect.scheduled()
        if scheduled:
            total_scheduled = sum(len(tasks) for tasks in scheduled.values())
            print(f"⏰ Scheduled tasks: {total_scheduled}")
        else:
            print("⏰ Scheduled tasks: None")
    except Exception as e:
        print(f"❌ Scheduled tasks: Cannot check - {e}")

def show_active_tasks():
    """Show detailed active task information"""
    print("🔄 Active Tasks")
    print("-" * 30)
    
    celery_app = get_celery_app()
    
    try:
        inspect = celery_app.control.inspect()
        active_tasks = inspect.active()
        
        if not active_tasks:
            print("No active tasks")
            return
        
        for worker_name, tasks in active_tasks.items():
            print(f"\n🖥️  Worker: {worker_name}")
            if not tasks:
                print("  No active tasks")
                continue
            
            for task in tasks:
                print(f"  📋 Task: {task['name']}")
                print(f"     ID: {task['id']}")
                print(f"     Started: {datetime.fromtimestamp(task['time_start']).strftime('%H:%M:%S')}")
                if 'args' in task and task['args']:
                    print(f"     Args: {task['args']}")
    except Exception as e:
        print(f"❌ Error getting active tasks: {e}")

def purge_queues(queue_names: Optional[List[str]] = None, all_queues: bool = False):
    """Purge specified queues or all queues"""
    celery_app = get_celery_app()
    
    if all_queues:
        queue_names = ['recommendations', 'cache_warming', 'scheduling', 'maintenance', 'monitoring']
    elif not queue_names:
        print("❌ Please specify queue names or use --all flag")
        return
    
    print(f"🗑️  Purging queues: {', '.join(queue_names)}")
    
    total_purged = 0
    for queue_name in queue_names:
        try:
            purged = celery_app.control.purge_queue(queue_name)
            if purged:
                count = purged[0]['ok']
                total_purged += count
                print(f"  ✅ {queue_name}: {count} tasks purged")
            else:
                print(f"  ⚠️  {queue_name}: No response from workers")
        except Exception as e:
            print(f"  ❌ {queue_name}: Error - {e}")
    
    print(f"\nTotal tasks purged: {total_purged}")

def trigger_task(task_name: str, **kwargs):
    """Manually trigger a specific task"""
    celery_app = get_celery_app()
    
    # Map friendly names to actual task names
    task_mapping = {
        'recommendations': 'tasks.scheduling_tasks.schedule_recommendation_updates',
        'cache_cleanup': 'tasks.scheduling_tasks.cleanup_stale_caches',
        'user_recommendations': 'tasks.recommendation_tasks.precompute_user_recommendations',
        'batch_recommendations': 'tasks.recommendation_tasks.batch_precompute_recommendations',
        'cache_warming': 'tasks.recommendation_tasks.warm_user_cache',
        'monitor': 'tasks.scheduling_tasks.monitor_task_performance'
    }
    
    actual_task_name = task_mapping.get(task_name, task_name)
    
    print(f"🚀 Triggering task: {actual_task_name}")
    
    try:
        # Filter kwargs to remove None values
        filtered_kwargs = {k: v for k, v in kwargs.items() if v is not None}
        
        if task_name == 'user_recommendations' and 'user_id' in filtered_kwargs:
            # Trigger user-specific recommendation update
            result = celery_app.send_task(actual_task_name, args=[filtered_kwargs['user_id']])
        elif task_name == 'batch_recommendations' and 'user_ids' in filtered_kwargs:
            # Trigger batch recommendation update
            user_ids = [int(id.strip()) for id in filtered_kwargs['user_ids'].split(',')]
            result = celery_app.send_task(actual_task_name, args=[user_ids])
        else:
            # Trigger task with keyword arguments
            result = celery_app.send_task(actual_task_name, kwargs=filtered_kwargs)
        
        print(f"✅ Task queued successfully")
        print(f"   Task ID: {result.id}")
        print(f"   Status: {result.status}")
        
        return result
    except Exception as e:
        print(f"❌ Failed to trigger task: {e}")
        return None

def monitor_tasks(interval: int = 5):
    """Real-time task monitoring"""
    print(f"📊 Real-time Task Monitoring (refresh interval: {interval}s)")
    print("Press Ctrl+C to stop monitoring")
    print("=" * 50)
    
    try:
        while True:
            # Clear screen (works on most terminals)
            os.system('cls' if os.name == 'nt' else 'clear')
            
            print(f"📊 Task Monitor - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print("=" * 50)
            
            show_system_status()
            print("\n")
            show_active_tasks()
            
            print(f"\n⏳ Next update in {interval} seconds... (Ctrl+C to stop)")
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print("\n🛑 Monitoring stopped by user")

def health_check():
    """Comprehensive system health check"""
    print("🏥 System Health Check")
    print("=" * 30)
    
    health_score = 0
    max_score = 6
    
    # Check Redis connection
    try:
        redis_client = get_redis_client()
        redis_client.ping()
        print("✅ Redis connection: Healthy")
        health_score += 1
    except Exception as e:
        print(f"❌ Redis connection: Failed - {e}")
    
    # Check Celery app configuration
    try:
        celery_app = get_celery_app()
        if celery_app.conf.beat_schedule:
            print("✅ Celery configuration: Healthy")
            health_score += 1
        else:
            print("⚠️  Celery configuration: No scheduled tasks")
    except Exception as e:
        print(f"❌ Celery configuration: Failed - {e}")
    
    # Check worker availability
    try:
        celery_app = get_celery_app()
        inspect = celery_app.control.inspect()
        active_workers = inspect.active()
        
        if active_workers:
            print(f"✅ Workers: {len(active_workers)} active")
            health_score += 1
        else:
            print("⚠️  Workers: No active workers")
    except Exception as e:
        print(f"❌ Workers: Cannot inspect - {e}")
    
    # Check queue sizes
    try:
        redis_client = get_redis_client()
        queues = ['recommendations', 'cache_warming', 'scheduling', 'maintenance']
        total_queued = sum(redis_client.llen(queue) for queue in queues)
        
        if total_queued < 100:
            print(f"✅ Queue sizes: Normal ({total_queued} total)")
            health_score += 1
        else:
            print(f"⚠️  Queue sizes: High ({total_queued} total)")
    except Exception as e:
        print(f"❌ Queue sizes: Cannot check - {e}")
    
    # Check task imports
    try:
        from tasks.recommendation_tasks import precompute_user_recommendations
        from tasks.scheduling_tasks import schedule_recommendation_updates
        print("✅ Task imports: Successful")
        health_score += 1
    except ImportError as e:
        print(f"❌ Task imports: Failed - {e}")
    
    # Check database connectivity (if using Supabase)
    try:
        from supabase_client import get_supabase_admin_client
        supabase = get_supabase_admin_client()
        # Simple test query
        result = supabase.table('users').select('id').limit(1).execute()
        print("✅ Database connection: Healthy")
        health_score += 1
    except Exception as e:
        print(f"❌ Database connection: Failed - {e}")
    
    # Overall health assessment
    health_percentage = (health_score / max_score) * 100
    print(f"\n🎯 Overall Health Score: {health_score}/{max_score} ({health_percentage:.1f}%)")
    
    if health_percentage >= 80:
        print("✅ System Status: Healthy")
    elif health_percentage >= 60:
        print("⚠️  System Status: Warning")
    else:
        print("❌ System Status: Critical")

def show_stats():
    """Show performance statistics"""
    print("📈 Performance Statistics")
    print("=" * 30)
    
    redis_client = get_redis_client()
    
    try:
        # Redis statistics
        redis_info = redis_client.info()
        print(f"📊 Redis Memory Usage: {redis_info.get('used_memory_human', 'N/A')}")
        print(f"📊 Redis Connected Clients: {redis_info.get('connected_clients', 'N/A')}")
        print(f"📊 Redis Total Commands: {redis_info.get('total_commands_processed', 'N/A')}")
        
        # Queue statistics
        queues = ['recommendations', 'cache_warming', 'scheduling', 'maintenance']
        print(f"\n📋 Queue Statistics:")
        for queue in queues:
            length = redis_client.llen(queue)
            print(f"  {queue}: {length} tasks")
        
        # Task completion statistics (if available)
        try:
            celery_app = get_celery_app()
            inspect = celery_app.control.inspect()
            
            # Get reserved tasks
            reserved = inspect.reserved()
            if reserved:
                total_reserved = sum(len(tasks) for tasks in reserved.values())
                print(f"\n⏰ Reserved Tasks: {total_reserved}")
            
        except Exception as e:
            print(f"⚠️  Task statistics unavailable: {e}")
            
    except Exception as e:
        print(f"❌ Error getting statistics: {e}")

def main():
    """Main function for task management"""
    parser = argparse.ArgumentParser(description='Celery Task Management Tool')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Show system status')
    status_parser.add_argument('--detailed', action='store_true', help='Show detailed information')
    
    # Purge command
    purge_parser = subparsers.add_parser('purge', help='Purge task queues')
    purge_parser.add_argument('--queues', nargs='+', help='Specific queues to purge')
    purge_parser.add_argument('--all', action='store_true', help='Purge all queues')
    
    # Trigger command
    trigger_parser = subparsers.add_parser('trigger', help='Manually trigger tasks')
    trigger_parser.add_argument('--task', required=True, 
                               choices=['recommendations', 'cache_cleanup', 'user_recommendations', 
                                       'batch_recommendations', 'cache_warming', 'monitor'],
                               help='Task to trigger')
    trigger_parser.add_argument('--user-id', type=int, help='User ID for user-specific tasks')
    trigger_parser.add_argument('--user-ids', type=str, help='Comma-separated user IDs for batch tasks')
    
    # Monitor command
    monitor_parser = subparsers.add_parser('monitor', help='Real-time task monitoring')
    monitor_parser.add_argument('--interval', type=int, default=5, help='Refresh interval in seconds')
    
    # Health command
    subparsers.add_parser('health', help='System health check')
    
    # Stats command
    subparsers.add_parser('stats', help='Performance statistics')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Set up environment
    setup_environment()
    
    # Execute command
    try:
        if args.command == 'status':
            show_system_status()
            if args.detailed:
                print("\n")
                show_active_tasks()
        
        elif args.command == 'purge':
            purge_queues(args.queues, args.all)
        
        elif args.command == 'trigger':
            trigger_task(args.task, user_id=args.user_id, user_ids=args.user_ids)
        
        elif args.command == 'monitor':
            monitor_tasks(args.interval)
        
        elif args.command == 'health':
            health_check()
        
        elif args.command == 'stats':
            show_stats()
    
    except Exception as e:
        print(f"❌ Error executing command: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
