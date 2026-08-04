export interface Subject {
  id: number;
  name: string;
  description?: string | null;
}

export interface TeacherSubjectCreate {
  subject_id: number;
}
