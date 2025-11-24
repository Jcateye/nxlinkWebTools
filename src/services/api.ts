import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { message } from 'antd';
import { requestDeduper } from '../utils/requestDeduper';
import { isTokenExpired, cleanupAllExpiredTokens, EXPIRED_TOKEN_MESSAGES } from '../utils/tokenCleaner';
import { 
  ApiResponse, 
  TagGroup, 
  Tag, 
  PaginatedResponse, 
  FaqResponse, 
  FaqAddRequest,
  FaqUpdateRequest,
  FaqListData,
  FaqItemDetailed,
  VoiceResponse,
  TagGroupAddRequest,
  TagAddRequest,
  TagUserParams,
  FaqUserParams,
  ConversationListResponse,
  ConversationDetailResponse,
} from '../types';
import requestLimiter from '../utils/requestLimiter';
import { API_LIMIT_CONFIG, API_CONFIG } from '../config/apiConfig';
import { withErrorMonitoring } from '../utils/errorMonitor';

// 应用API限流配置
Object.entries(API_LIMIT_CONFIG).forEach(([apiKey, config]) => {
  requestLimiter.setConfig(apiKey, config);
});

// 创建用于Tag的axios实例
const tagApi = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  withCredentials: true,
});

// 创建用于FAQ的axios实例
const faqApi = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  withCredentials: true,
});

// 创建用于Voice API请求的axios实例
const voiceApi = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8',
    'system_id': '5',
    'time_zone': 'UTC+08:00',
  }
});

// 为NXLink客户端功能创建一个通用的axios实例
const nxlinkClientApi = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8',
    'system_id': '5',
    'time_zone': 'UTC+08:00',
  }
});

const conversationApi = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8',
    'system_id': '5',
    'time_zone': 'UTC+08:00',
  }
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

// Tag API请求拦截器
tagApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 使用会话ID获取对应的tag用户参数
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      const storageKey = `tagUserParams_${sessionId}`;
      const tagUserParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      if (tagUserParams.authorization) {
        config.headers.authorization = tagUserParams.authorization;
        config.headers.system_id = '4';
      }
    }
    
    // 处理特殊请求URL的Content-Type
    if (config.url) {
      // 标签分组迁移请求特殊处理
      if (config.url.includes('/mgrPlatform/tagGroup/migrate')) {
        config.headers['Content-Type'] = 'application/json, text/plain, */*';
        console.log('[Tag API 请求] 检测到迁移请求，设置特殊Content-Type头');
      } else {
        // 对于其他请求，确保设置标准的Content-Type
        if (!config.headers['Content-Type']) {
          config.headers['Content-Type'] = 'application/json';
        }
      }
    }
    
    // 开发模式下输出请求信息
    if (process.env.NODE_ENV === 'development' && API_CONFIG.verboseLogging) {
      console.log('[Tag API 请求]', config.method?.toUpperCase(), config.url);
      console.log('[Tag API 请求参数]', config.params || {});
      console.log('[Tag API 请求头]', config.headers || {});
      if (config.data) {
        console.log('[Tag API 请求体]', config.data);
      }
    }
    
    return config;
  },
  (error: any) => {
    logRequestError(error, 'Tag API 请求拦截器');
    return Promise.reject(error);
  }
);

// NXLink客户端通用请求拦截器
nxlinkClientApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('nxlink_client_token');
    if (token) {
      config.headers.authorization = token;
    }
    return config;
  },
  (error: any) => {
    logRequestError(error, 'NXLink Client API 请求拦截器');
    return Promise.reject(error);
  }
);


// FAQ API请求拦截器
faqApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 优先从会话中获取FAQ专用的授权token
    const sessionId = localStorage.getItem('sessionId');
    let faqToken = '';
    
    if (sessionId) {
      const storageKey = `faqUserParams_${sessionId}`;
      const faqUserParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
          // 根据请求路径或URL参数判断使用哪个token
    // 对于源租户相关的请求，使用sourceAuthorization
    // 对于目标租户相关的请求，使用targetAuthorization
    faqToken = faqUserParams.sourceAuthorization || faqUserParams.targetAuthorization || '';
  }
  
  // 如果没有会话中的token，再尝试使用持久化的token
  if (!faqToken) {
    // 优先使用持久化的源租户token
    faqToken = localStorage.getItem('nxlink_source_token') || '';
  }
  if (!faqToken) {
    // 最后尝试使用全局登录token
    faqToken = localStorage.getItem('nxlink_client_token') || '';
  }

    // 设置授权头
    if (faqToken) {
      config.headers.authorization = faqToken;
      config.headers.system_id = '5';
      config.headers.time_zone = 'UTC+08:00';
      config.headers.lang = 'zh_CN';
      
      // 在请求配置中记录使用的token，用于后续错误处理
      (config as any)._usedToken = faqToken;
    } else {
      console.warn('🚫 [FAQ API] 没有找到有效的授权token');
    }
    
    // 开发模式下输出请求信息
    if (process.env.NODE_ENV === 'development' && API_CONFIG.verboseLogging) {
      console.log('[FAQ API 请求]', config.method?.toUpperCase(), config.url);
      console.log('[FAQ API 请求参数]', config.params || {});
      console.log('[FAQ API 请求头]', config.headers || {});
    }
    
    return config;
  },
  (error: any) => {
    logRequestError(error, 'FAQ API 请求拦截器');
    return Promise.reject(error);
  }
);

// Voice API请求拦截器
voiceApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 优先从会话中获取FAQ专用的授权token（与FAQ API使用相同的token优先级）
    const sessionId = localStorage.getItem('sessionId');
    let voiceToken = '';
    
    if (sessionId) {
      const storageKey = `faqUserParams_${sessionId}`;
      const faqUserParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
          // 对于声音管理，优先使用源租户的token，因为声音通常在源租户管理
    voiceToken = faqUserParams.sourceAuthorization || faqUserParams.targetAuthorization || '';
  }
  
  // 如果没有会话中的token，再尝试使用持久化的token
  if (!voiceToken) {
    // 优先使用持久化的源租户token
    voiceToken = localStorage.getItem('nxlink_source_token') || '';
  }
  if (!voiceToken) {
    // 最后尝试使用全局登录token
    voiceToken = localStorage.getItem('nxlink_client_token') || '';
  }

    // 设置授权头
    if (voiceToken) {
      config.headers.authorization = voiceToken;
      config.headers.system_id = '5';
      config.headers.time_zone = 'UTC+08:00';
      config.headers.lang = 'zh_CN';
      
      // 在请求配置中记录使用的token，用于后续错误处理
      (config as any)._usedToken = voiceToken;
    } else {
      console.warn('🚫 [Voice API] 没有找到有效的授权token');
    }
    
    // 开发模式下输出请求信息
    if (process.env.NODE_ENV === 'development' && API_CONFIG.verboseLogging) {
      console.log('[Voice API 请求]', config.method?.toUpperCase(), config.url);
      console.log('[Voice API 请求参数]', config.params || {});
      console.log('[Voice API 请求头]', config.headers || {});
    }
    
    return config;
  },
  (error: any) => {
    logRequestError(error, 'Voice API 请求拦截器');
    return Promise.reject(error);
  }
);

// Voice API响应拦截器
voiceApi.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development' && API_CONFIG.verboseLogging) {
      console.log('[Voice API 响应状态]', response.status);
      console.log('[Voice API 响应数据]', response.data);
    }
    
    // 检查响应中的错误码，处理token过期
    const resData = response.data as ApiResponse<any>;
    if (resData && resData.code !== 0 && isTokenExpired(response)) {
      const usedToken = (response.config as any)?._usedToken;
      if (usedToken) {
        console.log('🔍 [Voice API] 检测到token过期，开始清理...');
        cleanupAllExpiredTokens(usedToken);
      }
    }
    
    return response;
  },
  (error) => {
    // 处理HTTP错误状态码的token过期情况
    if (error.response && isTokenExpired(error.response)) {
      const usedToken = (error.config as any)?._usedToken;
      if (usedToken) {
        console.log('🔍 [Voice API] 检测到HTTP token过期，开始清理...');
        cleanupAllExpiredTokens(usedToken);
      }
    }
    return Promise.reject(logRequestError(error, 'Voice API 响应'));
  }
);

conversationApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 优先从会话中获取FAQ专用的授权token（与FAQ API使用相同的token优先级）
    const sessionId = localStorage.getItem('sessionId');
    let conversationToken = '';
    
    if (sessionId) {
      const storageKey = `faqUserParams_${sessionId}`;
      const faqUserParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
          // 会话管理使用源租户的身份信息
    conversationToken = faqUserParams.sourceAuthorization || '';
  }
  
  // 如果没有会话中的token，再尝试使用持久化的token
  if (!conversationToken) {
    // 优先使用持久化的源租户token
    conversationToken = localStorage.getItem('nxlink_source_token') || '';
  }
  if (!conversationToken) {
    // 最后尝试使用全局登录token
    conversationToken = localStorage.getItem('nxlink_client_token') || '';
  }

    // 设置授权头
    if (conversationToken) {
      config.headers.authorization = conversationToken;
      config.headers.system_id = '5';
      config.headers.time_zone = 'UTC+08:00';
      config.headers.lang = 'zh_CN';
      
      // 在请求配置中记录使用的token，用于后续错误处理
      (config as any)._usedToken = conversationToken;
    } else {
      console.warn('🚫 [Conversation API] 没有找到有效的授权token');
    }
    
    // 开发模式下输出请求信息
    if (process.env.NODE_ENV === 'development' && API_CONFIG.verboseLogging) {
      console.log('[Conversation API 请求]', config.method?.toUpperCase(), config.url);
      console.log('[Conversation API 请求参数]', config.params || {});
      console.log('[Conversation API 请求头]', config.headers || {});
    }
    
    return config;
  },
  (error: any) => {
    logRequestError(error, 'Conversation API 请求拦截器');
    return Promise.reject(error);
  }
);

conversationApi.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development' && API_CONFIG.verboseLogging) {
      console.log('[Conversation API 响应状态]', response.status);
      console.log('[Conversation API 响应数据]', response.data);
    }
    
    // 检查响应中的错误码，处理token过期
    const resData = response.data as ApiResponse<any>;
    if (resData && resData.code !== 0 && isTokenExpired(response)) {
      const usedToken = (response.config as any)?._usedToken;
      if (usedToken) {
        console.log('🔍 [Conversation API] 检测到token过期，开始清理...');
        cleanupAllExpiredTokens(usedToken);
      }
    }
    
    return response;
  },
  (error) => {
    // 处理HTTP错误状态码的token过期情况
    if (error.response && isTokenExpired(error.response)) {
      const usedToken = (error.config as any)?._usedToken;
      if (usedToken) {
        console.log('🔍 [Conversation API] 检测到HTTP token过期，开始清理...');
        cleanupAllExpiredTokens(usedToken);
      }
    }
    return Promise.reject(logRequestError(error, 'Conversation API 响应'));
  }
);


// 添加响应拦截器
tagApi.interceptors.response.use(
  (response) => {
    // 开发模式下输出响应信息
    if (process.env.NODE_ENV === 'development' && API_CONFIG.verboseLogging) {
      console.log('[Tag API 响应状态]', response.status);
      console.log('[Tag API 响应数据]', response.data);
    }
    return response;
  },
  (error) => {
    return Promise.reject(logRequestError(error, 'Tag API 响应'));
  }
);

// NXLink客户端通用响应拦截器
nxlinkClientApi.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development' && API_CONFIG.verboseLogging) {
      console.log('[NXLink Client API 响应状态]', response.status);
      console.log('[NXLink Client API 响应数据]', response.data);
    }
    const resData = response.data as ApiResponse<any>;
    if (resData.code !== 0) {
      const errMsg = resData.message || '服务器返回错误';
      console.error(`❌ [API] 请求失败: ${errMsg}`);
      if (typeof window !== 'undefined' && window.document) {
        message.error(errMsg, 3);
      }
      return Promise.reject(new Error(errMsg));
    }
    return response;
  },
  (error) => {
    return Promise.reject(logRequestError(error, 'NXLink Client API 响应'));
  }
);

faqApi.interceptors.response.use(
  (response) => {
    // 开发模式下输出响应信息
    if (process.env.NODE_ENV === 'development' && API_CONFIG.verboseLogging) {
      console.log('[FAQ API 响应状态]', response.status);
      console.log('[FAQ API 响应数据]', response.data);
    }
    const resData = response.data as ApiResponse<any>;
    // 超过code不为0的请求，并返回友好提示
    if (resData.code !== 0) {
      const errMsg = resData.message || '服务器返回错误';
      console.error(`❌ [FAQ API] 请求失败: ${errMsg}`);
      
      // 检查是否是token过期错误
      if (isTokenExpired(response)) {
        const usedToken = (response.config as any)?._usedToken;
        if (usedToken) {
          console.log('🔍 [FAQ API] 检测到token过期，开始清理...');
          cleanupAllExpiredTokens(usedToken);
        }
      }
      
      // 使用 antd message 提示，不再使用require
      if (typeof window !== 'undefined' && window.document) {
        message.error(errMsg, 3);
      }
      return Promise.reject(new Error(errMsg));
    }
    return response;
  },
  (error) => {
    // 处理HTTP错误状态码的token过期情况
    if (error.response && isTokenExpired(error.response)) {
      const usedToken = (error.config as any)?._usedToken;
      if (usedToken) {
        console.log('🔍 [FAQ API] 检测到HTTP token过期，开始清理...');
        cleanupAllExpiredTokens(usedToken);
      }
    }
    return Promise.reject(logRequestError(error, 'FAQ API 响应'));
  }
);

// 创建限流API请求包装函数
const createRateLimitedRequest = async <T>(
  apiKey: string,
  requestFn: () => Promise<T>
): Promise<T> => {
  // 如果未启用频率限制，直接执行请求
  if (!API_CONFIG.enableRateLimiting) {
    return requestFn();
  }
  
  // 检查是否可以发送请求
  if (!requestLimiter.canRequest(apiKey)) {
    // 等待直到可以发送请求
    await requestLimiter.waitUntilReady(apiKey);
  }
  
  // 执行请求
  return requestFn();
};

// 添加标签分组缓存机制
interface TagGroupCache {
  groups: TagGroup[];
  timestamp: number;
  tenantKey: string;
}

// 标签分组缓存，键为nxCloudUserID_tenantId
const tagGroupCache: Record<string, TagGroupCache> = {};

// 缓存有效期（毫秒），增加到5分钟，减少API调用频率
const CACHE_TTL = 300000; // 5分钟缓存

// 获取标签分组列表
export const getTagGroupList = async (nxCloudUserID: string, tenantId: string, headers?: Record<string, string>): Promise<TagGroup[]> => {
  return createRateLimitedRequest('getTagGroupList', async () => {
    try {
      // 生成缓存键
      const cacheKey = `${nxCloudUserID}_${tenantId}`;
      const now = Date.now();
      
      // 检查缓存是否有效
      if (
        tagGroupCache[cacheKey] && 
        (now - tagGroupCache[cacheKey].timestamp < CACHE_TTL) &&
        tagGroupCache[cacheKey].tenantKey === cacheKey
      ) {
        console.log(`🗂 [getTagGroupList] 使用缓存 (TTL=${CACHE_TTL/1000}s)：用户 ${nxCloudUserID}, 租户 ${tenantId}`);
        return tagGroupCache[cacheKey].groups;
      }
      
      console.log(`🔄 [getTagGroupList] 发起网络请求 -> userID=${nxCloudUserID}, tenantID=${tenantId}`);
      const response = await tagApi.get<ApiResponse<TagGroup[]>>(
        `/admin/nx_flow_manager/mgrPlatform/tag/typeDetails`,
        {
          params: {
            nxCloudUserID,
            tenantId
          },
          headers
        }
      );
      
      // 更新缓存
      tagGroupCache[cacheKey] = {
        groups: response.data.data,
        timestamp: now,
        tenantKey: cacheKey
      };
      
      return response.data.data;
    } catch (error: any) {
      console.error('获取标签分组列表失败', error);
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('未收到服务器响应，请检查网络连接');
      } else {
        console.error('请求配置错误:', error.message);
      }
      throw error;
    }
  });
};

// 清除标签分组缓存
export const clearTagGroupCache = async (
  nxCloudUserID: string, 
  tenantId: string,
  headers?: Record<string, string>
): Promise<void> => {
  return createRateLimitedRequest('clearTagGroupCache', async () => {
    try {
      console.log(`[clearTagGroupCache] 清除标签分组缓存，参数: nxCloudUserID=${nxCloudUserID}, tenantId=${tenantId}`);
      await tagApi.get<ApiResponse<void>>(
        '/admin/nx_flow_manager/mgrPlatform/tagGroup/clearCache',
        { 
          params: { 
            nxCloudUserID, 
            tenantId 
          },
          headers 
        }
      );
      
      console.log(`[clearTagGroupCache] 清除标签分组缓存成功`);
    } catch (error: any) {
      console.error('[clearTagGroupCache] 清除标签分组缓存失败', error);
      throw error;
    }
  });
};

// 创建标签分组
export const createTagGroup = async (data: TagGroupAddRequest, headers?: Record<string, string>): Promise<number> => {
  return createRateLimitedRequest('createTagGroup', async () => {
    try {
      console.log(`[createTagGroup] 正在创建标签分组，参数:`, data);
      const response = await tagApi.post<ApiResponse<number>>(
        '/admin/nx_flow_manager/mgrPlatform/tagGroup',
        data,
        { headers }
      );
      
      // 创建成功后清除缓存，确保下次获取到最新数据
      clearTagGroupCache(data.nxCloudUserID, data.tenantId);
      
      return response.data.data;
    } catch (error: any) {
      console.error('创建标签分组失败', error);
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('未收到服务器响应，请检查网络连接');
      } else {
        console.error('请求配置错误:', error.message);
      }
      throw error;
    }
  });
};

// 获取标签列表
export const getTagList = async (
  nxCloudUserID: string, 
  tenantId: string, 
  groupId: number,
  pageNumber: number = 1,
  pageSize: number = 100,
  headers?: Record<string, string>
): Promise<PaginatedResponse<Tag>> => {
  return createRateLimitedRequest('getTagList', async () => {
    try {
      console.log(`[getTagList] 正在获取标签列表，参数: nxCloudUserID=${nxCloudUserID}, tenantId=${tenantId}, groupId=${groupId}`);
      const response = await tagApi.get<ApiResponse<PaginatedResponse<Tag>>>(
        '/admin/nx_flow_manager/mgrPlatform/tag',
        {
          params: {
            page_number: pageNumber,
            page_size: pageSize,
            name: '',
            group_id: groupId,
            nxCloudUserID,
            tenantId
          },
          headers
        }
      );
      return response.data.data;
    } catch (error: any) {
      console.error('获取标签列表失败', error);
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('未收到服务器响应，请检查网络连接');
      } else {
        console.error('请求配置错误:', error.message);
      }
      throw error;
    }
  });
};

// 创建标签
export const createTag = async (data: TagAddRequest, headers?: Record<string, string>): Promise<any> => {
  return createRateLimitedRequest('createTag', async () => {
    try {
      const response = await tagApi.post<ApiResponse<any>>(
        '/admin/nx_flow_manager/mgrPlatform/tag',
        data,
        { headers }
      );
      return response.data.data;
    } catch (error: any) {
      console.error('创建标签失败', error);
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('未收到服务器响应，请检查网络连接');
      } else {
        console.error('请求配置错误:', error.message);
      }
      throw error;
    }
  });
};

// 批量导入标签
export const batchImportTags = async (
  tags: {
    name: string;
    describes: string | null;
    groupName: string;
  }[],
  nxCloudUserID: string, 
  tenantId: string
): Promise<{ success: number; failed: number; groupsCreated: string[] }> => {
  return createRateLimitedRequest('batchImportTags', async () => {
    let successCount = 0;
    let failedCount = 0;
    const groupsCreated: string[] = [];
    const groupCache: Record<string, number> = {};
    
    try {
      // 先一次性获取所有分组，避免每个标签都查询一次
      const existingGroups = await getTagGroupList(nxCloudUserID, tenantId);
      
      // 将现有分组预先加入缓存
      existingGroups.forEach(group => {
        groupCache[group.group_name] = group.id;
      });
      
      // 收集需要创建的分组名称（去重）
      const uniqueGroupNames = [...new Set(
        tags.map(tag => tag.groupName)
          .filter(name => !groupCache[name])
      )];
      
      // 预先创建所有需要的分组
      for (const groupName of uniqueGroupNames) {
        try {
          const groupId = await createTagGroup({
            group_name: groupName,
            group_type: 0,
            type: 7,
            nxCloudUserID,
            tenantId
          });
          
          // 缓存新创建的分组ID
          groupCache[groupName] = groupId;
          groupsCreated.push(groupName);
        } catch (error: any) {
          console.error(`创建分组 "${groupName}" 失败`, error);
        }
      }

      // 逐个处理标签
      for (const tag of tags) {
        try {
          // 从缓存获取分组ID
          const groupId = groupCache[tag.groupName];
          
          if (!groupId) {
            // 如果没有找到分组ID，则跳过此标签
            console.error(`找不到分组 "${tag.groupName}" 的ID，跳过标签 "${tag.name}"`);
            failedCount++;
            continue;
          }
          
          // 创建标签
          await createTag({
            group_id: groupId,
            name: tag.name,
            describes: tag.describes,
            nxCloudUserID,
            tenantId
          });
          
          successCount++;
        } catch (error: any) {
          console.error(`导入标签 "${tag.name}" 失败`, error);
          failedCount++;
        }
      }
      
      return {
        success: successCount,
        failed: failedCount,
        groupsCreated
      };
    } catch (error: any) {
      console.error('批量导入标签失败', error);
      throw error;
    }
  });
};

// 导出标签数据
export const exportTagsFromGroups = async (
  groupIds: number[],
  nxCloudUserID: string,
  tenantId: string
): Promise<{
  name: string;
  describes: string | null;
  groupName: string;
}[]> => {
  return createRateLimitedRequest('exportTagsFromGroups', async () => {
    try {
      const allTags: {
        name: string;
        describes: string | null;
        groupName: string;
      }[] = [];

      // 获取所有选中的分组，使用已加缓存的方法
      const groupsResponse = await getTagGroupList(nxCloudUserID, tenantId);
      const selectedGroups = groupsResponse.filter(group => groupIds.includes(group.id));

      // 遍历每个分组获取标签
      for (const group of selectedGroups) {
        let currentPage = 1;
        const pageSize = 100;
        let hasMoreTags = true;

        // 分页获取所有标签
        while (hasMoreTags) {
          const tagResponse = await getTagList(
            nxCloudUserID,
            tenantId,
            group.id,
            currentPage,
            pageSize
          );

          if (tagResponse.list.length > 0) {
            // 转换为导出格式
            const formattedTags = tagResponse.list.map(tag => ({
              name: tag.name,
              describes: tag.describes,
              groupName: group.group_name
            }));

            allTags.push(...formattedTags);

            // 检查是否还有更多标签
            if (tagResponse.list.length < pageSize) {
              hasMoreTags = false;
            } else {
              currentPage++;
            }
          } else {
            hasMoreTags = false;
          }
        }
      }

      return allTags;
    } catch (error: any) {
      console.error('导出标签数据失败', error);
      throw error;
    }
  });
};

// 标签分组迁移
export const migrateTagGroups = async (
  tagUserParams: TagUserParams,
  groupIds: number[],
  options?: { prefixProcessing: boolean; prefixAdd: string; prefixRemove: string }
): Promise<string[]> => {
  return createRateLimitedRequest('migrateTagGroups', async () => {
    try {
      console.log(`[migrateTagGroups] 开始迁移标签分组，目标租户ID: ${tagUserParams.targetTenantID}`, 'options:', options);
      
      // 成功迁移的分组名称列表
      const successGroups: string[] = [];
      
      // 获取选中的分组详情
      const sourceGroups = await getTagGroupList(tagUserParams.nxCloudUserID, tagUserParams.sourceTenantID);
      const selectedGroups = sourceGroups.filter(group => groupIds.includes(group.id));
      
      if (selectedGroups.length === 0) {
        console.log(`[migrateTagGroups] 未找到有效的分组`);
        return successGroups;
      }
      
      // 一个一个处理分组迁移
      for (const group of selectedGroups) {
        try {
          console.log(`[migrateTagGroups] 处理分组 "${group.group_name}" (ID: ${group.id})`);
          // 处理前缀
          let newGroupName = group.group_name;
          if (options?.prefixProcessing) {
            // 去掉前缀
            if (options.prefixRemove) {
              newGroupName = newGroupName.replace(new RegExp(options.prefixRemove, 'g'), '');
            }
            // 添加前缀
            newGroupName = `${options.prefixAdd}${newGroupName}`;
          }
          // 1. 创建目标租户中的分组
          const targetGroupId = await createTagGroup({
            group_name: newGroupName,
            group_type: 0,
            type: 7,
            nxCloudUserID: tagUserParams.nxCloudUserID,
            tenantId: tagUserParams.targetTenantID
          });
          
          // 2. 获取源分组中的所有标签
          const sourceTags = await getTagList(
            tagUserParams.nxCloudUserID,
            tagUserParams.sourceTenantID,
            group.id,
            1,
            10000 // 一次性获取足够多的标签
          );
          
          if (sourceTags.list.length === 0) {
            console.log(`[migrateTagGroups] 分组 "${group.group_name}" 中没有标签`);
            successGroups.push(newGroupName);
            continue;
          }
          
          // 3. 逐个复制标签到目标分组，并处理前缀
          for (const tagItem of sourceTags.list) {
            let newTagName = tagItem.name;
            if (options?.prefixProcessing) {
              if (options.prefixRemove) {
                newTagName = newTagName.replace(new RegExp(options.prefixRemove, 'g'), '');
              }
              newTagName = `${options.prefixAdd}${newTagName}`;
            }
            await createTag({
              group_id: targetGroupId,
              name: newTagName,
              describes: tagItem.describes,
              nxCloudUserID: tagUserParams.nxCloudUserID,
              tenantId: tagUserParams.targetTenantID
            });
          }
          console.log(`[migrateTagGroups] 成功迁移分组 "${newGroupName}" 的 ${sourceTags.list.length} 个标签`);
          successGroups.push(newGroupName);
        } catch (error: any) {
          console.error(`[migrateTagGroups] 迁移分组 "${group.group_name}" 失败:`, error);
          // 继续处理下一个分组
        }
      }
      
      return successGroups;
    } catch (error: any) {
      console.error('[migrateTagGroups] 迁移过程发生错误:', error);
      throw error;
    }
  });
};

// ==================== FAQ相关API ====================

// FAQ 相关接口 - 获取语言列表
export const getFaqLanguageList = async (): Promise<{ id: number; name: string }[]> => {
  try {
    const response = await faqApi.get<ApiResponse<{ id: number; name: string }[]>>(
      '/home/api/language'
    );
    return response.data.data;
  } catch (error) {
    console.error('获取FAQ语言列表失败', error);
    throw error;
  }
};

// FAQ 相关接口 - 获取租户下的语言列表
export const getTenantFaqLanguageList = async (): Promise<{ id: number; language_id: number; language_name: string }[]> => {
  return withErrorMonitoring(
    async () => {
      const response = await faqApi.get<ApiResponse<{ id: number; language_id: number; language_name: string }[]>>(
        '/home/api/faqTenantLanguage'
      );
      
      if (response.data.code === 0) {
        return response.data.data || [];
      } else {
        throw new Error(`API返回错误: ${response.data.message || '未知错误'}`);
      }
    },
    'getTenantFaqLanguageList',
    3
  );
};

// FAQ 相关接口 - 添加语言
export const addFaqLanguage = async (languageId: number): Promise<void> => {
  return withErrorMonitoring(
    async () => {
      const response = await faqApi.post<ApiResponse<null>>(
        '/home/api/faqTenantLanguage',
        { language_id: languageId }
      );
      
      if (response.data.code !== 0) {
        throw new Error(`添加语言失败: ${response.data.message || '未知错误'}`);
      }
    },
    'addFaqLanguage',
    2
  );
};

// FAQ 相关接口 - 获取FAQ分组列表
export const getFaqGroupList = async (
  languageId: number
): Promise<{
  code: number;
  message: string;
  data: Array<{
    id: number | null;
    group_name: string;
    group_size: number;
  }>;
  traceId: string;
}> => {
  try {
    const response = await faqApi.get<{
      code: number;
      message: string;
      data: Array<{
        id: number | null;
        group_name: string;
        group_size: number;
      }>;
      traceId: string;
    }>(
      '/home/api/faqGroup',
      {
        params: {
          language_id: languageId
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('获取FAQ分组列表失败', error);
    throw error;
  }
};

// FAQ 相关接口 - 添加FAQ
export const addFaq = async (params: {
  question: string;
  type: number;
  group_id: number;
  content: string;
  ai_desc: string;
  language_id: number;
  faq_medias: any[];
  faq_status: boolean;
}, headers?: Record<string, string>): Promise<void> => {
  try {
    // 打印日志，帮助调试
    console.log(`[addFaq] 添加FAQ: "${params.question}" 到分组ID: ${params.group_id}, 语言ID: ${params.language_id}`);
    
    // 构造完整的headers，确保包含Content-Type
    const fullHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers || {})
    };
    
    // 打印完整的headers信息(隐藏敏感部分)
    console.log(`[addFaq] 使用headers:`, {
      authorization: fullHeaders.authorization?.substring(0, 20) + '...' || '未设置',
      system_id: fullHeaders.system_id || '未设置',
      'Content-Type': fullHeaders['Content-Type']
    });
    
    // 使用faqApi发送请求，并确保headers正确传递
    console.log(`[addFaq] 正在发送POST请求到 '/home/api/faq'，请稍候...`);
    
    // 使用直接的axios请求确保headers正确传递
    const response = await axios.post('/api/home/api/faq', params, { 
      headers: fullHeaders 
    });
    
    // 检查响应
    if (response.data.code !== 0) {
      console.error(`[addFaq] 服务器返回错误:`, response.data);
      throw new Error(`添加FAQ失败: ${response.data.message || '未知错误'}`);
    }
    
    console.log(`[addFaq] 成功添加FAQ: "${params.question}", 服务器响应:`, response.data);
  } catch (error: any) {
    console.error(`[addFaq] 添加FAQ "${params.question}" 失败:`, error);
    if (error.response) {
      console.error(`[addFaq] 服务器响应:`, error.response.status, error.response.data);
    }
    throw error;
  }
};

// FAQ 相关接口 - 删除FAQ (旧版接口)
export const deleteFaqOld = async (id: number): Promise<void> => {
  try {
    await faqApi.delete<ApiResponse<null>>(
      `/home/api/faq/${id}`
    );
  } catch (error) {
    console.error('删除FAQ失败', error);
    throw error;
  }
};

// FAQ相关API
export const getFaqList = async (
  nxCloudUserID: string,
  tenantId: string,
  page: number = 1,
  pageSize: number = 10,
  keyword?: string
): Promise<FaqResponse> => {
  return createRateLimitedRequest('getFaqList', async () => {
    try {
      const params: any = {
        nxCloudUserID,
        tenantId,
        page,
        page_size: pageSize
      };
      
      if (keyword) {
        params.keyword = keyword;
      }
      
      const response = await faqApi.get<ApiResponse<FaqResponse>>(
        '/admin/nx_flow_manager/faq',
        { params }
      );
      
      return response.data.data;
    } catch (error: any) {
      console.error('获取FAQ列表失败', error);
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('未收到服务器响应，请检查网络连接');
      } else {
        console.error('请求配置错误:', error.message);
      }
      throw error;
    }
  });
};

export const createFaq = async (data: FaqAddRequest): Promise<any> => {
  return createRateLimitedRequest('createFaq', async () => {
    try {
      const response = await faqApi.post<ApiResponse<any>>(
        '/admin/nx_flow_manager/faq',
        data
      );
      return response.data.data;
    } catch (error: any) {
      console.error('创建FAQ失败', error);
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('未收到服务器响应，请检查网络连接');
      } else {
        console.error('请求配置错误:', error.message);
      }
      throw error;
    }
  });
};

export const updateFaq = async (
  faqId: number,
  data: FaqUpdateRequest
): Promise<boolean> => {
  return createRateLimitedRequest('updateFaq', async () => {
    try {
      const response = await faqApi.put<ApiResponse<any>>(
        `/admin/nx_flow_manager/faq/${faqId}`,
        data
      );
      return response.data.code === 0;
    } catch (error: any) {
      console.error('更新FAQ失败', error);
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('未收到服务器响应，请检查网络连接');
      } else {
        console.error('请求配置错误:', error.message);
      }
      throw error;
    }
  });
};

export const deleteFaq = async (
  faqId: number,
  nxCloudUserID: string,
  tenantId: string
): Promise<boolean> => {
  return createRateLimitedRequest('deleteFaq', async () => {
    try {
      const response = await faqApi.delete<ApiResponse<null>>(
        `/admin/nx_flow_manager/faq/${faqId}`,
        {
          params: {
            nxCloudUserID,
            tenantId
          }
        }
      );
      return response.data.code === 0;
    } catch (error: any) {
      console.error('删除FAQ失败', error);
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('未收到服务器响应，请检查网络连接');
      } else {
        console.error('请求配置错误:', error.message);
      }
      throw error;
    }
  });
};

export const batchImportFaqs = async (
  faqs: {
    question: string;
    answer: string;
    similar_questions?: string[];
    group_name?: string;
    language_id?: number;
    ai_desc?: string;
  }[],
  nxCloudUserID: string,
  tenantId: string
): Promise<{ success: number; failed: number }> => {
  return createRateLimitedRequest('batchImportFaqs', async () => {
    let successCount = 0;
    let failedCount = 0;

    try {
      // 获取或创建分组映射
      const groupMapping: Record<string, number> = {};
      
      // 收集所有需要的分组名称
      const uniqueGroupNames = [...new Set(
        faqs
          .map(faq => faq.group_name || '未分类')
          .filter(name => !!name)
      )];
      
      // 获取现有分组列表
      for (const groupName of uniqueGroupNames) {
        try {
          // 查询是否已存在该分组
          const groupResponse = await axios.get('/api/home/api/faqGroup', {
            params: { 
              language_id: faqs[0].language_id || 1 // 使用第一个FAQ的语言ID，如果没有则默认为1
            }
          });
          
          let groupId = null;
          
          // 检查是否已存在该分组
          if (groupResponse.data && Array.isArray(groupResponse.data.data)) {
            const existingGroup = groupResponse.data.data.find((g: any) => 
              g.group_name === groupName && g.id !== null
            );
            
            if (existingGroup) {
              groupId = existingGroup.id;
              console.log(`✅ [batchImportFaqs] 找到已存在的分组 "${groupName}", ID: ${groupId}`);
            }
          }
          
          // 如果分组不存在，创建新分组
          if (!groupId) {
            const createResp = await axios.post('/api/home/api/faqGroup', {
              group_name: groupName,
              language_id: faqs[0].language_id || 1,
              type: 4
            });
            
            if (createResp.data && createResp.data.code === 0) {
              // 创建成功，重新获取分组列表查找新ID
              const updatedGroupsResp = await axios.get('/api/home/api/faqGroup', {
                params: { 
                  language_id: faqs[0].language_id || 1
                }
              });
              
              if (updatedGroupsResp.data && Array.isArray(updatedGroupsResp.data.data)) {
                const newGroup = updatedGroupsResp.data.data.find((g: any) => 
                  g.group_name === groupName && g.id !== null
                );
                
                if (newGroup) {
                  groupId = newGroup.id;
                  console.log(`✅ [batchImportFaqs] 成功创建并获取分组 "${groupName}", ID: ${groupId}`);
                }
              }
            }
          }
          
          // 保存分组ID到映射
          if (groupId) {
            groupMapping[groupName] = groupId;
          } else {
            console.error(`❌ [batchImportFaqs] 无法创建或获取分组 "${groupName}"`);
          }
        } catch (error) {
          console.error(`❌ [batchImportFaqs] 处理分组 "${groupName}" 出错:`, error);
        }
      }
      
      // 逐个处理FAQ
      for (const faq of faqs) {
        try {
          const groupName = faq.group_name || '未分类';
          const groupId = groupMapping[groupName];
          
          if (!groupId) {
            console.error(`❌ [batchImportFaqs] 找不到分组 "${groupName}" 的ID，使用默认分组`);
            // 可能需要一个fallback处理
          }
          
          // 构建FAQ创建请求
          const faqData = {
            question: faq.question,
            type: 0, // 默认类型
            group_id: groupId || 0, // 如果找不到分组ID，可能需要一个默认值
            content: faq.answer,
            ai_desc: faq.ai_desc || '',
            language_id: faq.language_id || 1, // 默认语言ID为1
            faq_medias: [],
            faq_status: true // 默认启用
          };
          
          // 调用添加FAQ API
          const response = await axios.post<ApiResponse<null>>(
            '/api/home/api/faq',
            faqData
          );
          
          // 检查创建结果
          if (response.data.code === 0) {
            successCount++;
            console.log(`✅ [batchImportFaqs] 成功导入FAQ "${faq.question}"`);
          } else {
            failedCount++;
            console.error(`❌ [batchImportFaqs] 导入FAQ "${faq.question}" 失败:`, response.data);
          }
        } catch (error: any) {
          console.error(`❌ [batchImportFaqs] 导入FAQ "${faq.question}" 失败:`, error);
          if (axios.isAxiosError(error) && error.response) {
            console.error(`❌ [batchImportFaqs] 服务器响应:`, error.response.status, error.response.data);
          }
          failedCount++;
        }
      }
      
      return {
        success: successCount,
        failed: failedCount
      };
    } catch (error: any) {
      console.error('❌ [batchImportFaqs] 批量导入FAQ失败:', error);
      throw error;
    }
  });
};

export const exportFaqs = async (
  nxCloudUserID: string,
  tenantId: string
): Promise<{
  question: string;
  answer: string;
  similar_questions: string[];
}[]> => {
  return createRateLimitedRequest('exportFaqs', async () => {
    try {
      const allFaqs: {
        question: string;
        answer: string;
        similar_questions: string[];
      }[] = [];

      let currentPage = 1;
      const pageSize = 100;
      let hasMoreFaqs = true;

      // 分页获取所有FAQ
      while (hasMoreFaqs) {
        const faqResponse = await getFaqList(
          nxCloudUserID,
          tenantId,
          currentPage,
          pageSize
        );

        if (faqResponse.list.length > 0) {
          // 转换为导出格式
          const formattedFaqs = faqResponse.list.map(faq => ({
            question: faq.question,
            answer: faq.answer,
            similar_questions: faq.similar_questions || []
          }));

          allFaqs.push(...formattedFaqs);

          // 检查是否还有更多FAQ
          if (faqResponse.list.length < pageSize) {
            hasMoreFaqs = false;
          } else {
            currentPage++;
          }
        } else {
          hasMoreFaqs = false;
        }
      }

      return allFaqs;
    } catch (error: any) {
      console.error('导出FAQ数据失败', error);
      throw error;
    }
  });
};

// FAQ分组迁移
export const migrateFaqs = async (
  faqUserParams: FaqUserParams,
  faqsToMigrate: FaqItemDetailed[],
  targetLanguageId: number,
  options?: { prefixProcessing: boolean; prefixAdd: string; prefixRemove: string }
): Promise<string[]> => {
  return createRateLimitedRequest('migrateFaqs', async () => {
    try {
      console.log(`[migrateFaqs] 开始迁移FAQ到目标语言ID: ${targetLanguageId}`, 'options:', options);
      console.log(`[migrateFaqs] 源租户token前20位: ${faqUserParams.sourceAuthorization?.substring(0, 20) || '未设置'}`);
      console.log(`[migrateFaqs] 目标租户token前20位: ${faqUserParams.targetAuthorization?.substring(0, 20) || '未设置'}`);
      
      // 成功迁移的FAQ问题列表
      const successFaqs: string[] = [];
      
      // 检查是否有FAQ需要迁移
      if (!faqsToMigrate || faqsToMigrate.length === 0) {
        console.log(`[migrateFaqs] 没有FAQ需要迁移`);
        return successFaqs;
      }
      
      console.log(`[migrateFaqs] 需要迁移 ${faqsToMigrate.length} 条FAQ`);
      
      // 检查授权是否存在
      if (!faqUserParams.targetAuthorization) {
        console.error(`[migrateFaqs] 目标租户授权缺失，无法迁移FAQ`);
        throw new Error('目标租户授权Token缺失，请重新设置身份认证');
      }
      
      // 一个一个处理FAQ迁移
      for (const faq of faqsToMigrate) {
        try {
          console.log(`[migrateFaqs] 处理FAQ "${faq.question}" (ID: ${faq.id})`);
          
          // 创建目标租户请求头 - 使用targetAuthorization，因为目标是将FAQ添加到目标租户
          // 不管是从源租户迁移到目标租户还是从目标租户迁移到源租户，这里的targetAuthorization都是真正的目标租户token
          const headers = {
            'authorization': faqUserParams.targetAuthorization,
            'system_id': '5'
          };
          
          console.log(`[migrateFaqs] 使用目标租户Token前20位: ${headers.authorization.substring(0, 20)}`);
          
          // 处理media_infos到faq_medias的转换
          const faq_medias = faq.media_infos || [];
          
          // 应用前缀处理
          let question = faq.question;
          let content = faq.content;
          
          if (options?.prefixProcessing) {
            // 去掉前缀
            if (options.prefixRemove) {
              question = question.replace(new RegExp(options.prefixRemove, 'g'), '');
              // 对内容也进行前缀处理，但仅处理文本部分，不处理HTML标签
              // 这里是简单实现，实际场景可能需要更复杂的HTML解析
              content = content.replace(new RegExp(options.prefixRemove, 'g'), '');
            }
            // 添加前缀
            question = `${options.prefixAdd}${question}`;
          }
          
          // 记录请求参数
          const requestParams = {
            question: question,
            type: faq.type,
            group_id: faq.group_id,
            content: content,
            ai_desc: faq.ai_desc || '',
            language_id: targetLanguageId,
            faq_medias,
            faq_status: faq.faq_status
          };
          
          console.log(`[migrateFaqs] 请求参数:`, JSON.stringify(requestParams));
          console.log(`[migrateFaqs] 请求headers:`, { 
            authorization: `${headers.authorization.substring(0, 20)}...`, 
            system_id: headers.system_id 
          });
          
          // 调用addFaq API添加FAQ到目标租户
          await addFaq(requestParams, headers);
          
          console.log(`[migrateFaqs] 成功迁移FAQ "${question}"`);
          successFaqs.push(question);
        } catch (error: any) {
          console.error(`[migrateFaqs] 迁移FAQ "${faq.question || '未知问题'}" 失败:`, error);
          if (error.response) {
            console.error(`[migrateFaqs] 服务器响应:`, error.response.status, error.response.data);
          }
          // 继续处理下一个FAQ
        }
      }
      
      return successFaqs;
    } catch (error: any) {
      console.error('[migrateFaqs] 迁移过程发生错误:', error);
      throw error;
    }
  });
};

// 删除标签
export const deleteTag = async (
  tagId: number,
  nxCloudUserID: string,
  tenantId: string
): Promise<boolean> => {
  return createRateLimitedRequest('deleteTag', async () => {
    try {
      const response = await tagApi.delete<ApiResponse<null>>(
        '/admin/nx_flow_manager/mgrPlatform/tag/delete',
        {
          params: {
            id: tagId,
            nxCloudUserID,
            tenantId
          }
        }
      );
      
      // 标签删除成功后清除缓存，确保下次获取到最新数据
      if (response.data.code === 0) {
        clearTagGroupCache(nxCloudUserID, tenantId);
      }
      
      return response.data.code === 0;
    } catch (error: any) {
      console.error('删除标签失败', error);
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('未收到服务器响应，请检查网络连接');
      } else {
        console.error('请求配置错误:', error.message);
      }
      throw error;
    }
  });
};

// 根据名称查找标签分组
export const findTagGroupByName = async (
  groupName: string,
  nxCloudUserID: string,
  tenantId: string
): Promise<TagGroup | null> => {
  return createRateLimitedRequest('findTagGroupByName', async () => {
    try {
      // 直接使用getTagGroupList方法，该方法已经加入了缓存机制
      const groups = await getTagGroupList(nxCloudUserID, tenantId);
      const foundGroup = groups.find(group => group.group_name === groupName);
      return foundGroup || null;
    } catch (error: any) {
      console.error('查找标签分组失败', error);
      throw error;
    }
  });
};

// 获取分组内的FAQ
export const getFaqsByGroupId = async (
  groupId: string | number,
  languageId: number,
  pageSize = 10000,
  pageNum = 1,
  headers?: Record<string, string>
): Promise<FaqListData> => {
  // 构造请求参数（不传group_id时后端返回"未分类"）
  const params: any = { language_id: languageId, page_size: pageSize, page_num: pageNum };
  if (groupId != null) {
    params.group_id = groupId;
  }
  try {
    // 使用参数名和参数值一一匹配，确保正确性
    console.log(`[getFaqsByGroupId] 调用参数: groupId=${groupId}, languageId=${languageId}, pageSize=${pageSize}, pageNum=${pageNum}`);
    console.log(`[getFaqsByGroupId] API参数: ${JSON.stringify(params)}`);
    
    const resp = await faqApi.get<FaqListData>(
      '/home/api/faq',
      { params, headers }
    );
    
    // 打印响应结构，帮助调试
    console.log(`[getFaqsByGroupId] 响应结构:`, JSON.stringify(resp.data).substring(0, 100) + '...');
    
    // 检查响应结构，API直接返回了响应数据而不是包装在data.data中
    if (!resp.data) {
      console.log(`[getFaqsByGroupId] 响应为空，创建默认空结果`);
      return {
        list: [],
        total: 0,
        page_number: pageNum,
        page_size: pageSize,
        empty: true,
        notEmpty: false,
        totalPages: 0,
        ext: null
      };
    }
    
    // 检查是否有list属性
    if (!resp.data.list) {
      console.log(`[getFaqsByGroupId] 响应中无list属性，创建默认空结果`);
      return {
        ...resp.data,
        list: [],
        empty: true,
        notEmpty: false,
        total: 0,
        totalPages: 0
      };
    }
    
    // 确保list是数组
    if (!Array.isArray(resp.data.list)) {
      console.log(`[getFaqsByGroupId] 响应中list属性不是数组，创建默认空结果`);
      return {
        ...resp.data,
        list: [],
        empty: true,
        notEmpty: false,
        total: 0,
        totalPages: 0
      };
    }
    
    // 如果一切正常，直接返回响应数据
    return resp.data;
  } catch (error) {
    console.error(`❌ [API] 获取分组 ${groupId} 的FAQ失败:`, error);
    // 返回空结果而不是抛出异常，避免中断调用方的流程
    return {
      list: [],
      total: 0,
      page_number: pageNum,
      page_size: pageSize,
      empty: true,
      notEmpty: false,
      totalPages: 0,
      ext: null
    };
  }
};

// 重命名标签分组
export const renameTagGroup = (
  nxCloudUserID: string, 
  groupId: string, 
  groupName: string,
  headers?: Record<string, string>
): Promise<ApiResponse<void>> => {
  return createRateLimitedRequest('renameTagGroup', async () => {
    console.log(`[renameTagGroup] 重命名标签分组，参数: nxCloudUserID=${nxCloudUserID}, groupId=${groupId}, groupName=${groupName}`);
    const result = await tagApi.put<ApiResponse<void>>(
      '/admin/nx_flow_manager/mgrPlatform/tagGroup/rename',
      { groupId, groupName },
      { 
        params: { nxCloudUserID },
        headers
      }
    );
    
    console.log(`[renameTagGroup] 重命名标签分组成功`);
    
    // 标签分组名称变更后，需要清除对应的缓存
    if (result.data.code === 200) {
      clearTagGroupCache(nxCloudUserID, groupId.split('_')[0]);
    }
    
    return result.data;
  });
};

// 获取Voice列表
export const getVoiceList = async (
  pageNumber: number = 1,
  pageSize: number = 16
): Promise<VoiceResponse> => {
  return createRateLimitedRequest('getVoiceList', async () => {
    try {
      console.log(`[getVoiceList] 获取声音列表`);
      
      const response = await voiceApi.get<ApiResponse<VoiceResponse>>(
        '/admin/nx_flow/voiceConfig',
        {
          params: {
            page_number: pageNumber,
            page_size: pageSize
          },
        }
      );
      
      if (response.data.code !== 0) {
        throw new Error(`获取声音列表失败: ${response.data.message}`);
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('获取声音列表失败', error);
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('未收到服务器响应，请检查网络连接');
      } else {
        console.error('请求配置错误:', error.message);
      }
      throw error;
    }
  });
};

// 播放声音样本
export const playVoiceSample = async (url: string): Promise<void> => {
  try {
    const audio = new Audio(url);
    await audio.play();
  } catch (error) {
    console.error('播放声音样本失败', error);
    throw error;
  }
};

// ==================== Conversation相关API ====================
export const getConversationList = async (
  pageNumber: number = 1,
  pageSize: number = 10,
  filters: {
    phone?: string;
    tags?: number[];
    start_time?: string;
    end_time?: string;
    callId?: string;
  } = {}
): Promise<ConversationListResponse> => {
  return createRateLimitedRequest('getConversationList', async () => {
    try {
      const response = await conversationApi.post<ConversationListResponse>(
        '/admin/nx_flow_manager/conversation',
        {
          page_number: pageNumber,
          page_size: pageSize,
          ...filters,
        }
      );
      return response.data;
    } catch (error) {
      console.error('获取会话列表失败', error);
      throw error;
    }
  });
};

export const getConversationDetail = async (
  conversationId: number | string
): Promise<ConversationDetailResponse> => {
  return createRateLimitedRequest('getConversationDetail', async () => {
    try {
      const response = await conversationApi.get<ConversationDetailResponse>(
        '/admin/nx_flow_manager/conversation/messages',
        {
          params: {
            conversationId,
            pageSize: 9999,
            pageNumber: 1,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('获取会话详情失败', error);
      throw error;
    }
  });
};

// 获取租户列表
export const getTenantList = async (token: string): Promise<any[]> => {
  return createRateLimitedRequest('getTenantList', async () => {
    try {
      console.log(`[getTenantList] 获取租户列表`);
      
      const response = await axios({
        method: 'get',
        url: '/api/admin/saas_plat/tenant/tenantsInSwitch',
        headers: {
          'authorization': token,
          'system_id': '5',
          'time_zone': 'UTC+08:00'
        }
      });
      
      if (response.data.code !== 0) {
        throw new Error(`获取租户列表失败: ${response.data.message}`);
      }
      
      return response.data.data || [];
    } catch (error: any) {
      console.error('获取租户列表失败', error);
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('未收到服务器响应，请检查网络连接');
      } else {
        console.error('请求配置错误:', error.message);
      }
      throw error;
    }
  });
};

// 切换租户
export const switchTenant = async (token: string, tenantId: number): Promise<boolean> => {
  return createRateLimitedRequest('switchTenant', async () => {
    try {
      console.log(`[switchTenant] 切换租户，tenantId=${tenantId}`);
      
      const response = await axios({
        method: 'put',
        url: '/api/admin/saas_plat/user/switch_tenant',
        headers: {
          'authorization': token,
          'system_id': '5',
          'time_zone': 'UTC+08:00',
          'Content-Type': 'application/json;charset=UTF-8'
        },
        data: { tenant_id: tenantId }
      });
      
      if (response.data.code !== 0) {
        throw new Error(`切换租户失败: ${response.data.message}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('切换租户失败', error);
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('未收到服务器响应，请检查网络连接');
      } else {
        console.error('请求配置错误:', error.message);
      }
      throw error;
    }
  });
};

// NXLink 客户端登录相关API
export const nxlinkClientLogin = async (loginData: {
  password: string;
  email?: string;
  phone?: string;
  loginMethod: 0 | 1; // 0: 邮箱登录, 1: 手机号登录
  key: string;
  deviceUniqueIdentification: string;
}): Promise<any> => {
  try {
    const requestData = {
      ...loginData,
      graphVerificationCode: "",
      deviceType: "Browser",
      deviceName: "Chrome",
      deviceVersion: navigator.userAgent.split('Chrome/')[1]?.split(' ')[0] || "Unknown"
    };

    console.log('NXLink 客户端登录请求:', requestData);
    
    const response = await nxlinkClientApi.put('/admin/saas_plat/user/login', requestData, {
      headers: {
        'system_id': '5',
        'time_zone': 'UTC+08:00',
        'lang': 'zh_CN',
        'currentdomain': 'nxlink.nxcloud.com',
        'Content-Type': 'application/json;charset=UTF-8'
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('NXLink 客户端登录失败:', error);
    throw error;
  }
};

// 生成设备唯一标识
export const generateDeviceId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
};

// 生成登录key
export const generateLoginKey = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// NXLink 客户端登出
export const nxlinkClientLogout = async (token: string): Promise<any> => {
  try {
    console.log('🚪 [nxlinkClientLogout] 开始登出...');
    const response = await nxlinkClientApi.put('/admin/saas_plat/user/logout', '', {
      headers: {
        'authorization': token,
        'system_id': '5',
        'time_zone': 'UTC+08:00',
        'lang': 'zh_CN',
        'currentdomain': 'nxlink.nxcloud.com',
        'Content-Length': '0'
      }
    });
    console.log('✅ [nxlinkClientLogout] 登出成功:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ [nxlinkClientLogout] 登出失败:', error);
    throw error;
  }
};

// NXLink 客户端检查登录状态并获取用户信息
export const nxlinkClientIsLogin = async (token?: string): Promise<any> => {
  try {
    console.log('🔍 [nxlinkClientIsLogin] 检查登录状态并获取用户信息...');
    // 如果未显式传入token，按照优先级从本地获取
    let effectiveToken = token || '';
    if (!effectiveToken) {
      // 1) 优先使用会话内的FAQ源租户token（最新的）
      const sessionId = localStorage.getItem('sessionId') || '';
      if (sessionId) {
        try {
          const storageKey = `faqUserParams_${sessionId}`;
          const faqParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
          effectiveToken = faqParams?.sourceAuthorization || '';
        } catch (_) {}
      }
    }
    if (!effectiveToken) {
      // 2) 其次使用持久化的源租户token
      effectiveToken = localStorage.getItem('nxlink_source_token') || '';
    }
    if (!effectiveToken) {
      // 3) 最后尝试全局登录token（通用设置）
      effectiveToken = localStorage.getItem('nxlink_client_token') || '';
    }
    if (!effectiveToken) {
      throw new Error('没有可用的授权Token');
    }
    
    // 使用去重器，避免重复请求
    const requestKey = `is_login_${effectiveToken.substring(0, 20)}`;
    return await requestDeduper.dedupedRequest(requestKey, async () => {
      const response = await nxlinkClientApi.put('/admin/saas_plat/user/is_login', '', {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en,zh;q=0.9,zh-CN;q=0.8,fil;q=0.7,de;q=0.6',
        'authorization': effectiveToken,
        'cache-control': 'no-cache',
        'content-type': '',  // 显式设置为空，防止axios自动设置
        'createts': Date.now().toString(),
        'currentdomain': 'app.nxlink.ai',
        'lang': 'zh_CN',
        'pragma': 'no-cache',
        'priority': 'u=1, i',
        'system_id': '5',
        'time_zone': 'UTC+08:00'
      },
      transformRequest: [(data, headers) => {
        // 确保不会设置默认的 Content-Type
        if (headers) {
          headers['Content-Type'] = '';
        }
        return data;
      }]
    });
      console.log('✅ [nxlinkClientIsLogin] 获取用户信息成功:', response.data);
      return response.data;
    });
  } catch (error: any) {
    console.error('❌ [nxlinkClientIsLogin] 获取用户信息失败:', error);
    
    // 检查是否是token过期错误，如果是则清理过期token
    if (error.response && isTokenExpired(error.response)) {
      console.log('🔍 [nxlinkClientIsLogin] 检测到token过期，开始清理...');
      cleanupAllExpiredTokens(effectiveToken);
    } else if (error.message && EXPIRED_TOKEN_MESSAGES.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    )) {
      console.log('🔍 [nxlinkClientIsLogin] 检测到token过期消息，开始清理...');
      cleanupAllExpiredTokens(effectiveToken);
    }
    
    throw error;
  }
}; 