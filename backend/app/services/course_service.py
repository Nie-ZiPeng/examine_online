from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.course import Course

async def get_courses(db: AsyncSession, teacher_id: int = None):
    query = select(Course)
    if teacher_id:
        query = query.where(Course.teacher_id == teacher_id)
    result = await db.execute(query)
    return result.scalars().all()

async def get_course(db: AsyncSession, course_id: int):
    result = await db.execute(select(Course).where(Course.id == course_id))
    return result.scalar_one_or_none()

async def create_course(db: AsyncSession, course_data: dict, teacher_id: int):
    course = Course(
        name=course_data["name"],
        description=course_data.get("description"),
        teacher_id=teacher_id
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course

async def update_course(db: AsyncSession, course_id: int, course_data: dict):
    course = await get_course(db, course_id)
    if not course:
        return None
    for key, value in course_data.items():
        if value is not None:
            setattr(course, key, value)
    await db.commit()
    await db.refresh(course)
    return course

async def delete_course(db: AsyncSession, course_id: int):
    course = await get_course(db, course_id)
    if not course:
        return False
    await db.delete(course)
    await db.commit()
    return True
