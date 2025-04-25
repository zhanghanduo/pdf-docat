# Legacy Node.js Backend Backup

This directory contains a backup of the original Node.js backend components that were migrated to the new Python backend.

## Contents

### `shared/`
Contains shared TypeScript definitions and schemas used by both the frontend and backend.
- `schema.ts`: Database schema definitions, user tiers, credit costs, etc.

### `server/`
Contains the Node.js Express server implementation.
- `api/`: API implementations for PDF processing, translation, etc.
- `middleware/`: Authentication and logging middleware
- `routes.ts`: API route definitions
- `storage.ts`: Data storage and retrieval logic
- `db.ts`: Database connection setup
- `index.ts`: Server entry point

### `scripts/`
Contains Python scripts for PDF processing that were previously used as standalone services.
- `pdf_service.py`: Basic Flask service for PDF processing
- `pdf_service_async.py`: Async Flask service for PDF processing
- `setup_python_env.sh`: Script to set up Python environment
- `start_pdf_service.sh` and `start_pdf_service_async.sh`: Scripts to start the PDF services
- `test_pdf_processing.py`: Script to test PDF processing

## Note

These components have been migrated to the new Python backend in the `python-backend/` directory. This backup is kept for reference purposes only and should not be used in production.
