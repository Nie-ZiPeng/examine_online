from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

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

    class Config:
        from_attributes = True

class QuestionImport(BaseModel):
    questions: List[QuestionCreate]
