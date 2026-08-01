from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.exam import Exam

async def get_exams(db: AsyncSession, course_id: int = None, status: str = None):
    query = select(Exam)
    if course_id:
        query = query.where(Exam.course_id == course_id)
    if status:
        query = query.where(Exam.status == status)
    result = await db.execute(query)
    return result.scalars().all()

async def get_exam(db: AsyncSession, exam_id: int):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    return result.scalar_one_or_none()

async def create_exam(db: AsyncSession, exam_data: dict):
    exam = Exam(**exam_data)
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return exam

async def update_exam(db: AsyncSession, exam_id: int, exam_data: dict):
    exam = await get_exam(db, exam_id)
    if not exam:
        return None
    for key, value in exam_data.items():
        if value is not None:
            setattr(exam, key, value)
    await db.commit()
    await db.refresh(exam)
    return exam

async def publish_exam(db: AsyncSession, exam_id: int):
    exam = await get_exam(db, exam_id)
    if not exam:
        return None
    exam.status = "published"
    await db.commit()
    await db.refresh(exam)
    return exam

async def delete_exam(db: AsyncSession, exam_id: int):
    exam = await get_exam(db, exam_id)
    if not exam:
        return False
    await db.delete(exam)
    await db.commit()
    return True
