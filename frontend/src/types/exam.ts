import type { Dayjs } from 'dayjs';

export type ExamStatus = 'draft' | 'published' | 'ongoing' | 'finished';

export interface Exam {
  id: number;
  course_id: number;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  duration: number;
  total_score: number;
  pass_score: number;
  random_order: boolean;
  max_switch: number;
  status: ExamStatus;
  created_at: string;
}

export interface ExamInput {
  course_id?: number;
  title: string;
  description?: string;
  duration: number;
  total_score: number;
  pass_score: number;
  start_time: string;
  end_time: string;
  random_order: boolean;
  max_switch: number;
}

// 考试编辑页表单值（DatePicker 值，提交前 format 成字符串）
export interface ExamFormValues {
  course_id?: number;
  title: string;
  description?: string;
  duration: number;
  total_score: number;
  pass_score: number;
  max_switch: number;
  start_time: Dayjs;
  end_time: Dayjs;
  random_order: boolean;
}

export interface ExamQuery {
  page?: number;
  page_size?: number;
  status?: string;
  course_id?: number;
}
