import pytest
from pydantic import ValidationError

from app.schemas.question import QuestionCreate


def test_essay_rubric_must_match_question_score():
    with pytest.raises(ValidationError, match="评分要点总分"):
        QuestionCreate(
            type="essay",
            content="解释 OOP",
            answer="参考答案",
            score=10,
            grading_rubric=[
                {"criterion_id": "encapsulation", "criterion": "封装", "points": 6},
                {"criterion_id": "inheritance", "criterion": "继承", "points": 3},
            ],
        )


def test_non_essay_question_rejects_rubric():
    with pytest.raises(ValidationError, match="仅简答题"):
        QuestionCreate(
            type="single",
            content="选择题",
            answer="A",
            score=1,
            grading_rubric=[],
        )
