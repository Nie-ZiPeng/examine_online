import { render } from '@testing-library/react';
import SkeletonGrid from './index';

describe('SkeletonGrid', () => {
  it('渲染指定数量的骨架卡片', () => {
    const { container } = render(<SkeletonGrid count={4} />);
    expect(container.querySelectorAll('.skeleton-grid-item')).toHaveLength(4);
  });
});
