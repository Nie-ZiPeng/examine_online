import type { AxiosResponse } from 'axios';
import { downloadDashboardFile } from './dashboardExport';

describe('downloadDashboardFile', () => {
  let createObjectURL: jest.SpyInstance;
  let revokeObjectURL: jest.SpyInstance;
  let click: jest.SpyInstance;
  let appendChild: jest.SpyInstance;

  beforeEach(() => {
    window.URL.createObjectURL = jest.fn(() => 'blob:test');
    window.URL.revokeObjectURL = jest.fn();
    createObjectURL = jest.spyOn(window.URL, 'createObjectURL');
    revokeObjectURL = jest.spyOn(window.URL, 'revokeObjectURL');
    click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    appendChild = jest.spyOn(document.body, 'appendChild');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.querySelectorAll('a[download]').forEach((anchor) => anchor.remove());
  });

  it('uses and sanitizes the RFC 5987 filename from Content-Disposition', () => {
    const response = {
      data: new Blob(['test']),
      headers: {
        'content-disposition': "attachment; filename*=UTF-8''%E4%BB%AA%E8%A1%A8%E7%9B%98%2F%E6%A6%82%E8%A7%88%28%E6%95%B0%E6%8D%AE%29%F0%9F%94%A5.csv",
      },
    } as unknown as AxiosResponse<Blob>;

    downloadDashboardFile(response, 'dashboard.csv');

    const anchor = appendChild.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('仪表盘_概览_数据.csv');
    expect(click).toHaveBeenCalledTimes(1);
    expect(anchor).not.toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('falls back to a safe filename for a raw Blob response', () => {
    const blob = new Blob(['test']);

    downloadDashboardFile(blob, '../dashboard summary.csv');

    const anchor = appendChild.mock.calls[0][0] as HTMLAnchorElement;
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(anchor.download).toBe('dashboard_summary.csv');
  });
});
