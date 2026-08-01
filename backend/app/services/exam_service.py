from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.exam import Exam

async def get_exams(db: AsyncSession, course_id: int = None, status: str = None, page: int = 1, page_size: int = 10):
    query = select(Exam)
    if course_id:
        query = query.where(Exam.course_id == course_id)
    if status:
        query = query.where(Exam.status == status)
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    return result.scalars().all(), total

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
