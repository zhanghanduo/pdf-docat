import uvicorn
import os
import logging
from dotenv import load_dotenv
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

# Rename the uvicorn loggers to make the output clearer
logging.getLogger("uvicorn.error").name = "uvicorn.server"
logging.getLogger("uvicorn.access").name = "uvicorn.http"

# Import the mock modules
import mock_pymupdf

# Load environment variables
load_dotenv()

# Import all models to ensure they are registered with the Base metadata
from app.models.user import User
from app.models.processing_log import ProcessingLog
from app.models.credit_log import CreditLog
from app.models.setting import Setting

# Create database tables
from app.database import Base, engine
Base.metadata.create_all(bind=engine)
print("Database tables created")

# Initialize database with default data
from app.utils.init_db import create_default_users, create_default_settings
from app.database import SessionLocal

# Initialize database with default data
db = SessionLocal()
try:
    create_default_users(db)
    create_default_settings(db)
    print("Database initialized with default data")
finally:
    db.close()

# Start the server
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=True
    )