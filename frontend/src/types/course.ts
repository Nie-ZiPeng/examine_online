export interface Course {
  id: number;
  name: string;
  description?: string | null;
  teacher_id: number;
  created_at: string;
}

export interface CourseInput {
  name: string;
  description?: string;
}
