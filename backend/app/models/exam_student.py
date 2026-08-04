from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ExamStudent(Base):
    __tablename__ = "exam_students"

    id = Column(Integer, primary_key=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(20), nullable=False, comment="include=额外添加, exclude=排除")
    created_at = Column(DateTime, server_default=func.now())

    exam = relationship("Exam", backref="exam_students")
    student = relationship("User", backref="exam_students")

    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", name="uk_exam_student"),
    )
