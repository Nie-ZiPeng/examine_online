from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_grading_task import AiGradingTask
from app.models.answer import Answer
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


async def enqueue_ai_grading_task(db: AsyncSession, answer_id: int) -> AiGradingTask:
    existing = await db.scalar(select(AiGradingTask).where(AiGradingTask.answer_id == answer_id))
    if existing:
        return existing
    task = AiGradingTask(answer_id=answer_id, status="pending")
    db.add(task)
    await db.flush()
    return task


async def claim_next_ai_grading_task(
    db: AsyncSession,
    worker_id: str,
    now: datetime | None = None,
) -> AiGradingTask | None:
    now = now or datetime.now()
    task = await db.scalar(
        select(AiGradingTask)
        .where(AiGradingTask.status == "pending", AiGradingTask.available_at <= now)
        .order_by(AiGradingTask.available_at, AiGradingTask.id)
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    if not task:
        return None
    task.status = "processing"
    task.attempt_count += 1
    task.locked_at = now
    task.locked_by = worker_id
    await db.flush()
    return task


async def complete_ai_grading_task(
    db: AsyncSession,
    task_id: int,
    result: AiGradingResult,
    model_name: str,
) -> None:
    task = await db.scalar(select(AiGradingTask).where(AiGradingTask.id == task_id).with_for_update())
    if not task:
        raise ValueError("AI 评分任务不存在")
    answer = await db.scalar(select(Answer).where(Answer.id == task.answer_id).with_for_update())
    if not answer:
        raise ValueError("AI 评分答案不存在")

    now = datetime.now()
    answer.ai_score = result.score
    answer.ai_feedback = result.model_dump()
    answer.ai_model = model_name
    answer.ai_graded_at = now
    if answer.grading_source in {"pending", "ai"}:
        answer.score = result.score
        answer.grading_source = "ai"
        from app.services.grading_service import recalculate_total_score

        await recalculate_total_score(db, answer.record_id, commit=False)

    task.status = "completed"
    task.completed_at = now
    task.last_error = None
    task.locked_at = None
    task.locked_by = None
    await db.commit()


async def fail_ai_grading_task(
    db: AsyncSession,
    task_id: int,
    error: Exception | str,
    now: datetime | None = None,
) -> None:
    task = await db.scalar(select(AiGradingTask).where(AiGradingTask.id == task_id).with_for_update())
    if not task:
        return
    now = now or datetime.now()
    message = str(error).replace("\n", " ")[:500]
    task.last_error = message
    task.locked_at = None
    task.locked_by = None
    if task.attempt_count >= task.max_attempts:
        task.status = "failed"
        answer = await db.get(Answer, task.answer_id)
        if answer and answer.grading_source == "pending":
            answer.grading_source = "failed"
    else:
        task.status = "pending"
        task.available_at = now + timedelta(seconds=2 ** task.attempt_count)
    await db.commit()
