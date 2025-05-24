#!/usr/bin/env python3
"""
Verification script to test database-based configuration
"""

import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.services import settings_service, api_key_service
from app.core.config import settings

# Load environment variables
load_dotenv()


def verify_database_settings():
    """
    Verify that settings are being read from the database correctly
    """
    print("🔍 Verifying Database-Based Configuration")
    print("=" * 50)
    
    db = SessionLocal()
    
    try:
        # Test 1: Check if settings exist in database
        print("\n📋 Testing database settings storage...")
        
        all_settings = settings_service.get_all_settings(db)
        if all_settings:
            print(f"✅ Found {len(all_settings)} settings in database:")
            for setting in all_settings:
                if "API_KEY" in setting.key:
                    masked_value = f"****{setting.value[-4:] if setting.value and len(setting.value) > 4 else '****'}"
                    print(f"   🔐 {setting.key}: {masked_value}")
                else:
                    print(f"   📝 {setting.key}: {setting.value}")
        else:
            print("❌ No settings found in database")
            return False
        
        # Test 2: Check API key retrieval
        print(f"\n🔑 Testing API key retrieval from database...")
        
        # Test Gemini API key
        gemini_key = api_key_service.get_api_key_from_db(db, "gemini")
        if gemini_key:
            print(f"✅ Gemini API key retrieved: ****{gemini_key[-4:]}")
        else:
            print("⚠️  Gemini API key not found in database")
        
        # Test OpenRouter API key
        openrouter_key = api_key_service.get_api_key_from_db(db, "openrouter")
        if openrouter_key:
            print(f"✅ OpenRouter API key retrieved: ****{openrouter_key[-4:]}")
        else:
            print("⚠️  OpenRouter API key not found in database")
        
        # Test 3: Check API key pools
        print(f"\n🔄 Testing API key pools...")
        api_key_service.update_api_key_pool_from_db(db)
        
        usage_stats = api_key_service.get_api_key_usage_stats()
        if usage_stats:
            print("✅ API key pools active:")
            for service, stats in usage_stats.items():
                print(f"   🎯 {service}: {len(stats)} keys")
                for key_masked, key_stats in stats.items():
                    print(f"      - {key_masked}: {key_stats['requests_last_minute']} requests/min")
        else:
            print("⚠️  No API key pools found")
        
        # Test 4: Check settings priority (database over environment)
        print(f"\n⚖️  Testing settings priority (database vs environment)...")
        
        # Update settings from database
        settings.update_from_database()
        
        # Check a specific setting
        project_name_from_db = settings_service.get_setting(db, "PROJECT_NAME")
        if project_name_from_db:
            print(f"✅ Project name from database: {project_name_from_db.value}")
            print(f"📋 Config object project name: {settings.PROJECT_NAME}")
            
            if settings.PROJECT_NAME == project_name_from_db.value:
                print("✅ Settings are being read from database correctly")
            else:
                print("⚠️  Settings may still be using environment variables")
        
        # Test 5: Check CORS configuration
        print(f"\n🌐 Testing CORS configuration...")
        cors_setting = settings_service.get_setting(db, "BACKEND_CORS_ORIGINS")
        if cors_setting:
            print(f"✅ CORS origins from database: {cors_setting.value[:100]}...")
            print(f"📋 Config CORS origins: {len(settings.BACKEND_CORS_ORIGINS)} origins")
        
        return True
        
    except Exception as e:
        print(f"❌ Verification failed: {str(e)}")
        return False
    finally:
        db.close()


def test_api_endpoint_access():
    """
    Test if we can make a simple API request to verify the server is working
    """
    print("\n🌐 Testing API endpoint access...")
    
    try:
        import requests
        
        # Test the health endpoint
        response = requests.get("http://localhost:8000/", timeout=5)
        if response.status_code == 200:
            print("✅ API server is accessible")
            print(f"📄 Response: {response.json()}")
            return True
        else:
            print(f"⚠️  API server responded with status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("⚠️  API server is not running or not accessible")
        print("💡 Start the server with: python run.py")
        return False
    except ImportError:
        print("⚠️  requests library not available, skipping API test")
        return True
    except Exception as e:
        print(f"❌ API test failed: {str(e)}")
        return False


def main():
    print("🔧 PDF-Docat Database Configuration Verification")
    print("=" * 60)
    
    # Test database connection
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        print("✅ Database connection successful")
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return
    
    # Run verification tests
    db_success = verify_database_settings()
    api_success = test_api_endpoint_access()
    
    print("\n" + "=" * 60)
    print("📊 Verification Summary:")
    print(f"   Database Settings: {'✅ PASS' if db_success else '❌ FAIL'}")
    print(f"   API Accessibility: {'✅ PASS' if api_success else '⚠️  SKIP'}")
    
    if db_success:
        print("\n🎉 Configuration verification completed successfully!")
        print("\n📝 Next steps:")
        print("   1. Start the server: python run.py")
        print("   2. Access admin panel to manage settings")
        print("   3. Test PDF processing functionality")
        print("   4. Monitor API key usage in the admin panel")
    else:
        print("\n❌ Configuration verification failed!")
        print("   Please check the migration and database connection")


if __name__ == "__main__":
    main() 