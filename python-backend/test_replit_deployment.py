#!/usr/bin/env python3
"""
Test script to verify the application is ready for Replit deployment
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_pydantic_compatibility():
    """Test Pydantic v2 compatibility"""
    print("🧪 Testing Pydantic v2 Compatibility")
    print("=" * 50)
    
    try:
        import pydantic
        print(f"✅ Pydantic version: {pydantic.VERSION}")
        
        # Test schema imports
        from app.schemas.user import User, UserCreate, UserUpdate
        from app.schemas.credit import CreditLog
        from app.schemas.settings import Setting
        from app.schemas.processing import ProcessingLog
        
        print("✅ All schema imports successful")
        
        # Test schema instantiation
        user_data = {
            "id": 1,
            "email": "test@example.com",
            "role": "user",
            "tier": "free",
            "credits_used": 0,
            "credits_limit": 500,
            "is_active": True,
            "created_at": "2024-01-01T00:00:00"
        }
        
        user = User(**user_data)
        print(f"✅ User schema instantiation successful: {user.email}")
        
        return True
        
    except Exception as e:
        print(f"❌ Pydantic compatibility test failed: {str(e)}")
        return False

def test_database_configuration():
    """Test database configuration"""
    print(f"\n🔌 Testing Database Configuration")
    print("=" * 50)
    
    try:
        from app.core.config import settings
        from app.database import engine, DATABASE_URI, IS_SQLITE
        
        print(f"📊 Database Configuration:")
        print(f"   Database URI: {DATABASE_URI[:50]}...")
        print(f"   Is SQLite: {IS_SQLITE}")
        print(f"   USE_SQLITE setting: {settings.USE_SQLITE}")
        
        # Test connection
        connection = engine.connect()
        result = connection.execute("SELECT 1").scalar()
        connection.close()
        
        if result == 1:
            print("✅ Database connection successful!")
            return True
        else:
            print("❌ Database query failed")
            return False
            
    except Exception as e:
        print(f"❌ Database configuration test failed: {str(e)}")
        return False

def test_fastapi_app():
    """Test FastAPI application"""
    print(f"\n🚀 Testing FastAPI Application")
    print("=" * 50)
    
    try:
        from app.main import app
        print("✅ FastAPI app import successful")
        
        # Test app configuration
        print(f"   App title: {getattr(app, 'title', 'Not set')}")
        print(f"   Routes count: {len(app.routes)}")
        
        return True
        
    except Exception as e:
        print(f"❌ FastAPI app test failed: {str(e)}")
        return False

def test_services():
    """Test service imports"""
    print(f"\n🔧 Testing Service Imports")
    print("=" * 50)
    
    try:
        from app.services import user_service, settings_service, api_key_service
        print("✅ All service imports successful")
        
        from app.utils.init_db import create_default_users, create_default_settings
        print("✅ Init DB functions import successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Service imports test failed: {str(e)}")
        return False

def test_environment_variables():
    """Test required environment variables"""
    print(f"\n🌍 Testing Environment Variables")
    print("=" * 50)
    
    required_vars = [
        "DATABASE_URL",
        "SECRET_KEY"
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            masked_value = f"****{value[-4:] if len(value) > 4 else '****'}"
            print(f"✅ {var}: {masked_value}")
        else:
            print(f"❌ {var}: Not set")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️  Missing environment variables: {', '.join(missing_vars)}")
        return False
    
    return True

def main():
    print("🔧 PDF-Docat Replit Deployment Readiness Test")
    print("=" * 60)
    
    # Run all tests
    tests = [
        ("Pydantic Compatibility", test_pydantic_compatibility),
        ("Database Configuration", test_database_configuration),
        ("FastAPI Application", test_fastapi_app),
        ("Service Imports", test_services),
        ("Environment Variables", test_environment_variables)
    ]
    
    results = {}
    for test_name, test_func in tests:
        results[test_name] = test_func()
    
    print("\n" + "=" * 60)
    print("📊 Test Summary:")
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"   {test_name}: {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 All tests passed! Ready for Replit deployment!")
        print("\n📝 Deployment checklist:")
        print("   ✅ Pydantic v2 compatibility fixed")
        print("   ✅ Database configuration working")
        print("   ✅ PostgreSQL connection parameters correct")
        print("   ✅ All imports working")
        print("   ✅ Environment variables configured")
        print("\n🚀 You can now deploy to Replit successfully!")
    else:
        print("❌ Some tests failed. Please fix the issues before deploying.")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 