# Credential Migration Guide: From .env to Database

## Overview

Your PDF-Docat application has been successfully migrated to use **database-based credential management** instead of storing sensitive information in environment variables. This provides better security, easier management, and the ability to update credentials without redeploying the application.

## What Was Migrated

### ✅ **Moved to Database**
- `OPENROUTER_API_KEY` - OpenRouter API key for AI model access
- `GEMINI_API_KEY_POOL` - Gemini API key pool for translation services
- `PROJECT_NAME` - Application project name
- `ACCESS_TOKEN_EXPIRE_MINUTES` - JWT token expiration time
- `BACKEND_CORS_ORIGINS` - Allowed CORS origins
- `ALLOWED_HOSTS` - Allowed hosts for the application
- `PDF_SERVICE_URL` - PDF processing service URL
- `LOG_LEVEL` - Application logging level

### 🔒 **Kept in .env (Essential Infrastructure)**
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - Application secret key for JWT
- `USE_SQLITE` - Database type flag
- `POSTGRES_*` - Individual database connection parameters
- `ADMIN_*` - Initial admin user credentials
- `DEFAULT_USER_*` - Initial default user credentials

## Benefits

### 🔐 **Enhanced Security**
- API keys are no longer visible in environment files
- Sensitive values are masked in API responses
- Centralized credential management

### 🚀 **Easier Management**
- Update credentials without redeploying
- Real-time API key pool management
- Usage statistics and monitoring
- Admin panel for credential management

### 📊 **Better Monitoring**
- API key usage tracking
- Rate limiting per key
- Load balancing across multiple keys

## How to Manage Credentials

### 1. **Admin Panel**
Access the admin panel to manage settings:
- **Endpoint**: `/api/v1/settings`
- **Authentication**: Admin user required
- **Features**: Create, read, update settings with masked sensitive values

### 2. **API Endpoints**

#### List All Settings
```bash
GET /api/v1/settings
Authorization: Bearer <admin_token>
```

#### Get Specific Setting
```bash
GET /api/v1/settings/{key}
Authorization: Bearer <admin_token>
```

#### Create/Update Setting
```bash
POST /api/v1/settings
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "key": "OPENROUTER_API_KEY",
  "value": "your-new-api-key",
  "description": "OpenRouter API key for AI model access"
}
```

#### Get API Key Usage Stats
```bash
GET /api/v1/settings/api-key-stats
Authorization: Bearer <admin_token>
```

#### Refresh API Key Pools
```bash
POST /api/v1/settings/refresh-api-keys
Authorization: Bearer <admin_token>
```

### 3. **Direct Database Access**
Settings are stored in the `settings` table with the following structure:
```sql
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Current Database Settings

After migration, the following settings are stored in your database:

| Setting Key | Description | Sensitive |
|------------|-------------|-----------|
| `OPENROUTER_API_KEY` | OpenRouter API key for AI model access | ✅ |
| `GEMINI_API_KEY_POOL` | Gemini API key pool (comma-separated) | ✅ |
| `PROJECT_NAME` | Application project name | ❌ |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT token expiration time in minutes | ❌ |
| `BACKEND_CORS_ORIGINS` | Allowed CORS origins (JSON array) | ❌ |
| `ALLOWED_HOSTS` | Allowed hosts (comma-separated) | ❌ |
| `PDF_SERVICE_URL` | PDF processing service URL | ❌ |
| `LOG_LEVEL` | Application logging level | ❌ |

## API Key Pool Management

### **Gemini API Keys**
- Supports multiple keys in a pool for load balancing
- Format: Comma-separated list of API keys
- Rate limiting: 60 requests per minute per key
- Automatic rotation and usage tracking

### **OpenRouter API Keys**
- Currently supports single key setup
- Rate limiting: 20 requests per minute
- Can be extended to support multiple keys

## Verification and Testing

### **Run Verification Script**
```bash
cd python-backend
python verify_db_config.py
```

This script checks:
- ✅ Database connectivity
- ✅ Settings storage and retrieval
- ✅ API key pool functionality
- ✅ Configuration priority (database > environment)
- ✅ CORS configuration

### **Expected Output**
```
🔧 PDF-Docat Database Configuration Verification
============================================================
✅ Database connection successful
✅ Found 9 settings in database
✅ Gemini API key retrieved: ****Uhls
✅ OpenRouter API key retrieved: ****here
✅ API key pools active
✅ Settings are being read from database correctly
```

## Troubleshooting

### **Problem: Settings not loading from database**
**Solution:**
1. Verify database connection
2. Check if settings exist: `python verify_db_config.py`
3. Restart the application to refresh settings

### **Problem: API keys not working**
**Solution:**
1. Check API key validity in admin panel
2. Refresh API key pools: `POST /api/v1/settings/refresh-api-keys`
3. Monitor usage stats for rate limiting issues

### **Problem: CORS errors**
**Solution:**
1. Update `BACKEND_CORS_ORIGINS` in database
2. Include your Replit domain in the origins list
3. Restart application to apply new CORS settings

## Security Best Practices

### ✅ **Do**
- Use the admin panel to update sensitive credentials
- Monitor API key usage statistics
- Keep database credentials secure in environment variables
- Rotate API keys periodically
- Use strong passwords for admin accounts

### ❌ **Don't**
- Store API keys in environment files anymore
- Share database credentials
- Use the same API key across multiple environments
- Ignore rate limiting warnings

## Backup and Recovery

### **Database Backup**
Your credentials are now stored in the database. Ensure your PostgreSQL database is backed up regularly.

### **Environment Backup**
A backup of your original `.env` file was created as `.env.backup` during migration.

### **Migration Rollback**
If needed, you can restore from the backup:
```bash
cp .env.backup .env
# Then restart the application
```

## Updates and Maintenance

### **Adding New API Keys**
1. Use the admin panel or API endpoints
2. For Gemini: Add to `GEMINI_API_KEY_POOL` (comma-separated)
3. For OpenRouter: Update `OPENROUTER_API_KEY`
4. Refresh pools: `POST /api/v1/settings/refresh-api-keys`

### **Monitoring Usage**
- Check API key usage: `GET /api/v1/settings/api-key-stats`
- Monitor rate limits to avoid service interruptions
- Set up alerts for high usage patterns

### **Configuration Changes**
- CORS origins: Update `BACKEND_CORS_ORIGINS` in database
- Timeouts: Update `ACCESS_TOKEN_EXPIRE_MINUTES`
- Logging: Update `LOG_LEVEL`
- No application restart required for most settings

## Migration Files

- ✅ `migrate_env_to_db.py` - Migration script (completed)
- ✅ `verify_db_config.py` - Verification script
- ✅ `.env.backup` - Backup of original environment file
- ✅ `.env.cleaned` - Clean environment template
- ✅ `CREDENTIAL_MIGRATION_GUIDE.md` - This documentation

---

**🎉 Congratulations!** Your application now uses database-based credential management for enhanced security and easier administration.

For any issues or questions, refer to the troubleshooting section or run the verification script. 