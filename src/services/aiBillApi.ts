import axios from 'axios';
import { AIBillItem, AIBillExportParams } from '../utils/excelExport';
import { API_CONFIG } from '../config/apiConfig';

// 创建AI账单API的axios实例
const aiBillApi = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  withCredentials: true,
});

// 请求拦截器
aiBillApi.interceptors.request.use(
  (config) => {
    // 从localStorage获取用户参数
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      const storageKey = `faqUserParams_${sessionId}`;
      const userParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      if (userParams.sourceAuthorization) {
        config.headers.authorization = userParams.sourceAuthorization;
        config.headers.system_id = '4'; // 账单API使用system_id: 4
      }
    }
    
    return config;
  },
  (error) => {
    console.error('AI账单API请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
aiBillApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('AI账单API响应错误:', error);
    return Promise.reject(error);
  }
);

// API响应类型定义
export interface AIBillQueryResponse {
  code: number;
  message: string;
  traceId: string;
  data: {
    total: number;
    items: AIBillItem[];
    pageNum: number;
    pageSize: number;
  };
}

export interface CompanyInfo {
  id: number;
  customerId: number;
  customerCode: string;
  companyName: string;
}

export interface TenantInfo {
  id: number;
  name: string;
}

/**
 * 查询AI账单列表
 */
export async function queryAIBill(params: {
  pageNum: number;
  pageSize: number;
  customerId?: number;
  tenantId?: number;
  agentFlowName?: string;
  callee?: string;
  startTime?: string;
  endTime?: string;
}): Promise<AIBillQueryResponse> {
  
  const queryParams = new URLSearchParams();
  
  // 必需参数
  queryParams.append('pageNum', params.pageNum.toString());
  queryParams.append('pageSize', params.pageSize.toString());
  
  // 可选参数
  if (params.customerId) queryParams.append('customerId', params.customerId.toString());
  if (params.tenantId) queryParams.append('tenantId', params.tenantId.toString());
  if (params.agentFlowName) queryParams.append('agentFlowName', params.agentFlowName);
  if (params.callee) queryParams.append('callee', params.callee);
  if (params.startTime) queryParams.append('startTime', params.startTime);
  if (params.endTime) queryParams.append('endTime', params.endTime);
  
  const url = `/nxBill/usage/aiAgentCdr/query?${queryParams.toString()}`;
  
  try {
    const response = await aiBillApi.get<AIBillQueryResponse>(url);
    return response.data;
  } catch (error) {
    console.error('查询AI账单失败:', error);
    throw error;
  }
}

/**
 * 根据公司名称模糊查询公司列表
 */
export async function queryCompanyByName(companyName: string = ''): Promise<CompanyInfo[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('companyName', companyName);
  
  const url = `/admin/saas_plat_manager/company/queryLikeByCompanyName?${queryParams.toString()}`;
  
  try {
    const response = await aiBillApi.get<{ code: number; data: CompanyInfo[] }>(url);
    if (response.data.code === 0) {
      return response.data.data;
    }
    throw new Error('查询公司列表失败');
  } catch (error) {
    console.error('查询公司列表失败:', error);
    throw error;
  }
}

/**
 * 根据公司ID查询租户列表
 */
export async function queryTenantByCompanyId(companyId: number): Promise<TenantInfo[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('companyId', companyId.toString());
  
  const url = `/admin/saas_plat_manager/company/queryTenantByCompanyId?${queryParams.toString()}`;
  
  try {
    const response = await aiBillApi.get<{ code: number; data: TenantInfo[] }>(url);
    if (response.data.code === 0) {
      return response.data.data;
    }
    throw new Error('查询租户列表失败');
  } catch (error) {
    console.error('查询租户列表失败:', error);
    throw error;
  }
}

/**
 * 导出AI账单（用于Excel导出）
 */
export async function exportAIBillData(params: AIBillExportParams & { pageNum: number, pageSize: number }) {
  return queryAIBill(params);
} 