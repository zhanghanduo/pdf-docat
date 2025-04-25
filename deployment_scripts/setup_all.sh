#!/bin/bash
# Master script to set up the entire PDF-Docat application

echo "Setting up PDF-Docat Application..."

# Create .env file for the backend
echo "Creating backend .env file..."
cat > python-backend/.env << EOL
# API Configuration
PROJECT_NAME=PDF-Docat
SECRET_KEY=$(openssl rand -hex 32)
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 days

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000", "http://localhost:5173"]

# Database
POSTGRES_SERVER=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=pdf_docat

# For SQLite (comment out if using PostgreSQL)
USE_SQLITE=True

# API Keys
OPENROUTER_API_KEY=your-openrouter-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here
EOL

echo "Please edit python-backend/.env to add your API keys and configure the database."

# Create .env file for the frontend
echo "Creating frontend .env file..."
cat > client/.env << EOL
VITE_API_BASE_URL=http://localhost:8000/api/v1
EOL

echo "Please edit client/.env if your backend is running on a different URL."

# Set up the backend
echo "Setting up the backend..."
chmod +x setup_backend.sh
./setup_backend.sh

# Set up the frontend
echo "Setting up the frontend..."
chmod +x setup_frontend.sh
./setup_frontend.sh

echo "Setup complete!"
echo "To start the backend: source python_env/bin/activate && cd python-backend && python run.py"
echo "To start the frontend: cd client && npm run dev"
