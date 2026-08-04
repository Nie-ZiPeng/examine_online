import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axios from './axios';

const responseFulfilled = (axios.interceptors.response as any).handlers[0].fulfilled;

const makeResponse = (data: unknown, preserveResponse?: boolean): AxiosResponse => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { preserveResponse } as InternalAxiosRequestConfig,
});

describe('axios response interceptor', () => {
  it('keeps normal API responses unwrapped', () => {
    const response = makeResponse({ code: 0, data: { id: 1 } });
    expect(responseFulfilled(response)).toEqual({ code: 0, data: { id: 1 } });
  });

  it('preserves the full response only when requested for header-aware downloads', () => {
    const response = makeResponse(new Blob(['file']), true);
    expect(responseFulfilled(response)).toBe(response);
  });
});
