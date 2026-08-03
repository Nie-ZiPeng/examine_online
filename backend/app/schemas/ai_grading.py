from typing import Annotated

from pydantic import BaseModel, Field, field_validator


class CriterionResult(BaseModel):
    criterion_id: str
    score: Annotated[int, Field(ge=0)]
    reason: Annotated[str, Field(min_length=1, max_length=300)]


class AiGradingResult(BaseModel):
    score: Annotated[int, Field(ge=0)]
    reasoning: Annotated[str, Field(min_length=1, max_length=500)]
    criterion_results: list[CriterionResult]
    confidence: Annotated[float, Field(ge=0, le=1)]

    @field_validator("criterion_results")
    @classmethod
    def require_at_least_one_result(cls, value: list[CriterionResult]):
        if not value:
            raise ValueError("至少需要一个评分要点结果")
        return value


class AiGradingInput(BaseModel):
    question_content: str
    question_score: int
    reference_answer: str | None = None
    analysis: str | None = None
    rubric: list[dict] | None = None
    student_answer: str | None = None
