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
const { getTaskIdByFormId, getAvailableFormMappings } = require('../config/form-mapping.config');
const router = express_1.default.Router();
router.post('/form-submission', express_1.default.json(), apiKeyAuth_1.apiKeyAuth, async (req, res) => {
    try {
        const webhookData = req.body;
        console.log(`[${new Date().toLocaleString()}] 📝 收到表单数据推送:`, {
            formId: webhookData.form,
            formName: webhookData.form_name,
            serialNumber: webhookData.entry.serial_number,
            creator: webhookData.entry.creator_name,
            ip: webhookData.entry.info_remote_ip
        });
        if (!webhookData.form || !webhookData.entry) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid webhook data: missing form or entry',
                error: 'INVALID_WEBHOOK_DATA'
            });
        }
        const taskId = getTaskIdByFormId(webhookData.form);
        if (!taskId) {
            return res.status(400).json({
                code: 400,
                message: `No taskID mapping found for form: ${webhookData.form}`,
                error: 'FORM_NOT_CONFIGURED',
                availableForms: getAvailableFormMappings()
            });
        }
        const phoneNumber = webhookData.entry.field_5;
        if (!phoneNumber || !/^1[3-9]\d{9}$/.test(phoneNumber)) {
            console.warn(`[${new Date().toLocaleString()}] ⚠️  无效电话号码: ${phoneNumber}，跳过验证继续处理`);
        }
        const phoneData = {
            phoneNumber: phoneNumber,
            params: []
        };
        if (webhookData.entry.field_2) {
            phoneData.params.push({
                name: webhookData.entry.field_2,
                value: webhookData.entry.field_2
            });
        }
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
        const appendReq = {
            body: {
                taskId: taskId,
                phoneNumbers: [phoneData],
                autoFlowId: null,
                countryCode: '86'
            },
            apiKey: req.apiKey,
            apiKeyConfig: req.apiKeyConfig
        };
        const result = await processAppendNumbers(appendReq);
        console.log(`[${new Date().toLocaleString()}] ✅ 表单数据处理完成:`, {
            formId: webhookData.form,
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
                formId: webhookData.form,
                serialNumber: webhookData.entry.serial_number,
                phoneNumber: phoneNumber,
                taskId: taskId,
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
router.post('/update-mapping', express_1.default.json(), async (req, res) => {
    const { formId, taskId, formName, description } = req.body;
    if (!formId || !taskId) {
        return res.status(400).json({
            code: 400,
            message: 'Missing formId or taskId',
            error: 'INVALID_PARAMETERS'
        });
    }
    try {
        const configModule = await Promise.resolve().then(() => __importStar(require('../config/form-mapping.config')));
        const { DEFAULT_FORM_MAPPINGS } = configModule;
        let existingMapping = DEFAULT_FORM_MAPPINGS.find(m => m.formId === formId);
        if (existingMapping) {
            existingMapping.taskId = taskId;
            existingMapping.formName = formName || existingMapping.formName;
            existingMapping.description = description || existingMapping.description;
            existingMapping.updatedAt = new Date().toISOString();
            existingMapping.enabled = true;
        }
        else {
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
    }
    catch (error) {
        console.error(`[${new Date().toLocaleString()}] ❌ 更新表单映射失败:`, error);
        res.status(500).json({
            code: 500,
            message: '更新表单映射失败',
            error: 'INTERNAL_ERROR',
            details: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=formWebhook.js.map