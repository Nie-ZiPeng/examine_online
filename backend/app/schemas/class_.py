from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ClassCreate(BaseModel):
    name: str
    grade: Optional[str] = None
    description: Optional[str] = None


class ClassUpdate(BaseModel):
    name: Optional[str] = None
    grade: Optional[str] = None
    description: Optional[str] = None


class ClassResponse(BaseModel):
    id: int
    name: str
    grade: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
