import axios from './axios';
import { exportDashboard } from './statistics';

jest.mock('./axios', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockGet = axios.get as jest.Mock;

describe('exportDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests the CSV summary and preserves the binary response headers', async () => {
    const response = {
      data: new Blob(['metric,value']),
      headers: { 'content-disposition': 'attachment; filename="summary.csv"' },
    };
    mockGet.mockResolvedValue(response);

    await expect(exportDashboard('csv', 'summary')).resolves.toBe(response);
    expect(mockGet).toHaveBeenCalledWith('/api/statistics/dashboard/export', {
      params: { format: 'csv', dataset: 'summary' },
      responseType: 'blob',
      preserveResponse: true,
    });
  });

  it('requests all role sheets when exporting Excel', async () => {
    const response = { data: new Blob(['xlsx']), headers: {} };
    mockGet.mockResolvedValue(response);

    await exportDashboard('xlsx');

    expect(mockGet).toHaveBeenCalledWith('/api/statistics/dashboard/export', {
      params: { format: 'xlsx' },
      responseType: 'blob',
      preserveResponse: true,
    });
  });
});
