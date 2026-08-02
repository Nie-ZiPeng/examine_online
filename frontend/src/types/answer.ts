import type { Question } from './question';

export interface Answer {
  id: number;
  record_id: number;
  question_id: number;
  student_answer?: string | null;
  score: number;
  is_correct?: boolean | null;
  graded_at?: string | null;
  grader_id?: number | null;
  created_at: string;
  // 阅卷接口嵌套返回题目完整信息
  question?: Question;
}

export interface GradeRequest {
  score: number;
  is_correct?: boolean;
}

export type AnswerValue = string | string[];
