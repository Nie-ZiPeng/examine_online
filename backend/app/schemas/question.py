from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
import json

class RubricItem(BaseModel):
    criterion_id: str
    criterion: str
    points: int

    @field_validator("criterion_id", "criterion")
    @classmethod
    def require_non_empty_text(cls, value: str):
        if not value.strip():
            raise ValueError("评分要点不能为空")
        return value.strip()

    @field_validator("points")
    @classmethod
    def require_non_negative_points(cls, value: int):
        if value < 0:
            raise ValueError("评分要点分值不能为负数")
        return value


class QuestionBase(BaseModel):
    type: str
    content: str
    options: Optional[List[str]] = None
    answer: Optional[str] = None
    score: int = 1
    sort_order: int = 0
    analysis: Optional[str] = None
    grading_rubric: Optional[List[RubricItem]] = None

    @model_validator(mode="after")
    def validate_grading_rubric(self):
        if self.grading_rubric is None:
            return self
        if self.type != "essay":
            raise ValueError("评分要点仅简答题可配置")
        criterion_ids = [item.criterion_id for item in self.grading_rubric]
        if len(criterion_ids) != len(set(criterion_ids)):
            raise ValueError("评分要点 ID 不能重复")
        if sum(item.points for item in self.grading_rubric) != self.score:
            raise ValueError("评分要点总分必须等于题目分值")
        return self

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(BaseModel):
    type: Optional[str] = None
    content: Optional[str] = None
    options: Optional[List[str]] = None
    answer: Optional[str] = None
    score: Optional[int] = None
    sort_order: Optional[int] = None
    analysis: Optional[str] = None
    grading_rubric: Optional[List[RubricItem]] = None

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

    @field_validator("grading_rubric", mode="before")
    @classmethod
    def parse_grading_rubric(cls, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except (ValueError, TypeError):
                return None
        return value

    class Config:
        from_attributes = True

class QuestionImport(BaseModel):
    questions: List[QuestionCreate]
