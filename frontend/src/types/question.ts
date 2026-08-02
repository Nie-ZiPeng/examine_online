export type QuestionType = 'single' | 'multiple' | 'judge' | 'blank' | 'essay';

export interface Question {
  id: number;
  exam_id: number;
  type: QuestionType;
  content: string;
  options?: string[] | null;
  answer?: string | null;
  score: number;
  sort_order: number;
  created_at: string;
}

export interface QuestionInput {
  type: QuestionType;
  content: string;
  answer?: string;
  score: number;
  sort_order: number;
  options?: string[] | null;
}

// 考试编辑页"添加题目"表单值
export interface QuestionFormValues {
  type: QuestionType;
  content: string;
  answer?: string;
  score: number;
  options?: string[];
}

export interface QuestionQuery {
  page?: number;
  page_size?: number;
}
