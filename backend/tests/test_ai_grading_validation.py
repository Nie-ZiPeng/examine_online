import pytest

from app.schemas.ai_grading import AiGradingResult
from app.schemas.question import RubricItem
from app.services.ai_grading_service import validate_grading_result


def test_result_requires_each_rubric_item_once():
    rubric = [RubricItem(criterion_id="encapsulation", criterion="封装", points=5)]
    result = AiGradingResult(
        score=5,
        reasoning="答案完整",
        criterion_results=[
            {"criterion_id": "unknown", "score": 5, "reason": "无依据"},
        ],
        confidence=0.8,
    )

    with pytest.raises(ValueError, match="评分要点"):
        validate_grading_result(result, rubric, 5)


def test_result_rejects_total_different_from_items():
    result = AiGradingResult(
        score=4,
        reasoning="部分正确",
        criterion_results=[
            {"criterion_id": "default", "score": 3, "reason": "部分正确"},
        ],
        confidence=0.8,
    )

    with pytest.raises(ValueError, match="总分"):
        validate_grading_result(result, None, 5)
