import { render, screen } from '@testing-library/react';
import EmptyState from './index';

describe('EmptyState', () => {
  it('渲染标题与描述', () => {
    render(<EmptyState title="暂无考试" description="考试发布后会显示在这里" />);
    expect(screen.getByText('暂无考试')).toBeTruthy();
    expect(screen.getByText('考试发布后会显示在这里')).toBeTruthy();
  });

  it('渲染操作按钮', () => {
    render(<EmptyState title="暂无考试" action={<button>去创建</button>} />);
    expect(screen.getByRole('button', { name: '去创建' })).toBeTruthy();
  });
});
