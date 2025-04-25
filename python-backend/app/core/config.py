from typing import Any, Dict, List, Optional, Union
from pydantic import AnyHttpUrl, BaseSettings, PostgresDsn, validator


class Settings(BaseSettings):
    PROJECT_NAME: str = "PDF-Docat"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    # 60 minutes * 24 hours * 8 days = 8 days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Database Configuration
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "pdf_docat"
    SQLALCHEMY_DATABASE_URI: Optional[PostgresDsn] = None

    @validator("SQLALCHEMY_DATABASE_URI", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return PostgresDsn.build(
            scheme="postgresql",
            user=values.get("POSTGRES_USER"),
            password=values.get("POSTGRES_PASSWORD"),
            host=values.get("POSTGRES_SERVER"),
            path=f"/{values.get('POSTGRES_DB') or ''}",
        )
    
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
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
