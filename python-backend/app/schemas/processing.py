from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field


class ContentItem(BaseModel):
    type: str
    content: Optional[str] = None
    translated_content: Optional[str] = None
    language: Optional[str] = None
    headers: Optional[List[str]] = None
    translated_headers: Optional[List[str]] = None
    rows: Optional[List[List[str]]] = None
    translated_rows: Optional[List[List[str]]] = None


class Metadata(BaseModel):
    extraction_time: str
    word_count: int
    confidence: float
    is_translated: Optional[bool] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None


class ExtractedContent(BaseModel):
    title: str
    pages: int
    content: List[ContentItem]
    metadata: Metadata


class ProcessingLogBase(BaseModel):
    file_name: str
    file_size: int
    file_hash: Optional[str] = None
    engine: str
    status: str
    processing_time: Optional[int] = None
    credits_used: Optional[int] = None


class ProcessingLogCreate(ProcessingLogBase):
    user_id: int
    extracted_content: Optional[Dict[str, Any]] = None
    file_annotations: Optional[Dict[str, Any]] = None


class ProcessingLogUpdate(BaseModel):
    status: Optional[str] = None
    processing_time: Optional[int] = None
    extracted_content: Optional[Dict[str, Any]] = None
    file_annotations: Optional[Dict[str, Any]] = None
    credits_used: Optional[int] = None


class ProcessingLogInDBBase(ProcessingLogBase):
    id: int
    user_id: int
    extracted_content: Optional[Dict[str, Any]] = None
    file_annotations: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        orm_mode = True


class ProcessingLog(ProcessingLogInDBBase):
    pass


class ProcessingResponse(BaseModel):
    extracted_content: Dict[str, Any]
    file_annotations: Optional[Dict[str, Any]] = None
    log_id: int
    cached: Optional[bool] = False


class TranslationOptions(BaseModel):
    translate_enabled: Optional[bool] = False
    target_language: Optional[str] = "simplified-chinese"
    dual_language: Optional[bool] = False
