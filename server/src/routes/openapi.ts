import express from 'express';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { apiKeyAuth, AuthenticatedRequest } from '../middleware/apiKeyAuth';

const router = express.Router();

import { PROJECT_CONFIG } from '../../../config/project.config';

/**
 * OpenAPI配置
 */
const OPENAPI_CONFIG = {
  baseURL: PROJECT_CONFIG.openapi.baseUrl,
  defaultAuth: {
    accessKey: PROJECT_CONFIG.openapi.accessKey,
    accessSecret: PROJECT_CONFIG.openapi.accessSecret,
    bizType: PROJECT_CONFIG.openapi.bizType
  }
};

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
router.post('/append-numbers', apiKeyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { taskId, phoneNumbers, autoFlowId, countryCode, params } = req.body;

    // 参数验证
    if (!taskId) {
      return res.status(400).json({
        code: 400,
        message: 'taskId is required',
        error: 'MISSING_TASK_ID'
      });
    }

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'phoneNumbers must be a non-empty array',
        error: 'INVALID_PHONE_NUMBERS'
      });
    }

    // 检查OpenAPI配置
    if (!OPENAPI_CONFIG.defaultAuth.accessKey || !OPENAPI_CONFIG.defaultAuth.accessSecret) {
      return res.status(500).json({
        code: 500,
        message: 'OpenAPI configuration is missing. Please configure OPENAPI_ACCESS_KEY and OPENAPI_ACCESS_SECRET.',
        error: 'MISSING_OPENAPI_CONFIG'
      });
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
          accessKey: OPENAPI_CONFIG.defaultAuth.accessKey,
          accessSecret: OPENAPI_CONFIG.defaultAuth.accessSecret,
          bizType: OPENAPI_CONFIG.defaultAuth.bizType,
          action: 'callAppend',
          ts: String(Date.now())
        }, cmd);

        // 调用OpenAPI
        const response = await axios.post(
          `${OPENAPI_CONFIG.baseURL}/openapi/aiagent/call/append`,
          cmd,
          { headers }
        );

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

  } catch (error: any) {
    console.error('OpenAPI append numbers error:', error);
    res.status(500).json({
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * 获取API状态
 * GET /api/openapi/status
 */
router.get('/status', apiKeyAuth, (req: AuthenticatedRequest, res) => {
  res.json({
    code: 200,
    message: 'OpenAPI service is running',
    data: {
      service: 'nxlink-openapi-proxy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      apiKey: req.apiKey,
      hasOpenApiConfig: !!(OPENAPI_CONFIG.defaultAuth.accessKey && OPENAPI_CONFIG.defaultAuth.accessSecret)
    }
  });
});

export default router;
