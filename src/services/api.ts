import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  TagGroup, 
  Tag, 
  PaginatedResponse, 
  FaqResponse, 
  FaqAddRequest,
  FaqUpdateRequest,
  FaqListData,
  VoiceResponse,
  TagGroupAddRequest,
  TagAddRequest,
  TagUserParams,
  FaqUserParams
} from '../types';
import requestLimiter from '../utils/requestLimiter';
import { API_LIMIT_CONFIG, API_CONFIG } from '../config/apiConfig';

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
  baseURL: process.env.NODE_ENV === 'development' ? '/api' : 'https://nxlink.nxcloud.com',
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
    
    // 开发模式下输出请求信息
    if (process.env.NODE_ENV === 'development' && API_CONFIG.verboseLogging) {
      console.log('[Tag API 请求]', config.method?.toUpperCase(), config.url);
      console.log('[Tag API 请求参数]', config.params || {});
      console.log('[Tag API 请求头]', config.headers || {});
    }
    
    return config;
  },
  (error: any) => {
    logRequestError(error, 'Tag API 请求拦截器');
    return Promise.reject(error);
  }
);

// FAQ API请求拦截器
faqApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 使用会话ID获取对应的FAQ用户参数
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      const storageKey = `faqUserParams_${sessionId}`;
      const faqUserParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      if (faqUserParams.sourceAuthorization) {
        config.headers.authorization = faqUserParams.sourceAuthorization;
        config.headers.system_id = '5';
      }
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

faqApi.interceptors.response.use(
  (response) => {
    // 开发模式下输出响应信息
    if (process.env.NODE_ENV === 'development' && API_CONFIG.verboseLogging) {
      console.log('[FAQ API 响应状态]', response.status);
      console.log('[FAQ API 响应数据]', response.data);
    }
    const resData = response.data as ApiResponse<any>;
    // 统一处理业务错误: code != 0
    if (resData.code !== 0) {
      // 优先使用后端返回的 message
      const errMsg = resData.message || '请求失败';
      // 使用 antd message 提示
      (typeof window !== 'undefined' && window.document) && require('antd').message.error(errMsg, 3);
      return Promise.reject(new Error(errMsg));
    }
    return response;
  },
  (error) => {
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
  try {
    const response = await faqApi.get<ApiResponse<{ id: number; language_id: number; language_name: string }[]>>(
      '/home/api/faqTenantLanguage'
    );
    return response.data.data;
  } catch (error) {
    console.error('获取租户FAQ语言列表失败', error);
    throw error;
  }
};

// FAQ 相关接口 - 添加语言
export const addFaqLanguage = async (languageId: number): Promise<void> => {
  try {
    await faqApi.post<ApiResponse<null>>(
      '/home/api/faqTenantLanguage',
      { language_id: languageId }
    );
  } catch (error) {
    console.error('添加FAQ语言失败', error);
    throw error;
  }
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
    // 如果提供了自定义headers，则使用它们
    if (headers) {
      await faqApi.post<ApiResponse<null>>(
        '/home/api/faq',
        params,
        { headers }
      );
    } else {
      // 否则使用默认拦截器中的headers
      await faqApi.post<ApiResponse<null>>(
        '/home/api/faq',
        params
      );
    }
  } catch (error) {
    console.error('添加FAQ失败', error);
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

// 迁移FAQ
export const migrateFaqs = async (
  faqUserParams: FaqUserParams,
  selectedFaqs: any[],
  targetLanguageId: number,
  headers?: Record<string, string>
): Promise<string[]> => {
  const successFaqs: string[] = [];
  
  try {
    // 使用自定义headers或默认headers
    const requestHeaders = headers || {
      authorization: faqUserParams.targetAuthorization,
      system_id: '5'
    };
    
    // 如果提供了自定义headers，记录日志
    if (headers) {
      console.log(`ℹ️ [API] 使用自定义headers进行FAQ迁移: ${JSON.stringify(headers)}`);
    } else {
      console.log(`ℹ️ [API] 使用默认目标系统授权Token: ${faqUserParams.targetAuthorization?.substring(0, 20)}...`);
    }
    
    // 循环迁移每个FAQ
    for (const faq of selectedFaqs) {
      try {
        console.log(`🔄 [API] 正在迁移FAQ "${faq.question}"，目标语言ID: ${targetLanguageId}，目标分组ID: ${faq.group_id}`);
        
        const resp = await axios.post<ApiResponse<null>>(
          '/api/home/api/faq',
          {
            question: faq.question,
            type: faq.type,
            group_id: faq.group_id,
            content: faq.content,
            ai_desc: faq.ai_desc,
            language_id: targetLanguageId,
            faq_medias: faq.media_infos || [],
            faq_status: faq.faq_status
          },
          {
            headers: requestHeaders
          }
        );
        const data = resp.data;
        // 统一处理业务错误
        if (data.code !== 0) {
          const errMsg = data.message || '迁移FAQ失败';
          (typeof window !== 'undefined') && require('antd').message.error(errMsg, 3);
          console.error(`❌ [API] 迁移FAQ "${faq.question}" 失败:`, data);
          throw new Error(errMsg);
        }
        // 标记迁移成功
        successFaqs.push(faq.question);
        console.log(`✅ [API] FAQ "${faq.question}" 迁移成功`);
      } catch (error: any) {
        console.error(`❌ [API] 迁移FAQ "${faq.question}" 失败:`, error);
        if (axios.isAxiosError(error) && error.response) {
          console.error(`❌ [API] 服务器响应:`, error.response.status, error.response.data);
        }
      }
    }
    
    return successFaqs;
  } catch (error) {
    console.error('❌ [API] 迁移FAQ失败:', error);
    throw error;
  }
};

// 导出FAQ (旧版接口)
export const exportFaqsOld = async (
  faqs: any[]
): Promise<{
  question: string;
  content: string;
  ai_desc: string;
  group_type: string;
  language: string;
}[]> => {
  return faqs.map(faq => ({
    question: faq.question,
    content: faq.content,
    ai_desc: faq.ai_desc || '',
    group_type: faq.group_type,
    language: faq.language
  }));
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

// 迁移标签分组
export const migrateTagGroups = (
  nxCloudUserID: string,
  groupIds: string[],
  targetNxCloudUserID: string,
  targetLanguageId: string,
  headers?: Record<string, string>
): Promise<ApiResponse<void>> => {
  return createRateLimitedRequest('migrateTagGroups', async () => {
    console.log(`[migrateTagGroups] 迁移标签分组，参数: nxCloudUserID=${nxCloudUserID}, groupIds=${groupIds}, targetNxCloudUserID=${targetNxCloudUserID}, targetLanguageId=${targetLanguageId}`);
    const result = await tagApi.post<ApiResponse<void>>(
      '/admin/nx_flow_manager/mgrPlatform/tagGroup/migrate',
      { groupIds, targetNxCloudUserID, targetLanguageId },
      { 
        params: { nxCloudUserID },
        headers
      }
    );
    console.log(`[migrateTagGroups] 迁移标签分组成功，结果:`, result.data);
    return result.data;
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
    const resp = await faqApi.get<ApiResponse<FaqListData>>(
      '/home/api/faq',
      { params, headers }
    );
    // 拦截器已校验 code===0
    return resp.data.data;
  } catch (error) {
    console.error(`❌ [API] 获取分组 ${groupId} 的FAQ失败:`, error);
    throw error;
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
  token: string,
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
          headers: {
            'authorization': token
          }
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