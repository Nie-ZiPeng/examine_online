import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './index';
import { getDashboard } from '../../api/statistics';
import type { ApiResponse } from '../../types/api';
import type { StudentDashboardData } from '../../types/dashboard';

jest.mock('../../api/statistics', () => ({ getDashboard: jest.fn() }));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockGetDashboard = getDashboard as jest.Mock;

const studentData: StudentDashboardData = {
  role: 'student',
  stats: { available_exams: 2, my_exam_count: 5, avg_score: 82.5, pass_rate: 80 },
  upcoming_exams: [
    { id: 1, title: '期中考试', start_time: '2026-08-10 09:00:00', duration: 90 },
  ],
  recent_records: [
    { id: 1, exam_id: 1, exam_title: '期末考试', score: 88, pass_score: 60, status: 'graded', submit_time: '2026-07-01 11:00:00' },
  ],
};

describe('Dashboard', () => {
  beforeEach(() => {
    mockGetDashboard.mockResolvedValue({ data: studentData } as ApiResponse<StudentDashboardData>);
  });

  it('学生端渲染统计卡片与即将开始的考试', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(await screen.findByText('期中考试')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy(); // 可参加考试数
    expect(screen.getByText('期末考试')).toBeTruthy();
  });
});
