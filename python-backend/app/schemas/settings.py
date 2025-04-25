from typing import Optional
from datetime import datetime
from pydantic import BaseModel


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
    id: int
    updated_at: datetime
    
    class Config:
        orm_mode = True


class Setting(SettingInDBBase):
    pass


class SettingResponse(Setting):
    masked: Optional[bool] = False
