from pydantic import BaseModel


class TeacherSubjectCreate(BaseModel):
    subject_id: int
