export interface PaginationQuery {
  page?: number; // 1-based, default 1
  limit?: number; // default 20, max 100
  offset?: number; // alternative to page
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path?: string;
}
