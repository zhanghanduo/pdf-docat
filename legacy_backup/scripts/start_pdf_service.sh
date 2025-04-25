#!/bin/bash
# Script to start the PDF processing service

# Activate the virtual environment
source python_env/bin/activate

# Install Flask if not already installed
pip install flask

# Start the service
echo "Starting PDF processing service on port 5000..."
export FLASK_APP=scripts/pdf_service.py
export FLASK_ENV=development
python -m flask run --host=0.0.0.0 --port=5000
