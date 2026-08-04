from datetime import datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.answer import Answer
from app.models.course import Course
from app.models.exam import Exam
from app.models.exam_record import ExamRecord
from app.models.user import User
from app.services.exam_service import create_exam, get_teacher_exams
from app.services.grading_service import get_exam_id_by_answer, get_exam_id_by_record
from app.services.teacher_subject_service import (
    can_teacher_manage_subject, assign_subject_to_teacher,
)


async def _make_teacher_and_course(db: AsyncSession, username="t1"):
    teacher = User(username=username, password_hash="x", role="teacher", name="教师")
    db.add(teacher)
    await db.flush()
    course = Course(name="高等数学", teacher_id=teacher.id)
    db.add(course)
    await db.commit()
    await db.refresh(teacher)
    await db.refresh(course)
    return teacher, course


async def _make_exam(db: AsyncSession, course_id: int, title="考试", **kw) -> Exam:
    data = {
        "title": title, "course_id": course_id,
        "start_time": datetime(2026, 8, 10, 10, 0, 0),
        "end_time": datetime(2026, 8, 10, 12, 0, 0), "duration": 120,
    }
    data.update(kw)
    return await create_exam(db, data)


@pytest.mark.asyncio
async def test_can_teacher_manage_subject_false_before_assignment(db: AsyncSession):
    teacher, course = await _make_teacher_and_course(db)
    assert await can_teacher_manage_subject(db, teacher.id, course.id) is False


@pytest.mark.asyncio
async def test_can_teacher_manage_subject_true_after_assignment(db: AsyncSession):
    teacher, course = await _make_teacher_and_course(db)
    await assign_subject_to_teacher(db, teacher.id, course.id)
    assert await can_teacher_manage_subject(db, teacher.id, course.id) is True


@pytest.mark.asyncio
async def test_can_teacher_manage_subject_unknown_course(db: AsyncSession):
    teacher, _ = await _make_teacher_and_course(db)
    assert await can_teacher_manage_subject(db, teacher.id, 999) is False


@pytest.mark.asyncio
async def test_can_teacher_manage_subject_only_own_assignment(db: AsyncSession):
    teacher_a, course = await _make_teacher_and_course(db)
    teacher_b, _ = await _make_teacher_and_course(db, username="t2")
    await assign_subject_to_teacher(db, teacher_a.id, course.id)
    assert await can_teacher_manage_subject(db, teacher_b.id, course.id) is False


@pytest.mark.asyncio
async def test_teacher_without_assignments_gets_empty_exam_list(db: AsyncSession):
    teacher, course = await _make_teacher_and_course(db)
    await _make_exam(db, course.id, status="published")
    exams, total = await get_teacher_exams(db, teacher.id)
    assert total == 0
    assert exams == []


@pytest.mark.asyncio
async def test_teacher_exam_list_only_includes_assigned_courses(db: AsyncSession):
    teacher, course_a = await _make_teacher_and_course(db)
    course_b = Course(name="大学英语", teacher_id=teacher.id)
    db.add(course_b)
    await db.commit()
    await db.refresh(course_b)
    await assign_subject_to_teacher(db, teacher.id, course_a.id)
    await _make_exam(db, course_a.id, title="数学考试")
    await _make_exam(db, course_b.id, title="英语考试")
    exams, total = await get_teacher_exams(db, teacher.id)
    assert total == 1
    assert exams[0].title == "数学考试"


@pytest.mark.asyncio
async def test_teacher_exam_list_filters_by_status(db: AsyncSession):
    teacher, course = await _make_teacher_and_course(db)
    await assign_subject_to_teacher(db, teacher.id, course.id)
    await _make_exam(db, course.id, title="草稿")
    await _make_exam(db, course.id, title="已发布", status="published")
    exams, total = await get_teacher_exams(db, teacher.id, status="published")
    assert total == 1
    assert exams[0].title == "已发布"


@pytest.mark.asyncio
async def test_get_exam_id_by_record(db: AsyncSession):
    teacher, course = await _make_teacher_and_course(db)
    student = User(username="s1", password_hash="x", role="student", name="学生")
    db.add(student)
    await db.commit()
    await db.refresh(student)
    exam = await _make_exam(db, course.id)
    record = ExamRecord(student_id=student.id, exam_id=exam.id,
                        start_time=datetime(2026, 8, 10, 10, 0, 0))
    db.add(record)
    await db.commit()
    assert await get_exam_id_by_record(db, record.id) == exam.id
    assert await get_exam_id_by_record(db, 999) is None


@pytest.mark.asyncio
async def test_get_exam_id_by_answer(db: AsyncSession):
    teacher, course = await _make_teacher_and_course(db)
    student = User(username="s1", password_hash="x", role="student", name="学生")
    db.add(student)
    await db.commit()
    await db.refresh(student)
    exam = await _make_exam(db, course.id)
    record = ExamRecord(student_id=student.id, exam_id=exam.id,
                        start_time=datetime(2026, 8, 10, 10, 0, 0))
    db.add(record)
    await db.flush()
    answer = Answer(record_id=record.id, question_id=1, score=0)
    db.add(answer)
    await db.commit()
    assert await get_exam_id_by_answer(db, answer.id) == exam.id
    assert await get_exam_id_by_answer(db, 999) is None
