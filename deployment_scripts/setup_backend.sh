#!/bin/bash
# Script to set up the Python backend environment

echo "Setting up PDF-Docat Python Backend..."

# Check if uv is available, otherwise use regular pip
if command -v uv &> /dev/null; then
    echo "Using uv package manager..."
    PIP_CMD="uv pip"
    
    # Check if .venv already exists, if not create it
    if [ ! -d "../.venv" ]; then
        echo "Creating Python virtual environment with uv..."
        cd ..
        uv venv
        cd python-backend
    else
        echo "Using existing .venv virtual environment..."
    fi
else
    echo "Using standard pip..."
    PIP_CMD="pip"
    
    # Create and activate virtual environment
    echo "Creating Python virtual environment..."
    python3 -m venv python_env
    source python_env/bin/activate
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd python-backend || cd .
$PIP_CMD install -r requirements.txt

# Initialize and update PDFMathTranslate submodule
echo "Initializing PDFMathTranslate submodule..."
cd ..
git submodule update --init --recursive

# Ensure we're on the v2-rc branch
echo "Switching to PDFMathTranslate v2-rc branch..."
cd PDFMathTranslate
git checkout v2-rc
git pull origin v2-rc
cd ../python-backend

# Install PDFMathTranslate v2-rc
echo "Installing PDFMathTranslate v2-rc..."
$PIP_CMD install -e ../PDFMathTranslate

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file for local development..."
    cat > .env << EOL
# API Configuration
PROJECT_NAME=PDF-Docat
SECRET_KEY=dev-secret-key-change-in-production-$(openssl rand -hex 16)
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 days

# CORS Origins
BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000", "http://localhost:5173"]

# Database Configuration - SQLite for local development
USE_SQLITE=True

# For production PostgreSQL (uncomment and configure when deploying):
# USE_SQLITE=False
# POSTGRES_SERVER=localhost
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=your_postgres_password
# POSTGRES_DB=pdf_docat

# API Keys (replace with your actual keys)
OPENROUTER_API_KEY=your-openrouter-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here
EOL
    echo "✅ Created .env file. Please edit it to add your API keys."
else
    echo "✅ .env file already exists."
fi

# Test the integration
echo "Testing PDFMathTranslate integration..."
python -c "import pdf2zh; print('✅ PDFMathTranslate v2-rc imported successfully')" || echo "❌ PDFMathTranslate import failed"

echo ""
echo "🎉 Backend setup complete!"
echo ""
echo "Next steps:"
if command -v uv &> /dev/null; then
    echo "  1. Edit python-backend/.env to add your API keys"
    echo "  2. To start the backend: cd python-backend && python run.py"
else
    echo "  1. Activate the environment: source python_env/bin/activate"
    echo "  2. Edit python-backend/.env to add your API keys"
    echo "  3. To start the backend: cd python-backend && python run.py"
fi
echo "  4. Access the API at: http://localhost:8000"
echo "  5. API docs at: http://localhost:8000/docs"
