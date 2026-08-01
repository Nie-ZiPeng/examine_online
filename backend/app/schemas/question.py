from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
import json

class QuestionBase(BaseModel):
    type: str
    content: str
    options: Optional[List[str]] = None
    answer: Optional[str] = None
    score: int = 1
    sort_order: int = 0

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(BaseModel):
    type: Optional[str] = None
    content: Optional[str] = None
    options: Optional[List[str]] = None
    answer: Optional[str] = None
    score: Optional[int] = None
    sort_order: Optional[int] = None

class QuestionResponse(QuestionBase):
    id: int
    exam_id: int
    created_at: datetime

    @field_validator("options", mode="before")
    @classmethod
    def parse_options(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (ValueError, TypeError):
                return None
        return v

    class Config:
        from_attributes = True

class QuestionImport(BaseModel):
    questions: List[QuestionCreate]
