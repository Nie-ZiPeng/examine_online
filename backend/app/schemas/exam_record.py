from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExamRecordBase(BaseModel):
    exam_id: int

class ExamRecordResponse(ExamRecordBase):
    id: int
    student_id: int
    start_time: datetime
    submit_time: Optional[datetime] = None
    score: int
    status: str
    switch_count: int
    created_at: datetime

    class Config:
        from_attributes = True
