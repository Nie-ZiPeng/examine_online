import dayjs from 'dayjs';
import { getExamDisplayStatus, getExamCardColor, EXAM_CARD_COLORS } from './utils';
import type { Exam } from '../../../types/exam';

const makeExam = (overrides: Partial<Exam>): Exam => ({
  id: 1,
  course_id: 1,
  title: '测试考试',
  start_time: '2026-08-10 09:00:00',
  end_time: '2026-08-10 11:00:00',
  duration: 120,
  total_score: 100,
  pass_score: 60,
  random_order: true,
  max_switch: 3,
  status: 'published',
  created_at: '2026-08-01 09:00:00',
  ...overrides,
});

const at = (t: string) => dayjs(t).toDate();

describe('getExamDisplayStatus', () => {
  const exam = makeExam({});

  it('开始前为未开始', () => {
    expect(getExamDisplayStatus(exam, at('2026-08-10 08:59:00'))).toBe('not_started');
  });

  it('进行中', () => {
    expect(getExamDisplayStatus(exam, at('2026-08-10 09:30:00'))).toBe('ongoing');
  });

  it('结束后为已结束', () => {
    expect(getExamDisplayStatus(exam, at('2026-08-10 12:00:00'))).toBe('finished');
  });
});

describe('getExamDisplayStatus (后端 ISO T 格式)', () => {
  const exam = makeExam({
    start_time: '2026-08-10T09:00:00',
    end_time: '2026-08-10T11:00:00',
  });

  it('开始前为未开始', () => {
    expect(getExamDisplayStatus(exam, at('2026-08-10T08:59:00'))).toBe('not_started');
  });

  it('进行中', () => {
    expect(getExamDisplayStatus(exam, at('2026-08-10T09:30:00'))).toBe('ongoing');
  });

  it('结束后为已结束', () => {
    expect(getExamDisplayStatus(exam, at('2026-08-10T12:00:00'))).toBe('finished');
  });
});

describe('getExamCardColor', () => {
  it('相同标题颜色稳定', () => {
    expect(getExamCardColor('期中考试')).toBe(getExamCardColor('期中考试'));
  });

  it('不同标题可得到不同颜色', () => {
    expect(EXAM_CARD_COLORS).toContain(getExamCardColor('期中考试'));
  });
});