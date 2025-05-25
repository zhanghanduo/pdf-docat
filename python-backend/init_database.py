#!/usr/bin/env python3
"""
Database initialization script for Replit PostgreSQL deployment
Run this once to set up your database tables
"""

import os
import sys
import logging
from pathlib import Path

# Add the app directory to Python path
sys.path.append(str(Path(__file__).parent))

from app.db.base import Base
from app.db.session import engine
from app.models import user  # Import all models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """Initialize PostgreSQL database with all tables"""
    try:
        # Check if DATABASE_URL is configured
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            logger.error("❌ DATABASE_URL environment variable not found!")
            logger.error("Please set your PostgreSQL connection string in Replit Secrets:")
            logger.error("DATABASE_URL=postgresql://user:pass@host:port/dbname?sslmode=require")
            return False
        
        if not database_url.startswith('postgresql://'):
            logger.error("❌ DATABASE_URL must be a PostgreSQL connection string!")
            return False
        
        logger.info("🔗 Connecting to PostgreSQL database...")
        logger.info(f"Database URL: {database_url.split('@')[0]}@***")
        
        # Create all tables
        logger.info("📋 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        logger.info("✅ Database initialization completed successfully!")
        logger.info("📊 Tables created:")
        for table_name in Base.metadata.tables.keys():
            logger.info(f"   - {table_name}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        logger.error("Please check your DATABASE_URL and network connection")
        return False

def check_database_connection():
    """Test database connection"""
    try:
        from sqlalchemy import text
        
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            logger.info(f"✅ Database connection successful!")
            logger.info(f"PostgreSQL version: {version}")
            return True
            
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

if __name__ == "__main__":
    logger.info("🚀 Starting database initialization for Replit...")
    
    # Check connection first
    if not check_database_connection():
        sys.exit(1)
    
    # Initialize database
    if init_database():
        logger.info("🎉 Database setup complete! Your application is ready to run.")
    else:
        logger.error("💥 Database setup failed!")
        sys.exit(1) 