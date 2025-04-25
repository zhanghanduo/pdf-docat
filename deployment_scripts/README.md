# PDF-Docat Deployment Scripts

This directory contains scripts to help set up, configure, and deploy the PDF-Docat application with its Python backend.

## Available Scripts

### `setup_all.sh`
Master script that sets up both backend and frontend.
- Creates configuration files (.env) for both backend and frontend
- Calls the individual setup scripts for backend and frontend
- Generates a secure random key for JWT authentication

### `setup_backend.sh`
Sets up the Python backend environment.
- Creates a Python virtual environment
- Installs all backend dependencies
- Installs PDFMathTranslate
- Initializes the database

### `setup_frontend.sh`
Sets up the frontend environment.
- Installs Node.js dependencies
- Builds the frontend for production

### `deploy_production.sh`
Deploys the application in production mode.
- Pulls the latest changes from git
- Updates dependencies
- Builds the frontend
- Starts the backend using Gunicorn with multiple workers

### `configure_sqlite.sh`
Configures the backend to use SQLite instead of PostgreSQL.
- Modifies the database configuration
- Creates backups of the original files

### `update_frontend_api.sh`
Updates the frontend to work with the new Python backend API.
- Creates API client modules for authentication, PDF processing, and credits
- Provides examples of how to use the new API

## Usage Instructions

1. **Initial Setup**:
   ```bash
   ./setup_all.sh
   ```
   This will set up both the backend and frontend. Make sure to edit the `.env` files afterward to add your API keys.

2. **Production Deployment**:
   ```bash
   ./deploy_production.sh
   ```
   This will deploy the application in production mode using Gunicorn.

3. **Using SQLite for Development**:
   ```bash
   ./configure_sqlite.sh
   ```
   This will configure the backend to use SQLite instead of PostgreSQL, which is simpler for development.

4. **Updating Frontend API**:
   ```bash
   ./update_frontend_api.sh
   ```
   This will create API client modules for the frontend to work with the new Python backend.

## Configuration

After running the setup scripts, you'll need to edit the following configuration files:

1. `python-backend/.env` - Backend configuration:
   - Add your API keys for OpenRouter and Gemini
   - Configure database settings
   - Set a strong SECRET_KEY (generated automatically by setup_all.sh)

2. `client/.env` - Frontend configuration:
   - Set the backend API URL if it's different from the default

## Production Deployment Notes

For a production deployment, consider the following additional steps:

1. Set up a web server (Nginx/Apache) to:
   - Serve the frontend static files from `client/dist`
   - Set up a reverse proxy to the backend API

2. Configure SSL certificates for secure HTTPS connections

3. Set up proper database backups if using PostgreSQL

4. Configure logging and monitoring
