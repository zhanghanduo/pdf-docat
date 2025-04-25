#!/bin/bash
# Script to start the async PDF processing service

# Activate the virtual environment
source python_env/bin/activate

# Install required packages if not already installed
pip install flask flask-restx gunicorn

# Start the service using Gunicorn for better performance
echo "Starting async PDF processing service on port 5000..."
gunicorn --bind 0.0.0.0:5000 --workers 4 --threads 2 --timeout 300 'pdf_service_async:app'
