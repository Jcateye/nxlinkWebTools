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
 * 设置账单用户参数（API令牌）
 * @param userParams 用户参数
 */
export const setBillUserParams = (userParams: BillUserParams): void => {
  const sessionId = localStorage.getItem('sessionId');
  if (sessionId) {
    const storageKey = `tagUserParams_${sessionId}`;
    // 获取现有的tagUserParams，更新authorization字段
    const existingParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const updatedParams = {
      ...existingParams,
      authorization: userParams.authorization
    };
    
    localStorage.setItem(storageKey, JSON.stringify(updatedParams));
    console.log('[账单 API] API令牌已更新');
  } else {
    console.warn('[账单 API] 无法设置API令牌：缺少sessionId');
  }
};

/**
 * 验证是否有有效的API令牌
 * @returns 是否有有效令牌
 */
export const hasValidBillToken = (): boolean => {
  const userParams = getBillUserParams();
  return userParams !== null && !!userParams.authorization;
};

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (progress: {
  current: number;
  total: number;
  percentage: number;
  currentPage: number;
  totalPages?: number;
}) => void;

/**
 * 导出账单数据
 * @param params 查询参数
 * @param maxRecords 最大导出记录数，默认10000
 * @returns 账单记录数组
 */
export const exportBillData = async (
  params: Omit<BillQueryParams, 'pageNum' | 'pageSize'>,
  maxRecords: number = 10000
): Promise<BillRecord[]> => {
  try {
    console.log('[导出账单] 开始导出数据，最大记录数:', maxRecords);
    
    const allRecords: BillRecord[] = [];
    const pageSize = 1000; // 每页1000条，分批获取
    let currentPage = 1;
    let totalFetched = 0;
    
    while (totalFetched < maxRecords) {
      const remainingRecords = maxRecords - totalFetched;
      const currentPageSize = Math.min(pageSize, remainingRecords);
      
      console.log(`[导出账单] 正在获取第 ${currentPage} 页，每页 ${currentPageSize} 条`);
      
      const response = await billApi.get<BillQueryResponse>(
        '/api/nxBill/usage/aiAgentCdr/query',
        {
          params: {
            pageNum: currentPage,
            pageSize: currentPageSize,
            customerId: params.customerId,
            tenantId: params.tenantId,
            agentFlowName: params.agentFlowName || '',
            callee: params.callee || '',
            startTime: params.startTime,
            endTime: params.endTime
          }
        }
      );
      
      const pageData = response.data.data;
      
      if (pageData.items.length === 0) {
        console.log('[导出账单] 没有更多数据，停止获取');
        break;
      }
      
      allRecords.push(...pageData.items);
      totalFetched += pageData.items.length;
      
      console.log(`[导出账单] 已获取 ${totalFetched} 条记录`);
      
      // 如果当前页数据少于页大小，说明已经是最后一页
      if (pageData.items.length < currentPageSize) {
        console.log('[导出账单] 已到达最后一页');
        break;
      }
      
      // 如果已达到总记录数，停止获取
      if (totalFetched >= pageData.total) {
        console.log('[导出账单] 已获取所有可用记录');
        break;
      }
      
      currentPage++;
    }
    
    console.log(`[导出账单] 导出完成，共获取 ${allRecords.length} 条记录`);
    return allRecords;
  } catch (error) {
    console.error('导出账单数据失败:', error);
    throw error;
  }
};

/**
 * 分批导出回调函数类型
 */
export type BatchExportCallback = (batchData: BillRecord[], batchInfo: {
  batchNumber: number;
  totalBatches: number;
  batchSize: number;
  totalProcessed: number;
  estimatedTotal: number;
}) => Promise<void>;

/**
 * 导出全部账单数据（无数量限制，支持进度回调）
 * @param params 查询参数
 * @param onProgress 进度回调函数
 * @returns 账单记录数组
 */
export const exportAllBillData = async (
  params: Omit<BillQueryParams, 'pageNum' | 'pageSize'>,
  onProgress?: ProgressCallback
): Promise<BillRecord[]> => {
  try {
    console.log('[导出全部账单] 开始导出所有数据');
    
    const allRecords: BillRecord[] = [];
    const pageSize = 1000; // 每页1000条，分批获取
    let currentPage = 1;
    let totalRecords = 0;
    let totalPages = 0;
    
    // 首先获取第一页数据，确定总数量
    console.log(`[导出全部账单] 正在获取第 ${currentPage} 页，每页 ${pageSize} 条`);
    
    const firstResponse = await billApi.get<BillQueryResponse>(
      '/api/nxBill/usage/aiAgentCdr/query',
      {
        params: {
          pageNum: currentPage,
          pageSize: pageSize,
          customerId: params.customerId,
          tenantId: params.tenantId,
          agentFlowName: params.agentFlowName || '',
          callee: params.callee || '',
          startTime: params.startTime,
          endTime: params.endTime
        }
      }
    );
    
    const firstPageData = firstResponse.data.data;
    totalRecords = firstPageData.total;
    totalPages = Math.ceil(totalRecords / pageSize);
    
    console.log(`[导出全部账单] 总记录数: ${totalRecords}, 总页数: ${totalPages}`);
    
    if (firstPageData.items.length === 0) {
      console.log('[导出全部账单] 没有数据');
      return [];
    }
    
    // 添加第一页数据
    allRecords.push(...firstPageData.items);
    
    // 报告初始进度
    if (onProgress) {
      onProgress({
        current: allRecords.length,
        total: totalRecords,
        percentage: (allRecords.length / totalRecords) * 100,
        currentPage: currentPage,
        totalPages: totalPages
      });
    }
    
    // 如果还有更多页，继续获取
    currentPage++;
    while (currentPage <= totalPages && allRecords.length < totalRecords) {
      console.log(`[导出全部账单] 正在获取第 ${currentPage} 页，每页 ${pageSize} 条`);
      
      const response = await billApi.get<BillQueryResponse>(
        '/api/nxBill/usage/aiAgentCdr/query',
        {
          params: {
            pageNum: currentPage,
            pageSize: pageSize,
            customerId: params.customerId,
            tenantId: params.tenantId,
            agentFlowName: params.agentFlowName || '',
            callee: params.callee || '',
            startTime: params.startTime,
            endTime: params.endTime
          }
        }
      );
      
      const pageData = response.data.data;
      
      if (pageData.items.length === 0) {
        console.log('[导出全部账单] 当前页没有数据，停止获取');
        break;
      }
      
      allRecords.push(...pageData.items);
      
      console.log(`[导出全部账单] 已获取 ${allRecords.length} / ${totalRecords} 条记录`);
      
      // 报告进度
      if (onProgress) {
        onProgress({
          current: allRecords.length,
          total: totalRecords,
          percentage: Math.min((allRecords.length / totalRecords) * 100, 100),
          currentPage: currentPage,
          totalPages: totalPages
        });
      }
      
      // 如果当前页数据少于页大小，说明已经是最后一页
      if (pageData.items.length < pageSize) {
        console.log('[导出全部账单] 已到达最后一页');
        break;
      }
      
      currentPage++;
    }
    
    console.log(`[导出全部账单] 导出完成，共获取 ${allRecords.length} 条记录`);
    
    // 最终进度报告
    if (onProgress) {
      onProgress({
        current: allRecords.length,
        total: allRecords.length, // 最终的total使用实际获取的数量
        percentage: 100,
        currentPage: totalPages,
        totalPages: totalPages
      });
    }
    
    return allRecords;
  } catch (error) {
    console.error('导出全部账单数据失败:', error);
    throw error;
  }
};

/**
 * 分批导出账单数据（边获取边生成，内存友好）
 * @param params 查询参数
 * @param batchSize 每批处理的数据量，默认50000
 * @param onProgress 进度回调函数
 * @param onBatchReady 批次数据准备好的回调函数
 * @returns 总处理记录数
 */
export const exportAllBillDataInBatches = async (
  params: Omit<BillQueryParams, 'pageNum' | 'pageSize'>,
  batchSize: number = 50000,
  onProgress?: ProgressCallback,
  onBatchReady?: BatchExportCallback
): Promise<number> => {
  try {
    console.log('[分批导出账单] 开始分批导出数据，批次大小:', batchSize);
    
    let totalProcessed = 0;
    let currentBatch = 1;
    let estimatedTotal = 0;
    let totalBatches = 0;
    const apiPageSize = 1000; // API每页获取1000条
    let currentApiPage = 1;
    let currentBatchData: BillRecord[] = [];
    
    // 持续获取数据直到没有更多数据
    while (true) {
      console.log(`[分批导出账单] 正在获取API第 ${currentApiPage} 页，每页 ${apiPageSize} 条`);
      
      const response = await billApi.get<BillQueryResponse>(
        '/api/nxBill/usage/aiAgentCdr/query',
        {
          params: {
            pageNum: currentApiPage,
            pageSize: apiPageSize,
            customerId: params.customerId,
            tenantId: params.tenantId,
            agentFlowName: params.agentFlowName || '',
            callee: params.callee || '',
            startTime: params.startTime,
            endTime: params.endTime
          }
        }
      );
      
      const pageData = response.data.data;
      
      // 第一次获取时确定总数
      if (currentApiPage === 1) {
        estimatedTotal = pageData.total;
        totalBatches = Math.ceil(estimatedTotal / batchSize);
        console.log(`[分批导出账单] 估计总记录数: ${estimatedTotal}, 预计批次数: ${totalBatches}`);
      }
      
      // 如果没有数据，退出循环
      if (pageData.items.length === 0) {
        console.log('[分批导出账单] 没有更多数据');
        break;
      }
      
      // 将当前页数据添加到当前批次
      currentBatchData.push(...pageData.items);
      totalProcessed += pageData.items.length;
      
      // 报告获取进度
      if (onProgress) {
        onProgress({
          current: totalProcessed,
          total: estimatedTotal,
          percentage: Math.min((totalProcessed / estimatedTotal) * 100, 100),
          currentPage: currentApiPage,
          totalPages: Math.ceil(estimatedTotal / apiPageSize)
        });
      }
      
      console.log(`[分批导出账单] 当前批次已累积 ${currentBatchData.length} 条，总已获取 ${totalProcessed} 条`);
      
      // 检查是否达到批次大小或者是否为最后一批数据
      const isLastPage = pageData.items.length < apiPageSize || totalProcessed >= estimatedTotal;
      const shouldProcessBatch = currentBatchData.length >= batchSize || isLastPage;
      
      if (shouldProcessBatch && currentBatchData.length > 0) {
        console.log(`[分批导出账单] 处理第 ${currentBatch} 批次，包含 ${currentBatchData.length} 条记录`);
        
        // 调用批次处理回调
        if (onBatchReady) {
          await onBatchReady(currentBatchData, {
            batchNumber: currentBatch,
            totalBatches: Math.max(totalBatches, currentBatch), // 动态调整总批次数
            batchSize: currentBatchData.length,
            totalProcessed: totalProcessed,
            estimatedTotal: estimatedTotal
          });
        }
        
        // 清空当前批次数据，释放内存
        currentBatchData = [];
        currentBatch++;
        
        // 强制垃圾回收（如果浏览器支持）
        if (typeof window !== 'undefined' && (window as any).gc) {
          (window as any).gc();
        }
      }
      
      // 如果是最后一页，退出循环
      if (isLastPage) {
        break;
      }
      
      currentApiPage++;
    }
    
    console.log(`[分批导出账单] 分批导出完成，共处理 ${totalProcessed} 条记录，分 ${currentBatch - 1} 个批次`);
    return totalProcessed;
    
  } catch (error) {
    console.error('分批导出账单数据失败:', error);
    throw error;
  }
}; 