#!/bin/bash
# Script to set up Python environment for PDF processing

# Create a virtual environment
echo "Creating Python virtual environment..."
python3 -m venv python_env

# Activate the virtual environment
source python_env/bin/activate

# Install PDFMathTranslate and dependencies
echo "Installing PDFMathTranslate and dependencies..."
pip install -U pip setuptools wheel
pip install -e ./PDFMathTranslate

# Install additional dependencies
echo "Installing additional dependencies..."
pip install requests

# Create a requirements.txt file for future reference
pip freeze > requirements.txt

echo "Python environment setup complete!"
echo "To activate the environment, run: source python_env/bin/activate"
