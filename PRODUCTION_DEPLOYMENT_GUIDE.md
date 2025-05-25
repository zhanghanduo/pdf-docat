# 🚀 Production Deployment Guide for PDF Docat Backend Engine

## 📋 **Overview**

This guide covers the complete production deployment strategy for PDF Docat's **Python backend engine** (`python-backend/` directory), focusing on Redis-powered task processing, caching, and scaling for Replit/Vercel deployment.

## 🔧 **Project Structure Clarification**

```
pdf-docat/
├── python-backend/          ⭐ USE THIS (Production Backend)
│   ├── app/
│   │   ├── api/v1/endpoints/     # FastAPI routes
│   │   ├── services/
│   │   │   └── redis_client.py   # Redis integration
│   │   ├── tasks/
│   │   │   └── celery_app.py     # Celery + Redis config
│   │   └── main.py               # FastAPI application
│   ├── requirements.txt          # Full dependencies + Redis
│   ├── docker-compose.yml        # Production setup
│   └── .env                      # Environment config
│
├── backend-api/             ❌ IGNORE (Legacy/Reference)
│   └── ...                       # Older implementation
│
└── pyproject.toml           ✅ UPDATED (with Redis deps)
```

**✅ Use `python-backend/` for all deployments** - This is the main, production-ready implementation with:
- Comprehensive Redis integration (caching, task queue, sessions)
- Celery task processing with Redis broker
- FastAPI with proper project structure
- Production-ready Docker configuration

**❌ Ignore `backend-api/`** - This is an older/simpler version for reference only.

## 🏗️ **Backend Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │  FastAPI API    │    │  Admin/Monitor  │
│  (Nginx/Vercel) │    │   (python-      │    │   Dashboard     │
└─────────────────┘    │   backend/)     │    │                 │
         │              └─────────────────┘    └─────────────────┘
         ▼                       │                       │
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Application Layer                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  python-backend/app/                                        ││
│  │  ├── api/v1/endpoints/     # API endpoints                  ││
│  │  ├── services/redis_client.py  # Redis integration         ││
│  │  ├── tasks/celery_app.py   # Celery configuration          ││
│  │  └── core/                 # Core utilities                ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Task Processing Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Celery-W1   │  │ Celery-W2   │  │ Celery-WN   │             │
│  │ PDF Tasks   │  │ PDF Tasks   │  │ Cleanup     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data & Cache Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ PostgreSQL  │  │ Redis Cache │  │ File Storage│             │
│  │ (Primary)   │  │ & Sessions  │  │ (S3/MinIO)  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ **Technology Stack Recommendation**

### **✅ Primary Stack: Celery + Redis**

| **Component** | **Technology** | **Purpose** | **Scaling** |
|---------------|----------------|-------------|-------------|
| **Task Queue** | Celery + Redis | Background PDF processing | Horizontal workers |
| **Cache** | Redis | Result caching, sessions | Redis Cluster |
| **Database** | PostgreSQL | User data, logs | Read replicas |
| **File Storage** | MinIO/S3 | PDF files, results | Object storage |
| **Load Balancer** | Nginx/ALB | Traffic distribution | Auto-scaling |
| **Monitoring** | Prometheus + Grafana | System metrics | Centralized |

### **Why This Stack?**

#### **🎯 Celery + Redis Benefits:**
- **Unified Infrastructure**: Redis serves cache, sessions, and message broker
- **Simple Setup**: Single Redis instance vs Redis + RabbitMQ complexity
- **Cost Effective**: Reduced infrastructure footprint
- **Python Native**: Seamless integration with FastAPI
- **Real-time Updates**: Redis Pub/Sub for WebSocket notifications

#### **⚠️ Considered Alternatives:**

| **Alternative** | **Pros** | **Cons** | **Verdict** |
|-----------------|----------|----------|-------------|
| **RabbitMQ** | Better reliability, complex routing | Additional infrastructure, more complex | ❌ Overkill for PDF processing |
| **Apache Kafka** | High throughput, event streaming | Complex setup, resource heavy | ❌ Not needed for this use case |
| **AWS SQS** | Managed service, highly available | Vendor lock-in, limited features | ⚖️ Consider for AWS-only deployment |

## 🚀 **Deployment Options**

### **🎯 Recommended for PDF Docat Backend:**

| **Platform** | **Best For** | **Redis Support** | **Celery Support** | **Cost** |
|-------------|--------------|-------------------|-------------------|----------|
| **Railway** | ✅ Full-stack apps | Native Redis | Background workers | $5-20/month |
| **Render** | ✅ Production apps | Redis Add-on | Background workers | $7-25/month |
| **DigitalOcean** | ✅ Custom infrastructure | Managed Redis | Droplets | $10-50/month |
| **Replit** | ⚠️ Development/testing | External Redis required | Limited | Free-$20/month |
| **Vercel** | ❌ Serverless only | No persistent Redis | No background workers | Limited for backend |

### **🎯 Recommended Deployment: Railway or Render**

Both platforms support the full Redis + Celery stack needed for PDF processing.

## 🔧 **Implementation Steps**

### **Option 1: Railway Deployment** ⭐ **Recommended**

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Navigate to python-backend directory
cd python-backend/

# 3. Initialize Railway project
railway login
railway init

# 4. Add Redis service
railway add -d redis

# 5. Set environment variables
railway variables set REDIS_HOST=redis.railway.internal
railway variables set CELERY_BROKER_URL=redis://redis.railway.internal:6379/0
railway variables set CELERY_RESULT_BACKEND=redis://redis.railway.internal:6379/0

# 6. Deploy
railway up
```

### **Option 2: Docker Deployment** (DigitalOcean/AWS/GCP)

```bash
# 1. Navigate to python-backend directory
cd python-backend/

# 2. Start production services
docker-compose -f docker-compose.production.yml up -d

# 3. Initialize database
docker-compose exec api alembic upgrade head

# 4. Verify services
docker-compose ps
docker-compose logs redis
docker-compose logs celery-worker
```

### **Option 3: Replit Deployment** (Development Only)

```bash
# 1. Create new Replit from python-backend/ directory
# 2. Install external Redis (Upstash Redis)
# 3. Configure environment variables:
REDIS_HOST=your-upstash-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# 4. Install dependencies
cd python-backend/
pip install -r requirements.txt

# 5. Run application
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## ⚙️ **Environment Configuration**

### **Core Environment Variables** (python-backend/.env)

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/pdf_docat
POSTGRES_SERVER=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=pdf_docat

# Redis Configuration (Critical for PDF processing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password  # Optional for local dev

# Celery Configuration (Uses Redis)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# PDF Translation API Keys
OPENROUTER_API_KEY=your_openrouter_key
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key

# Security
SECRET_KEY=your_super_secret_jwt_key_at_least_32_characters
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALGORITHM=HS256

# File Storage
UPLOAD_DIR=./uploads
OUTPUT_DIR=./outputs
MAX_FILE_SIZE=50000000  # 50MB

# Application Settings
DEBUG=False
ENVIRONMENT=production
LOG_LEVEL=INFO

# Optional: External Storage
S3_BUCKET=pdf-docat-files
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

### **Platform-Specific Configurations**

#### **Railway Deployment**
```bash
# Railway automatically provides:
RAILWAY_STATIC_URL=https://your-app.railway.app
PORT=8000  # Railway sets this automatically

# You need to set:
REDIS_HOST=redis.railway.internal
OPENROUTER_API_KEY=your_api_key
SECRET_KEY=your_secret_key
```

#### **Replit with Upstash Redis**
```bash
# Upstash Redis (free tier available)
REDIS_HOST=your-region-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your_upstash_password

# Replit-specific
REPLIT_DB_URL=your_replit_db_url  # For simple key-value storage
```

## 🔴 **Redis Integration Guide**

### **Critical: Redis is Required for PDF Processing**

Your `python-backend/` uses Redis extensively for:

1. **Celery Task Queue** - Async PDF processing
2. **Result Caching** - Processed PDF results (2-hour TTL)
3. **File Storage** - Temporary uploaded files (1-hour TTL)
4. **Rate Limiting** - User request throttling
5. **Session Management** - User sessions and auth
6. **Real-time Updates** - Task status via Pub/Sub

### **Redis Setup by Platform**

#### **🚂 Railway (Recommended)**
```bash
# Add Redis service (one-click)
railway add -d redis

# Redis is automatically available at:
# redis.railway.internal:6379
```

#### **🎨 Render**
```bash
# Add Redis Add-on in dashboard
# Configure environment variables:
REDIS_HOST=your-render-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

#### **☁️ Upstash Redis (Free Tier)**
```bash
# Perfect for Replit deployment
# Sign up at: https://upstash.com/
# Get connection details:
REDIS_HOST=your-region-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-password
```

#### **🐳 Local Development**
```bash
# Docker (recommended)
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally
# macOS: brew install redis
# Ubuntu: apt-get install redis-server
```

### **Verify Redis Integration**

```bash
# Test Redis connection
cd python-backend/
python -c "
from app.services.redis_client import redis_manager
print('Redis health:', redis_manager.health_check())
"

# Check Celery workers
celery -A app.tasks.celery_app inspect active
```

### **3. Scaling Configuration**

#### **Horizontal Scaling Targets:**

| **Load Level** | **API Instances** | **Celery Workers** | **Redis** | **DB** |
|----------------|-------------------|-------------------|-----------|--------|
| **Low (1-10 users)** | 2 | 2 | Single | Single |
| **Medium (10-100 users)** | 4 | 6 | Single + Replica | Read Replica |
| **High (100-1000 users)** | 8 | 12 | Cluster | Cluster |
| **Enterprise (1000+ users)** | 16+ | 24+ | Cluster | Cluster |

#### **Auto-scaling Rules:**

```yaml
# docker-compose.scale.yml
services:
  api:
    deploy:
      replicas: 4
      update_config:
        parallelism: 2
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
  
  celery-worker:
    deploy:
      replicas: 6
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## 📊 **Performance Optimization**

### **1. Caching Strategy**

```python
# Caching Layers:

# L1: Application Cache (FastAPI/Redis)
# - PDF processing results: 2 hours TTL
# - User sessions: 24 hours TTL
# - Rate limiting: 1 hour windows

# L2: CDN Cache (CloudFlare/AWS CloudFront)  
# - Static assets: 1 year TTL
# - API responses: 5 minutes TTL
# - File downloads: 1 day TTL

# L3: Database Cache (PostgreSQL)
# - Query result cache: 30 minutes
# - Connection pooling: 20 connections
```

### **2. Database Optimization**

```sql
-- Critical Indexes
CREATE INDEX CONCURRENTLY idx_processing_logs_user_id_timestamp 
ON processing_logs(user_id, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_users_email_active 
ON users(email) WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_processing_logs_status 
ON processing_logs(status, created_at);

-- Partitioning for large tables
CREATE TABLE processing_logs_2024 PARTITION OF processing_logs
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### **3. File Storage Strategy**

```python
# File Storage Tiers:

# Hot Storage (Recent/Active)
# - Redis: Uploaded files (1 hour TTL)
# - Local SSD: Processing temp files
# - S3 Standard: Results < 30 days

# Cold Storage (Archive)
# - S3 IA: Results 30-90 days
# - S3 Glacier: Results > 90 days
# - Cleanup policy: Auto-delete > 1 year
```

## 🔐 **Security & Compliance**

### **1. API Security**

```python
# Rate Limiting Rules
RATE_LIMITS = {
    'pdf_upload': '10 per hour',      # Prevent abuse
    'api_general': '1000 per hour',   # General API calls
    'auth_login': '5 per minute',     # Brute force protection
    'password_reset': '3 per hour',   # Reset abuse prevention
}

# CORS Configuration
CORS_ORIGINS = [
    'https://your-domain.com',
    'https://app.your-domain.com'
]

# Security Headers
SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}
```

### **2. Data Protection**

```python
# Encryption at Rest
# - Database: PostgreSQL TDE
# - Files: S3 Server-Side Encryption
# - Redis: TLS encryption

# Encryption in Transit
# - HTTPS/TLS 1.3 for all API calls
# - Redis TLS for internal communication
# - Database SSL connections

# Data Retention
RETENTION_POLICY = {
    'user_data': '7 years',           # Legal compliance
    'processing_logs': '2 years',     # Analytics
    'temp_files': '24 hours',         # Cleanup
    'cached_results': '30 days'       # Performance
}
```

## 📈 **Monitoring & Observability**

### **1. Key Metrics to Track**

```python
# Application Metrics
METRICS = {
    # Performance
    'pdf_processing_time': 'histogram',
    'api_response_time': 'histogram',
    'queue_depth': 'gauge',
    'cache_hit_rate': 'percentage',
    
    # Business
    'daily_active_users': 'counter',
    'pdf_processed_count': 'counter',
    'revenue_per_user': 'gauge',
    'feature_usage': 'counter',
    
    # Infrastructure
    'redis_memory_usage': 'gauge',
    'database_connections': 'gauge',
    'celery_worker_status': 'gauge',
    'error_rate': 'percentage'
}
```

### **2. Alerting Rules**

```yaml
# prometheus_alerts.yml
groups:
  - name: pdf_docat_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
      
      - alert: LongProcessingTime
        expr: histogram_quantile(0.95, pdf_processing_time) > 300
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PDF processing taking too long"
      
      - alert: QueueBacklog
        expr: celery_queue_length > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Processing queue backing up"
```

### **3. Health Checks**

```python
# health_check.py
@router.get("/health")
async def health_check():
    checks = {
        'database': await check_database(),
        'redis': await check_redis(),
        'celery': await check_celery_workers(),
        'external_apis': await check_external_apis(),
        'storage': await check_file_storage()
    }
    
    overall_health = all(checks.values())
    
    return {
        'status': 'healthy' if overall_health else 'unhealthy',
        'checks': checks,
        'timestamp': datetime.utcnow().isoformat()
    }
```

## 🚀 **Deployment Strategies**

### **1. Blue-Green Deployment**

```bash
# Deploy to staging (green)
docker-compose -f docker-compose.green.yml up -d

# Run health checks
curl https://green.your-domain.com/health

# Switch traffic (blue -> green)
# Update load balancer configuration

# Monitor for issues
# Rollback if necessary: switch back to blue
```

### **2. Rolling Updates**

```bash
# Update API instances one by one
docker-compose up -d --scale api=4 --no-recreate

# Update workers with zero downtime
docker-compose exec celery-worker celery control shutdown
docker-compose up -d celery-worker
```

### **3. Database Migrations**

```bash
# Safe migration strategy
1. Deploy new code (backward compatible)
2. Run migrations during low-traffic window
3. Monitor for issues
4. Clean up old columns/tables after verification
```

## 💰 **Cost Optimization**

### **1. Infrastructure Costs**

| **Component** | **Small Setup** | **Medium Setup** | **Large Setup** |
|---------------|-----------------|------------------|-----------------|
| **Compute (API)** | $50/month | $200/month | $800/month |
| **Workers** | $30/month | $150/month | $600/month |
| **Database** | $25/month | $100/month | $500/month |
| **Redis** | $15/month | $50/month | $200/month |
| **Storage** | $10/month | $50/month | $300/month |
| **Total** | **$130/month** | **$550/month** | **$2,400/month** |

### **2. Optimization Strategies**

```python
# Cost Reduction Techniques:

# 1. Intelligent Caching
# - Aggressive caching for repeated requests
# - Smart cache invalidation
# - Cache warming for popular content

# 2. Resource Scaling
# - Auto-scale workers based on queue depth
# - Scale down during low-traffic periods
# - Use spot instances for workers

# 3. Storage Optimization
# - Compress processed PDFs
# - Implement storage tiers
# - Auto-delete old temporary files

# 4. API Optimization
# - Batch similar requests
# - Rate limiting to prevent abuse
# - Connection pooling for databases
```

## 🔍 **Testing Strategy**

### **1. Load Testing**

```python
# load_test.py using locust
from locust import HttpUser, task, between

class PDFProcessingUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def upload_pdf(self):
        with open('test.pdf', 'rb') as f:
            self.client.post('/api/v1/pdf/process-async', 
                           files={'file': f})
    
    @task(1)
    def check_status(self):
        # Check status of queued tasks
        response = self.client.get('/api/v1/pdf/status/task_id')
    
    @task(1)
    def get_logs(self):
        self.client.get('/api/v1/pdf/logs')

# Run: locust -f load_test.py --host=https://your-api.com
```

### **2. Integration Testing**

```python
# test_integration.py
def test_complete_pdf_workflow():
    # 1. Upload PDF
    response = client.post('/api/v1/pdf/process-async', ...)
    task_id = response.json()['task_id']
    
    # 2. Poll for completion
    while True:
        status = client.get(f'/api/v1/pdf/status/{task_id}')
        if status.json()['status'] == 'SUCCESS':
            break
        time.sleep(1)
    
    # 3. Verify result
    assert status.json()['result'] is not None
    assert 'content' in status.json()['result']
```

## 📋 **Production Checklist**

### **🔒 Security**
- [ ] HTTPS/TLS certificates configured
- [ ] JWT secrets rotated and secure
- [ ] Database passwords strong and rotated
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers implemented
- [ ] Input validation comprehensive
- [ ] File upload restrictions in place

### **🏗️ Infrastructure**
- [ ] Load balancer configured
- [ ] Auto-scaling rules set
- [ ] Health checks implemented
- [ ] Backup strategy defined
- [ ] Disaster recovery plan
- [ ] Monitoring alerts configured
- [ ] Log aggregation setup
- [ ] CDN configured for assets

### **📊 Performance**
- [ ] Database indexes optimized
- [ ] Caching layers implemented
- [ ] Background task queues working
- [ ] File storage optimized
- [ ] Connection pooling configured
- [ ] Resource limits set
- [ ] Performance baselines established

### **🛠️ Operations**
- [ ] CI/CD pipeline setup
- [ ] Blue-green deployment ready
- [ ] Database migration strategy
- [ ] Rollback procedures documented
- [ ] Incident response plan
- [ ] On-call rotation defined
- [ ] Documentation updated
- [ ] Team training completed

## 🚀 **Quick Start Commands**

### **Local Development**
```bash
# 1. Setup environment
cd python-backend/
cp .env.example .env
# Edit .env with your configuration

# 2. Install dependencies  
pip install -r requirements.txt

# 3. Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# 4. Initialize database
alembic upgrade head

# 5. Start API server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 6. Start Celery worker (separate terminal)
celery -A app.tasks.celery_app worker --loglevel=info
```

### **Production Deployment Checklist**

#### **✅ Pre-Deployment**
- [ ] Redis service configured and accessible
- [ ] Environment variables set (especially API keys)
- [ ] Database initialized with `alembic upgrade head`
- [ ] Dependencies installed from `requirements.txt`

#### **✅ Post-Deployment**
- [ ] API health check: `GET /health`
- [ ] Redis connection: Test upload → process → retrieve workflow
- [ ] Celery workers: Check task processing
- [ ] File uploads working (PDF processing end-to-end)

### **🎯 Recommended Deployment Flow**

1. **Start with Railway** (5 minutes setup)
   ```bash
   cd python-backend/
   railway login
   railway init
   railway add -d redis  # Add Redis service
   railway up  # Deploy application
   ```

2. **Configure Environment Variables**
   - Set Redis connection details
   - Add your PDF translation API keys
   - Set secure JWT secret

3. **Test PDF Processing**
   - Upload a test PDF
   - Verify async processing works
   - Check Redis caching

## 🎯 **Next Steps for Production**

1. **Phase 1: Basic Production** (Day 1)
   - ✅ Deploy to Railway/Render with Redis
   - ✅ Verify PDF processing pipeline
   - ✅ Set up basic monitoring

2. **Phase 2: Scale & Monitor** (Week 1)
   - Add error tracking (Sentry)
   - Implement proper logging
   - Add health check endpoints

3. **Phase 3: Optimize** (Week 2-3)
   - Optimize Redis caching strategies
   - Add auto-scaling rules
   - Performance tuning

4. **Phase 4: Enterprise Features** (Month 2+)
   - Multi-region deployment
   - Advanced security features
   - Custom monitoring dashboards

---

**This `python-backend/` setup with Redis integration will handle high-volume PDF processing efficiently with proper caching, task queuing, and scalability.** 🚀

## 🟡 **Replit-Specific Deployment (Redis-Free Alternative)**

### **Why Avoid Redis on Replit?**
- Replit doesn't support persistent Redis instances
- External Redis (Upstash) adds complexity and latency
- Background workers (Celery) are limited on Replit
- Cost-effective alternatives available

### **🔄 Redis → Replit Stack Migration**

| **Redis Use Case** | **Replit Alternative** | **Implementation** |
|-------------------|----------------------|-------------------|
| **Celery Task Queue** | FastAPI BackgroundTasks | Built-in async processing |
| **Result Caching** | Replit Database + Memory | Persistent + fast access |
| **File Storage** | Local File System | Direct file operations |
| **Rate Limiting** | In-Memory + Replit DB | Time-based tracking |
| **Session Management** | JWT Tokens | Stateless authentication |
| **Real-time Updates** | WebSocket + Polling | Direct connection |

### **🛠️ Implementation Changes for Replit**

#### **1. Replace Celery with FastAPI BackgroundTasks**

Create `python-backend/app/services/background_processor.py`:
```python
import asyncio
import uuid
from typing import Dict, Any
from fastapi import BackgroundTasks
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class TaskManager:
    """Simple task manager for Replit deployment"""
    
    def __init__(self):
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.results: Dict[str, Any] = {}
    
    def create_task(self, background_tasks: BackgroundTasks, 
                   func, *args, **kwargs) -> str:
        """Create and queue a background task"""
        task_id = str(uuid.uuid4())
        
        # Store task info
        self.tasks[task_id] = {
            'status': 'PENDING',
            'created_at': datetime.utcnow(),
            'function': func.__name__
        }
        
        # Queue the task
        background_tasks.add_task(self._execute_task, task_id, func, *args, **kwargs)
        
        return task_id
    
    async def _execute_task(self, task_id: str, func, *args, **kwargs):
        """Execute the background task"""
        try:
            # Update status
            self.tasks[task_id]['status'] = 'PROCESSING'
            self.tasks[task_id]['started_at'] = datetime.utcnow()
            
            # Execute function
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Store result
            self.tasks[task_id]['status'] = 'SUCCESS'
            self.tasks[task_id]['completed_at'] = datetime.utcnow()
            self.results[task_id] = result
            
        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}")
            self.tasks[task_id]['status'] = 'FAILURE'
            self.tasks[task_id]['error'] = str(e)
            self.tasks[task_id]['completed_at'] = datetime.utcnow()
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get task status and result"""
        task_info = self.tasks.get(task_id, {})
        result = self.results.get(task_id)
        
        return {
            'task_id': task_id,
            'status': task_info.get('status', 'NOT_FOUND'),
            'result': result,
            'created_at': task_info.get('created_at'),
            'started_at': task_info.get('started_at'),
            'completed_at': task_info.get('completed_at'),
            'error': task_info.get('error')
        }

# Global task manager
task_manager = TaskManager()
```

#### **2. Replace Redis Caching with Replit Database + Memory**

Create `python-backend/app/services/replit_cache.py`:
```python
import os
import json
import pickle
import time
from typing import Any, Optional, Dict
from datetime import datetime, timedelta
import hashlib

try:
    from replit import db
    REPLIT_DB_AVAILABLE = True
except ImportError:
    REPLIT_DB_AVAILABLE = False
    db = None

class ReplitCacheManager:
    """Cache manager using Replit DB + in-memory for speed"""
    
    def __init__(self):
        self.memory_cache: Dict[str, Dict[str, Any]] = {}
        self.max_memory_items = 1000  # Prevent memory overflow
    
    def _is_expired(self, item: Dict[str, Any]) -> bool:
        """Check if cached item is expired"""
        if 'expires_at' not in item:
            return False
        return datetime.utcnow() > datetime.fromisoformat(item['expires_at'])
    
    def _cleanup_memory(self):
        """Remove expired items from memory cache"""
        current_time = datetime.utcnow()
        expired_keys = [
            key for key, item in self.memory_cache.items()
            if self._is_expired(item)
        ]
        for key in expired_keys:
            del self.memory_cache[key]
        
        # Limit memory cache size
        if len(self.memory_cache) > self.max_memory_items:
            # Remove oldest items
            sorted_items = sorted(
                self.memory_cache.items(),
                key=lambda x: x[1].get('created_at', ''),
                reverse=True
            )
            self.memory_cache = dict(sorted_items[:self.max_memory_items])
    
    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Cache a value with TTL"""
        try:
            expires_at = datetime.utcnow() + timedelta(seconds=ttl)
            cache_item = {
                'value': value,
                'created_at': datetime.utcnow().isoformat(),
                'expires_at': expires_at.isoformat()
            }
            
            # Store in memory for fast access
            self.memory_cache[key] = cache_item
            
            # Store in Replit DB for persistence
            if REPLIT_DB_AVAILABLE and db is not None:
                db[f"cache:{key}"] = json.dumps(cache_item, default=str)
            
            self._cleanup_memory()
            return True
            
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached value"""
        try:
            # Try memory cache first
            if key in self.memory_cache:
                item = self.memory_cache[key]
                if not self._is_expired(item):
                    return item['value']
                else:
                    del self.memory_cache[key]
            
            # Try Replit DB
            if REPLIT_DB_AVAILABLE and db is not None:
                db_key = f"cache:{key}"
                if db_key in db:
                    item = json.loads(db[db_key])
                    if not self._is_expired(item):
                        # Restore to memory cache
                        self.memory_cache[key] = item
                        return item['value']
                    else:
                        del db[db_key]
            
            return None
            
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    def delete(self, key: str) -> bool:
        """Delete cached value"""
        try:
            # Remove from memory
            if key in self.memory_cache:
                del self.memory_cache[key]
            
            # Remove from Replit DB
            if REPLIT_DB_AVAILABLE and db is not None:
                db_key = f"cache:{key}"
                if db_key in db:
                    del db[db_key]
            
            return True
            
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    def generate_cache_key(self, file_hash: str, engine: str, options: Dict[str, Any]) -> str:
        """Generate cache key for PDF processing results"""
        options_str = json.dumps(options, sort_keys=True)
        combined = f"{file_hash}:{engine}:{options_str}"
        return f"pdf_result:{hashlib.md5(combined.encode()).hexdigest()}"

# Global cache manager
cache_manager = ReplitCacheManager()
```

#### **3. Replace Redis Rate Limiting**

Create `python-backend/app/services/rate_limiter.py`:
```python
import time
from typing import Dict, Any
from collections import defaultdict, deque
from datetime import datetime, timedelta

class SimpleRateLimiter:
    """In-memory rate limiter for Replit"""
    
    def __init__(self):
        self.requests: Dict[str, deque] = defaultdict(deque)
    
    def check_rate_limit(self, user_id: str, limit: int, window: int) -> Dict[str, Any]:
        """
        Check rate limit for user
        Returns: Dict with 'allowed' (bool), 'remaining' (int), 'reset_time' (int)
        """
        current_time = time.time()
        window_start = current_time - window
        
        # Clean old requests
        user_requests = self.requests[user_id]
        while user_requests and user_requests[0] < window_start:
            user_requests.popleft()
        
        # Check limit
        current_count = len(user_requests)
        allowed = current_count < limit
        
        if allowed:
            user_requests.append(current_time)
        
        remaining = max(0, limit - current_count - (1 if allowed else 0))
        reset_time = int(window_start + window)
        
        return {
            'allowed': allowed,
            'remaining': remaining,
            'reset_time': reset_time,
            'current_count': current_count + (1 if allowed else 0)
        }

# Global rate limiter
rate_limiter = SimpleRateLimiter()
```

#### **4. Update FastAPI Endpoints**

Update `python-backend/app/api/v1/endpoints/async_pdf.py`:
```python
from fastapi import BackgroundTasks, HTTPException
from app.services.background_processor import task_manager
from app.services.replit_cache import cache_manager
from app.services.rate_limiter import rate_limiter

@router.post("/process-async")
async def process_pdf_async(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    engine: str = Form("google"),
    current_user: User = Depends(get_current_user)
):
    # Rate limiting
    rate_check = rate_limiter.check_rate_limit(
        user_id=str(current_user.id),
        limit=10,  # 10 requests per hour
        window=3600
    )
    
    if not rate_check['allowed']:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {rate_check['reset_time'] - time.time():.0f} seconds"
        )
    
    # Check cache
    file_content = await file.read()
    file_hash = hashlib.md5(file_content).hexdigest()
    cache_key = cache_manager.generate_cache_key(file_hash, engine, {})
    
    cached_result = cache_manager.get(cache_key)
    if cached_result:
        return {"cached": True, "result": cached_result}
    
    # Save file locally (Replit has persistent storage)
    file_path = f"uploads/{file_hash}_{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Create background task
    task_id = task_manager.create_task(
        background_tasks,
        process_pdf_file,
        file_path=file_path,
        engine=engine,
        cache_key=cache_key
    )
    
    return {
        "task_id": task_id,
        "status": "PENDING",
        "message": "PDF processing started"
    }

@router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """Get task processing status"""
    return task_manager.get_task_status(task_id)
```

### **📦 Replit Deployment Steps**

1. **Create New Replit**
   ```bash
   # Fork or upload your python-backend/ directory
   # Select Python template
   ```

2. **Install Dependencies** 
   ```bash
   # Remove Redis dependencies from requirements.txt
   pip install fastapi uvicorn python-multipart aiofiles
   ```

3. **Create `main.py` for Replit**
   ```python
   # main.py (Replit entry point)
   import uvicorn
   from app.main import app
   
   if __name__ == "__main__":
       uvicorn.run(app, host="0.0.0.0", port=8000)
   ```

4. **Environment Variables**
   ```bash
   # Set in Replit Secrets
   OPENROUTER_API_KEY=your_key
   SECRET_KEY=your_jwt_secret
   DATABASE_URL=sqlite:///./pdf_docat.db
   ```

5. **Run Configuration**
   ```bash
   # .replit file
   run = "python main.py"
   ```

### **🎯 Benefits of Replit Stack**

✅ **No external dependencies** - Everything runs on Replit
✅ **Persistent storage** - Files and database persist
✅ **Simple deployment** - One-click run
✅ **Cost effective** - No Redis hosting costs
✅ **Real-time development** - Live code updates

### **⚠️ Limitations vs Redis Stack**

- **Performance**: Memory caching vs Redis speed
- **Scalability**: Single instance vs distributed Redis
- **Features**: Basic rate limiting vs Redis advanced features
- **Reliability**: In-memory vs Redis persistence

This stack is perfect for **development, prototyping, and small-scale deployments** on Replit! 🚀 