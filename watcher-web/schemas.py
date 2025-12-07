from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


class WatchTargetCreate(BaseModel):
    url: str
    name: Optional[str] = None
    check_interval_seconds: int = 300
    enabled: bool = True


class WatchTargetUpdate(BaseModel):
    url: Optional[str] = None
    name: Optional[str] = None
    check_interval_seconds: Optional[int] = None
    enabled: Optional[bool] = None


class WatchTargetResponse(BaseModel):
    id: int
    url: str
    name: Optional[str]
    check_interval_seconds: int
    enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContentCheckResponse(BaseModel):
    id: int
    target_id: int
    checked_at: datetime
    status_code: Optional[int]
    response_time_ms: Optional[float]
    is_success: bool
    error_message: Optional[str]
    content_hash: Optional[str]
    content_changed: bool
    content_type: Optional[str]
    content_length: Optional[int]

    class Config:
        from_attributes = True
