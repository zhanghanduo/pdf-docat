#!/usr/bin/env python3
"""
Migration script to move credentials from .env file to database settings
"""

import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.services import settings_service

# Load environment variables
load_dotenv()


def migrate_env_to_db():
    """
    Migrate environment variables to database settings
    """
    db = SessionLocal()
    
    try:
        print("🔄 Starting migration of environment variables to database...")
        
        # Define which environment variables should be moved to database
        credentials_to_migrate = {
            # API Keys
            "OPENROUTER_API_KEY": {
                "description": "OpenRouter API key for AI model access",
                "sensitive": True
            },
            "GEMINI_API_KEY_POOL": {
                "description": "Gemini API key pool for translation services (comma-separated)",
                "sensitive": True
            },
            "GEMINI_API_KEY": {
                "description": "Single Gemini API key for translation services (legacy)",
                "sensitive": True
            },
            
            # Application Settings
            "PROJECT_NAME": {
                "description": "Application project name",
                "sensitive": False
            },
            "ACCESS_TOKEN_EXPIRE_MINUTES": {
                "description": "JWT token expiration time in minutes",
                "sensitive": False
            },
            "BACKEND_CORS_ORIGINS": {
                "description": "Allowed CORS origins for the backend API",
                "sensitive": False
            },
            "ALLOWED_HOSTS": {
                "description": "Allowed hosts for the application",
                "sensitive": False
            },
            "PDF_SERVICE_URL": {
                "description": "PDF processing service URL",
                "sensitive": False
            },
            "LOG_LEVEL": {
                "description": "Application logging level",
                "sensitive": False
            },
            
            # Credit and tier configuration
            "MAX_FILE_SIZE": {
                "description": "Maximum file size for uploads (bytes)",
                "sensitive": False
            },
            "MAX_DAILY_PROCESSING": {
                "description": "Maximum number of PDFs a user can process per day",
                "sensitive": False
            }
        }
        
        migrated_count = 0
        skipped_count = 0
        
        for env_key, config in credentials_to_migrate.items():
            env_value = os.getenv(env_key)
            
            if env_value:
                # Check if setting already exists in database
                existing_setting = settings_service.get_setting(db, env_key)
                
                if existing_setting and existing_setting.value:
                    print(f"⏭️  Skipping {env_key}: Already exists in database")
                    skipped_count += 1
                    continue
                
                # Migrate to database
                settings_service.set_setting(
                    db=db,
                    key=env_key,
                    value=env_value,
                    description=config["description"]
                )
                
                if config["sensitive"]:
                    print(f"🔐 Migrated {env_key}: ****{env_value[-4:] if len(env_value) > 4 else '****'}")
                else:
                    print(f"✅ Migrated {env_key}: {env_value}")
                
                migrated_count += 1
            else:
                print(f"⚠️  Skipping {env_key}: Not found in environment variables")
        
        print(f"\n📊 Migration Summary:")
        print(f"   ✅ Migrated: {migrated_count} settings")
        print(f"   ⏭️  Skipped: {skipped_count} settings")
        
        # Update API key pools from database
        print("\n🔄 Updating API key pools from database...")
        from app.services.api_key_service import update_api_key_pool_from_db
        update_api_key_pool_from_db(db)
        
        print("\n✅ Migration completed successfully!")
        print("\n📝 Next steps:")
        print("   1. Verify settings in the database using the admin panel")
        print("   2. Test API functionality to ensure keys work correctly")
        print("   3. Remove migrated credentials from .env file (keep DATABASE_URL, SECRET_KEY)")
        print("   4. Keep critical infrastructure settings in .env (DATABASE_URL, USE_SQLITE, etc.)")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


def create_env_backup():
    """
    Create a backup of the current .env file
    """
    env_file = ".env"
    backup_file = ".env.backup"
    
    if os.path.exists(env_file):
        with open(env_file, 'r') as original:
            content = original.read()
        
        with open(backup_file, 'w') as backup:
            backup.write(content)
        
        print(f"📁 Created backup: {backup_file}")
    else:
        print(f"⚠️  No .env file found to backup")


def generate_cleaned_env():
    """
    Generate a cleaned .env file with only essential infrastructure settings
    """
    essential_settings = [
        "# Essential infrastructure settings (keep these in .env)",
        "DATABASE_URL=postgresql://neondb_owner:npg_IRvdV0ZcSE7f@ep-broad-flower-a6bbiqas.us-west-2.aws.neon.tech/neondb?sslmode=require",
        "",
        "# Database Configuration",
        "USE_SQLITE=False",
        "POSTGRES_SERVER=ep-broad-flower-a6bbiqas.us-west-2.aws.neon.tech",
        "POSTGRES_USER=neondb_owner", 
        "POSTGRES_PASSWORD=npg_IRvdV0ZcSE7f",
        "POSTGRES_DB=neondb",
        "",
        "# Security (should remain in environment for bootstrap)",
        "SECRET_KEY=christtc1",
        "",
        "# User initialization (can be removed after first run)",
        "ADMIN_EMAIL=admin@so-cat.top",
        "ADMIN_PASSWORD=Christlurker@2",
        "ADMIN_NAME=Administrator",
        "DEFAULT_USER_EMAIL=handuo@so-cat.top",
        "DEFAULT_USER_PASSWORD=christtc1",
        "DEFAULT_USER_NAME=Default User",
        "",
        "# Application settings are now managed in database",
        "# Use the admin panel to update API keys and other settings"
    ]
    
    cleaned_env_file = ".env.cleaned"
    with open(cleaned_env_file, 'w') as f:
        f.write('\n'.join(essential_settings))
    
    print(f"📄 Generated cleaned .env template: {cleaned_env_file}")


if __name__ == "__main__":
    print("🔧 Environment to Database Migration Tool")
    print("=" * 50)
    
    # Create backup first
    create_env_backup()
    
    # Run migration
    migrate_env_to_db()
    
    # Generate cleaned .env template
    generate_cleaned_env()
    
    print("\n" + "=" * 50)
    print("🎉 Migration process completed!") 