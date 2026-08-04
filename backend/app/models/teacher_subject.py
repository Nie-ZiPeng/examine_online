from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class TeacherSubject(Base):
    __tablename__ = "teacher_subjects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())

    teacher = relationship("User", backref="teacher_subjects")
    subject = relationship("Course", backref="teacher_subjects")

    __table_args__ = (
        UniqueConstraint("teacher_id", "subject_id", name="uk_teacher_subject"),
    )
