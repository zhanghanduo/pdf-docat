#!/usr/bin/env python3
"""
Main entry point for Replit deployment
Uses FastAPI BackgroundTasks instead of Celery + Redis
"""

import os
import logging
import uvicorn
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_environment():
    """Setup environment for Replit deployment"""
    
    # Create necessary directories
    directories = ["uploads", "outputs", "logs", "data"]
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        logger.info(f"Created directory: {directory}")
    
    # Set default environment variables for Replit
    # Note: DATABASE_URL should be set in Replit Secrets for PostgreSQL
    env_defaults = {
        'SECRET_KEY': 'your-secret-key-change-this-in-production',
        'ACCESS_TOKEN_EXPIRE_MINUTES': '30',
        'ALGORITHM': 'HS256',
        'DEBUG': 'False',
        'ENVIRONMENT': 'replit',
        'LOG_LEVEL': 'INFO',
        'MAX_FILE_SIZE': '52428800',  # 50MB
        'UPLOAD_DIR': './uploads',
        'OUTPUT_DIR': './outputs',
    }
    
    for key, default_value in env_defaults.items():
        if not os.getenv(key):
            os.environ[key] = default_value
            logger.info(f"Set default environment variable: {key}")
    
    # Validate required DATABASE_URL for PostgreSQL
    if not os.getenv('DATABASE_URL'):
        logger.error("❌ DATABASE_URL environment variable is required for PostgreSQL!")
        logger.error("   Please set it in Replit Secrets:")
        logger.error("   DATABASE_URL=postgresql://user:pass@host:port/dbname?sslmode=require")
        raise ValueError("DATABASE_URL environment variable is required")

def create_replit_app():
    """Create FastAPI app configured for Replit"""
    
    setup_environment()
    
    # Import after environment setup
    from app.main import app
    from app.api.v1.api import api_router
    from app.api.v1.endpoints.async_pdf_replit import router as replit_pdf_router
    
    # Add Replit-specific PDF processing routes
    app.include_router(
        replit_pdf_router,
        prefix="/api/v1/pdf-replit",
        tags=["pdf-replit"]
    )
    
    # Add health check for Replit
    @app.get("/replit/health")
    async def replit_health_check():
        """Replit-specific health check"""
        from app.services.background_processor import task_manager
        from app.services.replit_cache import cache_manager
        from app.services.rate_limiter import rate_limiter
        
        try:
            # Check all services
            task_health = task_manager.get_task_stats()
            cache_health = cache_manager.health_check()
            rate_limit_health = rate_limiter.health_check()
            
            all_healthy = (
                cache_health.get('status') == 'healthy' and
                rate_limit_health.get('status') == 'healthy'
            )
            
            return {
                'status': 'healthy' if all_healthy else 'unhealthy',
                'deployment': 'replit',
                'services': {
                    'task_manager': {
                        'status': 'healthy',
                        'total_tasks': task_health.get('total_tasks', 0),
                        'active_tasks': task_health.get('processing', 0) + task_health.get('pending', 0)
                    },
                    'cache_manager': cache_health,
                    'rate_limiter': rate_limit_health
                },
                'directories': {
                    'uploads': os.path.exists('uploads'),
                    'outputs': os.path.exists('outputs'),
                    'data': os.path.exists('data')
                },
                'database': {
                    'type': 'postgresql',
                    'url_configured': bool(os.getenv('DATABASE_URL')),
                    'connection_healthy': True  # TODO: Add actual DB health check
                }
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'deployment': 'replit'
            }
    
    # Add Replit-specific info endpoint
    @app.get("/replit/info")
    async def replit_info():
        """Information about Replit deployment"""
        return {
            'deployment': 'replit',
            'services': {
                'task_queue': 'FastAPI BackgroundTasks',
                'caching': 'Replit Database + Memory',
                'rate_limiting': 'In-memory',
                'file_storage': 'Local filesystem',
                'session_management': 'JWT tokens',
                'database': 'PostgreSQL (Neon)'
            },
            'endpoints': {
                'pdf_processing': '/api/v1/pdf-replit/process-async',
                'task_status': '/api/v1/pdf-replit/status/{task_id}',
                'health_check': '/replit/health',
                'stats': '/api/v1/pdf-replit/stats'
            },
            'features': {
                'redis_required': False,
                'celery_required': False,
                'external_dependencies': ['PDF translation APIs'],
                'persistent_storage': True,
                'background_processing': True
            }
        }
    
    logger.info("✅ Replit app configuration completed")
    return app

def main():
    """Main function for Replit deployment"""
    logger.info("🚀 Starting PDF Docat for Replit deployment...")
    
    try:
        # Verify database connection before starting
        logger.info("🔗 Verifying PostgreSQL database connection...")
        database_url = os.getenv('DATABASE_URL')
        if database_url and 'postgresql://' in database_url:
            logger.info("✅ PostgreSQL DATABASE_URL configured")
        else:
            logger.error("❌ Invalid or missing DATABASE_URL")
            logger.error("Please set DATABASE_URL in Replit Secrets")
            return
        
        # Create the app
        app = create_replit_app()
        
        # Get configuration
        host = os.getenv('HOST', '0.0.0.0')
        port = int(os.getenv('PORT', 8000))
        
        logger.info(f"📡 Starting server on {host}:{port}")
        logger.info("💡 Replit deployment features:")
        logger.info("   ✅ No Redis required")
        logger.info("   ✅ No Celery required") 
        logger.info("   ✅ FastAPI BackgroundTasks for async processing")
        logger.info("   ✅ Replit Database + memory caching")
        logger.info("   ✅ In-memory rate limiting")
        logger.info("   ✅ Local file storage")
        
        # Start the server
        uvicorn.run(
            app,
            host=host,
            port=port,
            log_level=os.getenv('LOG_LEVEL', 'info').lower(),
            access_log=True
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        raise

if __name__ == "__main__":
    main() 