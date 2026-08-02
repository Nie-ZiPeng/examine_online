import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page title', async () => {
  render(<App />);
  expect(await screen.findByText('在线考试系统')).toBeInTheDocument();
});
