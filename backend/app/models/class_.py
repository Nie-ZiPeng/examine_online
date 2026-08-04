from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SchoolClass(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    grade = Column(String(50))
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    students = relationship("User", back_populates="school_class")
