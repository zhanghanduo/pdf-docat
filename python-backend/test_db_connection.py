#!/usr/bin/env python3
"""
Test script to verify database connection after fixing the configuration
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_database_configuration():
    """Test database configuration and connection"""
    print("🧪 Testing Database Configuration")
    print("=" * 50)
    
    try:
        # Import configuration
        from app.core.config import settings
        from app.database import engine, DATABASE_URI, IS_SQLITE
        
        print(f"📊 Database Configuration:")
        print(f"   Database URI: {DATABASE_URI[:50]}...")
        print(f"   Is SQLite: {IS_SQLITE}")
        print(f"   USE_SQLITE setting: {settings.USE_SQLITE}")
        
        # Test basic connection
        print(f"\n🔌 Testing Database Connection...")
        connection = engine.connect()
        
        # Execute a simple query
        result = connection.execute("SELECT 1").scalar()
        connection.close()
        
        if result == 1:
            print("✅ Database connection successful!")
            print("✅ Query execution successful!")
            return True
        else:
            print("❌ Query returned unexpected result")
            return False
            
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        print(f"   Error type: {type(e).__name__}")
        return False

def test_table_creation():
    """Test creating database tables"""
    print(f"\n🏗️  Testing Table Creation...")
    
    try:
        # Import models
        from app.models.user import User
        from app.models.processing_log import ProcessingLog
        from app.models.credit_log import CreditLog
        from app.models.setting import Setting
        
        # Create tables
        from app.database import Base, engine
        Base.metadata.create_all(bind=engine)
        
        print("✅ Database tables created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Table creation failed: {str(e)}")
        return False

def main():
    print("🔧 PDF-Docat Database Connection Test")
    print("=" * 60)
    
    # Test configuration
    config_success = test_database_configuration()
    
    # Test table creation if connection works
    table_success = False
    if config_success:
        table_success = test_table_creation()
    
    print("\n" + "=" * 60)
    print("📊 Test Summary:")
    print(f"   Database Connection: {'✅ PASS' if config_success else '❌ FAIL'}")
    print(f"   Table Creation: {'✅ PASS' if table_success else '❌ FAIL'}")
    
    if config_success and table_success:
        print("\n🎉 Database configuration is working correctly!")
        print("   You should be able to deploy to Replit successfully now.")
    else:
        print("\n❌ Database configuration needs attention!")
        print("   Please check the error messages above.")

if __name__ == "__main__":
    main() 