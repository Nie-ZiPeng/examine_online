from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExamBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration: int
    total_score: int = 100
    pass_score: int = 60
    random_order: bool = True
    max_switch: int = 3

class ExamCreate(ExamBase):
    course_id: int

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[int] = None
    total_score: Optional[int] = None
    pass_score: Optional[int] = None
    random_order: Optional[bool] = None
    max_switch: Optional[int] = None
    status: Optional[str] = None

class ExamResponse(ExamBase):
    id: int
    course_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
