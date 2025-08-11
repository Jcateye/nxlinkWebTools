// 供应商应用类型定义
export interface VendorApp {
  id: number;
  status: number;
  type: string;
  remark: string | null;
  currency: string;
  operatorId: number;
  operatorName: string;
  gmtCreate: string;
  gmtModified: string;
  vendor_id: number;
  vendor_name: string;
  vendor_code: string;
  name: string;
  charge_type: string;
  original_current_price: number;
  original_effective_price: number;
  effective_date: string;
  local_current_price: number;
  local_effective_price: number;
}

// 场景供应商应用类型定义
export interface SceneVendorApp {
  id: number;
  type: number;
  language: string;
  vendor: string;
  vendor_params: string;
  code: string;
  timbre: string;
  model: string;
  vendor_app_id: string;
  status: number;
  rating: string;
  remark: string | null;
  create_ts: number;
  update_ts: number;
}

// 供应商应用列表响应
export interface VendorAppListResponse {
  pageNum: number;
  pageSize: number;
  totalPage: number | null;
  total: number;
  list: VendorApp[];
}

// 场景供应商应用列表响应
export interface SceneVendorAppListResponse {
  code: number;
  message: string | null;
  traceId: string | null;
  total: number;
  page_number: number;
  page_size: number;
  list: SceneVendorApp[];
  ext: any;
  notEmpty: boolean;
  totalPages: number;
  empty: boolean;
}

// 供应商应用查询参数
export interface VendorAppQueryParams {
  type?: string;
  page_num?: number;
  page_size?: number;
  tenantId?: number;
}

// 场景供应商应用查询参数
export interface SceneVendorAppQueryParams {
  rating?: string;
  page_number?: number;
  page_size?: number;
  type?: number;
  tenantId?: number;
  language?: string;
  vendor?: string;
  status?: number;
  timbre?: string; // TTS音色搜索字段（前端过滤用）
  model?: string; // 模型搜索字段（前端过滤用）
}

// 供应商应用编辑表单数据
export interface VendorAppFormData {
  id?: number;
  name: string;
  type: string;
  vendor_id: number;
  vendor_name: string;
  vendor_code: string;
  charge_type: string;
  original_current_price: number;
  original_effective_price: number;
  effective_date: string;
  currency: string;
  status: number;
  remark?: string;
}

// 场景供应商应用编辑表单数据
export interface SceneVendorAppFormData {
  id?: number;
  type: number;
  language: string;
  vendor: string;
  vendor_params: string;
  code: string;
  timbre: string;
  model: string;
  vendor_app_id: string;
  status: number;
  rating: string;
  remark?: string;
} 