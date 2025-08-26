import { RequestLimitConfig } from '../utils/requestLimiter';

/**
 * API接口限流配置
 * 
 * 默认限制：5秒内最多3次请求
 * 可根据实际需求调整各接口的限流配置
 */
export const API_LIMIT_CONFIG: Record<string, RequestLimitConfig> = {
  // 标签分组相关接口
  'getTagGroupList': {
    windowMs: 5000,
    maxRequests: 3
  },
  'createTagGroup': {
    windowMs: 5000,
    maxRequests: 3
  },
  'getTagList': {
    windowMs: 5000,
    maxRequests: 3
  },
  'createTag': {
    windowMs: 5000,
    maxRequests: 3
  },
  'deleteTag': {
    windowMs: 5000,
    maxRequests: 3
  },
  'migrateTagGroups': {
    windowMs: 5000,
    maxRequests: 3
  },
  'findTagGroupByName': {
    windowMs: 5000,
    maxRequests: 3
  },
  'batchImportTags': {
    windowMs: 10000, // 批量导入可能需要更多时间
    maxRequests: 2
  },
  'exportTagsFromGroups': {
    windowMs: 10000, // 导出可能需要更多时间
    maxRequests: 2
  },

  // FAQ相关接口
  'getFaqLanguageList': {
    windowMs: 5000,
    maxRequests: 3
  },
  'getTenantFaqLanguageList': {
    windowMs: 5000,
    maxRequests: 3
  },
  'addFaqLanguage': {
    windowMs: 5000,
    maxRequests: 3
  },
  'getFaqGroupList': {
    windowMs: 5000,
    maxRequests: 3
  },
  'addFaq': {
    windowMs: 5000,
    maxRequests: 3
  },
  'deleteFaq': {
    windowMs: 5000,
    maxRequests: 3
  },
  'migrateFaqs': {
    windowMs: 10000, // 迁移可能需要更多时间
    maxRequests: 2
  },
  'exportFaqs': {
    windowMs: 10000, // 导出可能需要更多时间
    maxRequests: 2
  }
};

/**
 * 全局API配置
 */
export const API_CONFIG = {
  // 基础URL
  baseURL: '/api',
  // 请求超时时间(毫秒)
  timeout: 30000,
  // 是否开启请求频率限制
  enableRateLimiting: true,
  // 是否在开发模式下输出详细日志
  verboseLogging: true
};

/**
 * 数据中心配置
 */
export interface DataCenter {
  id: string;
  name: string;
  baseURL: string;
  description?: string;
}

export const DATA_CENTERS: DataCenter[] = [
  {
    id: 'hk',
    name: '香港',
    baseURL: '/api/hk',
    description: '香港数据中心'
  },
  {
    id: 'chl',
    name: 'CHL',
    baseURL: '/api/chl',
    description: 'CHL环境数据中心'
  }
];

/**
 * 获取当前选择的数据中心
 */
export const getCurrentDataCenter = (): DataCenter => {
  const savedDataCenter = localStorage.getItem('selectedDataCenter');
  if (savedDataCenter) {
    try {
      const parsed = JSON.parse(savedDataCenter);
      const found = DATA_CENTERS.find(dc => dc.id === parsed.id);
      if (found) return found;
    } catch (error) {
      console.warn('解析保存的数据中心失败:', error);
    }
  }
  // 默认返回香港数据中心
  return DATA_CENTERS[0];
};

/**
 * 设置当前数据中心
 */
export const setCurrentDataCenter = (dataCenter: DataCenter): void => {
  localStorage.setItem('selectedDataCenter', JSON.stringify(dataCenter));
};

/**
 * 协作模式API配置
 */
export const COLLABORATION_API_BASE_URL = 'http://localhost:3020';

/**
 * OpenAPI平台配置
 */
export const OPENAPI_CONFIG = {
  // 预设的OpenAPI鉴权信息
  defaultAuth: {
    accessKey: import.meta.env.VITE_OPENAPI_ACCESS_KEY || '',
    accessSecret: import.meta.env.VITE_OPENAPI_ACCESS_SECRET || '',
    bizType: import.meta.env.VITE_OPENAPI_BIZ_TYPE || '8'
  },
  // 外部平台调用我们API时的认证配置
  externalApiKeys: [
    import.meta.env.VITE_EXTERNAL_API_KEY_1 || 'demo-api-key-1',
    import.meta.env.VITE_EXTERNAL_API_KEY_2 || 'demo-api-key-2'
  ]
}; 