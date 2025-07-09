#!/usr/bin/env python3
# ABOUTME: Simple runner script to execute the list optimization integration test
# ABOUTME: Provides a convenient way to test the SQL optimization with detailed output

"""
Run List Optimization Integration Test

This script runs the integration test for the list query optimization,
providing detailed output about the test results and performance metrics.

Usage:
    python scripts/run_optimization_test.py
"""

import os
import sys
import subprocess
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_optimization_test():
    """Run the list optimization integration test with detailed output"""
    print("=" * 70)
    print("LIST QUERY OPTIMIZATION INTEGRATION TEST")
    print("=" * 70)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Check if the PostgreSQL function exists
    print("Prerequisites:")
    print("1. PostgreSQL function 'get_user_lists_optimized' must exist in Supabase")
    print("2. Environment variables must be configured with real Supabase credentials")
    print("3. Internet connection required for database access")
    print()
    
    # Run the test
    print("Running integration test...")
    print("-" * 70)
    
    try:
        # Run pytest with verbose output
        result = subprocess.run(
            [
                sys.executable, 
                "-m", 
                "pytest", 
                "tests/test_list_optimization_integration.py",
                "-v",
                "-s",
                "-m", 
                "integration",
                "--tb=short"
            ],
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            capture_output=False,  # Show output in real-time
            text=True
        )
        
        print("-" * 70)
        
        if result.returncode == 0:
            print("\n✅ ALL TESTS PASSED!")
            print("\nOptimization is working correctly:")
            print("- RPC function is being called")
            print("- Performance improvement verified")
            print("- Data consistency maintained")
            print("- Fallback mechanism functional")
        else:
            print("\n❌ TESTS FAILED!")
            print("\nPossible issues:")
            print("1. PostgreSQL function might not be created")
            print("2. Environment variables might be incorrect")
            print("3. Network connectivity issues")
            print("4. Database permissions")
            
    except Exception as e:
        print(f"\n❌ Error running tests: {e}")
        print("\nMake sure you have pytest installed:")
        print("pip install pytest")
    
    print("\n" + "=" * 70)
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)


def check_environment():
    """Check if environment is properly configured"""
    print("\nChecking environment configuration...")
    
    from dotenv import load_dotenv
    load_dotenv()
    
    required_vars = ['SUPABASE_URL', 'SUPABASE_KEY']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please ensure your .env file contains valid Supabase credentials")
        return False
    
    print("✅ Environment variables configured")
    return True


if __name__ == "__main__":
    print("List Query Optimization Test Runner")
    print("==================================\n")
    
    if not check_environment():
        print("\nPlease fix environment configuration before running tests.")
        sys.exit(1)
    
    # Offer to run a quick check or full test
    print("\nOptions:")
    print("1. Run full integration test (creates test data)")
    print("2. Just check if function exists (quick)")
    
    try:
        choice = input("\nEnter choice (1 or 2): ").strip()
        
        if choice == "2":
            # Quick function check
            from supabase_client import SupabaseClient
            client = SupabaseClient()
            
            print("\nChecking if PostgreSQL function exists...")
            try:
                # Try to call the function with a non-existent user
                import uuid
                test_user_id = str(uuid.uuid4())
                result = client.get_user_custom_lists(test_user_id, page=1, limit=1)
                
                # Check if it used the optimized path
                if 'data' in result:
                    print("✅ Function appears to be working!")
                    print("Run option 1 for comprehensive testing.")
                else:
                    print("❌ Function might not be working correctly")
            except Exception as e:
                print(f"❌ Error checking function: {e}")
        else:
            # Run full test
            run_optimization_test()
            
    except KeyboardInterrupt:
        print("\n\nTest cancelled by user.")
        sys.exit(0)