from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AnswerBase(BaseModel):
    question_id: int
    student_answer: Optional[str] = None

class AnswerCreate(AnswerBase):
    pass

class AnswerUpdate(BaseModel):
    student_answer: Optional[str] = None
    score: Optional[int] = None
    is_correct: Optional[bool] = None

class AnswerResponse(AnswerBase):
    id: int
    record_id: int
    score: int
    is_correct: Optional[bool] = None
    graded_at: Optional[datetime] = None
    grader_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class GradeRequest(BaseModel):
    score: int
    is_correct: Optional[bool] = None
