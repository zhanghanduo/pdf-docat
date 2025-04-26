#!/bin/bash
# Script to set up the Python backend environment

echo "Setting up PDF-Docat Python Backend..."

# Create and activate virtual environment
echo "Creating Python virtual environment..."
python3 -m venv python_env
source python_env/bin/activate

# Upgrade pip and install wheel
echo "Upgrading pip and installing wheel..."
pip install --upgrade pip setuptools wheel

# Install backend dependencies
echo "Installing backend dependencies..."
cd python-backend
pip install -r requirements.txt

# Initialize and update PDFMathTranslate submodule
echo "Initializing PDFMathTranslate submodule..."
git submodule update --init --recursive

# Install PDFMathTranslate
echo "Installing PDFMathTranslate..."
pip install -e ../PDFMathTranslate

# Create compatibility helper modules
echo "Creating compatibility helper modules..."
cat > mock_pymupdf.py << EOL
"""
Mock module for pymupdf that redirects to fitz
"""
import sys
from types import ModuleType

try:
    # Try to import fitz (the actual PyMuPDF module)
    import fitz

    # Create a mock module for pymupdf
    class MockPyMuPDF(ModuleType):
        def __getattr__(self, name):
            # Redirect all attribute access to fitz
            return getattr(fitz, name)

    # Create the mock module
    mock_pymupdf = MockPyMuPDF('pymupdf')

    # Add it to sys.modules
    sys.modules['pymupdf'] = mock_pymupdf

    print("Mock pymupdf module created and redirected to fitz")
except ImportError:
    print("Warning: Could not import fitz, mock pymupdf module not created")
EOL

# Create a wrapper for PDFMathTranslate
echo "Creating PDFMathTranslate wrapper..."
mkdir -p app/services
cat > app/services/pdf_wrapper.py << EOL
"""
Wrapper module for PDFMathTranslate to handle import errors gracefully
"""
import os
import tempfile
from typing import Dict, Any, Optional

# Flag to track if PDFMathTranslate is available
pdf_translate_available = False

try:
    # Try to import PDFMathTranslate modules
    from pdf2zh.high_level import translate
    from pdf2zh.config import ConfigManager
    from pdf2zh.translator import GeminiTranslator

    # If imports succeed, set the flag to True
    pdf_translate_available = True
except ImportError as e:
    print(f"Warning: PDFMathTranslate import failed: {e}")
    print("PDF translation functionality will be limited")


def process_pdf_file(
    file_path: str,
    engine: str,
    target_language: Optional[str] = None,
    translate_enabled: bool = False,
    dual_language: bool = False,
) -> Dict[str, Any]:
    """
    Process a PDF file using PDFMathTranslate

    Returns a dictionary with processing results or error information
    """
    if not pdf_translate_available:
        return {
            "success": False,
            "error": "PDFMathTranslate is not available",
            "details": "The required dependencies could not be imported"
        }

    try:
        # Process the PDF using PDFMathTranslate
        result = translate(
            file_path,
            target_language=target_language if translate_enabled else None,
            dual_language=dual_language if translate_enabled else False,
            engine=engine
        )

        return {
            "success": True,
            "result": result,
            "pages": result.get("pages", 0),
            "engine": engine
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "details": f"Error processing PDF: {str(e)}"
        }


def estimate_page_count(file_path: str) -> int:
    """
    Estimate the number of pages in a PDF file
    """
    if not pdf_translate_available:
        # Return a default value if PDFMathTranslate is not available
        return 1

    try:
        # Use PyMuPDF to estimate page count
        # Note: PyMuPDF is installed as 'pymupdf' but imported as 'fitz'
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            return len(doc)
        except ImportError:
            print("Warning: fitz (PyMuPDF) import failed, using default page count")
            return 1
    except Exception as e:
        # Return a default value if estimation fails
        print(f"Error estimating page count: {str(e)}")
        return 1
EOL

# Create a custom startup script
echo "Creating custom startup script..."
cat > start_server.py << EOL
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
        reload=False
    )
EOL

# Create database tables (if using SQLite)
echo "Initializing database..."
python start_server.py

echo "Backend setup complete!"
echo "To activate the environment in the future, run: source python_env/bin/activate"
echo "To start the backend server, run: cd python-backend && python start_server.py"
