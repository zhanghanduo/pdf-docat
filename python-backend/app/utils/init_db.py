import os
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import secrets
import string

from app.database import SessionLocal
from app.services import user_service, settings_service, api_key_service
from app.schemas.user import UserCreate
from app.core.config import settings

# Load environment variables
load_dotenv()


def init_db() -> None:
    """
    Initialize the database with default data
    """
    db = SessionLocal()
    try:
        # Create default admin user
        create_default_users(db)

        # Create default settings
        create_default_settings(db)

        # Initialize API key pools
        api_key_service.initialize_api_key_pools()

    finally:
        db.close()


def generate_secure_password(length: int = 16) -> str:
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def create_default_users(db: Session) -> None:
    """
    Create default users if they don't exist
    IMPORTANT: Use environment variables for credentials!
    """
    # Check if admin user exists with email
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@documind.ai")
    admin = user_service.get_user_by_email(db, admin_email)

    if not admin:
        # Get admin password from environment or generate secure one
        admin_password = os.environ.get("ADMIN_PASSWORD")
        if not admin_password:
            admin_password = generate_secure_password()
            print("=" * 50)
            print("🚨 SECURITY WARNING: No ADMIN_PASSWORD environment variable set!")
            print(f"Generated secure admin password: {admin_password}")
            print("⚠️  SAVE THIS PASSWORD IMMEDIATELY!")
            print("⚠️  Set ADMIN_PASSWORD environment variable for production!")
            print("=" * 50)
        
        admin_user = UserCreate(
            email=admin_email,
            password=admin_password,
            confirm_password=admin_password,
            name=os.environ.get("ADMIN_NAME", "Admin"),
            role="admin",
            tier=settings.USER_TIERS["PRO"],
            credits_limit=settings.TIER_CREDITS["pro"],
            is_active=True
        )
        user_service.create_user(db, admin_user)
        print(f"Created admin user: {admin_email}")

    # Check if default user exists
    user_email = os.environ.get("DEFAULT_USER_EMAIL", "user@documind.ai")
    user = user_service.get_user_by_email(db, user_email)

    if not user:
        # Get default user password from environment or generate secure one
        user_password = os.environ.get("DEFAULT_USER_PASSWORD")
        if not user_password:
            user_password = generate_secure_password()
            print("=" * 50)
            print("🚨 SECURITY WARNING: No DEFAULT_USER_PASSWORD environment variable set!")
            print(f"Generated secure default user password: {user_password}")
            print("⚠️  SAVE THIS PASSWORD IMMEDIATELY!")
            print("⚠️  Set DEFAULT_USER_PASSWORD environment variable for production!")
            print("=" * 50)
        
        default_user = UserCreate(
            email=user_email,
            password=user_password,
            confirm_password=user_password,
            name=os.environ.get("DEFAULT_USER_NAME", "Default User"),
            role="user",
            tier=settings.USER_TIERS["FREE"],
            credits_limit=settings.TIER_CREDITS["free"],
            is_active=True
        )
        user_service.create_user(db, default_user)
        print(f"Created default user: {user_email}")


def create_default_settings(db: Session) -> None:
    """
    Create default settings if they don't exist
    """
    # OpenRouter API Key
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    if openrouter_key:
        settings_service.set_setting(
            db,
            "OPENROUTER_API_KEY",
            openrouter_key,
            "OpenRouter API key for AI model access"
        )
        print("Set OpenRouter API key from environment")

    # Gemini API Key Pool
    gemini_keys = os.environ.get("GEMINI_API_KEY_POOL", os.environ.get("GEMINI_API_KEYS", ""))
    if gemini_keys:
        settings_service.set_setting(
            db,
            "GEMINI_API_KEY_POOL",
            gemini_keys,
            "Gemini API key pool for translation services"
        )
        print(f"Set Gemini API key pool from environment with {len(gemini_keys.split(','))} keys")

    # For backward compatibility, also check for single Gemini API Key
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key and not gemini_keys:
        settings_service.set_setting(
            db,
            "GEMINI_API_KEY",
            gemini_key,
            "Gemini API key for translation services (legacy)"
        )
        print("Set single Gemini API key from environment")


if __name__ == "__main__":
    print("Initializing database...")
    
    # Security check
    if not os.environ.get("ADMIN_PASSWORD") or not os.environ.get("DEFAULT_USER_PASSWORD"):
        print("🚨 SECURITY WARNING: Running without secure passwords!")
        print("🔒 Recommended: Set ADMIN_PASSWORD and DEFAULT_USER_PASSWORD environment variables")
    
    init_db()
    print("Database initialization completed")
