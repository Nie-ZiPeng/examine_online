from datetime import datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.exam import Exam
from app.models.user import User
from app.services.teacher_subject_service import (
    get_teacher_subjects, assign_subject_to_teacher,
    remove_subject_from_teacher, can_teacher_manage_exam,
)


async def _make_teacher_and_course(db: AsyncSession):
    teacher = User(username="t1", password_hash="x", role="teacher", name="教师1")
    db.add(teacher)
    await db.flush()
    course = Course(name="高等数学", teacher_id=teacher.id)
    db.add(course)
    await db.commit()
    await db.refresh(teacher)
    await db.refresh(course)
    return teacher, course


@pytest.mark.asyncio
async def test_assign_and_get_teacher_subjects(db: AsyncSession):
    teacher, course = await _make_teacher_and_course(db)
    assert await assign_subject_to_teacher(db, teacher.id, course.id) is True
    subjects = await get_teacher_subjects(db, teacher.id)
    assert len(subjects) == 1
    assert subjects[0].id == course.id


@pytest.mark.asyncio
async def test_assign_duplicate_rejected(db: AsyncSession):
    teacher, course = await _make_teacher_and_course(db)
    assert await assign_subject_to_teacher(db, teacher.id, course.id) is True
    assert await assign_subject_to_teacher(db, teacher.id, course.id) is False


@pytest.mark.asyncio
async def test_assign_rejects_non_teacher(db: AsyncSession):
    student = User(username="s1", password_hash="x", role="student", name="学生1")
    db.add(student)
    await db.commit()
    course = Course(name="语文", teacher_id=student.id)
    db.add(course)
    await db.commit()
    assert await assign_subject_to_teacher(db, student.id, course.id) is False


@pytest.mark.asyncio
async def test_remove_subject(db: AsyncSession):
    teacher, course = await _make_teacher_and_course(db)
    await assign_subject_to_teacher(db, teacher.id, course.id)
    assert await remove_subject_from_teacher(db, teacher.id, course.id) is True
    assert await remove_subject_from_teacher(db, teacher.id, course.id) is False
    assert await get_teacher_subjects(db, teacher.id) == []


@pytest.mark.asyncio
async def test_can_teacher_manage_exam(db: AsyncSession):
    teacher, course = await _make_teacher_and_course(db)
    exam = Exam(
        course_id=course.id, title="期中",
        start_time=datetime(2026, 8, 10, 10, 0, 0),
        end_time=datetime(2026, 8, 10, 12, 0, 0), duration=120,
    )
    db.add(exam)
    await db.commit()
    assert await can_teacher_manage_exam(db, teacher.id, exam.id) is False
    await assign_subject_to_teacher(db, teacher.id, course.id)
    assert await can_teacher_manage_exam(db, teacher.id, exam.id) is True
