from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.exam_record import ExamRecord
from app.models.question import Question
from app.models.answer import Answer

async def get_exam_records(db: AsyncSession, exam_id: int):
    result = await db.execute(
        select(ExamRecord).where(ExamRecord.exam_id == exam_id)
    )
    return result.scalars().all()

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

    answers_with_questions = []
    for a in answers:
        q = questions[a.question_id]
        answers_with_questions.append({
            "id": a.id,
            "question_id": a.question_id,
            "student_answer": a.student_answer,
            "score": a.score,
            "is_correct": a.is_correct,
            "graded_at": a.graded_at,
            "question": {
                "type": q.type,
                "content": q.content,
                "options": q.options,
                "answer": q.answer,
                "score": q.score
            }
        })

    return answers_with_questions

async def grade_answer(db: AsyncSession, answer_id: int, grader_id: int, score: int, is_correct: bool = None):
    result = await db.execute(select(Answer).where(Answer.id == answer_id))
    answer = result.scalar_one_or_none()
    if not answer:
        return None

    answer.score = score
    answer.is_correct = is_correct
    answer.graded_at = datetime.now()
    answer.grader_id = grader_id

    await db.commit()

    # 重新计算总分
    await recalculate_total_score(db, answer.record_id)

    await db.refresh(answer)
    return answer

async def recalculate_total_score(db: AsyncSession, record_id: int):
    result = await db.execute(
        select(Answer).where(Answer.record_id == record_id)
    )
    answers = result.scalars().all()
    total_score = sum(a.score for a in answers)

    result = await db.execute(select(ExamRecord).where(ExamRecord.id == record_id))
    record = result.scalar_one_or_none()
    if record:
        record.score = total_score
        record.status = "graded"
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
