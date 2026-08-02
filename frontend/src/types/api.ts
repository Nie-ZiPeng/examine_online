// 后端统一响应包装 { code, message, data }
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 分页响应
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
