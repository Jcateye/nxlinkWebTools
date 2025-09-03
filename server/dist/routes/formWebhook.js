"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const form_templates_config_1 = require("../../config/form-templates.config");
const router = express_1.default.Router();
function getTemplateMapping(templateId) {
    return (0, form_templates_config_1.getTemplateById)(templateId);
}
function isValidTemplate(templateId) {
    return (0, form_templates_config_1.isValidTemplateId)(templateId);
}
router.post('/:taskId/form-submission', express_1.default.json(), apiKeyAuth_1.apiKeyAuth, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { templateId = 'contact', countryCode = '86' } = req.query;
        const webhookData = req.body;
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
        if (!taskId) {
            return res.status(400).json({
                code: 400,
                message: 'Missing required parameter: taskId',
                error: 'MISSING_TASK_ID'
            });
        }
        if (!webhookData.entry) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid webhook data: missing entry',
                error: 'INVALID_WEBHOOK_DATA'
            });
        }
        const templateMapping = getTemplateMapping(templateId);
        if (!templateMapping) {
            return res.status(400).json({
                code: 400,
                message: `Template not found: ${templateId}`,
                error: 'TEMPLATE_NOT_FOUND',
                availableTemplates: (0, form_templates_config_1.getAvailableTemplates)()
            });
        }
        console.log(`[${new Date().toLocaleString()}] 🎨 使用模板: ${templateId} (${templateMapping.name})`);
        const phoneField = templateMapping.fieldMapping.phone;
        const phoneNumber = webhookData.entry[phoneField];
        if (!phoneNumber) {
            return res.status(400).json({
                code: 400,
                message: `Missing required phone number in field: ${phoneField}`,
                error: 'MISSING_PHONE_NUMBER',
                templateId,
                requiredField: phoneField
            });
        }
        if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
            console.warn(`[${new Date().toLocaleString()}] ⚠️  无效电话号码: ${phoneNumber}，跳过验证继续处理`);
        }
        const phoneData = {
            phoneNumber: phoneNumber,
            params: []
        };
        const fieldMapping = templateMapping.fieldMapping;
        if (fieldMapping.name && webhookData.entry[fieldMapping.name]) {
            phoneData.params.push({
                name: '姓名',
                value: String(webhookData.entry[fieldMapping.name])
            });
        }
        if (fieldMapping.email && webhookData.entry[fieldMapping.email]) {
            phoneData.params.push({
                name: '邮箱',
                value: String(webhookData.entry[fieldMapping.email])
            });
        }
        if (fieldMapping.company && webhookData.entry[fieldMapping.company]) {
            phoneData.params.push({
                name: '公司',
                value: String(webhookData.entry[fieldMapping.company])
            });
        }
        if (fieldMapping.message && webhookData.entry[fieldMapping.message]) {
            phoneData.params.push({
                name: '留言',
                value: String(webhookData.entry[fieldMapping.message])
            });
        }
        if (webhookData.entry.info_region) {
            const region = webhookData.entry.info_region;
            const regionStr = `${region.province || ''}${region.city || ''}${region.district || ''}`.trim();
            if (regionStr) {
                phoneData.params.push({
                    name: '地区',
                    value: regionStr
                });
            }
        }
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
        const appendReq = {
            body: {
                taskId: taskId,
                phoneNumbers: [phoneData],
                autoFlowId: null,
                countryCode: countryCode
            },
            apiKey: req.apiKey,
            apiKeyConfig: req.apiKeyConfig
        };
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
    }
    catch (error) {
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
async function processAppendNumbers(req) {
    const { taskId, phoneNumbers, autoFlowId, countryCode } = req.body;
    let openApiConfig;
    if (req.apiKeyConfig && req.apiKeyConfig.openapi) {
        openApiConfig = {
            baseURL: req.apiKeyConfig.openapi.baseUrl,
            auth: {
                accessKey: req.apiKeyConfig.openapi.accessKey,
                accessSecret: req.apiKeyConfig.openapi.accessSecret,
                bizType: req.apiKeyConfig.openapi.bizType
            }
        };
        console.log(`[${new Date().toLocaleString()}] 🔑 使用API Key配置: ${req.apiKeyConfig.alias}`);
    }
    else {
        const { PROJECT_CONFIG } = await Promise.resolve().then(() => __importStar(require('../config/project.config')));
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
    const CryptoJS = await Promise.resolve().then(() => __importStar(require('crypto-js')));
    const axios = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
    function buildOpenApiHeaders(auth, body) {
        const ts = String(Date.now());
        const headersStr = `accessKey=${auth.accessKey}&action=callAppend&bizType=${auth.bizType}&ts=${ts}`;
        const bodyJsonString = JSON.stringify(body);
        let raw = headersStr;
        if (bodyJsonString && bodyJsonString !== '{}') {
            raw += `&body=${bodyJsonString}`;
        }
        raw += `&accessSecret=${auth.accessSecret}`;
        const sign = CryptoJS.MD5(raw).toString();
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
    function generateContactIdFromPhone(phone) {
        const hash = CryptoJS.MD5(phone + Date.now() + Math.random()).toString();
        return hash.substring(0, 28) + hash.substring(28, 32);
    }
    const results = [];
    let successCount = 0;
    let failCount = 0;
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
            console.log(`[${new Date().toLocaleString()}] 📡 发送追加号码请求:`, {
                url: `${openApiConfig.baseURL}/openapi/aiagent/call/append`,
                headers: {
                    ...headers,
                    accessKey: headers.accessKey.substring(0, 10) + '***',
                    accessSecret: '***'
                },
                body: cmd
            });
            const response = await axios.post(`${openApiConfig.baseURL}/openapi/aiagent/call/append`, cmd, { headers });
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
            }
            else {
                failCount++;
                results.push({
                    phoneNumber,
                    success: false,
                    error: response.data?.message || 'Unknown error',
                    response: response.data
                });
            }
        }
        catch (error) {
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
router.get('/templates', (req, res) => {
    res.json({
        code: 200,
        message: '可用模板列表',
        data: {
            templates: (0, form_templates_config_1.getAvailableTemplates)(),
            description: '支持的表单模板配置'
        }
    });
});
router.get('/form-mapping', (req, res) => {
    res.json({
        code: 200,
        message: '表单映射配置（已废弃，请使用 /api/webhook/templates）',
        data: {
            mappings: (0, form_templates_config_1.getAvailableTemplates)(),
            description: '表单模板配置（新版）'
        }
    });
});
router.get('/templates/:templateId', (req, res) => {
    const { templateId } = req.params;
    const templateMapping = getTemplateMapping(templateId);
    if (!templateMapping) {
        res.status(404).json({
            code: 404,
            message: `Template not found: ${templateId}`,
            error: 'TEMPLATE_NOT_FOUND',
            availableTemplates: (0, form_templates_config_1.getAvailableTemplates)()
        });
        return;
    }
    res.json({
        code: 200,
        message: '模板详情',
        data: templateMapping
    });
});
router.post('/templates', express_1.default.json(), (req, res) => {
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
        res.status(501).json({
            code: 501,
            message: 'Dynamic template creation not implemented. Please edit config/form-templates.config.ts directly.',
            error: 'NOT_IMPLEMENTED',
            suggestion: 'Edit config/form-templates.config.ts to add new templates'
        });
    }
    catch (error) {
        res.status(500).json({
            code: 500,
            message: 'Failed to create template',
            error: 'INTERNAL_ERROR',
            details: error.message
        });
    }
});
router.put('/templates/:templateId', express_1.default.json(), (req, res) => {
    const { templateId } = req.params;
    const updates = req.body;
    try {
        res.status(501).json({
            code: 501,
            message: 'Dynamic template update not implemented. Please edit config/form-templates.config.ts directly.',
            error: 'NOT_IMPLEMENTED',
            suggestion: 'Edit config/form-templates.config.ts to modify templates'
        });
    }
    catch (error) {
        res.status(500).json({
            code: 500,
            message: 'Failed to update template',
            error: 'INTERNAL_ERROR',
            details: error.message
        });
    }
});
router.delete('/templates/:templateId', (req, res) => {
    const { templateId } = req.params;
    try {
        res.status(501).json({
            code: 501,
            message: 'Dynamic template deletion not implemented. Please edit config/form-templates.config.ts directly.',
            error: 'NOT_IMPLEMENTED',
            suggestion: 'Edit config/form-templates.config.ts to remove templates'
        });
    }
    catch (error) {
        res.status(500).json({
            code: 500,
            message: 'Failed to delete template',
            error: 'INTERNAL_ERROR',
            details: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=formWebhook.js.map