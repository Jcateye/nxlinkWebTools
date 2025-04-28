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

// 标签用户参数类型
export interface TagUserParams {
  nxCloudUserID: string;
  sourceTenantID: string;
  targetTenantID: string;
  authorization: string;
}

// FAQ用户参数类型
export interface FaqUserParams {
  sourceAuthorization: string;
  targetAuthorization: string;
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

// FAQ项类型
export interface Faq {
  id: number;
  question: string;
  answer: string;
  similar_questions: string[];
  created_at: string;
  updated_at: string;
}

// FAQ列表响应类型
export interface FaqResponse {
  list: Faq[];
  total: number;
  page: number;
  page_size: number;
}

// FAQ添加请求类型
export interface FaqAddRequest {
  question: string;
  answer: string;
  similar_questions: string[];
  nxCloudUserID: string;
  tenantId: string;
}

// FAQ更新请求类型
export interface FaqUpdateRequest {
  question: string;
  answer: string;
  similar_questions: string[];
  nxCloudUserID: string;
  tenantId: string;
}

// FAQ项类型详细版
export interface FaqItemDetailed {
  id: number;
  type: number;
  content: string;
  question: string;
  language: string;
  user_name: string;
  faq_status: boolean;
  group_type: string;
  group_id: number;
  update_time: string;
  media_infos: any[];
  language_id: number;
  ai_desc: string | null;
}

// FAQ列表详细响应类型
export interface FaqListData {
  total: number;
  page_number: number;
  page_size: number;
  list: FaqItemDetailed[];
  ext: any;
  notEmpty: boolean;
  totalPages: number;
  empty: boolean;
}

// Voice类型定义
export interface Voice {
  id: number;
  tenantId: number;
  name: string;
  gender: number;
  language: string;
  vendor: string;
  prompt: string;
  des: string | null;
  content: string;
  url: string;
  bgTimbreId: number;
  createTs: number | null;
  updateTs: number | null;
}

export interface VoiceResponse {
  total: number;
  page_number: number;
  page_size: number;
  list: Voice[];
} 