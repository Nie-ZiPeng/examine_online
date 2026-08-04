import { isQuestionAnswered, countAnswered } from './utils';

describe('isQuestionAnswered', () => {
  it('未作答为 false', () => {
    expect(isQuestionAnswered(undefined)).toBe(false);
    expect(isQuestionAnswered('')).toBe(false);
    expect(isQuestionAnswered('   ')).toBe(false);
    expect(isQuestionAnswered([])).toBe(false);
  });

  it('已作答为 true', () => {
    expect(isQuestionAnswered('A')).toBe(true);
    expect(isQuestionAnswered(['A'])).toBe(true);
  });
});

describe('countAnswered', () => {
  it('统计已答题数', () => {
    const answers = { 1: 'A', 2: ['B', 'C'], 3: '', 4: undefined };
    expect(countAnswered(answers, [1, 2, 3, 4, 5])).toBe(2);
  });
});
