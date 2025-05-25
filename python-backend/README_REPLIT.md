# 🚀 PDF Docat - Replit Deployment Guide

## 🎯 **Replit-Optimized Deployment**

This deployment uses **zero external dependencies** - no Redis, no Celery, just pure FastAPI with Replit-native services!

## ⚡ **Quick Start (5 minutes)**

### **1. Create New Replit**
```bash
# Option A: Import from GitHub
1. Go to replit.com
2. Click "Create Repl"
3. Choose "Import from GitHub"
4. Use your repository URL
5. Select "python-backend" folder

# Option B: Upload files
1. Create new Python Repl
2. Upload all files from python-backend/ directory
```

### **2. Install Dependencies**
```bash
# In Replit Shell:
pip install -r requirements-replit.txt
```

### **3. Set Environment Variables**
```bash
# Go to Replit Secrets tab and add:
DATABASE_URL=postgresql://neondb_owner:npg_IRvdV0ZcSE7f@ep-broad-flower-a6bbiqas.us-west-2.aws.neon.tech/neondb?sslmode=require
OPENROUTER_API_KEY=your_openrouter_api_key
SECRET_KEY=your_super_secret_jwt_key_minimum_32_characters
GEMINI_API_KEY=your_gemini_api_key  # Optional
ANTHROPIC_API_KEY=your_anthropic_key  # Optional
```

### **4. Initialize Database**
```bash
# Run once to create database tables:
python init_database.py
```

### **5. Run the Application**
```bash
# Click "Run" button or execute:
python main_replit.py
```

🎉 **That's it!** Your PDF processing API is now running on Replit with PostgreSQL!

> **🔒 Security Note**: The DATABASE_URL shown above is an example. Make sure to use your actual Neon database credentials and keep them secure in Replit Secrets.

## 🛠️ **Technical Architecture**

### **What Replaced Redis + Celery:**

| **Original (Redis Stack)** | **Replit Stack** | **Benefits** |
|----------------------------|------------------|--------------|
| **Celery Task Queue** | FastAPI BackgroundTasks | ✅ No external service needed |
| **Redis Caching** | Replit DB + Memory Cache | ✅ Persistent + fast |
| **Redis Rate Limiting** | In-memory tracking | ✅ Simple and effective |
| **Redis File Storage** | Local filesystem | ✅ Replit has persistent storage |
| **Redis Sessions** | JWT tokens | ✅ Stateless authentication |
| **Database** | PostgreSQL (Neon) | ✅ Production-ready database |

### **Key Features:**

✅ **Zero External Dependencies** - Everything runs on Replit  
✅ **Persistent Storage** - Files and cache survive restarts  
✅ **PostgreSQL Database** - Production-ready Neon database  
✅ **Background Processing** - Async PDF processing works  
✅ **Rate Limiting** - User request throttling  
✅ **Caching** - Processed results cached for speed  
✅ **Health Monitoring** - Built-in health checks  

## 📋 **API Endpoints**

### **PDF Processing (Replit-optimized)**
```bash
# Process PDF asynchronously
POST /api/v1/pdf-replit/process-async
# Body: multipart/form-data with file

# Check processing status
GET /api/v1/pdf-replit/status/{task_id}

# Cancel task
DELETE /api/v1/pdf-replit/cancel/{task_id}

# Get statistics
GET /api/v1/pdf-replit/stats
```

### **Health & Monitoring**
```bash
# Replit-specific health check
GET /replit/health

# Deployment information
GET /replit/info

# General health check
GET /api/v1/pdf-replit/health
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Required
DATABASE_URL=postgresql://user:pass@host:port/dbname?sslmode=require
OPENROUTER_API_KEY=your_api_key
SECRET_KEY=your_jwt_secret

# Optional (with defaults)
ACCESS_TOKEN_EXPIRE_MINUTES=30
MAX_FILE_SIZE=52428800  # 50MB
LOG_LEVEL=INFO
DEBUG=False
```

### **Rate Limits**
```python
# Default limits (configurable in code):
PDF_PROCESSING_LIMIT = 10 per hour per user
API_REQUESTS_LIMIT = 1000 per hour per user
```

## 🧪 **Testing Your Deployment**

### **1. Health Check**
```bash
curl https://your-replit-url.replit.dev/replit/health
```

Expected response:
```json
{
  "status": "healthy",
  "deployment": "replit",
  "services": {
    "task_manager": {"status": "healthy", "total_tasks": 0},
    "cache_manager": {"status": "healthy", "replit_db_available": true},
    "rate_limiter": {"status": "healthy"}
  }
}
```

### **2. Upload Test PDF**
```bash
curl -X POST \
  https://your-replit-url.replit.dev/api/v1/pdf-replit/process-async \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test.pdf" \
  -F "engine=auto" \
  -F "translate_enabled=true" \
  -F "target_language=simplified-chinese"
```

### **3. Check Processing Status**
```bash
curl https://your-replit-url.replit.dev/api/v1/pdf-replit/status/TASK_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 **Performance & Limits**

### **Replit Constraints:**
- **File Size**: 50MB max (configurable)
- **Memory**: ~512MB - 1GB available
- **Processing Time**: Background tasks work well
- **Storage**: Persistent across restarts
- **Concurrent Users**: 10-50 simultaneous users

### **Optimization Tips:**
```python
# 1. Aggressive caching
cache_manager.set(key, result, ttl=7200)  # 2 hours

# 2. File cleanup
os.remove(file_path)  # After processing

# 3. Memory management
task_manager.max_tasks_in_memory = 1000

# 4. Rate limiting
rate_limiter.check_rate_limit(user_id, limit=10, window=3600)
```

## 🔍 **Monitoring & Debugging**

### **View Logs**
```bash
# Replit Console shows real-time logs
# Logs include:
# - PDF processing progress
# - Cache hit/miss rates
# - Rate limiting events
# - Error details
```

### **Monitor Performance**
```bash
# Get detailed statistics
GET /api/v1/pdf-replit/stats

# Response includes:
{
  "tasks": {
    "total_tasks": 25,
    "completed": 20,
    "failed": 2,
    "success_rate": 0.91
  },
  "cache": {
    "memory_cache_size": 150,
    "db_cache_size": 45,
    "replit_db_available": true
  },
  "rate_limiting": {
    "total_users_tracked": 12,
    "active_users_last_hour": 5
  }
}
```

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **1. "Import Error: No module named 'replit'"**
```bash
# Solution: Install replit package
pip install replit
```

#### **2. "PDF Processing Fails"**
```bash
# Check logs for specific error
# Common causes:
# - Missing API keys
# - File too large
# - Corrupted PDF
# - Rate limit exceeded
```

#### **3. "Database Connection Failed"**
```bash
# Check DATABASE_URL in Replit Secrets
# Ensure PostgreSQL connection string is correct:
# postgresql://user:pass@host:port/dbname?sslmode=require

# Check database health
GET /replit/health
```

#### **4. "Cache Not Working"**
```bash
# Check Replit DB status
GET /replit/health

# If DB unavailable, app falls back to memory-only caching
```

#### **5. "Background Tasks Not Processing"**
```bash
# Check task status
GET /api/v1/pdf-replit/stats

# Ensure FastAPI BackgroundTasks are working
# (They should start automatically)
```

## 🎯 **Production Considerations**

### **For Production Use:**
1. **Set Strong JWT Secret**: Use 64+ character random string
2. **Configure API Keys**: Add all required translation service keys
3. **Monitor Usage**: Use `/stats` endpoint to track performance
4. **Set Appropriate Limits**: Adjust rate limits for your user base
5. **Regular Health Checks**: Monitor `/replit/health` endpoint

### **Scaling Beyond Replit:**
When you outgrow Replit, migrate to:
- **Railway/Render**: Full Redis + Celery stack
- **AWS/GCP**: Managed services
- **Docker**: Container deployment

## 🎉 **Success!**

Your PDF processing API is now running on Replit with:
- ✅ Zero Redis dependency
- ✅ Zero Celery dependency  
- ✅ Full background processing
- ✅ Persistent caching
- ✅ Rate limiting
- ✅ Health monitoring

**API Base URL**: `https://your-replit-name.your-username.repl.co`

Happy coding! 🚀 