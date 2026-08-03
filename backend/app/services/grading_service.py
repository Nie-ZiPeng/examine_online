from datetime import datetime
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.exam_record import ExamRecord
from app.models.question import Question
from app.models.answer import Answer
from app.models.user import User
from app.models.ai_grading_task import AiGradingTask

async def get_exam_records(db: AsyncSession, exam_id: int, page: int = 1, page_size: int = 10):
    query = select(ExamRecord).where(ExamRecord.exam_id == exam_id).order_by(ExamRecord.submit_time.desc())
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    records = result.scalars().all()

    student_ids = [r.student_id for r in records]
    students = {}
    if student_ids:
        res = await db.execute(select(User).where(User.id.in_(student_ids)))
        students = {u.id: u for u in res.scalars().all()}

    items = []
    for r in records:
        s = students.get(r.student_id)
        items.append({
            "id": r.id,
            "student_id": r.student_id,
            "exam_id": r.exam_id,
            "score": r.score,
            "status": r.status,
            "switch_count": r.switch_count,
            "start_time": r.start_time,
            "submit_time": r.submit_time,
            "student": {
                "id": s.id,
                "username": s.username,
                "role": s.role,
                "name": s.name,
                "email": s.email,
                "phone": s.phone,
                "is_active": s.is_active,
                "created_at": s.created_at
            } if s else None
        })
    return items, total

async def get_record_answers(db: AsyncSession, record_id: int):
    result = await db.execute(
        select(Answer).where(Answer.record_id == record_id)
    )
    answers = result.scalars().all()

    # 获取题目信息
    question_ids = [a.question_id for a in answers]
    result = await db.execute(
        select(Question).where(Question.id.in_(question_ids))
    )
    questions = {q.id: q for q in result.scalars().all()}
    task_result = await db.execute(select(AiGradingTask).where(AiGradingTask.answer_id.in_([a.id for a in answers])))
    tasks = {task.answer_id: task for task in task_result.scalars().all()}

    answers_with_questions = []
    for a in answers:
        q = questions[a.question_id]
        options = None
        if q.options:
            try:
                options = json.loads(q.options)
            except (ValueError, TypeError):
                options = q.options
        task = tasks.get(a.id)
        ai_grading = {
            "answer_id": a.id,
            "question_id": a.question_id,
            "record_id": a.record_id,
            "grading_status": task.status if task else a.grading_source,
            "grading_source": a.grading_source,
            "ai_score": a.ai_score,
            "ai_feedback": a.ai_feedback,
            "ai_model": a.ai_model,
            "ai_graded_at": a.ai_graded_at,
            "last_error": task.last_error if task else None,
        }
        answers_with_questions.append({
            "id": a.id,
            "question_id": a.question_id,
            "student_answer": a.student_answer,
            "score": a.score,
            "is_correct": a.is_correct,
            "graded_at": a.graded_at,
            "ai_grading": ai_grading,
            "question": {
                "type": q.type,
                "content": q.content,
                "options": options,
                "answer": q.answer,
                "score": q.score
            }
        })

    return answers_with_questions

async def grade_answer(
    db: AsyncSession,
    answer_id: int,
    grader_id: int,
    score: int,
    is_correct: bool = None,
    override_reason: str | None = None,
):
    result = await db.execute(select(Answer).where(Answer.id == answer_id))
    answer = result.scalar_one_or_none()
    if not answer:
        return None

    answer.score = score
    answer.is_correct = is_correct
    answer.graded_at = datetime.now()
    answer.grader_id = grader_id
    if answer.ai_score is not None and score != answer.ai_score:
        answer.override_reason = override_reason
    answer.grading_source = "teacher"

    await db.commit()

    # 重新计算总分
    await recalculate_total_score(db, answer.record_id)

    await db.refresh(answer)
    return answer

async def recalculate_total_score(db: AsyncSession, record_id: int, commit: bool = True):
    result = await db.execute(
        select(Answer).where(Answer.record_id == record_id)
    )
    answers = result.scalars().all()
    total_score = sum(a.score for a in answers)

    result = await db.execute(select(ExamRecord).where(ExamRecord.id == record_id))
    record = result.scalar_one_or_none()
    if record:
        record.score = total_score
        if commit:
            await db.commit()

async def finalize_record(db: AsyncSession, record_id: int):
    result = await db.execute(select(ExamRecord).where(ExamRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        return None

    record.status = "graded"
    await db.commit()
    await db.refresh(record)
    return record
