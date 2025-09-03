import express from 'express';
import { apiKeyAuth, AuthenticatedRequest } from '../middleware/apiKeyAuth';
import {
  getTemplateById,
  getAvailableTemplates,
  isValidTemplateId,
  FormTemplate
} from '../../../config/form-templates.config';

const router = express.Router();

// 表单数据推送接口的数据结构
interface FormEntry {
  serial_number: number;
  field_2: string; // 姓名
  field_5: string; // 电话号码
  field_3?: string;
  field_4?: string;
  field_6?: string;
  x_field_1?: string;
  color_mark?: string;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  info_filling_duration?: number;
  info_platform?: string;
  info_os?: string;
  info_browser?: string;
  info_region?: {
    province?: string;
    city?: string;
    district?: string;
    street?: string;
  };
  info_remote_ip?: string;
}

interface FormWebhookData {
  form: string;
  form_name: string;
  entry: FormEntry;
}

// 获取模板映射配置（从配置文件加载）
function getTemplateMapping(templateId: string): FormTemplate | null {
  return getTemplateById(templateId);
}

// 验证模板ID是否存在
function isValidTemplate(templateId: string): boolean {
  return isValidTemplateId(templateId);
}

// 直接使用字段key作为参数名称

/**
 * 表单数据推送接收接口（新版）
 * POST /api/webhook/:taskId/form-submission?templateId=contact
 *
 * URL参数:
 * - taskId: 任务ID
 *
 * Query参数:
 * - templateId: 模板ID (可选，默认使用contact模板)
 * - countryCode: 国家代码 (可选，默认86)
 */
router.post('/:taskId/form-submission', express.json(), apiKeyAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { taskId } = req.params;
    const { templateId = 'contact', countryCode = '86' } = req.query;
    const webhookData: FormWebhookData = req.body;

    console.log(`[${new Date().toLocaleString()}] 📝 收到表单数据推送（新版）:`, {
      taskId,
      templateId,
      countryCode,
      formId: webhookData.form,
      formName: webhookData.form_name,
      serialNumber: webhookData.entry?.serial_number,
      creator: webhookData.entry?.creator_name,
      ip: webhookData.entry?.info_remote_ip
    });

    // 验证必需参数
    if (!taskId) {
      return res.status(400).json({
        code: 400,
        message: 'Missing required parameter: taskId',
        error: 'MISSING_TASK_ID'
      });
    }

    // 验证必需字段
    if (!webhookData.entry) {
      return res.status(400).json({
        code: 400,
        message: 'Invalid webhook data: missing entry',
        error: 'INVALID_WEBHOOK_DATA'
      });
    }

    // 获取模板映射配置
    const templateMapping = getTemplateMapping(templateId as string);
    if (!templateMapping) {
      return res.status(400).json({
        code: 400,
        message: `Template not found: ${templateId}`,
        error: 'TEMPLATE_NOT_FOUND',
        availableTemplates: getAvailableTemplates()
      });
    }

    console.log(`[${new Date().toLocaleString()}] 🎨 使用模板: ${templateId} (${templateMapping.name})`);

    // 使用模板映射提取字段
    const phoneField = templateMapping.fieldMapping.phone;
    const phoneNumber = (webhookData.entry as any)[phoneField];

    if (!phoneNumber) {
      return res.status(400).json({
        code: 400,
        message: `Missing required phone number in field: ${phoneField}`,
        error: 'MISSING_PHONE_NUMBER',
        templateId,
        requiredField: phoneField
      });
    }

    // 验证电话号码格式（中国手机号）
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      console.warn(`[${new Date().toLocaleString()}] ⚠️  无效电话号码: ${phoneNumber}，跳过验证继续处理`);
    }

    // 构建追加号码的数据
    const phoneData: {
      phoneNumber: string;
      name: string;
      params: Array<{ name: string; value: string }>;
    } = {
      phoneNumber: phoneNumber,
      name: phoneNumber, // 默认使用电话号码作为姓名
      params: []
    };

    // 使用模板映射处理其他字段
    const fieldMapping = templateMapping.fieldMapping;

    // 处理姓名字段 - 直接映射到name字段
    if (fieldMapping.name && (webhookData.entry as any)[fieldMapping.name]) {
      phoneData.name = String((webhookData.entry as any)[fieldMapping.name]);
    }

    // 处理邮箱字段
    if (fieldMapping.email && (webhookData.entry as any)[fieldMapping.email]) {
      phoneData.params.push({
        name: 'email',
        value: String((webhookData.entry as any)[fieldMapping.email])
      });
    }

    // 处理公司字段
    if (fieldMapping.company && (webhookData.entry as any)[fieldMapping.company]) {
      phoneData.params.push({
        name: 'company',
        value: String((webhookData.entry as any)[fieldMapping.company])
      });
    }

    // 处理留言字段
    if (fieldMapping.message && (webhookData.entry as any)[fieldMapping.message]) {
      phoneData.params.push({
        name: 'message',
        value: String((webhookData.entry as any)[fieldMapping.message])
      });
    }

    // 处理地区信息（如果有的话）
    if (webhookData.entry.info_region) {
      const region = webhookData.entry.info_region;
      const regionStr = `${region.province || ''}${region.city || ''}${region.district || ''}`.trim();
      if (regionStr) {
        phoneData.        params.push({
          name: 'region',
          value: regionStr
        });
      }
    }

    // 添加表单元信息
    if (webhookData.form_name) {
      phoneData.params.push({
        name: '表单名称',
        value: webhookData.form_name
      });
    }

    if (webhookData.entry.created_at) {
      phoneData.params.push({
        name: '提交时间',
        value: webhookData.entry.created_at
      });
    }

    if (webhookData.entry.creator_name) {
      phoneData.params.push({
        name: '创建者',
        value: webhookData.entry.creator_name
      });
    }

    console.log(`[${new Date().toLocaleString()}] 🔄 处理表单数据:`, {
      taskId,
      templateId,
      phoneNumber: phoneNumber,
      paramsCount: phoneData.params.length,
      templateName: templateMapping.name
    });

    // 使用真实的AuthenticatedRequest对象
    const appendReq = {
      body: {
        taskId: taskId,
        phoneNumbers: [phoneData],
        autoFlowId: null,
        countryCode: countryCode as string
      },
      apiKey: req.apiKey,
      apiKeyConfig: req.apiKeyConfig
    } as AuthenticatedRequest;

    // 调用追加号码接口的逻辑
    const result = await processAppendNumbers(appendReq);

    console.log(`[${new Date().toLocaleString()}] ✅ 表单数据处理完成:`, {
      taskId,
      templateId,
      serialNumber: webhookData.entry.serial_number,
      success: result.code === 200,
      total: result.data?.total || 0,
      successCount: result.data?.success || 0,
      failedCount: result.data?.failed || 0
    });

    // 返回处理结果
    res.status(200).json({
      code: 200,
      message: '表单数据处理成功',
      data: {
        taskId,
        templateId,
        templateName: templateMapping.name,
        serialNumber: webhookData.entry.serial_number,
        phoneNumber: phoneNumber,
        countryCode: countryCode,
        paramsCount: phoneData.params.length,
        appendResult: result
      }
    });

  } catch (error: any) {
    console.error(`[${new Date().toLocaleString()}] ❌ 表单数据处理失败:`, {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      code: 500,
      message: '表单数据处理失败',
      error: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

/**
 * 处理追加号码的逻辑（从openapi.ts复制并修改）
 */
async function processAppendNumbers(req: any): Promise<any> {
  const { taskId, phoneNumbers, autoFlowId, countryCode } = req.body;

  // 使用API Key对应的OpenAPI配置
  let openApiConfig;
  if (req.apiKeyConfig && req.apiKeyConfig.openapi) {
    // 使用API Key配置
    openApiConfig = {
      baseURL: req.apiKeyConfig.openapi.baseUrl,
      auth: {
        accessKey: req.apiKeyConfig.openapi.accessKey,
        accessSecret: req.apiKeyConfig.openapi.accessSecret,
        bizType: req.apiKeyConfig.openapi.bizType
      }
    };
    console.log(`[${new Date().toLocaleString()}] 🔑 使用API Key配置: ${req.apiKeyConfig.alias}`);
  } else {
    // 回退到默认配置
    const { PROJECT_CONFIG } = await import('../config/project.config');
    openApiConfig = {
      baseURL: PROJECT_CONFIG.openapi.baseUrl,
      auth: {
        accessKey: PROJECT_CONFIG.openapi.accessKey,
        accessSecret: PROJECT_CONFIG.openapi.accessSecret,
        bizType: PROJECT_CONFIG.openapi.bizType
      }
    };
    console.log(`[${new Date().toLocaleString()}] ⚠️  使用默认配置（无API Key）`);
  }

  // 导入必要的函数
  const CryptoJS = await import('crypto-js');
  const axios = (await import('axios')).default;

  // 生成签名头部的函数
  function buildOpenApiHeaders(auth: any, body: any) {
    const ts = String(Date.now());

    // Step 1: 拼接header参数
    const headersStr = `accessKey=${auth.accessKey}&action=callAppend&bizType=${auth.bizType}&ts=${ts}`;

    // Step 2: 拼接body参数
    const bodyJsonString = JSON.stringify(body);
    let raw = headersStr;
    if (bodyJsonString && bodyJsonString !== '{}') {
      raw += `&body=${bodyJsonString}`;
    }

    // Step 3: 拼接accessSecret
    raw += `&accessSecret=${auth.accessSecret}`;

    // 生成签名
    const sign = CryptoJS.MD5(raw).toString();

    // 调试：打印签名详情
    console.log(`[${new Date().toLocaleString()}] 🔐 签名计算详情:`, {
      headers: {
        accessKey: auth.accessKey.substring(0, 10) + '***',
        ts: ts,
        algorithm: 'md5'
      },
      bodyPreview: bodyJsonString.length > 100
        ? bodyJsonString.substring(0, 100) + '...'
        : bodyJsonString,
      rawPreview: raw.length > 70
        ? `${raw.substring(0, 50)}...${raw.substring(raw.length - 20)}`
        : raw,
      sign: sign
    });

    return {
      'Content-Type': 'application/json',
      'accessKey': auth.accessKey,
      'bizType': auth.bizType,
      'action': 'callAppend',
      'ts': ts,
      'sign': sign,
      'algorithm': 'md5'
    };
  }

  // 生成contactId的函数
  function generateContactIdFromPhone(phone: string): string {
    const hash = CryptoJS.MD5(phone + Date.now() + Math.random()).toString();
    return hash.substring(0, 28) + hash.substring(28, 32);
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  // 为每个号码单独调用OpenAPI
  for (const phoneData of phoneNumbers) {
    try {
      const phoneNumber = typeof phoneData === 'string' ? phoneData : phoneData.phoneNumber;
      const phoneParams = typeof phoneData === 'object' ? phoneData.params || [] : [];
      const contactName = typeof phoneData === 'object' ? phoneData.name || phoneNumber : phoneNumber;

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
          name: contactName,
          params: phoneParams
        }]
      };

      const headers = buildOpenApiHeaders(openApiConfig.auth, cmd);

      // 调试：打印请求详情
      console.log(`[${new Date().toLocaleString()}] 📡 发送追加号码请求:`, {
        url: `${openApiConfig.baseURL}/openapi/aiagent/call/append`,
        headers: {
          ...headers,
          accessKey: headers.accessKey.substring(0, 10) + '***',
          accessSecret: '***'
        },
        body: cmd
      });

      // 调用OpenAPI
      const response = await axios.post(
        `${openApiConfig.baseURL}/openapi/aiagent/call/append`,
        cmd,
        { headers }
      );

      // 调试：打印响应详情
      console.log(`[${new Date().toLocaleString()}] 📨 追加号码响应:`, {
        status: response.status,
        data: response.data
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
      console.error(`[${new Date().toLocaleString()}] ❌ 追加号码请求失败:`, {
        phoneNumber: typeof phoneData === 'string' ? phoneData : phoneData.phoneNumber,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      failCount++;
      results.push({
        phoneNumber: typeof phoneData === 'string' ? phoneData : phoneData.phoneNumber,
        success: false,
        error: error.message || 'Request failed',
        response: error.response?.data
      });
    }
  }

  return {
    code: failCount === 0 ? 200 : (successCount > 0 ? 207 : 500),
    message: failCount === 0 ? '追加号码完成' : (successCount > 0 ? '部分号码追加成功' : '追加号码失败'),
    data: {
      total: phoneNumbers.length,
      success: successCount,
      failed: failCount,
      results: results
    }
  };
}

/**
 * 获取可用模板列表
 * GET /api/webhook/templates
 */
router.get('/templates', (req, res) => {
  res.json({
    code: 200,
    message: '可用模板列表',
    data: {
      templates: getAvailableTemplates(),
      description: '支持的表单模板配置'
    }
  });
});

/**
 * 获取表单映射配置（向后兼容）
 * GET /api/webhook/form-mapping
 */
router.get('/form-mapping', (req, res) => {
  res.json({
    code: 200,
    message: '表单映射配置（已废弃，请使用 /api/webhook/templates）',
    data: {
      mappings: getAvailableTemplates(),
      description: '表单模板配置（新版）'
    }
  });
});

/**
 * 获取模板详情
 * GET /api/webhook/templates/:templateId
 */
router.get('/templates/:templateId', (req, res): void => {
  const { templateId } = req.params;

  const templateMapping = getTemplateMapping(templateId);
  if (!templateMapping) {
    res.status(404).json({
      code: 404,
      message: `Template not found: ${templateId}`,
      error: 'TEMPLATE_NOT_FOUND',
      availableTemplates: getAvailableTemplates()
    });
    return;
  }

  res.json({
    code: 200,
    message: '模板详情',
    data: templateMapping
  });
});

/**
 * 添加新模板（开发调试用）
 * POST /api/webhook/templates
 */
router.post('/templates', express.json(), (req, res): void => {
  const { templateId, name, description, fieldMapping, tags, useCase } = req.body;

  if (!templateId || !name || !fieldMapping?.phone) {
    res.status(400).json({
      code: 400,
      message: 'Missing required fields: templateId, name, fieldMapping.phone',
      error: 'INVALID_PARAMETERS'
    });
    return;
  }

  try {
    // 这里可以实现动态添加模板的逻辑
    // 由于当前是只读配置，暂时返回提示信息
    res.status(501).json({
      code: 501,
      message: 'Dynamic template creation not implemented. Please edit config/form-templates.config.ts directly.',
      error: 'NOT_IMPLEMENTED',
      suggestion: 'Edit config/form-templates.config.ts to add new templates'
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: 'Failed to create template',
      error: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

/**
 * 更新模板（开发调试用）
 * PUT /api/webhook/templates/:templateId
 */
router.put('/templates/:templateId', express.json(), (req, res): void => {
  const { templateId } = req.params;
  const updates = req.body;

  try {
    // 这里可以实现动态更新模板的逻辑
    // 由于当前是只读配置，暂时返回提示信息
    res.status(501).json({
      code: 501,
      message: 'Dynamic template update not implemented. Please edit config/form-templates.config.ts directly.',
      error: 'NOT_IMPLEMENTED',
      suggestion: 'Edit config/form-templates.config.ts to modify templates'
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: 'Failed to update template',
      error: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

/**
 * 删除模板（开发调试用）
 * DELETE /api/webhook/templates/:templateId
 */
router.delete('/templates/:templateId', (req, res): void => {
  const { templateId } = req.params;

  try {
    // 这里可以实现动态删除模板的逻辑
    // 由于当前是只读配置，暂时返回提示信息
    res.status(501).json({
      code: 501,
      message: 'Dynamic template deletion not implemented. Please edit config/form-templates.config.ts directly.',
      error: 'NOT_IMPLEMENTED',
      suggestion: 'Edit config/form-templates.config.ts to remove templates'
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: 'Failed to delete template',
      error: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

export default router;
