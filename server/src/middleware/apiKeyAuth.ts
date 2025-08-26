import { Request, Response, NextFunction } from 'express';
import { PROJECT_CONFIG } from '../../../config/project.config';

/**
 * API Key认证中间件
 * 验证外部平台调用时携带的API Key
 */

// 从项目配置中获取有效的API Keys
const VALID_API_KEYS = PROJECT_CONFIG.externalApiKeys;

export interface AuthenticatedRequest extends Request {
  apiKey?: string;
}

export function apiKeyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // 从请求头中获取API Key
  const apiKey = req.headers['x-api-key'] as string || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({
      code: 401,
      message: 'API Key is required. Please provide x-api-key header or Authorization Bearer token.',
      error: 'MISSING_API_KEY'
    });
  }

  // 验证API Key是否有效
  if (!VALID_API_KEYS.includes(apiKey)) {
    return res.status(403).json({
      code: 403,
      message: 'Invalid API Key',
      error: 'INVALID_API_KEY'
    });
  }

  // 将API Key添加到请求对象中，供后续使用
  req.apiKey = apiKey;
  next();
}

/**
 * 获取API Key使用统计（可选功能）
 */
export function getApiKeyStats() {
  // 这里可以实现API Key使用统计逻辑
  return {
    validKeys: VALID_API_KEYS.length,
    // 可以添加更多统计信息
  };
}
