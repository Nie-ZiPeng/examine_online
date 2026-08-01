from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(Integer, ForeignKey("exam_records.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    student_answer = Column(Text, comment="学生答案")
    score = Column(Integer, default=0, comment="得分")
    is_correct = Column(Boolean, comment="是否正确")
    graded_at = Column(DateTime, comment="阅卷时间")
    grader_id = Column(Integer, ForeignKey("users.id"), comment="阅卷老师ID")
    created_at = Column(DateTime, server_default=func.now())

    record = relationship("ExamRecord", backref="answers")
    question = relationship("Question", backref="answers")
    grader = relationship("User", backref="graded_answers")

    __table_args__ = (
        UniqueConstraint("record_id", "question_id", name="uk_record_question"),
    )
