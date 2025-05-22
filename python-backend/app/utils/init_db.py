import os
from sqlalchemy.orm import Session
from dotenv import load_dotenv

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


def create_default_users(db: Session) -> None:
    """
    Create default users if they don't exist
    """
    # Check if admin user exists with email
    admin_email = "admin@documind.ai"
    admin = user_service.get_user_by_email(db, admin_email)

    if not admin:
        admin_user = UserCreate(
            email=admin_email,
            password="Christlurker2",
            confirm_password="Christlurker2",
            name="Admin",
            role="admin",
            tier=settings.USER_TIERS["PRO"],
            credits_limit=settings.TIER_CREDITS["pro"],
            is_active=True
        )
        user_service.create_user(db, admin_user)
        print(f"Created admin user: {admin_email}")

    # Check if default user exists
    user_email = "user@documind.ai"
    user = user_service.get_user_by_email(db, user_email)

    if not user:
        default_user = UserCreate(
            email=user_email,
            password="user123",
            confirm_password="user123",
            name="Default User",
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
    init_db()
    print("Database initialization completed")
