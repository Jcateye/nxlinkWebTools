import express from 'express';
import { appendNumbers } from './openapi';
import { getTaskIdByFormId, isValidFormId, getAvailableFormMappings } from '../../../config/form-mapping.config';

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

/**
 * 表单数据推送接收接口
 * POST /api/webhook/form-submission
 */
router.post('/form-submission', express.json(), async (req, res) => {
  try {
    const webhookData: FormWebhookData = req.body;

    console.log(`[${new Date().toLocaleString()}] 📝 收到表单数据推送:`, {
      formId: webhookData.form,
      formName: webhookData.form_name,
      serialNumber: webhookData.entry.serial_number,
      creator: webhookData.entry.creator_name,
      ip: webhookData.entry.info_remote_ip
    });

    // 验证必需字段
    if (!webhookData.form || !webhookData.entry) {
      return res.status(400).json({
        code: 400,
        message: 'Invalid webhook data: missing form or entry',
        error: 'INVALID_WEBHOOK_DATA'
      });
    }

    // 检查表单ID是否有对应的taskID映射
    const taskId = getTaskIdByFormId(webhookData.form);
    if (!taskId) {
      return res.status(400).json({
        code: 400,
        message: `No taskID mapping found for form: ${webhookData.form}`,
        error: 'FORM_NOT_CONFIGURED',
        availableForms: getAvailableFormMappings()
      });
    }

    // 提取并验证电话号码
    const phoneNumber = webhookData.entry.field_5;
    if (!phoneNumber || !/^1[3-9]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({
        code: 400,
        message: 'Invalid phone number in field_5',
        error: 'INVALID_PHONE_NUMBER',
        receivedPhone: phoneNumber
      });
    }

    // 构建追加号码的数据
    const phoneData = {
      phoneNumber: phoneNumber,
      params: []
    };

    // 如果有field_2（姓名），添加到参数中
    if (webhookData.entry.field_2) {
      phoneData.params.push({
        name: webhookData.entry.field_2, // 姓名作为参数名
        value: webhookData.entry.field_2  // 姓名也作为参数值
      });
    }

    // 添加其他有用的表单信息到参数
    if (webhookData.entry.field_3) {
      phoneData.params.push({
        name: 'field_3',
        value: webhookData.entry.field_3
      });
    }

    if (webhookData.entry.field_4) {
      phoneData.params.push({
        name: 'field_4',
        value: webhookData.entry.field_4
      });
    }

    if (webhookData.entry.field_6) {
      phoneData.params.push({
        name: '邮箱',
        value: webhookData.entry.field_6
      });
    }

    if (webhookData.entry.info_region) {
      const region = webhookData.entry.info_region;
      phoneData.params.push({
        name: '地区',
        value: `${region.province || ''}${region.city || ''}${region.district || ''}`.trim()
      });
    }

    // 添加表单元信息
    phoneData.params.push({
      name: '表单名称',
      value: webhookData.form_name
    });

    phoneData.params.push({
      name: '提交时间',
      value: webhookData.entry.created_at
    });

    if (webhookData.entry.creator_name) {
      phoneData.params.push({
        name: '创建者',
        value: webhookData.entry.creator_name
      });
    }

    console.log(`[${new Date().toLocaleString()}] 🔄 处理表单数据:`, {
      formId: webhookData.form,
      phoneNumber: phoneNumber,
      paramsCount: phoneData.params.length,
      taskId: taskId
    });

    // 模拟AuthenticatedRequest对象来调用追加号码接口
    // 注意：这里我们需要使用默认的API Key配置
    const mockReq = {
      body: {
        taskId: taskId,
        phoneNumbers: [phoneData],
        autoFlowId: null,
        countryCode: '86'
      },
      apiKeyConfig: null // 使用默认配置
    };

    // 调用追加号码接口的逻辑
    // 这里我们需要复制append-numbers路由的逻辑
    const result = await processAppendNumbers(mockReq);

    console.log(`[${new Date().toLocaleString()}] ✅ 表单数据处理完成:`, {
      formId: webhookData.form,
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
        formId: webhookData.form,
        serialNumber: webhookData.entry.serial_number,
        phoneNumber: phoneNumber,
        taskId: taskId,
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
async function processAppendNumbers(req: any) {
  const { taskId, phoneNumbers, autoFlowId, countryCode } = req.body;

  // 这里需要导入必要的函数和配置
  const { PROJECT_CONFIG } = await import('../../../config/project.config');

  // 使用默认的OpenAPI配置
  const openApiConfig = {
    baseURL: PROJECT_CONFIG.openapi.baseUrl,
    auth: {
      accessKey: PROJECT_CONFIG.openapi.accessKey,
      accessSecret: PROJECT_CONFIG.openapi.accessSecret,
      bizType: PROJECT_CONFIG.openapi.bizType
    }
  };

  // 导入必要的函数
  const CryptoJS = await import('crypto-js');
  const axios = (await import('axios')).default;

  // 生成签名头部的函数
  function buildOpenApiHeaders(auth: any, body: any) {
    const ts = String(Date.now());
    const raw = `accessKey=${auth.accessKey}&action=callAppend&bizType=${auth.bizType}&ts=${ts}`;
    const sign = CryptoJS.MD5(raw + auth.accessSecret).toString();

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

      const headers = buildOpenApiHeaders(openApiConfig.auth, cmd);

      // 调用OpenAPI
      const response = await axios.post(
        `${openApiConfig.baseURL}/openapi/aiagent/call/append`,
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
 * 获取表单映射配置
 * GET /api/webhook/form-mapping
 */
router.get('/form-mapping', (req, res) => {
  res.json({
    code: 200,
    message: '表单映射配置',
    data: {
      mappings: getAvailableFormMappings(),
      description: '表单ID到taskID的映射配置'
    }
  });
});

/**
 * 更新表单映射配置（仅用于开发调试）
 * POST /api/webhook/update-mapping
 */
router.post('/update-mapping', express.json(), async (req, res) => {
  const { formId, taskId, formName, description } = req.body;

  if (!formId || !taskId) {
    return res.status(400).json({
      code: 400,
      message: 'Missing formId or taskId',
      error: 'INVALID_PARAMETERS'
    });
  }

  try {
    // 动态导入配置文件进行更新
    const configModule = await import('../../../config/form-mapping.config');
    const { DEFAULT_FORM_MAPPINGS } = configModule;

    // 查找或创建映射
    let existingMapping = DEFAULT_FORM_MAPPINGS.find(m => m.formId === formId);

    if (existingMapping) {
      // 更新现有映射
      existingMapping.taskId = taskId;
      existingMapping.formName = formName || existingMapping.formName;
      existingMapping.description = description || existingMapping.description;
      existingMapping.updatedAt = new Date().toISOString();
      existingMapping.enabled = true;
    } else {
      // 创建新映射
      const newMapping = {
        formId,
        taskId,
        formName: formName || `表单 ${formId}`,
        description: description || '动态添加的表单映射',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      DEFAULT_FORM_MAPPINGS.push(newMapping);
    }

    console.log(`[${new Date().toLocaleString()}] 🔧 更新表单映射: ${formId} -> ${taskId}`);

    res.json({
      code: 200,
      message: '表单映射更新成功',
      data: {
        formId,
        taskId,
        formName,
        description,
        mappings: getAvailableFormMappings()
      }
    });

  } catch (error: any) {
    console.error(`[${new Date().toLocaleString()}] ❌ 更新表单映射失败:`, error);

    res.status(500).json({
      code: 500,
      message: '更新表单映射失败',
      error: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

export default router;
