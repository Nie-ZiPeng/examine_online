import type { QuestionType } from './question';

// 阅卷接口嵌套返回的题目信息（仅字段子集）
export type GradingQuestion = {
  type: QuestionType;
  content: string;
  options?: string[] | null;
  answer?: string | null;
  score: number;
};

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
  // 阅卷接口嵌套返回题目信息（字段子集）
  question?: GradingQuestion;
}

export interface GradeRequest {
  score: number;
  is_correct?: boolean;
}

export type AnswerValue = string | string[];
