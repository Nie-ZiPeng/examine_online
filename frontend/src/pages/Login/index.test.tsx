import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './index';
import { login } from '../../api/auth';
import useAuthStore from '../../store/auth';

jest.mock('../../api/auth', () => ({ login: jest.fn() }));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('../../store/auth', () => () => ({ setToken: jest.fn() }));

const mockLogin = login as jest.Mock;

describe('Login', () => {
  beforeEach(() => {
    mockLogin.mockResolvedValue({ data: { access_token: 'token' } });
  });

  it('渲染衡鉴品牌区与表单', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(screen.getByText('衡鉴')).toBeTruthy();
    expect(screen.getByText('严谨考测 · 公正鉴证')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入用户名')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入密码')).toBeTruthy();
    expect(screen.getByRole('button', { name: (name) => name.replace(/\s+/g, '') === '登录' })).toBeTruthy();
  });
});
