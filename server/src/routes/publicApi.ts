import express from 'express';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { getAllApiKeys } from '../services/configManager';
import { getTemplateById } from '../../../config/form-templates.config';

// 使用配置文件中的模板

// 直接使用字段key作为参数名称

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
    const { countryCode, templateId = 'contact' } = req.query;
    const webhookData = req.body;

    console.log(`[${new Date().toLocaleString()}] 📝 公开表单提交接口（统一版）:`, {
      apiKey: apiKey.substring(0, 8) + '***',
      taskId,
      templateId,
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

    // 获取模板映射配置
    const templateMapping = getTemplateById(templateId as string);
    if (!templateMapping) {
      res.status(400).json({
        code: 400,
        message: `Template not found: ${templateId}`,
        error: 'TEMPLATE_NOT_FOUND'
      });
      return;
    }

    console.log(`[${new Date().toLocaleString()}] 🎨 使用模板: ${templateId} (${templateMapping.name})`);

    // 验证表单数据
    if (!webhookData.entry) {
      res.status(400).json({
        code: 400,
        message: 'Invalid webhook data: missing entry',
        error: 'INVALID_WEBHOOK_DATA'
      });
      return;
    }

    // 使用模板映射验证电话号码
    const phoneField = templateMapping.fieldMapping.phone;
    const phoneValue = (webhookData.entry as any)[phoneField];

    if (!phoneValue) {
      res.status(400).json({
        code: 400,
        message: `Missing required phone number in field: ${phoneField}`,
        error: 'MISSING_PHONE_NUMBER',
        templateId,
        requiredField: phoneField
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
    const phoneNumber = String(phoneValue);

    // 构建参数数组，包含所有表单字段
    const params: Array<{ name: string; value: string }> = [];

    // 使用模板映射处理其他字段
    const fieldMapping = templateMapping.fieldMapping;

    // 处理姓名字段 - 在后面单独处理，不放到params里

    // 处理邮箱字段
    if (fieldMapping.email && (webhookData.entry as any)[fieldMapping.email]) {
      params.push({
        name: 'email',
        value: String((webhookData.entry as any)[fieldMapping.email])
      });
    }

    // 处理公司字段
    if (fieldMapping.company && (webhookData.entry as any)[fieldMapping.company]) {
      params.push({
        name: 'company',
        value: String((webhookData.entry as any)[fieldMapping.company])
      });
    }

    // 处理留言字段
    if (fieldMapping.message && (webhookData.entry as any)[fieldMapping.message]) {
      params.push({
        name: 'message',
        value: String((webhookData.entry as any)[fieldMapping.message])
      });
    }

    // 处理地区信息（如果有的话）
    if (webhookData.entry.info_region) {
      const region = webhookData.entry.info_region;
      const regionStr = `${region.province || ''}${region.city || ''}${region.district || ''}`.trim();
      if (regionStr) {
        params.push({
          name: 'region',
          value: regionStr
        });
      }
    }

    // 添加表单信息
    if (webhookData.form_name) {
      params.push({
        name: '表单名称',
        value: String(webhookData.form_name)
      });
    }

    if (webhookData.entry.created_at) {
      params.push({
        name: '提交时间',
        value: String(webhookData.entry.created_at)
      });
    }

    if (webhookData.entry.creator_name) {
      params.push({
        name: '创建者',
        value: String(webhookData.entry.creator_name)
      });
    }

    // 使用姓名作为联系人名称，如果没有则使用电话号码
    const nameField = fieldMapping.name;
    const contactName = nameField && (webhookData.entry as any)[nameField]
      ? String((webhookData.entry as any)[nameField])
      : phoneNumber;

    const requestBody = {
      taskId,
      list: [{
        contactId: generateContactIdFromPhone(phoneNumber),
        phoneNumber: phoneNumber,
        name: contactName,
        params: params
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
        templateId,
        templateName: templateMapping.name,
        countryCode: finalCountryCode,
        phoneNumber: phoneNumber,
        formId: webhookData.form,
        paramsCount: params.length
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
