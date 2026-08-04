import { render, screen } from '@testing-library/react';
import StatusTag from './index';

describe('StatusTag', () => {
  it.each([
    ['not_started', '未开始'],
    ['ongoing', '进行中'],
    ['finished', '已结束'],
    ['pending_grading', '待批改'],
    ['passed', '已通过'],
    ['failed', '未通过'],
  ])('状态 %s 渲染文案 %s', (status, label) => {
    render(<StatusTag status={status as never} />);
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('label 可覆盖默认文案', () => {
    render(<StatusTag status="finished" label="已截止" />);
    expect(screen.getByText('已截止')).toBeTruthy();
  });
});
