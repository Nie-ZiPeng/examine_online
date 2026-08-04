import { act, render } from '@testing-library/react';
import * as echarts from 'echarts';
import EChart from './index';

jest.mock('echarts', () => ({ init: jest.fn() }));

const setOption = jest.fn();
const resize = jest.fn();
const dispose = jest.fn();
const observe = jest.fn();
const disconnect = jest.fn();
let resizeCallback: ResizeObserverCallback;

class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }

  observe = observe;
  unobserve = jest.fn();
  disconnect = disconnect;
}

const mockInit = echarts.init as jest.MockedFunction<typeof echarts.init>;

describe('EChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    mockInit.mockReturnValue({ setOption, resize, dispose } as unknown as echarts.ECharts);
  });

  it('updates, resizes, and disposes the chart with its container lifecycle', () => {
    const firstOption = { series: [{ type: 'bar' as const, data: [1] }] };
    const secondOption = { series: [{ type: 'bar' as const, data: [2] }] };
    const { container, rerender, unmount } = render(
      <EChart option={firstOption} ariaLabel="考试成绩图表" className="dashboard-chart" />
    );
    const chartContainer = container.firstElementChild as HTMLDivElement;

    expect(mockInit).toHaveBeenCalledWith(chartContainer);
    expect(observe).toHaveBeenCalledWith(chartContainer);
    expect(setOption).toHaveBeenLastCalledWith(firstOption, true);
    expect(chartContainer).toHaveAttribute('role', 'img');
    expect(chartContainer).toHaveAttribute('aria-label', '考试成绩图表');

    rerender(
      <EChart option={secondOption} ariaLabel="考试成绩图表" className="dashboard-chart" />
    );
    expect(setOption).toHaveBeenLastCalledWith(secondOption, true);

    act(() => resizeCallback([], {} as ResizeObserver));
    expect(resize).toHaveBeenCalledTimes(1);

    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
