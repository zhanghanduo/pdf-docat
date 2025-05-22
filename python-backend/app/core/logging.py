import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from app.models.user import User

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("pdf-docat")


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = datetime.utcnow()
        
        # Process the request
        response = await call_next(request)
        
        # Log the request
        process_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        log_dict = {
            "timestamp": datetime.utcnow().isoformat(),
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "process_time_ms": process_time,
            "client_ip": request.client.host if request.client else None,
        }
        
        # Add user info if available
        user = getattr(request.state, "user", None)
        if user:
            log_dict["user_id"] = user.id
            log_dict["user_email"] = user.email
        
        logger.info(f"Request: {json.dumps(log_dict)}")
        
        return response


def log_user_action(
    db: Session,
    user_id: int,
    action: str,
    details: Optional[Dict[str, Any]] = None
):
    """
    Log user actions for auditing purposes
    """
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "action": action,
        "details": details or {},
    }
    
    # Get user email for better logging
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        log_entry["user_email"] = user.email
    
    logger.info(f"User Action: {json.dumps(log_entry)}")
    
    # In a production environment, you might want to store these logs in a database
    # or send them to a logging service
