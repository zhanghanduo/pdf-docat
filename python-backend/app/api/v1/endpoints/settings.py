from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.logging import log_user_action
from app.services import settings_service
from app.models.user import User
from app.schemas.settings import Setting, SettingCreate, SettingUpdate, SettingResponse

router = APIRouter()


@router.get("/", response_model=List[SettingResponse])
def read_settings(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Retrieve all settings. Admin only.
    """
    settings = settings_service.get_all_settings(db)
    
    # Mask sensitive values like API keys
    masked_settings = []
    for setting in settings:
        if "API_KEY" in setting.key:
            # Create a copy of the setting with masked value
            masked_setting = settings_service.mask_sensitive_setting(setting)
            masked_settings.append(SettingResponse(
                id=masked_setting.id,
                key=masked_setting.key,
                value=masked_setting.value,
                description=masked_setting.description,
                updated_at=masked_setting.updated_at,
                masked=True
            ))
        else:
            masked_settings.append(SettingResponse(
                id=setting.id,
                key=setting.key,
                value=setting.value,
                description=setting.description,
                updated_at=setting.updated_at,
                masked=False
            ))
    
    return masked_settings


@router.get("/{key}", response_model=SettingResponse)
def read_setting(
    *,
    db: Session = Depends(deps.get_db),
    key: str,
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Get a specific setting by key. Admin only.
    """
    setting = settings_service.get_setting(db, key)
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Setting not found",
        )
    
    # Mask sensitive values like API keys
    if "API_KEY" in setting.key:
        masked_setting = settings_service.mask_sensitive_setting(setting)
        return SettingResponse(
            id=masked_setting.id,
            key=masked_setting.key,
            value=masked_setting.value,
            description=masked_setting.description,
            updated_at=masked_setting.updated_at,
            masked=True
        )
    
    return SettingResponse(
        id=setting.id,
        key=setting.key,
        value=setting.value,
        description=setting.description,
        updated_at=setting.updated_at,
        masked=False
    )


@router.post("/", response_model=SettingResponse)
def create_or_update_setting(
    *,
    db: Session = Depends(deps.get_db),
    setting_in: SettingCreate,
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Create or update a setting. Admin only.
    """
    setting = settings_service.set_setting(
        db, 
        setting_in.key, 
        setting_in.value, 
        setting_in.description
    )
    
    # Log setting update
    log_user_action(db, current_user.id, "Updated setting", {"key": setting_in.key})
    
    # Mask sensitive values in the response
    if "API_KEY" in setting.key:
        masked_setting = settings_service.mask_sensitive_setting(setting)
        return SettingResponse(
            id=masked_setting.id,
            key=masked_setting.key,
            value=masked_setting.value,
            description=masked_setting.description,
            updated_at=masked_setting.updated_at,
            masked=True
        )
    
    return SettingResponse(
        id=setting.id,
        key=setting.key,
        value=setting.value,
        description=setting.description,
        updated_at=setting.updated_at,
        masked=False
    )
