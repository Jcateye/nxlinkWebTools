"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const configManager_1 = require("../services/configManager");
const project_config_1 = require("../../../config/project.config");
const router = express_1.default.Router();
router.get('/list', (req, res) => {
    try {
        const apiKeys = (0, configManager_1.getAllApiKeys)();
        const stats = (0, configManager_1.getConfigStats)();
        res.json({
            code: 200,
            message: '获取成功',
            data: {
                totalKeys: apiKeys.length,
                keys: apiKeys.map(key => {
                    const config = require('../services/configManager').readApiKeysConfig();
                    const isFromFile = config.keys.some((fileKey) => fileKey.apiKey === key.apiKey);
                    return {
                        apiKey: key.apiKey,
                        alias: key.alias,
                        description: key.description,
                        hasOpenApiConfig: !!(key.openapi.accessKey && key.openapi.accessSecret),
                        openApiBaseUrl: key.openapi.baseUrl,
                        bizType: key.openapi.bizType,
                        isFromEnv: !isFromFile,
                        openapi: {
                            accessKey: key.openapi.accessKey ? '***' : '',
                            accessSecret: key.openapi.accessSecret ? '***' : '',
                            bizType: key.openapi.bizType,
                            baseUrl: key.openapi.baseUrl
                        }
                    };
                }),
                stats
            }
        });
        return Promise.resolve();
    }
    catch (error) {
        console.error('获取API Keys失败:', error);
        res.status(500).json({
            code: 500,
            message: '获取失败',
            error: error.message
        });
        return Promise.resolve();
    }
});
router.post('/add', (req, res) => {
    try {
        const apiKeyConfig = req.body;
        const errors = (0, configManager_1.validateApiKeyConfig)(apiKeyConfig);
        if (errors.length > 0) {
            res.status(400).json({
                code: 400,
                message: '配置验证失败',
                errors
            });
            return Promise.resolve();
        }
        (0, configManager_1.addApiKey)(apiKeyConfig);
        res.json({
            code: 200,
            message: 'API Key 添加成功',
            data: {
                apiKey: apiKeyConfig.apiKey,
                alias: apiKeyConfig.alias
            }
        });
        console.log(`✅ API Key已添加: ${apiKeyConfig.alias} (${apiKeyConfig.apiKey})`);
        return Promise.resolve();
    }
    catch (error) {
        console.error('添加API Key失败:', error);
        res.status(500).json({
            code: 500,
            message: error.message || '添加失败'
        });
        return Promise.resolve();
    }
});
router.put('/update/:apiKey', (req, res) => {
    try {
        const apiKey = req.params.apiKey;
        const updates = req.body;
        if (Object.keys(updates).length === 0) {
            res.status(400).json({
                code: 400,
                message: '没有提供更新数据'
            });
            return Promise.resolve();
        }
        if (updates.apiKey || updates.alias || updates.openapi) {
            const errors = (0, configManager_1.validateApiKeyConfig)(updates);
            if (errors.length > 0) {
                res.status(400).json({
                    code: 400,
                    message: '配置验证失败',
                    errors
                });
                return Promise.resolve();
            }
        }
        (0, configManager_1.updateApiKey)(apiKey, updates);
        res.json({
            code: 200,
            message: 'API Key 更新成功',
            data: {
                apiKey: updates.apiKey || apiKey,
                alias: updates.alias
            }
        });
        console.log(`✅ API Key已更新: ${apiKey}`);
        return Promise.resolve();
    }
    catch (error) {
        console.error('更新API Key失败:', error);
        res.status(500).json({
            code: 500,
            message: error.message || '更新失败'
        });
        return Promise.resolve();
    }
});
router.delete('/delete/:apiKey', (req, res) => {
    try {
        const apiKey = req.params.apiKey;
        (0, configManager_1.deleteApiKey)(apiKey);
        res.json({
            code: 200,
            message: 'API Key 删除成功',
            data: {
                apiKey: apiKey.length > 8 ? apiKey.substring(0, 8) + '***' : apiKey
            }
        });
        return Promise.resolve();
    }
    catch (error) {
        console.error(`删除API Key失败: ${error.message}`);
        res.status(500).json({
            code: 500,
            message: error.message || '删除失败'
        });
        return Promise.resolve();
    }
});
router.get('/detail/:apiKey', (req, res) => {
    try {
        const apiKey = req.params.apiKey;
        const allKeys = (0, configManager_1.getAllApiKeys)();
        const keyConfig = allKeys.find(key => key.apiKey === apiKey);
        if (!keyConfig) {
            res.status(404).json({
                code: 404,
                message: 'API Key 不存在'
            });
            return Promise.resolve();
        }
        res.json({
            code: 200,
            message: '获取成功',
            data: {
                apiKey: keyConfig.apiKey,
                alias: keyConfig.alias,
                description: keyConfig.description,
                openapi: {
                    accessKey: keyConfig.openapi.accessKey ?
                        keyConfig.openapi.accessKey.substring(0, 10) + '***' : '',
                    accessSecret: keyConfig.openapi.accessSecret ? '***' : '',
                    bizType: keyConfig.openapi.bizType,
                    baseUrl: keyConfig.openapi.baseUrl
                }
            }
        });
        return Promise.resolve();
    }
    catch (error) {
        console.error('获取API Key详情失败:', error);
        res.status(500).json({
            code: 500,
            message: error.message || '获取失败'
        });
        return Promise.resolve();
    }
});
router.post('/test', async (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey) {
            res.status(400).json({
                code: 400,
                message: 'API Key 不能为空'
            });
            return;
        }
        const allKeys = (0, configManager_1.getAllApiKeys)();
        const keyConfig = allKeys.find(key => key.apiKey === apiKey);
        if (!keyConfig) {
            res.status(404).json({
                code: 404,
                message: 'API Key 不存在'
            });
            return;
        }
        const hasValidConfig = keyConfig.openapi.accessKey && keyConfig.openapi.accessSecret;
        res.json({
            code: 200,
            message: '测试完成',
            data: {
                apiKey: keyConfig.apiKey,
                alias: keyConfig.alias,
                description: keyConfig.description,
                testResult: {
                    isValid: hasValidConfig,
                    message: hasValidConfig ? 'API Key配置有效' : 'OpenAPI配置不完整',
                    timestamp: new Date().toISOString()
                },
                config: {
                    hasOpenApiConfig: hasValidConfig,
                    openApiBaseUrl: keyConfig.openapi.baseUrl,
                    bizType: keyConfig.openapi.bizType
                }
            }
        });
        return;
    }
    catch (error) {
        console.error('测试API Key失败:', error);
        res.status(500).json({
            code: 500,
            message: error.message || '测试失败'
        });
        return;
    }
});
router.get('/stats', (req, res) => {
    try {
        const stats = (0, configManager_1.getConfigStats)();
        res.json({
            code: 200,
            message: '获取成功',
            data: stats
        });
        return Promise.resolve();
    }
    catch (error) {
        console.error('获取统计信息失败:', error);
        res.status(500).json({
            code: 500,
            message: error.message || '获取失败'
        });
        return Promise.resolve();
    }
});
router.post('/verify-admin-password', (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            res.status(400).json({
                code: 400,
                message: '密码不能为空'
            });
            return Promise.resolve();
        }
        const isValid = password === project_config_1.PROJECT_CONFIG.server.adminPassword;
        res.json({
            code: 200,
            message: isValid ? '密码验证成功' : '密码验证失败',
            data: {
                isValid,
                timestamp: new Date().toISOString()
            }
        });
        console.log(`${isValid ? '✅' : '❌'} 超级管理员密码验证: ${isValid ? '成功' : '失败'}`);
        return Promise.resolve();
    }
    catch (error) {
        console.error('验证超级管理员密码失败:', error);
        res.status(500).json({
            code: 500,
            message: '验证失败',
            error: error.message
        });
        return Promise.resolve();
    }
});
router.post('/full-detail/:apiKey', (req, res) => {
    try {
        const apiKey = req.params.apiKey;
        const { password } = req.body;
        if (!password || password !== project_config_1.PROJECT_CONFIG.server.adminPassword) {
            res.status(403).json({
                code: 403,
                message: '超级管理员密码验证失败'
            });
            return Promise.resolve();
        }
        const allKeys = (0, configManager_1.getAllApiKeys)();
        const keyConfig = allKeys.find(key => key.apiKey === apiKey);
        if (!keyConfig) {
            res.status(404).json({
                code: 404,
                message: 'API Key 不存在'
            });
            return Promise.resolve();
        }
        res.json({
            code: 200,
            message: '获取完整信息成功',
            data: {
                apiKey: keyConfig.apiKey,
                alias: keyConfig.alias,
                description: keyConfig.description,
                openapi: {
                    accessKey: keyConfig.openapi.accessKey,
                    accessSecret: keyConfig.openapi.accessSecret,
                    bizType: keyConfig.openapi.bizType,
                    baseUrl: keyConfig.openapi.baseUrl
                },
                verifiedAt: new Date().toISOString()
            }
        });
        console.log(`✅ 获取API Key完整信息: ${keyConfig.alias} (${keyConfig.apiKey})`);
        return Promise.resolve();
    }
    catch (error) {
        console.error('获取API Key完整信息失败:', error);
        res.status(500).json({
            code: 500,
            message: error.message || '获取失败'
        });
        return Promise.resolve();
    }
});
exports.default = router;
//# sourceMappingURL=apiKeyManagement.js.map