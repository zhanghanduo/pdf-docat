#!/bin/bash
# Script to configure the backend to use SQLite instead of PostgreSQL

echo "Configuring backend to use SQLite..."

# Create a backup of the original database.py file
cp python-backend/app/database.py python-backend/app/database.py.bak

# Modify the database.py file to use SQLite
cat > python-backend/app/database.py << EOL
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

from app.core.config import settings

# Use SQLite for development
SQLALCHEMY_DATABASE_URL = "sqlite:///./pdf_docat.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator:
    """
    Dependency for getting DB session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
EOL

# Create a backup of the original config.py file
cp python-backend/app/core/config.py python-backend/app/core/config.py.bak

# Modify the config.py file to support SQLite
sed -i 's/@validator("SQLALCHEMY_DATABASE_URI", pre=True)/# @validator("SQLALCHEMY_DATABASE_URI", pre=True)/g' python-backend/app/core/config.py
sed -i 's/def assemble_db_connection(cls, v: Optional\[str\], values: Dict\[str, Any\]) -> Any:/# def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:/g' python-backend/app/core/config.py
sed -i '/# def assemble_db_connection/,/)/s/^/# /' python-backend/app/core/config.py

echo "Configuration complete!"
echo "The backend will now use SQLite instead of PostgreSQL."
echo "To revert to the original configuration, run:"
echo "  cp python-backend/app/database.py.bak python-backend/app/database.py"
echo "  cp python-backend/app/core/config.py.bak python-backend/app/core/config.py"
