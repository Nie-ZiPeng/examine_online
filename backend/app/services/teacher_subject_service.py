from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.exam import Exam
from app.models.teacher_subject import TeacherSubject
from app.models.user import User


async def get_teacher_subjects(db: AsyncSession, teacher_id: int) -> List[Course]:
    result = await db.execute(
        select(Course)
        .join(TeacherSubject, TeacherSubject.subject_id == Course.id)
        .where(TeacherSubject.teacher_id == teacher_id)
        .order_by(Course.id)
    )
    return list(result.scalars().all())


async def assign_subject_to_teacher(
    db: AsyncSession, teacher_id: int, subject_id: int
) -> bool:
    teacher = await db.get(User, teacher_id)
    if not teacher or teacher.role != "teacher":
        return False
    subject = await db.get(Course, subject_id)
    if not subject:
        return False
    existing = await db.execute(
        select(TeacherSubject).where(
            TeacherSubject.teacher_id == teacher_id,
            TeacherSubject.subject_id == subject_id,
        )
    )
    if existing.scalar_one_or_none():
        return False
    db.add(TeacherSubject(teacher_id=teacher_id, subject_id=subject_id))
    await db.commit()
    return True


async def remove_subject_from_teacher(
    db: AsyncSession, teacher_id: int, subject_id: int
) -> bool:
    result = await db.execute(
        select(TeacherSubject).where(
            TeacherSubject.teacher_id == teacher_id,
            TeacherSubject.subject_id == subject_id,
        )
    )
    teacher_subject = result.scalar_one_or_none()
    if not teacher_subject:
        return False
    await db.delete(teacher_subject)
    await db.commit()
    return True


async def can_teacher_manage_exam(db: AsyncSession, teacher_id: int, exam_id: int) -> bool:
    exam = await db.get(Exam, exam_id)
    if not exam:
        return False
    result = await db.execute(
        select(TeacherSubject).where(
            TeacherSubject.teacher_id == teacher_id,
            TeacherSubject.subject_id == exam.course_id,
        )
    )
    return result.scalar_one_or_none() is not None
