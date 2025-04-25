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

# Install PDFMathTranslate
echo "Installing PDFMathTranslate..."
pip install -e ../PDFMathTranslate

# Create database tables (if using SQLite)
echo "Initializing database..."
python run.py

echo "Backend setup complete!"
echo "To activate the environment in the future, run: source python_env/bin/activate"
echo "To start the backend server, run: cd python-backend && python run.py"
