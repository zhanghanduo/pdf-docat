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

# Create a backup of the original .env file
cp python-backend/.env python-backend/.env.bak

# Update the .env file to use SQLite
sed -i 's/USE_SQLITE=.*/USE_SQLITE=True/g' python-backend/.env

# If USE_SQLITE doesn't exist in the .env file, add it
if ! grep -q "USE_SQLITE" python-backend/.env; then
    echo "USE_SQLITE=True" >> python-backend/.env
fi

echo "Configuration complete!"
echo "The backend will now use SQLite instead of PostgreSQL."
echo "To revert to the original configuration, run:"
echo "  cp python-backend/app/database.py.bak python-backend/app/database.py"
echo "  cp python-backend/.env.bak python-backend/.env"
