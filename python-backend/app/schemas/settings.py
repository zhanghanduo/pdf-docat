from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SettingBase(BaseModel):
    key: str
    value: Optional[str] = None
    description: Optional[str] = None


class SettingCreate(SettingBase):
    pass


class SettingUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None


class SettingInDBBase(SettingBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    updated_at: datetime


class Setting(SettingInDBBase):
    pass


class SettingResponse(Setting):
    masked: Optional[bool] = False
