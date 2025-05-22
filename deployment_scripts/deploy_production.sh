#!/bin/bash
# Script to deploy the application in production mode

echo "Deploying PDF-Docat to production..."

# Activate virtual environment
source python_env/bin/activate

# Pull latest changes
echo "Pulling latest changes..."
git pull

# Install/update backend dependencies
echo "Updating backend dependencies..."
cd python-backend
pip install -r requirements.txt

# Install/update PDFMathTranslate
echo "Updating PDFMathTranslate..."
pip install -e ../PDFMathTranslate

# Build frontend
echo "Building frontend..."
cd ../client
npm install
npm run build

# Start or restart the backend server using Gunicorn
echo "Starting backend server with Gunicorn..."
cd ../python-backend

# Check if Gunicorn is already running
if pgrep -f "gunicorn app.main:app" > /dev/null; then
    echo "Stopping existing Gunicorn process..."
    pkill -f "gunicorn app.main:app"
fi

# Start Gunicorn in the background
echo "Starting Gunicorn..."
gunicorn app.main:app --bind 0.0.0.0:8000 --workers 4 --timeout 120 --daemon

echo "Deployment complete!"
echo "Backend is running on port 8000"
echo "Frontend build is available in client/dist directory"
