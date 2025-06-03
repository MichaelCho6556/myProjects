#!/usr/bin/env python3
"""
Debug script to verify Flask setup in Docker
"""
import sys

def verify_flask_environment():
    """Verify all Flask-related imports and environment"""
    try:
        print("🔍 Verifying Flask environment...")
        
        # Test Flask import
        import flask
        print(f"✅ Flask: {flask.__version__}")
        
        # Test JWT import (the problem child)
        import jwt
        print(f"✅ JWT: {jwt.__version__}")
        
        # Test other critical imports
        import supabase
        print("✅ Supabase: OK")
        
        import pandas as pd
        print(f"✅ Pandas: {pd.__version__}")
        
        import numpy as np  
        print(f"✅ NumPy: {np.__version__}")
        
        # Test app import
        try:
            from app import app
            print("✅ App import: OK")
            print(f"✅ Flask app name: {app.name}")
        except Exception as e:
            print(f"❌ App import failed: {e}")
            return False
            
        print("\n🎉 All Flask environment checks passed!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == '__main__':
    success = verify_flask_environment()
    sys.exit(0 if success else 1)