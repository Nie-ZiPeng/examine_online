import type { AnswerValue } from '../../../types/answer';

export const isQuestionAnswered = (value: AnswerValue | undefined): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return Array.isArray(value) && value.length > 0;
};

export const countAnswered = (
  answers: Record<string, AnswerValue | undefined>,
  questionIds: number[]
): number => questionIds.filter((id) => isQuestionAnswered(answers[id])).length;
