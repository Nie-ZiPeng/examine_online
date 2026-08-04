import dayjs from 'dayjs';
import type { Exam } from '../../../types/exam';

export const EXAM_CARD_COLORS: [string, string][] = [
  ['#3D5A80', '#4A6B94'],
  ['#4E8D8C', '#5FA8A7'],
  ['#7A6F9B', '#9488B4'],
  ['#A05B6D', '#B87A89'],
  ['#8C6D5B', '#A6897A'],
  ['#5B7C99', '#7195B2'],
];

export type ExamDisplayStatus = 'not_started' | 'ongoing' | 'finished';

export const getExamDisplayStatus = (
  exam: Pick<Exam, 'start_time' | 'end_time'>,
  now: Date = new Date()
): ExamDisplayStatus => {
  const cur = dayjs(now);
  if (cur.isBefore(dayjs(exam.start_time))) return 'not_started';
  if (cur.isAfter(dayjs(exam.end_time))) return 'finished';
  return 'ongoing';
};

export const getExamCardColor = (title: string): [string, string] => {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return EXAM_CARD_COLORS[hash % EXAM_CARD_COLORS.length];
};