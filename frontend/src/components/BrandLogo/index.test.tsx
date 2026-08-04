import { render, screen } from '@testing-library/react';
import BrandLogo from './index';

describe('BrandLogo', () => {
  it('渲染 SVG 图形', () => {
    render(<BrandLogo />);
    expect(document.querySelector('.brand-logo svg')).toBeTruthy();
  });

  it('showName 时显示π考名称', () => {
    render(<BrandLogo showName />);
    expect(screen.getByText('π考')).toBeTruthy();
  });

  it('不传 showName 时不显示名称', () => {
    render(<BrandLogo />);
    expect(screen.queryByText('π考')).toBeNull();
  });
});
