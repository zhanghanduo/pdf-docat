#!/bin/bash
# Script to set up the frontend environment

echo "Setting up PDF-Docat Frontend..."

# Install Node.js dependencies
echo "Installing frontend dependencies..."
cd client
npm install

# Build the frontend for production
echo "Building frontend for production..."
npm run build

echo "Frontend setup complete!"
echo "To start the frontend development server, run: cd client && npm run dev"
echo "To build the frontend for production, run: cd client && npm run build"
