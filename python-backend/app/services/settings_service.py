from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.setting import Setting


def get_setting(db: Session, key: str) -> Optional[Setting]:
    return db.query(Setting).filter(Setting.key == key).first()


def get_all_settings(db: Session) -> List[Setting]:
    return db.query(Setting).all()


def set_setting(
    db: Session, 
    key: str, 
    value: str, 
    description: Optional[str] = None
) -> Setting:
    setting = db.query(Setting).filter(Setting.key == key).first()
    
    if setting:
        # Update existing setting
        setting.value = value
        setting.updated_at = datetime.utcnow()
        if description:
            setting.description = description
    else:
        # Create new setting
        setting = Setting(
            key=key,
            value=value,
            description=description,
            updated_at=datetime.utcnow()
        )
        db.add(setting)
    
    db.commit()
    db.refresh(setting)
    return setting


def mask_sensitive_setting(setting: Setting) -> Setting:
    """
    Mask sensitive values like API keys
    """
    if "API_KEY" in setting.key and setting.value and len(setting.value) > 8:
        # Create a copy of the setting to avoid modifying the original
        masked_setting = Setting(
            id=setting.id,
            key=setting.key,
            value=f"{setting.value[:4]}{'•' * (len(setting.value) - 8)}{setting.value[-4:]}",
            description=setting.description,
            updated_at=setting.updated_at
        )
        return masked_setting
    
    return setting
