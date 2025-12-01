"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const crypto_js_1 = __importDefault(require("crypto-js"));
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const router = express_1.default.Router();
const project_config_1 = require("../config/project.config");
const configManager_1 = require("../services/configManager");
function getOpenApiConfigForApiKey(req) {
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
    return {
        baseURL: project_config_1.PROJECT_CONFIG.openapi.baseUrl,
        auth: {
            accessKey: project_config_1.PROJECT_CONFIG.openapi.accessKey,
            accessSecret: project_config_1.PROJECT_CONFIG.openapi.accessSecret,
            bizType: project_config_1.PROJECT_CONFIG.openapi.bizType
        }
    };
}
function logDebug(title, payload) {
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
            requestUrl: payload.requestUrl,
            status: payload.status,
            responseData: payload.responseData,
            errorMessage: payload.errorMessage,
            errorCode: payload.errorCode,
        };
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] [OpenAPI Debug] ${title}:`, JSON.stringify(logObj, null, 2));
    }
    catch (e) {
        console.log('[OpenAPI Debug] log error', e?.message);
    }
}
function generateOpenApiSign(headers, bodyJsonString, accessSecret, options = {}) {
    const { algorithm = "md5" } = options;
    const headersStr = `accessKey=${headers.accessKey}&action=${headers.action}&bizType=${headers.bizType}&ts=${headers.ts}`;
    let raw = headersStr;
    if (bodyJsonString && bodyJsonString !== '{}') {
        raw += `&body=${bodyJsonString}`;
    }
    raw += `&accessSecret=${accessSecret}`;
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
    let sign;
    if (algorithm === "sha256") {
        sign = crypto_js_1.default.SHA256(raw).toString(crypto_js_1.default.enc.Hex);
    }
    else {
        sign = crypto_js_1.default.MD5(raw).toString(crypto_js_1.default.enc.Hex);
    }
    return sign;
}
function generateContactIdFromPhone(phone) {
    const base28 = crypto_js_1.default.MD5(String(phone || '')).toString().toLowerCase().substring(0, 28);
    const saltSource = `${Date.now()}-${Math.random()}`;
    const salt8 = crypto_js_1.default.MD5(saltSource).toString().toLowerCase().substring(0, 8);
    const mixed = base28 + salt8;
    return `${mixed.substring(0, 8)}-${mixed.substring(8, 12)}-${mixed.substring(12, 16)}-${mixed.substring(16, 20)}-${mixed.substring(20, 32)}`;
}
function buildOpenApiHeaders(config, body) {
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
router.post('/append-numbers', apiKeyAuth_1.apiKeyAuth, async (req, res) => {
    try {
        const { taskId, phoneNumbers, autoFlowId, countryCode, params } = req.body;
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
        const openApiConfig = getOpenApiConfigForApiKey(req);
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
                const response = await axios_1.default.post(`${openApiConfig.baseURL}/openapi/aiagent/call/append`, cmd, { headers });
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
                failCount++;
                results.push({
                    phoneNumber: typeof phoneData === 'string' ? phoneData : phoneData.phoneNumber,
                    success: false,
                    error: error.message || 'Request failed'
                });
            }
        }
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
            apiKey: req.apiKey
        });
        return;
    }
    catch (error) {
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
router.post('/task-list', apiKeyAuth_1.apiKeyAuth, async (req, res) => {
    try {
        const params = req.body;
        const openApiConfig = getOpenApiConfigForApiKey(req);
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
        try {
            const response = await axios_1.default.post(`${openApiConfig.baseURL}/openapi/aiagent/task/list`, params, { headers });
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
        }
        catch (axiosError) {
            console.error('OpenAPI task-list 详细错误信息:', {
                apiKey: req.apiKey,
                alias: req.apiKeyConfig?.alias,
                baseURL: openApiConfig.baseURL,
                action: 'pageCallTaskInfo',
                requestUrl: `${openApiConfig.baseURL}/openapi/aiagent/task/list`,
                requestHeaders: headers,
                requestBody: params,
                responseStatus: axiosError.response?.status,
                responseHeaders: axiosError.response?.headers,
                responseData: axiosError.response?.data,
                errorMessage: axiosError.message,
                errorCode: axiosError.code
            });
            logDebug('Error task-list detailed', {
                apiKey: req.apiKey,
                alias: req.apiKeyConfig?.alias,
                baseURL: openApiConfig.baseURL,
                action: 'pageCallTaskInfo',
                requestUrl: `${openApiConfig.baseURL}/openapi/aiagent/task/list`,
                status: axiosError.response?.status,
                responseData: axiosError.response?.data,
                error: axiosError.message
            });
            res.status(500).json({
                code: 500,
                message: 'Internal server error',
                error: axiosError.message,
                details: {
                    status: axiosError.response?.status,
                    responseData: axiosError.response?.data
                }
            });
            return;
        }
    }
    catch (error) {
        console.error('OpenAPI task-list 未知错误:', error);
        logDebug('Error task-list unknown', { apiKey: req.apiKey, alias: req.apiKeyConfig?.alias, error });
        res.status(500).json({
            code: 500,
            message: 'Internal server error',
            error: error.message
        });
        return;
    }
});
router.post('/call-records', apiKeyAuth_1.apiKeyAuth, async (req, res) => {
    try {
        const params = req.body;
        const openApiConfig = getOpenApiConfigForApiKey(req);
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
        const response = await axios_1.default.post(`${openApiConfig.baseURL}/openapi/aiagent/call/list`, params, { headers });
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
    }
    catch (error) {
        logDebug('Error call-records', { apiKey: req.apiKey, alias: req.apiKeyConfig?.alias, error });
        res.status(500).json({
            code: 500,
            message: 'Internal server error',
            error: error.message
        });
        return;
    }
});
router.post('/delete-number', apiKeyAuth_1.apiKeyAuth, async (req, res) => {
    try {
        const { taskId, contactId } = req.body;
        if (!taskId || !contactId) {
            res.status(400).json({
                code: 400,
                message: 'taskId and contactId are required',
                error: 'MISSING_PARAMETERS'
            });
            return;
        }
        const openApiConfig = getOpenApiConfigForApiKey(req);
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
        const response = await axios_1.default.post(`${openApiConfig.baseURL}/openapi/aiagent/call/delete`, cmd, { headers });
        res.json({
            code: 200,
            message: '删除成功',
            data: response.data,
            apiKey: req.apiKey
        });
        return;
    }
    catch (error) {
        console.error('OpenAPI delete number error:', error);
        res.status(500).json({
            code: 500,
            message: 'Internal server error',
            error: error.message
        });
        return;
    }
});
router.get('/status', apiKeyAuth_1.apiKeyAuth, (req, res) => {
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
router.get('/keys', (req, res) => {
    const allApiKeys = (0, configManager_1.getAllApiKeys)();
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
exports.default = router;
//# sourceMappingURL=openapi.js.map