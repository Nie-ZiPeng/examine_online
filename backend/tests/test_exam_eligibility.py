import pytest
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.class_ import SchoolClass
from app.models.exam import Exam
from app.models.exam_class import ExamClass
from app.models.exam_student import ExamStudent
from app.models.user import User
from app.services.exam_service import (
    create_exam, update_exam, get_exam, is_student_eligible,
    get_student_eligible_exams,
)
from app.schemas.exam import ExamResponse


async def _make_student(db: AsyncSession, username: str, class_id=None) -> User:
    student = User(username=username, password_hash="x", role="student",
                   name=username, class_id=class_id)
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


async def _make_exam(db: AsyncSession, **kw) -> Exam:
    data = {
        "title": "测试考试", "course_id": 1,
        "start_time": datetime(2026, 8, 10, 10, 0, 0),
        "end_time": datetime(2026, 8, 10, 12, 0, 0), "duration": 120,
        "total_score": 100, "pass_score": 60,
    }
    data.update(kw)
    return await create_exam(db, data)


@pytest.mark.asyncio
async def test_eligible_no_assignment_backward_compatible(db: AsyncSession):
    student = await _make_student(db, "s1")
    exam = await _make_exam(db)
    assert await is_student_eligible(db, exam.id, student.id) is True


@pytest.mark.asyncio
async def test_eligible_via_class(db: AsyncSession):
    class_ = SchoolClass(name="一班")
    db.add(class_)
    await db.commit()
    await db.refresh(class_)
    student = await _make_student(db, "s1", class_id=class_.id)
    exam = await _make_exam(db, class_ids=[class_.id])
    assert await is_student_eligible(db, exam.id, student.id) is True


@pytest.mark.asyncio
async def test_ineligible_outside_class(db: AsyncSession):
    class_a = SchoolClass(name="A班")
    class_b = SchoolClass(name="B班")
    db.add_all([class_a, class_b])
    await db.commit()
    await db.refresh(class_a)
    await db.refresh(class_b)
    student = await _make_student(db, "s1", class_id=class_a.id)
    exam = await _make_exam(db, class_ids=[class_b.id])
    assert await is_student_eligible(db, exam.id, student.id) is False


@pytest.mark.asyncio
async def test_exclude_overrides_class(db: AsyncSession):
    class_ = SchoolClass(name="一班")
    db.add(class_)
    await db.commit()
    await db.refresh(class_)
    student = await _make_student(db, "s1", class_id=class_.id)
    exam = await _make_exam(
        db, class_ids=[class_.id],
        student_overrides=[{"student_id": student.id, "action": "exclude"}],
    )
    assert await is_student_eligible(db, exam.id, student.id) is False


@pytest.mark.asyncio
async def test_include_overrides_class(db: AsyncSession):
    class_a = SchoolClass(name="A班")
    db.add(class_a)
    await db.commit()
    await db.refresh(class_a)
    student = await _make_student(db, "s1", class_id=class_a.id)
    exam = await _make_exam(
        db, class_ids=[class_a.id],
        student_overrides=[{"student_id": student.id, "action": "include"}],
    )
    assert await is_student_eligible(db, exam.id, student.id) is True


@pytest.mark.asyncio
async def test_include_grants_eligibility_outside_class(db: AsyncSession):
    class_b = SchoolClass(name="B班")
    db.add(class_b)
    await db.commit()
    await db.refresh(class_b)
    student = await _make_student(db, "s1")
    exam = await _make_exam(
        db, class_ids=[class_b.id],
        student_overrides=[{"student_id": student.id, "action": "include"}],
    )
    assert await is_student_eligible(db, exam.id, student.id) is True


@pytest.mark.asyncio
async def test_update_exam_replaces_assignments(db: AsyncSession):
    class_ = SchoolClass(name="一班")
    db.add(class_)
    await db.commit()
    await db.refresh(class_)
    student = await _make_student(db, "s1", class_id=class_.id)
    exam = await _make_exam(db)
    assert await is_student_eligible(db, exam.id, student.id) is True
    await update_exam(
        db, exam.id,
        {"title": "新标题", "class_ids": [class_.id],
         "student_overrides": [{"student_id": student.id, "action": "exclude"}]},
    )
    assert await is_student_eligible(db, exam.id, student.id) is False


@pytest.mark.asyncio
async def test_get_student_eligible_exams_pagination(db: AsyncSession):
    student = await _make_student(db, "s1")
    for i in range(3):
        await _make_exam(db, title=f"考试{i}", status="published")
    exams, total = await get_student_eligible_exams(db, student.id, page=1, page_size=2)
    assert total == 3
    assert len(exams) == 2


@pytest.mark.asyncio
async def test_get_exam_echoes_assignments(db: AsyncSession):
    class_ = SchoolClass(name="一班")
    db.add(class_)
    await db.commit()
    await db.refresh(class_)
    student = await _make_student(db, "s1", class_id=class_.id)
    exam = await _make_exam(
        db, class_ids=[class_.id],
        student_overrides=[{"student_id": student.id, "action": "exclude"}],
    )
    fetched = await get_exam(db, exam.id)
    assert fetched.assigned_class_ids == [class_.id]
    assert fetched.student_overrides == [{"student_id": student.id, "action": "exclude"}]
    resp = ExamResponse.model_validate(fetched)
    assert resp.assigned_class_ids == [class_.id]
    assert [o.model_dump() for o in resp.student_overrides] == [{"student_id": student.id, "action": "exclude"}]


@pytest.mark.asyncio
async def test_update_exam_returns_fresh_assignments(db: AsyncSession):
    class_a = SchoolClass(name="A班")
    class_b = SchoolClass(name="B班")
    db.add_all([class_a, class_b])
    await db.commit()
    await db.refresh(class_a)
    await db.refresh(class_b)
    student = await _make_student(db, "s1", class_id=class_a.id)
    exam = await _make_exam(
        db, class_ids=[class_a.id],
        student_overrides=[{"student_id": student.id, "action": "exclude"}],
    )
    updated = await update_exam(
        db, exam.id,
        {"class_ids": [class_b.id], "student_overrides": []},
    )
    assert updated is not None
    assert updated.assigned_class_ids == [class_b.id]
    assert updated.student_overrides == []
    fetched = await get_exam(db, exam.id)
    assert fetched.assigned_class_ids == [class_b.id]
    assert fetched.student_overrides == []


@pytest.mark.asyncio
async def test_update_exam_dedupes_duplicate_class_ids(db: AsyncSession):
    class_ = SchoolClass(name="一班")
    db.add(class_)
    await db.commit()
    await db.refresh(class_)
    exam = await _make_exam(db)
    updated = await update_exam(db, exam.id, {"class_ids": [class_.id, class_.id]})
    assert updated is not None
    fetched = await get_exam(db, exam.id)
    assert fetched.assigned_class_ids == [class_.id]
