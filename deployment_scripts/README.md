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

1. **Clone the Repository with Submodules**:
   ```bash
   git clone --recurse-submodules https://github.com/your-repo/pdf-docat.git
   cd pdf-docat
   ```
   This will clone the main repository and the PDFMathTranslate submodule.

2. **Initial Setup**:
   ```bash
   ./setup_all.sh
   ```
   This will set up both the backend and frontend. Make sure to edit the `.env` files afterward to add your API keys.

3. **Production Deployment**:
   ```bash
   ./deploy_production.sh
   ```
   This will deploy the application in production mode using Gunicorn.

4. **Using SQLite for Development**:
   ```bash
   ./configure_sqlite.sh
   ```
   This will configure the backend to use SQLite instead of PostgreSQL, which is simpler for development.

5. **Updating Frontend API**:
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
   - Set `USE_SQLITE=True` if you want to use SQLite instead of PostgreSQL

2. `client/.env` - Frontend configuration:
   - Set the backend API URL if it's different from the default

## PDFMathTranslate Submodule

The application uses PDFMathTranslate as a git submodule tracking the **v2-rc branch**:

- **Origin**: https://github.com/awwaawwa/PDFMathTranslate.git
- **Upstream**: https://github.com/Byaidu/PDFMathTranslate.git
- **Branch**: v2-rc (release candidate for version 2.0)

**Note**: The v2-rc branch introduces significant API changes from v1.x:
- Uses a new settings-based configuration system (`SettingsModel`)
- The high-level API functions have changed from `translate()` to `do_translate_async_stream()`
- Requires different parameter structures and configuration methods

To update the PDFMathTranslate submodule to the latest v2-rc version:

```bash
cd PDFMathTranslate
git fetch origin
git checkout v2-rc
git pull origin v2-rc
cd ..
git add PDFMathTranslate
git commit -m "Update PDFMathTranslate submodule to latest v2-rc"
```

To sync with upstream changes:

```bash
cd PDFMathTranslate
git remote add upstream https://github.com/Byaidu/PDFMathTranslate.git
git fetch upstream
git merge upstream/v2-rc
cd ..
git add PDFMathTranslate
git commit -m "Sync PDFMathTranslate with upstream v2-rc"
```

## Dependency Compatibility Notes

The application has specific dependency version requirements to ensure compatibility with PDFMathTranslate v2-rc:

1. **Pydantic Version**: The backend uses Pydantic 1.10.8 for compatibility with FastAPI 0.88.0. PDFMathTranslate v2-rc also supports Pydantic 1.x, making this compatible. **Note**: Using Pydantic 2.x may cause compatibility issues with both FastAPI 0.88.0 and the current PDFMathTranslate integration.

2. **PyMuPDF Import**: PyMuPDF is installed as the package `pymupdf` but imported as `fitz`. The setup script includes a compatibility layer to handle this difference.

3. **PDFMathTranslate v2-rc Dependencies**: The v2-rc branch has different dependency requirements than v1.x. The setup script includes a wrapper module that gracefully handles import errors and provides fallback functionality.

4. **API Changes**: The v2-rc branch uses a completely different API structure:
   - Settings-based configuration with `SettingsModel`
   - Async stream processing with `do_translate_async_stream()`
   - Different parameter names and structures

If you encounter dependency-related errors, try the following:

1. Use the exact versions specified in `python-backend/requirements.txt`
2. Ensure PDFMathTranslate v2-rc is properly installed with `pip install -e ../PDFMathTranslate`
3. Check that the mock modules are properly created during setup
4. Use the `start_server.py` script instead of `run.py` to start the server
5. Verify that the wrapper handles the new v2-rc API correctly

## Production Deployment Notes

For a production deployment, consider the following additional steps:

1. Set up a web server (Nginx/Apache) to:
   - Serve the frontend static files from `client/dist`
   - Set up a reverse proxy to the backend API

2. Configure SSL certificates for secure HTTPS connections

3. Set up proper database backups if using PostgreSQL

4. Configure logging and monitoring
