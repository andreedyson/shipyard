export interface Paginate {
  page: number;
  limit: number;
  total_page: number;
  total_data: number;
}

export interface APIResponse<T = unknown> {
  message: string;
  data?: T;
  pagination?: Paginate;
}
