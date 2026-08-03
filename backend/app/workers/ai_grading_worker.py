import asyncio
import socket
from uuid import uuid4

from sqlalchemy import select

from app.config import settings
from app.database import async_session
from app.models.answer import Answer
from app.models.question import Question
from app.schemas.ai_grading import AiGradingInput
from app.schemas.question import RubricItem
from app.services.ai_grading_agent import grade_essay
from app.services.ai_grading_service import (
    claim_next_ai_grading_task,
    complete_ai_grading_task,
    fail_ai_grading_task,
    validate_grading_result,
)


async def run_worker() -> None:
    worker_id = f"{socket.gethostname()}-{uuid4().hex[:8]}"
    while True:
        async with async_session() as db:
            async with db.begin():
                task = await claim_next_ai_grading_task(db, worker_id)
            if not task:
                await asyncio.sleep(settings.AI_WORKER_POLL_SECONDS)
                continue

            try:
                answer = await db.scalar(select(Answer).where(Answer.id == task.answer_id))
                question = await db.scalar(select(Question).where(Question.id == answer.question_id)) if answer else None
                if not answer or not question or question.type != "essay":
                    raise ValueError("任务未关联有效简答题")
                rubric = [RubricItem.model_validate(item) for item in question.grading_rubric or []]
                grading_input = AiGradingInput(
                    question_content=question.content,
                    question_score=question.score,
                    reference_answer=question.answer,
                    analysis=question.analysis,
                    rubric=question.grading_rubric,
                    student_answer=answer.student_answer,
                )
                result = await grade_essay(grading_input)
                validate_grading_result(result, rubric or None, question.score)
                await complete_ai_grading_task(db, task.id, result, settings.AI_MODEL or "unknown")
            except Exception as exc:
                await db.rollback()
                await fail_ai_grading_task(db, task.id, exc)


if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        pass
