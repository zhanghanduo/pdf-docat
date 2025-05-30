from typing import Dict, List, Optional
import os
import json
from dotenv import load_dotenv
import pathlib

# Load environment variables
load_dotenv()

# Simple settings class without pydantic to avoid validation issues
class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "PDF-Docat")
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")

    # Parse ACCESS_TOKEN_EXPIRE_MINUTES
    try:
        token_expire_str = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")
        if "#" in token_expire_str:
            token_expire_str = token_expire_str.split("#")[0].strip()
        ACCESS_TOKEN_EXPIRE_MINUTES: int = int(token_expire_str)
    except (ValueError, TypeError):
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # Default to 7 days

    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[str] = []
    cors_origins = os.getenv("BACKEND_CORS_ORIGINS", "")
    if cors_origins:
        if cors_origins.startswith("[") and cors_origins.endswith("]"):
            try:
                BACKEND_CORS_ORIGINS = json.loads(cors_origins)
            except json.JSONDecodeError:
                BACKEND_CORS_ORIGINS = ["http://localhost:3000", "http://localhost:8000", "http://localhost:5173"]
        else:
            BACKEND_CORS_ORIGINS = [i.strip() for i in cors_origins.split(",")]

    # Database Configuration
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "pdf_docat")

    # Check if USE_SQLITE is set to True
    USE_SQLITE: bool = os.getenv("USE_SQLITE", "").lower() == "true"

    # Build database URI - Priority: DATABASE_URL > constructed URI > SQLite fallback
    SQLALCHEMY_DATABASE_URI: str = os.getenv("DATABASE_URL", "") or os.getenv("SQLALCHEMY_DATABASE_URI", "")
    if not SQLALCHEMY_DATABASE_URI:
        if USE_SQLITE:
            # Use SQLite database within the python-backend directory
            backend_dir = pathlib.Path(__file__).parent.parent.parent
            db_path = backend_dir / "pdf_docat.db"
            SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
        else:
            SQLALCHEMY_DATABASE_URI = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}/{POSTGRES_DB}"

    # User Tiers
    USER_TIERS: Dict[str, str] = {
        "FREE": "free",
        "PLUS": "plus",
        "PRO": "pro"
    }

    # Credit limits per tier
    TIER_CREDITS: Dict[str, int] = {
        "free": 500,
        "plus": 50000,
        "pro": 1000000
    }

    # Credit costs per page type
    CREDIT_COSTS: Dict[str, int] = {
        "SCANNED": 5,
        "STRUCTURED": 1
    }

    # PDF Processing
    MAX_FILE_SIZE: int = 25 * 1024 * 1024  # 25MB in bytes
    MAX_DAILY_PROCESSING: int = 20  # Maximum number of PDFs a user can process per day
    MAX_PAGE_COUNT: Dict[str, int] = {
        "admin": 200,
        "user": 100
    }

    # Engine types
    ENGINE_TYPES: List[str] = ["auto", "mistral-ocr", "pdf-text", "native"]

    # Target languages
    TARGET_LANGUAGES: List[str] = [
        "english",
        "simplified-chinese",
        "traditional-chinese",
        "german",
        "japanese",
        "spanish",
        "french"
    ]

    def get_setting_from_db_or_env(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """
        Get a setting from database first, then fallback to environment variable
        This method should be called after database is initialized
        """
        try:
            from app.database import SessionLocal
            from app.services import settings_service
            
            db = SessionLocal()
            try:
                setting = settings_service.get_setting(db, key)
                if setting and setting.value:
                    return setting.value
            finally:
                db.close()
        except Exception:
            # If database is not available, fall back to environment
            pass
        
        # Fallback to environment variable
        return os.getenv(key, default)

    def update_from_database(self) -> None:
        """
        Update settings from database if available
        Call this after database initialization
        """
        try:
            from app.database import SessionLocal
            from app.services import settings_service
            
            db = SessionLocal()
            try:
                # Update dynamic settings from database
                
                # Project settings
                project_name = self.get_setting_from_db_or_env("PROJECT_NAME")
                if project_name:
                    self.PROJECT_NAME = project_name
                
                # Token expiration
                token_expire = self.get_setting_from_db_or_env("ACCESS_TOKEN_EXPIRE_MINUTES")
                if token_expire:
                    try:
                        self.ACCESS_TOKEN_EXPIRE_MINUTES = int(token_expire)
                    except ValueError:
                        pass
                
                # CORS origins
                cors_origins = self.get_setting_from_db_or_env("BACKEND_CORS_ORIGINS")
                if cors_origins:
                    if cors_origins.startswith("[") and cors_origins.endswith("]"):
                        try:
                            self.BACKEND_CORS_ORIGINS = json.loads(cors_origins)
                        except json.JSONDecodeError:
                            pass
                    else:
                        self.BACKEND_CORS_ORIGINS = [i.strip() for i in cors_origins.split(",")]
                
                # File size and processing limits
                max_file_size = self.get_setting_from_db_or_env("MAX_FILE_SIZE")
                if max_file_size:
                    try:
                        self.MAX_FILE_SIZE = int(max_file_size)
                    except ValueError:
                        pass
                
                max_daily = self.get_setting_from_db_or_env("MAX_DAILY_PROCESSING")
                if max_daily:
                    try:
                        self.MAX_DAILY_PROCESSING = int(max_daily)
                    except ValueError:
                        pass
                        
            finally:
                db.close()
        except Exception:
            # If database is not available, continue with environment values
            pass

settings = Settings()
