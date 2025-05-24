from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app.core.config import settings

# Check if we're using SQLite to conditionally handle PostgreSQL imports
USE_SQLITE = settings.USE_SQLITE

# Conditionally import PostgreSQL-specific modules
if not USE_SQLITE:
    try:
        import psycopg2
    except ImportError:
        print("Warning: psycopg2 not available. Install it for PostgreSQL support: pip install psycopg2-binary")
        print("Falling back to SQLite...")
        USE_SQLITE = True
        # Update the database URI to use SQLite
        import pathlib
        backend_dir = pathlib.Path(__file__).parent.parent.parent
        db_path = backend_dir / "pdf_docat.db"
        DATABASE_URI = f"sqlite:///{db_path}"
    else:
        DATABASE_URI = settings.SQLALCHEMY_DATABASE_URI
else:
    DATABASE_URI = settings.SQLALCHEMY_DATABASE_URI

# Create engine based on database type
if USE_SQLITE:
    # SQLite configuration
    engine = create_engine(
        DATABASE_URI,
        connect_args={"check_same_thread": False},  # Needed for SQLite
        echo=False  # Set to True for SQL query logging
    )
else:
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URI,
        pool_pre_ping=True,  # Verify connections before use
        echo=False  # Set to True for SQL query logging
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
