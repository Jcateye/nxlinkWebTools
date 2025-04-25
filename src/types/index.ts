// 通用接口响应类型
export interface ApiResponse<T> {
  code: number;
  message: string;
  traceId: string;
  data: T;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  code: number;
  message: string | null;
  traceId: string | null;
  total: number;
  page_number: number;
  page_size: number;
  list: T[];
  ext: any;
  notEmpty: boolean;
  totalPages: number;
  empty: boolean;
}

// 标签分组类型
export interface TagGroup {
  id: number;
  group_name: string;
  count: number;
}

// 标签类型
export interface Tag {
  id: number;
  name: string;
  group_id: number;
  group_name: string;
  describes: string | null;
  created_at: string;
  updated_at: string;
}

// 用户参数类型
export interface UserParams {
  nxCloudUserID: string;
  sourceTenantID: string;
  targetTenantID: string;
  authorization: string;
}

// 标签分组添加请求类型
export interface TagGroupAddRequest {
  group_name: string;
  group_type: number;
  type: number;
  nxCloudUserID: string;
  tenantId: string;
}

// 标签添加请求类型
export interface TagAddRequest {
  group_id: number;
  name: string;
  describes: string | null;
  nxCloudUserID: string;
  tenantId: string;
} 