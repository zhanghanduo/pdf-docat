import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
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
    from app.utils.init_db import init_db
    init_db()
    print("Database initialized with default data")

    # Run the application
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=True
    )
