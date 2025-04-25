# PDF-Docat Python Backend

This is the Python backend for the PDF-Docat application, which provides PDF processing and translation services.

## Features

- User authentication and authorization
- PDF processing with PDFMathTranslate
- Credit system for tracking usage
- Admin panel for user and settings management
- API key management for external services
- Comprehensive API documentation

## Technology Stack

- **FastAPI**: High-performance web framework
- **SQLAlchemy**: SQL toolkit and ORM
- **Pydantic**: Data validation and settings management
- **JWT**: Authentication with JSON Web Tokens
- **PDFMathTranslate**: PDF processing and translation
- **Uvicorn/Gunicorn**: ASGI server

## Getting Started

### Prerequisites

- Python 3.8+
- PostgreSQL
- PDFMathTranslate repository

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pdf-docat.git
   cd pdf-docat/python-backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Install PDFMathTranslate:
   ```bash
   pip install -e ../PDFMathTranslate
   ```

5. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. Run the application:
   ```bash
   uvicorn app.main:app --reload
   ```

7. Access the API documentation:
   ```
   http://localhost:8000/docs
   ```

### Database Migrations

The application uses Alembic for database migrations:

```bash
# Initialize migrations
alembic init alembic

# Create a migration
alembic revision --autogenerate -m "Initial migration"

# Run migrations
alembic upgrade head
```

## API Documentation

The API documentation is available at `/docs` when the application is running. It provides a comprehensive overview of all available endpoints and their parameters.

## Project Structure

```
app/
├── __init__.py
├── main.py                 # FastAPI application entry point
├── database.py             # Database connection and session management
├── models/                 # SQLAlchemy models
│   ├── __init__.py
│   ├── user.py
│   ├── processing_log.py
│   ├── credit_log.py
│   └── setting.py
├── schemas/                # Pydantic schemas for request/response validation
│   ├── __init__.py
│   ├── user.py
│   ├── auth.py
│   ├── processing.py
│   └── settings.py
├── api/                    # API routes
│   ├── __init__.py
│   ├── deps.py             # Dependency injection
│   ├── v1/                 # API version 1
│   │   ├── __init__.py
│   │   ├── endpoints/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── pdf.py
│   │   │   ├── credits.py
│   │   │   └── settings.py
│   │   └── router.py       # Main router for v1 API
├── core/                   # Core functionality
│   ├── __init__.py
│   ├── security.py         # Authentication and security
│   ├── config.py           # Configuration settings
│   └── logging.py          # Logging configuration
├── services/               # Business logic
│   ├── __init__.py
│   ├── user_service.py
│   ├── pdf_service.py
│   ├── credit_service.py
│   └── settings_service.py
└── utils/                  # Utility functions
    ├── __init__.py
    └── pdf_utils.py
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
