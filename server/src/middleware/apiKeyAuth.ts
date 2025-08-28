import { Request, Response, NextFunction } from 'express';
import { PROJECT_CONFIG, ExternalApiKeyConfig } from '../../../config/project.config';
import { getAllApiKeys } from '../services/configManager';

/**
 * API Key认证中间件
 * 验证外部平台调用时携带的API Key，并提供对应的OpenAPI配置
 */

export interface AuthenticatedRequest extends Request {
  apiKey?: string;
  apiKeyConfig?: ExternalApiKeyConfig;
}

export function apiKeyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // 从请求头中获取API Key
  const apiKey = req.headers['x-api-key'] as string || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    res.status(401).json({
      code: 401,
      message: 'API Key is required. Please provide x-api-key header or Authorization Bearer token.',
      error: 'MISSING_API_KEY'
    });
    return;
  }

  // 查找匹配的API Key配置（包括环境变量和配置文件）
  const allApiKeys = getAllApiKeys();
  const apiKeyConfig = allApiKeys.find(config => config.apiKey === apiKey);

  if (!apiKeyConfig) {
    res.status(403).json({
      code: 403,
      message: `Invalid API Key: ${apiKey}`,
      error: 'INVALID_API_KEY',
      availableKeys: allApiKeys.map(config => ({
        alias: config.alias,
        description: config.description
      }))
    });
    return;
  }

  // 将API Key和对应的配置信息附加到请求对象
  req.apiKey = apiKey;
  req.apiKeyConfig = apiKeyConfig;
  
  console.log(`[${new Date().toLocaleTimeString()}] 🔑 API Key认证成功: ${apiKeyConfig.alias} (${apiKey})`);
  
  next();
  return;
}

/**
 * 获取API Key使用统计（可选功能）
 */
export function getApiKeyStats() {
  // 这里可以实现API Key使用统计逻辑
  const allApiKeys = getAllApiKeys();
  return {
    validKeys: allApiKeys.length,
    keys: allApiKeys.map(config => ({
      alias: config.alias,
      description: config.description,
      hasOpenApiConfig: !!(config.openapi.accessKey && config.openapi.accessSecret)
    }))
  };
}
