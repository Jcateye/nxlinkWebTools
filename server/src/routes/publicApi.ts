import express from 'express';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { getAllApiKeys } from '../services/configManager';

const router = express.Router();

/**
 * 公开API路由 - 支持URL参数形式的调用
 * 适用于没有鉴权能力的第三方系统
 */

// 生成唯一的contactId
function generateContactIdFromPhone(phone: string): string {
  // 基礎28位：手机号的MD5前28位
  const base28 = CryptoJS.MD5(String(phone || '')).toString().toLowerCase().substring(0, 28);
  // 追加8位：基于当前时间戳和随机数的短哈希，避免同号码重复
  const saltSource = `${Date.now()}-${Math.random()}`;
  const salt8 = CryptoJS.MD5(saltSource).toString().toLowerCase().substring(0, 8);
  // 组合为36位（前28位为MD5，末尾追加8位salt）
  const mixed = base28 + salt8;
  // 按 8-4-4-4-12 插入连字符
  return `${mixed.substring(0, 8)}-${mixed.substring(8, 12)}-${mixed.substring(12, 16)}-${mixed.substring(16, 20)}-${mixed.substring(20, 32)}`;
}

// 构建OpenAPI请求头（使用和openapi.ts相同的签名算法）
function buildOpenApiHeaders(
  authConfig: {
    accessKey: string;
    accessSecret: string;
    bizType: string;
    action: string;
    ts: string;
  },
  body: any
): Record<string, string> {
  const { accessKey, accessSecret, bizType, action, ts } = authConfig;

  // Step 1: 拼接header参数 (accessKey, action, bizType, ts)
  const headersStr = `accessKey=${accessKey}&action=${action}&bizType=${bizType}&ts=${ts}`;

  // Step 2: 拼接body参数
  let raw = headersStr;
  const bodyJsonString = JSON.stringify(body);
  if (bodyJsonString && bodyJsonString !== '{}') {
    raw += `&body=${bodyJsonString}`;
  }

  // Step 3: 拼接accessSecret
  raw += `&accessSecret=${accessSecret}`;

  // Step 4: 生成MD5签名
  const sign = CryptoJS.MD5(raw).toString();

  console.log(`[OpenAPI Debug] String to sign: "${raw}"`); // 增加日志打印

  return {
    'Content-Type': 'application/json',
    'accessKey': accessKey,
    'bizType': bizType,
    'action': action,
    'ts': ts,
    'sign': sign,
    'algorithm': 'md5'
  };
}

// 验证URL中的API Key
function validateApiKey(apiKey: string) {
  const allKeys = getAllApiKeys();
  const apiKeyConfig = allKeys.find(key => key.apiKey === apiKey);
  
  if (!apiKeyConfig) {
    return { valid: false, error: 'Invalid API Key' };
  }
  
  if (!apiKeyConfig.openapi.accessKey || !apiKeyConfig.openapi.accessSecret) {
    return { valid: false, error: 'API Key configuration incomplete' };
  }
  
  return { valid: true, config: apiKeyConfig };
}

/**
 * 公开追加号码接口（国家代码通过查询参数传递）
 * POST /api/openapi/public/:apiKey/:taskId/append-numbers?countryCode=86
 * 
 * URL参数:
 * - apiKey: API密钥
 * - taskId: 任务ID
 * 
 * Query参数:
 * - countryCode: 国家代码（必填）
 * 
 * Body: 
 * {
 *   "phones": [
 *     {
 *       "phone": "1234567890",
 *       "params": [
 *         { "name": "姓名", "value": "张三" },
 *         { "name": "城市", "value": "北京" }
 *       ]
 *     }
 *   ]
 * }
 */
router.post('/public/:apiKey/:taskId/append-numbers', async (req, res): Promise<void> => {
  try {
    const { apiKey, taskId } = req.params;
    const { countryCode } = req.query;
    const { phones } = req.body;

    console.log(`[${new Date().toLocaleString()}] 📞 公开API追加号码请求:`, {
      apiKey: apiKey.substring(0, 8) + '***',
      taskId,
      countryCode,
      phoneCount: phones?.length || 0
    });

    // 验证API Key
    const validation = validateApiKey(apiKey);
    if (!validation.valid) {
      res.status(401).json({
        code: 401,
        message: validation.error,
        error: 'UNAUTHORIZED'
      });
      return;
    }

    // 验证必需参数
    if (!taskId) {
      res.status(400).json({
        code: 400,
        message: 'Missing required parameter: taskId',
        error: 'MISSING_PARAMETERS'
      });
      return;
    }

    // 如果没有提供countryCode，使用默认值"86"（中国）
    const finalCountryCode = countryCode || '86';

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      res.status(400).json({
        code: 400,
        message: 'Invalid phones data',
        error: 'INVALID_PHONES_DATA'
      });
      return;
    }

    const apiKeyConfig = validation.config!;
    const openApiConfig = {
      baseURL: apiKeyConfig.openapi.baseUrl,
      auth: {
        accessKey: apiKeyConfig.openapi.accessKey,
        accessSecret: apiKeyConfig.openapi.accessSecret,
        bizType: apiKeyConfig.openapi.bizType
      }
    };

    // 构建请求参数
    const requestBody = {
      taskId,
      countryCode: String(finalCountryCode), // 确保是字符串
      appendNumbers: phones.map(item => ({
        phoneNumber: item.phone,
        params: item.params || []
      }))
    };

    // 构建请求头
    const headers = buildOpenApiHeaders({
      accessKey: openApiConfig.auth.accessKey,
      accessSecret: openApiConfig.auth.accessSecret,
      bizType: openApiConfig.auth.bizType,
      action: 'callAppend',
      ts: String(Date.now())
    }, requestBody);

    console.log(`[${new Date().toLocaleString()}] 🚀 调用OpenAPI追加号码:`, {
      baseURL: openApiConfig.baseURL,
      taskId,
      countryCode: finalCountryCode,
      phoneCount: phones.length
    });

    // 调用OpenAPI
    const response = await axios.post(
      `${openApiConfig.baseURL}/openapi/aiagent/call/append`,
      requestBody,
      { headers }
    );

    console.log(`[${new Date().toLocaleString()}] ✅ OpenAPI响应:`, {
      code: response.data?.code,
      message: response.data?.msg || response.data?.message
    });

    // 返回响应
    res.json({
      code: 200,
      message: '号码追加成功',
      data: response.data?.data || response.data,
      request: {
        taskId,
        countryCode,
        phoneCount: phones.length
      }
    });
    return;

  } catch (error: any) {
    console.error(`[${new Date().toLocaleString()}] ❌ 公开API追加号码失败:`, error.message);
    
    if (error.response) {
      res.status(error.response.status || 500).json({
        code: error.response.status || 500,
        message: error.response.data?.message || error.message,
        error: 'OPENAPI_ERROR',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        code: 500,
        message: error.message || 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
    return;
  }
});

/**
 * 公开追加号码接口（原版本，国家代码在URL中）
 * POST /api/openapi/public/:apiKey/:taskId/:countryCode/append-numbers
 * 
 * URL参数:
 * - apiKey: API密钥
 * - taskId: 任务ID
 * - countryCode: 国家代码
 * 
 * Body: 
 * {
 *   "phones": [
 *     {
 *       "phone": "1234567890",
 *       "params": [
 *         { "name": "姓名", "value": "张三" },
 *         { "name": "城市", "value": "北京" }
 *       ]
 *     }
 *   ]
 * }
 */
router.post('/public/:apiKey/:taskId/:countryCode/append-numbers', async (req, res): Promise<void> => {
  try {
    const { apiKey, taskId, countryCode } = req.params;
    const { phones } = req.body;

    console.log(`[${new Date().toLocaleString()}] 📞 公开API追加号码请求:`, {
      apiKey: apiKey.substring(0, 8) + '***',
      taskId,
      countryCode,
      phoneCount: phones?.length || 0
    });

    // 验证API Key
    const validation = validateApiKey(apiKey);
    if (!validation.valid) {
      res.status(401).json({
        code: 401,
        message: validation.error,
        error: 'UNAUTHORIZED'
      });
      return;
    }

    // 验证必需参数
    if (!taskId || !countryCode) {
      res.status(400).json({
        code: 400,
        message: 'Missing required parameters: taskId and countryCode',
        error: 'MISSING_PARAMETERS'
      });
      return;
    }

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      res.status(400).json({
        code: 400,
        message: 'Invalid phones data',
        error: 'INVALID_PHONES_DATA'
      });
      return;
    }

    const apiKeyConfig = validation.config!;
    const openApiConfig = {
      baseURL: apiKeyConfig.openapi.baseUrl,
      auth: {
        accessKey: apiKeyConfig.openapi.accessKey,
        accessSecret: apiKeyConfig.openapi.accessSecret,
        bizType: apiKeyConfig.openapi.bizType
      }
    };

    // 构建请求参数
    const requestBody = {
      taskId,
      countryCode,
      appendNumbers: phones.map(item => ({
        phoneNumber: item.phone,
        params: item.params || []
      }))
    };

    // 构建请求头
    const headers = buildOpenApiHeaders({
      accessKey: openApiConfig.auth.accessKey,
      accessSecret: openApiConfig.auth.accessSecret,
      bizType: openApiConfig.auth.bizType,
      action: 'callAppend',
      ts: String(Date.now())
    }, requestBody);

    console.log(`[${new Date().toLocaleString()}] 🚀 调用OpenAPI追加号码:`, {
      baseURL: openApiConfig.baseURL,
      taskId,
      countryCode,
      phoneCount: phones.length
    });

    // 调用OpenAPI
    const response = await axios.post(
      `${openApiConfig.baseURL}/openapi/aiagent/call/append`,
      requestBody,
      { headers }
    );

    console.log(`[${new Date().toLocaleString()}] ✅ OpenAPI响应:`, {
      code: response.data?.code,
      message: response.data?.msg || response.data?.message
    });

    // 返回响应
    res.json({
      code: 200,
      message: '号码追加成功',
      data: response.data?.data || response.data,
      request: {
        taskId,
        countryCode,
        phoneCount: phones.length
      }
    });
    return;

  } catch (error: any) {
    console.error(`[${new Date().toLocaleString()}] ❌ 公开API追加号码失败:`, error.message);
    
    if (error.response) {
      res.status(error.response.status || 500).json({
        code: error.response.status || 500,
        message: error.response.data?.message || error.message,
        error: 'OPENAPI_ERROR',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        code: 500,
        message: error.message || 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
    return;
  }
});

/**
 * 公开获取通话记录接口
 * GET /api/openapi/public/:apiKey/:taskId/call-records
 * 
 * URL参数:
 * - apiKey: API密钥
 * - taskId: 任务ID
 * 
 * Query参数:
 * - pageNumber: 页码（默认1）
 * - pageSize: 每页大小（默认10）
 * - status: 状态筛选（可选）
 */
router.get('/public/:apiKey/:taskId/call-records', async (req, res): Promise<void> => {
  try {
    const { apiKey, taskId } = req.params;
    const { pageNumber = 1, pageSize = 10, status } = req.query;

    console.log(`[${new Date().toLocaleString()}] 📋 公开API获取通话记录:`, {
      apiKey: apiKey.substring(0, 8) + '***',
      taskId,
      pageNumber,
      pageSize,
      status
    });

    // 验证API Key
    const validation = validateApiKey(apiKey);
    if (!validation.valid) {
      res.status(401).json({
        code: 401,
        message: validation.error,
        error: 'UNAUTHORIZED'
      });
      return;
    }

    // 验证必需参数
    if (!taskId) {
      res.status(400).json({
        code: 400,
        message: 'Missing required parameter: taskId',
        error: 'MISSING_PARAMETERS'
      });
      return;
    }

    const apiKeyConfig = validation.config!;
    const openApiConfig = {
      baseURL: apiKeyConfig.openapi.baseUrl,
      auth: {
        accessKey: apiKeyConfig.openapi.accessKey,
        accessSecret: apiKeyConfig.openapi.accessSecret,
        bizType: apiKeyConfig.openapi.bizType
      }
    };

    // 构建请求参数
    const requestBody = {
      taskId,
      pageNumber: Number(pageNumber),
      pageSize: Number(pageSize),
      ...(status && { status })
    };

    // 构建请求头
    const headers = buildOpenApiHeaders({
      accessKey: openApiConfig.auth.accessKey,
      accessSecret: openApiConfig.auth.accessSecret,
      bizType: openApiConfig.auth.bizType,
      action: 'pageCallRecords',
      ts: String(Date.now())
    }, requestBody);

    // 调用OpenAPI
    const response = await axios.post(
      `${openApiConfig.baseURL}/openapi/aiagent/call/list`,
      requestBody,
      { headers }
    );

    // 返回响应
    res.json({
      code: 200,
      message: '获取成功',
      data: response.data?.data || response.data
    });
    return;

  } catch (error: any) {
    console.error(`[${new Date().toLocaleString()}] ❌ 公开API获取通话记录失败:`, error.message);
    
    if (error.response) {
      res.status(error.response.status || 500).json({
        code: error.response.status || 500,
        message: error.response.data?.message || error.message,
        error: 'OPENAPI_ERROR',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        code: 500,
        message: error.message || 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
    return;
  }
});

/**
 * 公开删除号码接口
 * DELETE /api/openapi/public/:apiKey/:taskId/:contactId/delete
 * 
 * URL参数:
 * - apiKey: API密钥
 * - taskId: 任务ID
 * - contactId: 联系人ID
 */
router.delete('/public/:apiKey/:taskId/:contactId/delete', async (req, res): Promise<void> => {
  try {
    const { apiKey, taskId, contactId } = req.params;

    console.log(`[${new Date().toLocaleString()}] 🗑️ 公开API删除号码:`, {
      apiKey: apiKey.substring(0, 8) + '***',
      taskId,
      contactId
    });

    // 验证API Key
    const validation = validateApiKey(apiKey);
    if (!validation.valid) {
      res.status(401).json({
        code: 401,
        message: validation.error,
        error: 'UNAUTHORIZED'
      });
      return;
    }

    // 验证必需参数
    if (!taskId || !contactId) {
      res.status(400).json({
        code: 400,
        message: 'Missing required parameters: taskId and contactId',
        error: 'MISSING_PARAMETERS'
      });
      return;
    }

    const apiKeyConfig = validation.config!;
    const openApiConfig = {
      baseURL: apiKeyConfig.openapi.baseUrl,
      auth: {
        accessKey: apiKeyConfig.openapi.accessKey,
        accessSecret: apiKeyConfig.openapi.accessSecret,
        bizType: apiKeyConfig.openapi.bizType
      }
    };

    // 构建请求参数
    const requestBody = {
      taskId,
      contactIds: [contactId]
    };

    // 构建请求头
    const headers = buildOpenApiHeaders({
      accessKey: openApiConfig.auth.accessKey,
      accessSecret: openApiConfig.auth.accessSecret,
      bizType: openApiConfig.auth.bizType,
      action: 'deleteCallRecords',
      ts: String(Date.now())
    }, requestBody);

    // 调用OpenAPI
    const response = await axios.post(
      `${openApiConfig.baseURL}/openapi/aiagent/call/delete`,
      requestBody,
      { headers }
    );

    // 返回响应
    res.json({
      code: 200,
      message: '删除成功',
      data: response.data?.data || response.data
    });
    return;

  } catch (error: any) {
    console.error(`[${new Date().toLocaleString()}] ❌ 公开API删除号码失败:`, error.message);
    
    if (error.response) {
      res.status(error.response.status || 500).json({
        code: error.response.status || 500,
        message: error.response.data?.message || error.message,
        error: 'OPENAPI_ERROR',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        code: 500,
        message: error.message || 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
    return;
  }
});

/**
 * 公开表单提交接口
 * POST /api/openapi/public/:apiKey/:taskId/form-submission?countryCode=86
 * 
 * URL参数:
 * - apiKey: API密钥
 * - taskId: 任务ID
 * 
 * Query参数:
 * - countryCode: 国家代码（可选，默认86）
 * 
 * Body: 表单数据（字段映射）
 * {
 *   "form": "form_ABC123",  // 表单ID（可选）
 *   "form_name": "客户信息表", // 表单名称（可选）
 *   "entry": {
 *     "field_5": "13800138000",  // 电话号码（必填）
 *     "field_2": "张三",         // 姓名（可选）
 *     "field_6": "zhang@email.com", // 邮箱（可选）
 *   }
 * }
 */
router.post('/public/:apiKey/:taskId/form-submission', async (req, res): Promise<void> => {
  try {
    const { apiKey, taskId } = req.params;
    const { countryCode } = req.query;
    const webhookData = req.body;

    console.log(`[${new Date().toLocaleString()}] 📝 公开表单提交接口（重构版）:`, {
      apiKey: apiKey.substring(0, 8) + '***',
      taskId,
      countryCode,
      formId: webhookData.form,
      phoneNumber: webhookData.entry?.field_5
    });

    // 验证API Key
    const validation = validateApiKey(apiKey);
    if (!validation.valid) {
      res.status(401).json({
        code: 401,
        message: validation.error,
        error: 'UNAUTHORIZED'
      });
      return;
    }

    // 验证必需参数
    if (!taskId) {
      res.status(400).json({
        code: 400,
        message: 'Missing required parameter: taskId',
        error: 'MISSING_PARAMETERS'
      });
      return;
    }

    // 验证表单数据
    if (!webhookData.entry || !webhookData.entry.field_5) {
      res.status(400).json({
        code: 400,
        message: 'Missing required field: field_5 (phone number)',
        error: 'MISSING_PHONE_NUMBER'
      });
      return;
    }

    // 如果没有提供countryCode，使用默认值"86"（中国）
    const finalCountryCode = countryCode || '86';

    const apiKeyConfig = validation.config!;
    const openApiConfig = {
      baseURL: apiKeyConfig.openapi.baseUrl,
      auth: {
        accessKey: apiKeyConfig.openapi.accessKey,
        accessSecret: apiKeyConfig.openapi.accessSecret,
        bizType: apiKeyConfig.openapi.bizType
      }
    };

    // 根据成功请求格式构建（使用list格式，包含contactId和name）
    const phoneNumber = String(webhookData.entry.field_5);
    const requestBody = {
      taskId,
      list: [{
        contactId: generateContactIdFromPhone(phoneNumber),
        phoneNumber: phoneNumber,
        name: phoneNumber, // 使用号码作为默认名称
        params: [] // 关键：必须是空数组！
      }]
    };

    // 只有明确提供了countryCode才添加
    if (countryCode) {
      (requestBody as any).countryCode = String(finalCountryCode);
    }

    console.log(`[${new Date().toLocaleString()}] 📦 最终请求体:`, JSON.stringify(requestBody));

    // 构建请求头
    const headers = buildOpenApiHeaders({
      accessKey: openApiConfig.auth.accessKey,
      accessSecret: openApiConfig.auth.accessSecret,
      bizType: openApiConfig.auth.bizType,
      action: 'callAppend',
      ts: String(Date.now())
    }, requestBody);

    // 调用OpenAPI
    const response = await axios.post(
      `${openApiConfig.baseURL}/openapi/aiagent/call/append`,
      requestBody,
      { headers }
    );

    console.log(`[${new Date().toLocaleString()}] ✅ OpenAPI响应:`, {
      code: response.data?.code,
      message: response.data?.msg || response.data?.message
    });

    // 返回响应
    res.json({
      code: 200,
      message: '表单数据处理成功',
      data: response.data?.data || response.data,
      request: {
        taskId,
        countryCode: finalCountryCode,
        phoneNumber: String(webhookData.entry.field_5),
        formId: webhookData.form
      }
    });
    return;

  } catch (error: any) {
    console.error(`[${new Date().toLocaleString()}] ❌ 公开表单提交失败:`, error.message);
    
    if (error.response) {
      res.status(error.response.status || 500).json({
        code: error.response.status || 500,
        message: error.response.data?.message || error.message,
        error: 'OPENAPI_ERROR',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        code: 500,
        message: error.message || 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
    return;
  }
});

export default router;
