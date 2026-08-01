from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ExamRecord(Base):
    __tablename__ = "exam_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False)
    submit_time = Column(DateTime)
    score = Column(Integer, default=0)
    status = Column(Enum("ongoing", "submitted", "graded"), default="ongoing")
    switch_count = Column(Integer, default=0, comment="切屏次数")
    created_at = Column(DateTime, server_default=func.now())

    student = relationship("User", backref="exam_records")
    exam = relationship("Exam", backref="records")

    __table_args__ = (
        UniqueConstraint("student_id", "exam_id", name="uk_student_exam"),
    )
