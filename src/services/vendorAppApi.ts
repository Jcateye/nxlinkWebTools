import axios from 'axios';
import { ApiResponse } from '../types';
import {
  VendorAppListResponse,
  SceneVendorAppListResponse,
  VendorAppQueryParams,
  SceneVendorAppQueryParams,
  VendorAppFormData,
  SceneVendorAppFormData
} from '../types/vendorApp';
import { getCurrentDataCenter } from '../config/apiConfig';
import { fixApiUrl } from '../utils/apiHelper';



// 创建不同类型的API实例
const createApiInstance = (baseURL: string) => {
  const api = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json;charset=UTF-8',
      'system_id': '4',
    }
  });
  
  // 请求拦截器 - 添加认证信息和修正URL
  api.interceptors.request.use(
    (config) => {
      // 修正URL，确保使用代理路径
      if (config.url && config.url.startsWith('http')) {
        config.url = fixApiUrl(config.url);
      }
      
      // 修正baseURL
      if (config.baseURL && config.baseURL.startsWith('http')) {
        config.baseURL = fixApiUrl(config.baseURL);
      }
      
      // 从localStorage获取认证信息
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        const storageKey = `tagUserParams_${sessionId}`;
        const userParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
        
        if (userParams.authorization) {
          config.headers.authorization = userParams.authorization;
        }
      }
      
      // 确保设置正确的请求头
      config.headers['system_id'] = '4';
      config.headers['Accept'] = 'application/json, text/plain, */*';
      config.headers['Content-Type'] = 'application/json;charset=UTF-8';
      
      console.log('[vendorAppApi] 请求配置:', {
        baseURL: config.baseURL,
        url: config.url,
        method: config.method,
        headers: {
          authorization: config.headers.authorization?.substring(0, 20) + '...',
          'system_id': config.headers['system_id'],
          'Content-Type': config.headers['Content-Type']
        },
        data: config.data
      });
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  api.interceptors.response.use(
    (response) => {
      console.log('[vendorAppApi] 响应成功:', {
        baseURL: response.config.baseURL,
        url: response.config.url,
        status: response.status,
        data: response.data
      });
      return response;
    },
    (error) => {
      console.error('[vendorAppApi] 请求失败:', {
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      return Promise.reject(error);
    }
  );
  
  return api;
};

// 获取中台API实例（始终使用默认代理，不需要数据中心切换）
const getManagementApi = () => {
  return createApiInstance('/api');
};

// 获取流程管理API实例（根据数据中心切换）
const getFlowManagerApi = () => {
  const currentDataCenter = getCurrentDataCenter();
  return createApiInstance(currentDataCenter.baseURL);
};



/**
 * 获取供应商应用列表
 */
export const getVendorAppList = async (params: VendorAppQueryParams): Promise<VendorAppListResponse> => {
  try {
    console.log('[getVendorAppList] 获取供应商应用列表（中台API）', params);
    
    const managementApi = getManagementApi();
    const response = await managementApi.get<ApiResponse<VendorAppListResponse>>(
      '/admin/saas_plat_manager/nx_bill/vendorApp',
      { params }
    );
    
    if (response.data.code !== 0) {
      throw new Error(`获取供应商应用列表失败: ${response.data.message}`);
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error('获取供应商应用列表失败', error);
    throw error;
  }
};

/**
 * 获取场景供应商应用列表
 */
export const getSceneVendorAppList = async (params: SceneVendorAppQueryParams): Promise<SceneVendorAppListResponse> => {
  try {
    console.log('[getSceneVendorAppList] 获取场景供应商应用列表（流程管理API）', params);
    
    const flowManagerApi = getFlowManagerApi();
    const response = await flowManagerApi.get<ApiResponse<SceneVendorAppListResponse>>(
      '/admin/nx_flow_manager/mgrPlatform/sceneInfo',
      { params }
    );
    
    if (response.data.code !== 0) {
      throw new Error(`获取场景供应商应用列表失败: ${response.data.message}`);
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error('获取场景供应商应用列表失败', error);
    throw error;
  }
};

/**
 * 创建供应商应用
 */
export const createVendorApp = async (data: VendorAppFormData): Promise<any> => {
  try {
    console.log('[createVendorApp] 创建供应商应用', data);
    
    const managementApi = getManagementApi();
    const response = await managementApi.post<ApiResponse<any>>(
      '/admin/saas_plat_manager/nx_bill/vendorApp',
      data
    );
    
    if (response.data.code !== 0) {
      throw new Error(`创建供应商应用失败: ${response.data.message}`);
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error('创建供应商应用失败', error);
    throw error;
  }
};

/**
 * 更新供应商应用
 */
export const updateVendorApp = async (id: number, data: VendorAppFormData): Promise<any> => {
  try {
    console.log('[updateVendorApp] 更新供应商应用', id, data);
    
    const managementApi = getManagementApi();
    const response = await managementApi.put<ApiResponse<any>>(
      `/admin/saas_plat_manager/nx_bill/vendorApp/${id}`,
      data
    );
    
    if (response.data.code !== 0) {
      throw new Error(`更新供应商应用失败: ${response.data.message}`);
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error('更新供应商应用失败', error);
    throw error;
  }
};

/**
 * 删除供应商应用
 */
export const deleteVendorApp = async (id: number): Promise<boolean> => {
  try {
    console.log('[deleteVendorApp] 删除供应商应用', id);
    
    const managementApi = getManagementApi();
    const response = await managementApi.delete<ApiResponse<any>>(
      `/admin/saas_plat_manager/nx_bill/vendorApp/${id}`
    );
    
    if (response.data.code !== 0) {
      throw new Error(`删除供应商应用失败: ${response.data.message}`);
    }
    
    return true;
  } catch (error: any) {
    console.error('删除供应商应用失败', error);
    throw error;
  }
};

/**
 * 为指定的数据中心创建场景供应商应用（多环境同步创建时使用）
 * @param data 创建数据
 * @param baseURL 目标数据中心的baseURL
 */
export const createSceneVendorAppForDataCenter = async (data: SceneVendorAppFormData, baseURL: string): Promise<any> => {
  try {
    console.log(`[createSceneVendorAppForDataCenter] 为数据中心 ${baseURL} 创建场景供应商应用`, data);
    
    // 从localStorage获取tenantId
    const sessionId = localStorage.getItem('sessionId');
    let tenantId = '255'; // 默认值
    if (sessionId) {
      const storageKey = `tagUserParams_${sessionId}`;
      const userParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (userParams.tenantId) {
        tenantId = userParams.tenantId;
      }
    }
    
    // 构建创建数据
    const createData = {
      ...data,
      vendor_app_id: parseInt(data.vendor_app_id), // 确保是数字类型
      tenantId: tenantId
    };
    
    console.log(`[createSceneVendorAppForDataCenter] 发送的数据到 ${baseURL}:`, createData);
    
    // 创建特定数据中心的API实例，而不影响全局状态
    const dataCenterApi = createApiInstance(baseURL);
    const response = await dataCenterApi.post<ApiResponse<any>>(
      '/admin/nx_flow_manager/mgrPlatform/sceneInfo',
      createData
    );
    
    if (response.data.code !== 0) {
      throw new Error(`创建场景供应商应用失败: ${response.data.message}`);
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error(`[createSceneVendorAppForDataCenter] 创建失败 (${baseURL}):`, error);
    throw error;
  }
};

/**
 * 创建场景供应商应用
 */
export const createSceneVendorApp = async (data: SceneVendorAppFormData): Promise<any> => {
  try {
    console.log('[createSceneVendorApp] 创建场景供应商应用', data);
    
    // 从localStorage获取tenantId
    const sessionId = localStorage.getItem('sessionId');
    let tenantId = '255'; // 默认值
    if (sessionId) {
      const storageKey = `tagUserParams_${sessionId}`;
      const userParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (userParams.tenantId) {
        tenantId = userParams.tenantId;
      }
    }
    
    // 构建创建数据
    const createData = {
      ...data,
      vendor_app_id: parseInt(data.vendor_app_id), // 确保是数字类型
      tenantId: tenantId
    };
    
    console.log('[createSceneVendorApp] 发送的数据:', createData);
    
    const flowManagerApi = getFlowManagerApi();
    const response = await flowManagerApi.post<ApiResponse<any>>(
      '/admin/nx_flow_manager/mgrPlatform/sceneInfo',
      createData
    );
    
    if (response.data.code !== 0) {
      throw new Error(`创建场景供应商应用失败: ${response.data.message}`);
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error('创建场景供应商应用失败', error);
    throw error;
  }
};

/**
 * 更新场景供应商应用
 */
export const updateSceneVendorApp = async (id: number, data: SceneVendorAppFormData, originalRecord?: any): Promise<any> => {
  try {
    console.log('[updateSceneVendorApp] 更新场景供应商应用', id, data, originalRecord);
    
    // 从localStorage获取tenantId
    const sessionId = localStorage.getItem('sessionId');
    let tenantId = '255'; // 默认值
    if (sessionId) {
      const storageKey = `tagUserParams_${sessionId}`;
      const userParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (userParams.tenantId) {
        tenantId = userParams.tenantId;
      }
    }
    
    // 构建完整的更新数据，包括原始记录的所有字段
    const updateData = {
      id: id,
      type: data.type,
      language: data.language,
      vendor: data.vendor,
      vendor_params: data.vendor_params,
      code: data.code,
      timbre: data.timbre,
      model: data.model,
      vendor_app_id: parseInt(data.vendor_app_id), // 确保是数字类型
      status: data.status,
      rating: data.rating,
      remark: data.remark,
      // 包含原始记录的时间戳和tenantId
      create_ts: originalRecord?.create_ts,
      update_ts: Math.floor(Date.now() / 1000), // 更新时间戳
      tenantId: tenantId
    };
    
    console.log('[updateSceneVendorApp] 发送的完整数据:', updateData);
    
    const flowManagerApi = getFlowManagerApi();
    const response = await flowManagerApi.put<ApiResponse<any>>(
      `/admin/nx_flow_manager/mgrPlatform/sceneInfo`,
      updateData
    );
    
    if (response.data.code !== 0) {
      throw new Error(`更新场景供应商应用失败: ${response.data.message}`);
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error('[updateSceneVendorApp] 更新失败', error);
    throw error;
  }
};

/**
 * 删除场景供应商应用
 */
export const deleteSceneVendorApp = async (id: number): Promise<boolean> => {
  try {
    console.log('[deleteSceneVendorApp] 删除场景供应商应用', id);
    
    const flowManagerApi = getFlowManagerApi();
    const response = await flowManagerApi.delete<ApiResponse<any>>(
      `/admin/nx_flow_manager/mgrPlatform/sceneInfo/${id}`
    );
    
    if (response.data.code !== 0) {
      throw new Error(`删除场景供应商应用失败: ${response.data.message}`);
    }
    
    return true;
  } catch (error: any) {
    console.error('删除场景供应商应用失败', error);
    throw error;
  }
};

/**
 * 更新场景供应商应用状态
 */
export const updateSceneVendorAppStatus = async (id: number, status: number, originalRecord?: any): Promise<boolean> => {
  try {
    console.log('[updateSceneVendorAppStatus] 更新场景供应商应用状态', id, status, originalRecord);
    
    if (originalRecord) {
      // 使用完整记录更新的方式，只修改状态字段
      const formData = {
        type: originalRecord.type,
        language: originalRecord.language,
        vendor: originalRecord.vendor,
        vendor_params: originalRecord.vendor_params,
        code: originalRecord.code,
        timbre: originalRecord.timbre,
        model: originalRecord.model,
        vendor_app_id: originalRecord.vendor_app_id,
        status: status, // 只修改状态
        rating: originalRecord.rating,
        remark: originalRecord.remark
      };
      
      await updateSceneVendorApp(id, formData, originalRecord);
      return true;
    } else {
      // 回退到简单的状态更新方式
      const flowManagerApi = getFlowManagerApi();
      const response = await flowManagerApi.patch<ApiResponse<any>>(
        `/admin/nx_flow_manager/mgrPlatform/sceneInfo/${id}`,
        { status }
      );
      
      if (response.data.code !== 0) {
        throw new Error(`更新状态失败: ${response.data.message}`);
      }
      
      return true;
    }
  } catch (error: any) {
    console.error('更新场景供应商应用状态失败', error);
    throw error;
  }
};

/**
 * 获取供应商应用列表（用于ID到name的映射）
 */
export const getVendorAppListForMapping = async (type: string): Promise<any[]> => {
  try {
    console.log('[getVendorAppListForMapping] 获取供应商应用列表', type);
    
    // 从localStorage获取tenantId
    const sessionId = localStorage.getItem('sessionId');
    let tenantId = '255'; // 默认值
    if (sessionId) {
      const storageKey = `tagUserParams_${sessionId}`;
      const userParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (userParams.tenantId) {
        tenantId = userParams.tenantId;
      }
    }
    
    console.log('[getVendorAppListForMapping] API请求参数:', {
      type,
      page_num: -1,
      page_size: -1,
      tenantId
    });
    
    const managementApi = getManagementApi();
    const response = await managementApi.get<ApiResponse<any>>('/admin/saas_plat_manager/nx_bill/vendorApp', {
      params: {
        type: type,
        page_num: -1,
        page_size: -1,
        tenantId: tenantId
      }
    });
    
    console.log('[getVendorAppListForMapping] API响应:', response.data);
    
    if (response.data.code !== 0) {
      throw new Error(`获取供应商应用列表失败: ${response.data.message}`);
    }
    
    return response.data.data.list || [];
  } catch (error: any) {
    console.error('获取供应商应用列表失败', error);
    return [];
  }
}; 