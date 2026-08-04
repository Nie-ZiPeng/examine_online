import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page brand slogan', async () => {
  render(<App />);
  expect(await screen.findByText('π尺为度 · 考以见真')).toBeInTheDocument();
});

test('uses one equal responsive label column for login fields', async () => {
  render(<App />);

  const usernameLabel = await screen.findByText('用户名');
  const passwordLabel = screen.getByText('密码');
  const usernameColumn = usernameLabel.closest('.ant-form-item-label');
  const passwordColumn = passwordLabel.closest('.ant-form-item-label');

  expect(usernameColumn).toHaveStyle({ flex: '0 0 4em' });
  expect(passwordColumn).toHaveStyle({ flex: '0 0 4em' });
});
