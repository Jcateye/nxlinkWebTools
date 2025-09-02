import express from 'express';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { apiKeyAuth, AuthenticatedRequest } from '../middleware/apiKeyAuth';

const router = express.Router();

import { PROJECT_CONFIG } from '../config/project.config';
import { getAllApiKeys } from '../services/configManager';

/**
 * 获取API Key对应的OpenAPI配置
 */
function getOpenApiConfigForApiKey(req: AuthenticatedRequest) {
  // 如果有API Key配置，使用对应的OpenAPI配置
  if (req.apiKeyConfig?.openapi) {
    return {
      baseURL: req.apiKeyConfig.openapi.baseUrl,
      auth: {
        accessKey: req.apiKeyConfig.openapi.accessKey,
        accessSecret: req.apiKeyConfig.openapi.accessSecret,
        bizType: req.apiKeyConfig.openapi.bizType
      }
    };
  }
  
  // 否则使用默认配置
  return {
    baseURL: PROJECT_CONFIG.openapi.baseUrl,
    auth: {
      accessKey: PROJECT_CONFIG.openapi.accessKey,
      accessSecret: PROJECT_CONFIG.openapi.accessSecret,
      bizType: PROJECT_CONFIG.openapi.bizType
    }
  };
}

// 调试日志（简单脱敏）
function logDebug(
  title: string,
  payload: {
    apiKey?: string;
    alias?: string;
    baseURL?: string;
    action?: string;
    headers?: Record<string, any>;
    body?: any;
    response?: any;
    error?: any;
  }
) {
  try {
    const safeHeaders = payload.headers
      ? {
          ...payload.headers,
          accessKey: payload.headers.accessKey ? `${String(payload.headers.accessKey).slice(0, 10)}***` : undefined,
        }
      : undefined;
    const logObj = {
      apiKey: payload.apiKey,
      alias: payload.alias,
      baseURL: payload.baseURL,
      action: payload.action,
      headers: safeHeaders,
      body: payload.body,
      responseCode: payload.response?.code ?? payload.response?.status,
      responseMsg: payload.response?.message,
      errorMsg: payload.error?.message,
    };
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [OpenAPI Debug] ${title}:`, JSON.stringify(logObj, null, 2));
  } catch (e) {
    console.log('[OpenAPI Debug] log error', (e as any)?.message);
  }
}

/**
 * 生成OpenAPI签名
 */
function generateOpenApiSign(
  headers: Record<string, string>, 
  bodyJsonString: string, 
  accessSecret: string, 
  options: { algorithm?: "md5" | "sha256" } = {}
): string {
  const { algorithm = "md5" } = options;

  // Step 1: 拼接header参数 (accessKey, action, bizType, ts)
  const headersStr = `accessKey=${headers.accessKey}&action=${headers.action}&bizType=${headers.bizType}&ts=${headers.ts}`;

  // Step 2: 拼接body参数
  let raw = headersStr;
  if (bodyJsonString && bodyJsonString !== '{}') {
    raw += `&body=${bodyJsonString}`;
  }

  // Step 3: 拼接accessSecret
  raw += `&accessSecret=${accessSecret}`;

  // Debug: 打印签名原文（仅显示前50个字符和后20个字符）
  const rawPreview = raw.length > 70 
    ? `${raw.substring(0, 50)}...${raw.substring(raw.length - 20)}`
    : raw;
  logDebug('Sign calculation details', { 
    headers: {
      accessKey: headers.accessKey.substring(0, 10) + '***',
      ts: headers.ts,
      algorithm
    },
    body: `Raw string length: ${raw.length}, Preview: ${rawPreview}`
  });

  // Step 4: 哈希并转换为小写十六进制
  let sign: string;
  if (algorithm === "sha256") {
    sign = CryptoJS.SHA256(raw).toString(CryptoJS.enc.Hex);
  } else {
    sign = CryptoJS.MD5(raw).toString(CryptoJS.enc.Hex);
  }
  return sign;
}

/**
 * 生成唯一的contactId
 */
function generateContactIdFromPhone(phone: string): string {
  // 基础28位：手机号的MD5前28位
  const base28 = CryptoJS.MD5(String(phone || '')).toString().toLowerCase().substring(0, 28);
  // 追加8位：基于当前时间戳和随机数的短哈希，避免同号码重复
  const saltSource = `${Date.now()}-${Math.random()}`;
  const salt8 = CryptoJS.MD5(saltSource).toString().toLowerCase().substring(0, 8);
  // 组合为36位（前28位为MD5，末尾追加8位salt）
  const mixed = base28 + salt8;
  // 按 8-4-4-4-12 插入连字符
  return `${mixed.substring(0, 8)}-${mixed.substring(8, 12)}-${mixed.substring(12, 16)}-${mixed.substring(16, 20)}-${mixed.substring(20, 32)}`;
}

/**
 * 构建OpenAPI请求头
 */
function buildOpenApiHeaders(config: {
  accessKey: string;
  accessSecret: string;
  bizType: string;
  action: string;
  ts: string;
}, body: any): Record<string, string> {
  const bodyStr = JSON.stringify(body);
  const sign = generateOpenApiSign({
    accessKey: config.accessKey,
    action: config.action,
    bizType: config.bizType,
    ts: config.ts
  }, bodyStr, config.accessSecret);

  return {
    'Content-Type': 'application/json',
    'accessKey': config.accessKey,
    'bizType': config.bizType,
    'action': config.action,
    'ts': config.ts,
    'sign': sign,
    'algorithm': 'md5'
  };
}

/**
 * 追加号码接口
 * POST /api/openapi/append-numbers
 */
router.post('/append-numbers', apiKeyAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { taskId, phoneNumbers, autoFlowId, countryCode, params } = req.body;

    // 参数验证
    if (!taskId) {
      res.status(400).json({
        code: 400,
        message: 'taskId is required',
        error: 'MISSING_TASK_ID'
      });
      return;
    }

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      res.status(400).json({
        code: 400,
        message: 'phoneNumbers must be a non-empty array',
        error: 'INVALID_PHONE_NUMBERS'
      });
      return;
    }

    // 获取当前API Key对应的OpenAPI配置
    const openApiConfig = getOpenApiConfigForApiKey(req);
    
    // 检查OpenAPI配置
    if (!openApiConfig.auth.accessKey || !openApiConfig.auth.accessSecret) {
      res.status(500).json({
        code: 500,
        message: `OpenAPI configuration is incomplete for API Key: ${req.apiKeyConfig?.alias || req.apiKey}`,
        error: 'OPENAPI_CONFIG_INCOMPLETE',
        apiKeyAlias: req.apiKeyConfig?.alias
      });
      return;
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // 为每个号码单独调用OpenAPI
    for (const phoneData of phoneNumbers) {
      try {
        const phoneNumber = typeof phoneData === 'string' ? phoneData : phoneData.phoneNumber;
        const phoneParams = typeof phoneData === 'object' ? phoneData.params || [] : (params || []);

        if (!phoneNumber) {
          failCount++;
          results.push({
            phoneNumber: phoneData,
            success: false,
            error: 'Invalid phone number'
          });
          continue;
        }

        // 构建OpenAPI请求
        const cmd = {
          taskId,
          autoFlowId,
          countryCode,
          list: [{
            contactId: generateContactIdFromPhone(phoneNumber),
            phoneNumber,
            name: phoneNumber,
            params: phoneParams
          }]
        };

        const headers = buildOpenApiHeaders({
          accessKey: openApiConfig.auth.accessKey,
          accessSecret: openApiConfig.auth.accessSecret,
          bizType: openApiConfig.auth.bizType,
          action: 'callAppend',
          ts: String(Date.now())
        }, cmd);

        // 调用OpenAPI
        const response = await axios.post(
          `${openApiConfig.baseURL}/openapi/aiagent/call/append`,
          cmd,
          { headers }
        );

        logDebug('Response call-append (single)', {
          apiKey: req.apiKey,
          alias: req.apiKeyConfig?.alias,
          baseURL: openApiConfig.baseURL,
          action: 'callAppend',
          response: response.data,
        });

        if (response.data?.code === 0 || response.data?.code === 200) {
          successCount++;
          results.push({
            phoneNumber,
            success: true,
            contactId: cmd.list[0].contactId,
            response: response.data
          });
        } else {
          failCount++;
          results.push({
            phoneNumber,
            success: false,
            error: response.data?.message || 'Unknown error',
            response: response.data
          });
        }

      } catch (error: any) {
        failCount++;
        results.push({
          phoneNumber: typeof phoneData === 'string' ? phoneData : phoneData.phoneNumber,
          success: false,
          error: error.message || 'Request failed'
        });
      }
    }

    // 返回结果
    res.json({
      code: 200,
      message: `Successfully processed ${phoneNumbers.length} numbers. Success: ${successCount}, Failed: ${failCount}`,
      data: {
        taskId,
        totalCount: phoneNumbers.length,
        successCount,
        failCount,
        results
      },
      apiKey: req.apiKey // 返回使用的API Key（用于调试）
    });
    return;

  } catch (error: any) {
    logDebug('Error append-numbers', {
      apiKey: req.apiKey,
      alias: req.apiKeyConfig?.alias,
      error
    });
    res.status(500).json({
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
    return;
  }
});

/**
 * 获取任务列表接口
 * POST /api/openapi/task-list
 */
router.post('/task-list', apiKeyAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const params = req.body;
    
    // 获取当前API Key对应的OpenAPI配置
    const openApiConfig = getOpenApiConfigForApiKey(req);
    
    // 检查OpenAPI配置
    if (!openApiConfig.auth.accessKey || !openApiConfig.auth.accessSecret) {
      res.status(500).json({
        code: 500,
        message: `OpenAPI configuration is incomplete for API Key: ${req.apiKeyConfig?.alias || req.apiKey}`,
        error: 'OPENAPI_CONFIG_INCOMPLETE'
      });
      return;
    }

    const headers = buildOpenApiHeaders({
      accessKey: openApiConfig.auth.accessKey,
      accessSecret: openApiConfig.auth.accessSecret,
      bizType: openApiConfig.auth.bizType,
      action: 'pageCallTaskInfo',
      ts: String(Date.now())
    }, params);

    logDebug('Request task-list', {
      apiKey: req.apiKey,
      alias: req.apiKeyConfig?.alias,
      baseURL: openApiConfig.baseURL,
      action: 'pageCallTaskInfo',
      headers,
      body: params
    });

    // 调用OpenAPI
    const response = await axios.post(
      `${openApiConfig.baseURL}/openapi/aiagent/task/list`,
      params,
      { headers }
    );

    logDebug('Response task-list', {
      apiKey: req.apiKey,
      alias: req.apiKeyConfig?.alias,
      baseURL: openApiConfig.baseURL,
      action: 'pageCallTaskInfo',
      response: response.data
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: response.data?.data || response.data,
      apiKey: req.apiKey
    });
    return;

  } catch (error: any) {
    logDebug('Error task-list', { apiKey: req.apiKey, alias: req.apiKeyConfig?.alias, error });
    res.status(500).json({
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
    return;
  }
});

/**
 * 获取通话记录接口
 * POST /api/openapi/call-records
 */
router.post('/call-records', apiKeyAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const params = req.body;
    
    // 获取当前API Key对应的OpenAPI配置
    const openApiConfig = getOpenApiConfigForApiKey(req);
    
    // 检查OpenAPI配置
    if (!openApiConfig.auth.accessKey || !openApiConfig.auth.accessSecret) {
      res.status(500).json({
        code: 500,
        message: `OpenAPI configuration is incomplete for API Key: ${req.apiKeyConfig?.alias || req.apiKey}`,
        error: 'OPENAPI_CONFIG_INCOMPLETE'
      });
      return;
    }

    const headers = buildOpenApiHeaders({
      accessKey: openApiConfig.auth.accessKey,
      accessSecret: openApiConfig.auth.accessSecret,
      bizType: openApiConfig.auth.bizType,
      action: 'pageCallRecords',
      ts: String(Date.now())
    }, params);

    logDebug('Request call-records', {
      apiKey: req.apiKey,
      alias: req.apiKeyConfig?.alias,
      baseURL: openApiConfig.baseURL,
      action: 'pageCallRecords',
      headers,
      body: params
    });

    // 调用OpenAPI
    const response = await axios.post(
      `${openApiConfig.baseURL}/openapi/aiagent/call/list`,
      params,
      { headers }
    );

    logDebug('Response call-records', {
      apiKey: req.apiKey,
      alias: req.apiKeyConfig?.alias,
      baseURL: openApiConfig.baseURL,
      action: 'pageCallRecords',
      response: response.data
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: response.data?.data || response.data,
      apiKey: req.apiKey
    });
    return;

  } catch (error: any) {
    logDebug('Error call-records', { apiKey: req.apiKey, alias: req.apiKeyConfig?.alias, error });
    res.status(500).json({
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
    return;
  }
});

/**
 * 删除号码接口
 * POST /api/openapi/delete-number
 */
router.post('/delete-number', apiKeyAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { taskId, contactId } = req.body;
    
    // 参数验证
    if (!taskId || !contactId) {
      res.status(400).json({
        code: 400,
        message: 'taskId and contactId are required',
        error: 'MISSING_PARAMETERS'
      });
      return;
    }
    
    // 获取当前API Key对应的OpenAPI配置
    const openApiConfig = getOpenApiConfigForApiKey(req);
    
    // 检查OpenAPI配置
    if (!openApiConfig.auth.accessKey || !openApiConfig.auth.accessSecret) {
      res.status(500).json({
        code: 500,
        message: `OpenAPI configuration is incomplete for API Key: ${req.apiKeyConfig?.alias || req.apiKey}`,
        error: 'OPENAPI_CONFIG_INCOMPLETE'
      });
      return;
    }

    const cmd = { taskId, contactId };
    const headers = buildOpenApiHeaders({
      accessKey: openApiConfig.auth.accessKey,
      accessSecret: openApiConfig.auth.accessSecret,
      bizType: openApiConfig.auth.bizType,
      action: 'callDelete',
      ts: String(Date.now())
    }, cmd);

    // 调用OpenAPI
    const response = await axios.post(
      `${openApiConfig.baseURL}/openapi/aiagent/call/delete`,
      cmd,
      { headers }
    );

    res.json({
      code: 200,
      message: '删除成功',
      data: response.data,
      apiKey: req.apiKey
    });
    return;

  } catch (error: any) {
    console.error('OpenAPI delete number error:', error);
    res.status(500).json({
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
    return;
  }
});

/**
 * 获取API状态
 * GET /api/openapi/status
 */
router.get('/status', apiKeyAuth, (req: AuthenticatedRequest, res) => {
  const openApiConfig = getOpenApiConfigForApiKey(req);
  
  res.json({
    code: 200,
    message: 'OpenAPI service is running',
    data: {
      service: 'nxlink-openapi-proxy',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      apiKey: req.apiKey,
      apiKeyAlias: req.apiKeyConfig?.alias,
      apiKeyDescription: req.apiKeyConfig?.description,
      hasOpenApiConfig: !!(openApiConfig.auth.accessKey && openApiConfig.auth.accessSecret),
      openApiBaseUrl: openApiConfig.baseURL,
      openApiBizType: openApiConfig.auth.bizType
    }
  });
});

/**
 * 获取所有API Keys配置（仅显示非敏感信息）
 * GET /api/openapi/keys
 */
router.get('/keys', (req, res) => {
  const allApiKeys = getAllApiKeys();
  res.json({
    code: 200,
    message: 'Available API Keys',
    data: {
      totalKeys: allApiKeys.length,
      keys: allApiKeys.map(config => ({
        alias: config.alias,
        description: config.description,
        hasOpenApiConfig: !!(config.openapi.accessKey && config.openapi.accessSecret),
        openApiBaseUrl: config.openapi.baseUrl,
        bizType: config.openapi.bizType
      }))
    }
  });
});

export default router;
