from sqlalchemy import Column
from app.models.class_ import SchoolClass
from app.models.teacher_subject import TeacherSubject
from app.models.exam_class import ExamClass
from app.models.exam_student import ExamStudent
from app.models.user import User


def test_school_class_columns():
    assert hasattr(SchoolClass, "id")
    assert hasattr(SchoolClass, "name")
    assert hasattr(SchoolClass, "grade")
    assert hasattr(SchoolClass, "description")


def test_teacher_subject_columns():
    assert hasattr(TeacherSubject, "teacher_id")
    assert hasattr(TeacherSubject, "subject_id")


def test_exam_class_columns():
    assert hasattr(ExamClass, "exam_id")
    assert hasattr(ExamClass, "class_id")


def test_exam_student_columns():
    assert hasattr(ExamStudent, "exam_id")
    assert hasattr(ExamStudent, "student_id")
    assert hasattr(ExamStudent, "action")


def test_user_has_class_id():
    assert isinstance(User.__table__.c.class_id, Column)
