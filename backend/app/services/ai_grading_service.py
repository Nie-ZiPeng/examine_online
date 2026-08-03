from app.schemas.ai_grading import AiGradingResult
from app.schemas.question import RubricItem


def validate_grading_result(
    result: AiGradingResult,
    rubric: list[RubricItem] | None,
    question_score: int,
) -> None:
    criterion_results = result.criterion_results
    result_ids = [item.criterion_id for item in criterion_results]

    if len(result_ids) != len(set(result_ids)):
        raise ValueError("评分要点不能重复")

    if rubric:
        rubric_by_id = {item.criterion_id: item for item in rubric}
        if set(result_ids) != set(rubric_by_id):
            raise ValueError("评分要点与题目 rubric 不一致")
        for item in criterion_results:
            if item.score > rubric_by_id[item.criterion_id].points:
                raise ValueError("分项得分超过评分要点满分")
    else:
        if len(criterion_results) != 1 or result_ids != ["default"]:
            raise ValueError("无 rubric 题目必须返回默认评分要点")
        if criterion_results[0].score > question_score:
            raise ValueError("分项得分超过题目满分")

    item_total = sum(item.score for item in criterion_results)
    if result.score != item_total or result.score > question_score:
        raise ValueError("总分与分项得分不一致")
