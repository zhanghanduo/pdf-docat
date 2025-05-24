# PDF-Docat - PDF Content Extraction and Translation

PDF-Docat is a sophisticated PDF content extraction platform that leverages AI-powered OCR technology and intelligent document processing, with advanced rendering and user-friendly interfaces. It now features a Python backend with direct integration of PDFMathTranslate for improved structured PDF processing.

## Features

- **AI-Powered OCR**: Leverages Mistral-OCR via OpenRouter API for advanced content extraction of scanned PDFs
- **PDFMathTranslate Integration**: Uses PDFMathTranslate v2-rc and BabelDOC for structured PDF processing with math support
- **Smart PDF Detection**: Automatically identifies scanned vs. structured PDFs and applies the optimal processing method
- **Intelligent Table Detection**: Automatically identifies and extracts tables with proper formatting
- **Translation Support**: Convert extracted content to multiple languages including Chinese, English, Japanese, and more
- **Multi-language UI**: Application interface available in Chinese (default) and English
- **Caching System**: Avoid reprocessing duplicate files with SHA-256 based file caching
- **User Management**: Admin interface for managing user access
- **Rate Limiting**: Prevents abuse with tiered rate limiting

## Tech Stack

- **Frontend**: React with TypeScript, TailwindCSS, Shadcn UI components
- **Backend**: Python with FastAPI (migrated from Node.js)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **PDF Processing**: PDFMathTranslate and OpenRouter for AI model access
- **Authentication**: JWT-based authentication with role-based access control
- **API Documentation**: Automatic OpenAPI/Swagger documentation
- **Containerization**: Docker and Docker Compose for easy deployment

## Prerequisites

- Python 3.8+ (for backend)
- Node.js 18+ (for frontend)
- PostgreSQL database (optional, SQLite can be used for development)
- OpenRouter API key (for OCR processing)
- Gemini API key (for translation services)

## Installation and Setup

### Using Deployment Scripts (Recommended)

We provide deployment scripts to simplify the setup process:

1. Clone the repository:

```bash
git clone https://github.com/yourusername/pdf-docat.git
cd pdf-docat
```

2. Run the setup script:

```bash
./deployment_scripts/setup_all.sh
```

3. Edit the configuration files:

```bash
# Edit backend configuration
nano python-backend/.env

# Edit frontend configuration
nano client/.env
```

4. Start the application:

```bash
# Start the backend
cd python-backend
source python_env/bin/activate
python run.py

# In another terminal, start the frontend
cd client
npm run dev
```

5. **Test PDFMathTranslate Integration (Optional)**:

```bash
# Test the PDFMathTranslate v2-rc integration
cd python-backend
source python_env/bin/activate
python test_pdftranslate.py
```

6. Access the application at [http://localhost:5173](http://localhost:5173) and the API documentation at [http://localhost:8000/docs](http://localhost:8000/docs)

### Using Docker (Alternative)

1. Clone the repository:

```bash
git clone https://github.com/yourusername/pdf-docat.git
cd pdf-docat
```

2. Create a `.env` file in the python-backend directory:

```env
# API Configuration
PROJECT_NAME=PDF-Docat
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000", "http://localhost:5173"]

# Database
POSTGRES_SERVER=db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=pdf_docat

# API Keys
OPENROUTER_API_KEY=your_openrouter_api_key
GEMINI_API_KEY=your_gemini_api_key
```

3. Build and start the containers:

```bash
cd python-backend
docker-compose up -d
```

4. Access the application API at [http://localhost:8000](http://localhost:8000) and the API documentation at [http://localhost:8000/docs](http://localhost:8000/docs)

## User Guide

### Authentication

The system comes with a predefined admin user:

- Username: admin_handuo
- Password: Christlurker2

New users must be created by an admin through the user management interface.

### PDF Processing

1. Log in to the application
2. Navigate to the Dashboard
3. Upload a PDF file
4. Configure translation options if needed
5. Click "Process Document"
6. View and export the extracted content

### Translation Options

- **Enable Translation**: Toggle translation on/off
- **Target Language**: Select the language to translate to
- **Dual Language View**: Display both original and translated text

## Docker Compose Configuration

The included `docker-compose.yml` file in the python-backend directory sets up:

1. A Python FastAPI application container
2. A PostgreSQL database container
3. Proper networking between containers
4. Volume mapping for persistent data storage

## Development

### Project Structure

```plaintext
pdf-docat/
├── client/                     # Frontend React application
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── hooks/              # React hooks
│   │   ├── lib/                # Utility functions
│   │   ├── pages/              # Application pages
│   │   └── App.tsx             # Main application component
├── python-backend/             # Python FastAPI backend
│   ├── app/
│   │   ├── api/                # API endpoints
│   │   ├── core/               # Core functionality
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   └── utils/              # Utility functions
│   ├── main.py                 # Application entry point
│   └── docker-compose.yml      # Docker Compose configuration
├── deployment_scripts/         # Deployment and setup scripts
└── legacy_backup/              # Backup of the original Node.js backend
```

### Database Migrations

The project uses SQLAlchemy ORM for database access. To update the database schema:

1. Modify the SQLAlchemy models in `python-backend/app/models/`
2. Use Alembic to generate and apply migrations:

```bash
cd python-backend
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

## License

MIT

## Acknowledgements

- OpenRouter for AI model access
- Gemini for translation services
- PDFMathTranslate for structured PDF processing
- FastAPI for the Python backend framework
- SQLAlchemy for database ORM
- Shadcn UI for component library
- All the open source libraries that made this project possible