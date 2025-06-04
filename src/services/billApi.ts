import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { message } from 'antd';
import {
  Company,
  Team,
  BillRecord,
  BillQueryParams,
  CompanyQueryResponse,
  TeamQueryResponse,
  BillQueryResponse,
  BillUserParams
} from '../types/bill';
import { API_CONFIG } from '../config/apiConfig';

// 创建用于账单查询的axios实例
const billApi = axios.create({
  timeout: API_CONFIG.timeout,
  withCredentials: true,
});

// 打印详细的请求错误信息
const logRequestError = (error: AxiosError, source: string) => {
  console.error(`[${source}] 错误信息:`, error.message);
  if (error.config) {
    console.error(`[${source}] 请求URL:`, error.config.url);
    console.error(`[${source}] 请求方法:`, error.config.method?.toUpperCase());
    console.error(`[${source}] 请求参数:`, error.config.params || {});
    console.error(`[${source}] 请求头:`, error.config.headers || {});
  }
  if (error.response) {
    console.error(`[${source}] 响应状态:`, error.response.status);
    console.error(`[${source}] 响应数据:`, error.response.data);
  } else if (error.request) {
    console.error(`[${source}] 没有收到响应`, error.request);
  }
  return error;
};

// 账单API请求拦截器
billApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 获取标签迁移工具的API令牌（与"标签迁移工具"共用）
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      const storageKey = `tagUserParams_${sessionId}`;
      const tagUserParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      if (tagUserParams.authorization) {
        config.headers.authorization = tagUserParams.authorization;
        config.headers.system_id = '4';
      }
    }
    
    // 开发模式下输出请求信息
    if (process.env.NODE_ENV === 'development' && API_CONFIG.verboseLogging) {
      console.log('[账单 API 请求]', config.method?.toUpperCase(), config.url);
      console.log('[账单 API 请求参数]', config.params || {});
      console.log('[账单 API 请求头]', config.headers || {});
      if (config.data) {
        console.log('[账单 API 请求体]', config.data);
      }
    }
    
    return config;
  },
  (error: any) => {
    logRequestError(error, '账单 API 请求拦截器');
    return Promise.reject(error);
  }
);

// 添加响应拦截器
billApi.interceptors.response.use(
  (response) => {
    // 开发模式下输出响应信息
    if (process.env.NODE_ENV === 'development' && API_CONFIG.verboseLogging) {
      console.log('[账单 API 响应状态]', response.status);
      console.log('[账单 API 响应数据]', response.data);
    }
    
    const resData = response.data;
    // 检查code不为0的请求，并返回友好提示
    if (resData.code !== 0) {
      const errMsg = resData.message || '服务器返回错误';
      console.error(`❌ [账单 API] 请求失败: ${errMsg}`);
      
      // 使用 antd message 提示
      if (typeof window !== 'undefined' && window.document) {
        message.error(errMsg, 3);
      }
      return Promise.reject(new Error(errMsg));
    }
    return response;
  },
  (error) => {
    // 网络错误或其他异常的友好提示
    const errMsg = error.response?.data?.message || error.message || '网络请求失败';
    console.error(`❌ [账单 API] 网络错误: ${errMsg}`);
    
    if (typeof window !== 'undefined' && window.document) {
      message.error(errMsg, 3);
    }
    
    return Promise.reject(logRequestError(error, '账单 API 响应'));
  }
);

/**
 * 根据公司名称模糊查询公司列表
 * @param companyName 公司名称关键字
 * @returns 公司列表
 */
export const queryCompaniesByName = async (companyName: string): Promise<Company[]> => {
  try {
    const response = await billApi.get<CompanyQueryResponse>(
      '/api/admin/saas_plat_manager/company/queryLikeByCompanyName',
      {
        params: { companyName }
      }
    );
    
    return response.data.data;
  } catch (error) {
    console.error('查询公司列表失败:', error);
    throw error;
  }
};

/**
 * 根据公司ID查询团队列表
 * @param companyId 公司ID
 * @returns 团队列表
 */
export const queryTeamsByCompanyId = async (companyId: number): Promise<Team[]> => {
  try {
    const response = await billApi.get<TeamQueryResponse>(
      '/api/admin/saas_plat_manager/company/queryTenantByCompanyId',
      {
        params: { companyId }
      }
    );
    
    return response.data.data;
  } catch (error) {
    console.error('查询团队列表失败:', error);
    throw error;
  }
};

/**
 * 查询账单列表
 * @param params 查询参数
 * @returns 账单列表和分页信息
 */
export const queryBillList = async (params: BillQueryParams): Promise<{
  items: BillRecord[];
  total: number;
  pageNum: number;
  pageSize: number;
}> => {
  try {
    const response = await billApi.get<BillQueryResponse>(
      '/api/nxBill/usage/aiAgentCdr/query',
      {
        params: {
          pageNum: params.pageNum,
          pageSize: params.pageSize,
          customerId: params.customerId,
          tenantId: params.tenantId,
          agentFlowName: params.agentFlowName || '',
          callee: params.callee || '',
          startTime: params.startTime,
          endTime: params.endTime
        }
      }
    );
    
    return response.data.data;
  } catch (error) {
    console.error('查询账单列表失败:', error);
    throw error;
  }
};

/**
 * 获取当前的账单用户参数（API令牌）
 * @returns 账单用户参数
 */
export const getBillUserParams = (): BillUserParams | null => {
  const sessionId = localStorage.getItem('sessionId');
  if (sessionId) {
    const storageKey = `tagUserParams_${sessionId}`;
    const tagUserParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    if (tagUserParams.authorization) {
      return {
        authorization: tagUserParams.authorization
      };
    }
  }
  
  return null;
};

/**
 * 验证是否有有效的API令牌
 * @returns 是否有有效令牌
 */
export const hasValidBillToken = (): boolean => {
  const userParams = getBillUserParams();
  return userParams !== null && !!userParams.authorization;
}; 