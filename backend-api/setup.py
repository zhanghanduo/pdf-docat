#!/usr/bin/env python3
"""
Setup script for PDF-Docat Backend API
Handles PDFMathTranslate installation and configuration
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_command(command, cwd=None):
    """Run a shell command and return the result"""
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            cwd=cwd,
            capture_output=True, 
            text=True, 
            check=True
        )
        logger.info(f"✅ Command succeeded: {command}")
        return result.stdout
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Command failed: {command}")
        logger.error(f"Error: {e.stderr}")
        return None

def install_pdftranslate():
    """Install PDFMathTranslate if not already installed"""
    try:
        # Check if PDFMathTranslate is already installed
        import PDFMathTranslate
        logger.info("✅ PDFMathTranslate is already installed")
        return True
    except ImportError:
        pass
    
    logger.info("📦 Installing PDFMathTranslate...")
    
    # Check if PDFMathTranslate directory exists
    pdft_dir = Path("PDFMathTranslate")
    
    if not pdft_dir.exists():
        logger.info("📥 Cloning PDFMathTranslate repository from awwaawwa/PDFMathTranslate...")
        result = run_command("git clone https://github.com/awwaawwa/PDFMathTranslate.git")
        if result is None:
            logger.error("❌ Failed to clone PDFMathTranslate")
            return False
        
        # Checkout v2-rc branch
        logger.info("🔄 Checking out v2-rc branch...")
        result = run_command("git checkout v2-rc", cwd=pdft_dir)
        if result is None:
            logger.warning("⚠️ Failed to checkout v2-rc branch, using default branch")
            # Continue anyway, don't fail the installation
    else:
        logger.info("📁 PDFMathTranslate directory already exists")
        # If directory exists, ensure we're on the correct branch
        logger.info("🔄 Ensuring we're on v2-rc branch...")
        run_command("git fetch origin", cwd=pdft_dir)
        result = run_command("git checkout v2-rc", cwd=pdft_dir)
        if result is None:
            logger.warning("⚠️ Failed to checkout v2-rc branch, using current branch")
    
    # Install PDFMathTranslate
    logger.info("🔧 Installing PDFMathTranslate...")
    result = run_command("pip install -e .", cwd=pdft_dir)
    if result is None:
        logger.error("❌ Failed to install PDFMathTranslate")
        return False
    
    # Verify installation
    try:
        import PDFMathTranslate
        logger.info("✅ PDFMathTranslate installed successfully")
        return True
    except ImportError:
        logger.error("❌ PDFMathTranslate installation verification failed")
        return False

def install_dependencies():
    """Install Python dependencies"""
    logger.info("📦 Installing Python dependencies...")
    result = run_command("pip install -r requirements.txt")
    if result is None:
        logger.error("❌ Failed to install dependencies")
        return False
    
    logger.info("✅ Dependencies installed successfully")
    return True

def verify_redis_connection():
    """Verify Redis connection and installation"""
    try:
        import redis
        # Try to connect to Redis
        r = redis.Redis(host='localhost', port=6379, decode_responses=True)
        r.ping()
        logger.info("✅ Redis connection verified successfully")
        return True
    except ImportError:
        logger.error("❌ Redis Python client not installed")
        return False
    except Exception as e:
        logger.warning(f"⚠️ Redis server not accessible: {e}")
        logger.info("💡 Note: Redis server needs to be running for full functionality")
        logger.info("💡 Docker: docker run -d -p 6379:6379 redis:7-alpine")
        logger.info("💡 Or install Redis locally: https://redis.io/download")
        return True  # Don't fail setup if Redis server isn't running

def create_directories():
    """Create necessary directories"""
    dirs = ["uploads", "outputs", "logs"]
    for dir_name in dirs:
        Path(dir_name).mkdir(exist_ok=True)
        logger.info(f"📁 Created directory: {dir_name}")

def main():
    """Main setup function"""
    logger.info("🚀 Setting up PDF-Docat Backend API...")
    
    # Install Python dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Verify Redis installation
    if not verify_redis_connection():
        sys.exit(1)
    
    # Install PDFMathTranslate
    if not install_pdftranslate():
        sys.exit(1)
    
    # Create necessary directories
    create_directories()
    
    logger.info("🎉 Setup completed successfully!")
    logger.info("💡 You can now run: python main.py")
    logger.info("💡 For task processing, also start Celery worker: celery -A app.tasks.celery_app worker --loglevel=info")

if __name__ == "__main__":
    main() 