from app.schemas.class_ import ClassCreate, ClassUpdate
from app.schemas.teacher_subject import TeacherSubjectCreate
from app.schemas.exam import ExamCreate, ExamUpdate, StudentOverride


def test_class_create_schema():
    data = ClassCreate(name="计算机2024级1班", grade="2024级")
    assert data.name == "计算机2024级1班"
    assert data.grade == "2024级"
    assert data.description is None


def test_class_update_all_optional():
    data = ClassUpdate()
    assert data.name is None
    assert data.grade is None


def test_teacher_subject_create_schema():
    data = TeacherSubjectCreate(subject_id=1)
    assert data.subject_id == 1


def test_exam_create_with_class_ids():
    data = ExamCreate(
        title="期中考试",
        course_id=1,
        start_time="2026-08-10 10:00:00",
        end_time="2026-08-10 12:00:00",
        duration=120,
        class_ids=[1, 2],
        student_overrides=[
            StudentOverride(student_id=10, action="include"),
            StudentOverride(student_id=11, action="exclude"),
        ],
    )
    assert data.class_ids == [1, 2]
    assert len(data.student_overrides) == 2
    assert data.student_overrides[1].action == "exclude"


def test_exam_update_class_ids_optional():
    data = ExamUpdate(title="新标题")
    assert data.class_ids is None
    assert data.student_overrides is None
