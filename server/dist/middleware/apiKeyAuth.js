"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = apiKeyAuth;
exports.getApiKeyStats = getApiKeyStats;
const configManager_1 = require("../services/configManager");
function apiKeyAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!apiKey) {
        res.status(401).json({
            code: 401,
            message: 'API Key is required. Please provide x-api-key header or Authorization Bearer token.',
            error: 'MISSING_API_KEY'
        });
        return;
    }
    const allApiKeys = (0, configManager_1.getAllApiKeys)();
    const apiKeyConfig = allApiKeys.find(config => config.apiKey === apiKey);
    if (!apiKeyConfig) {
        res.status(403).json({
            code: 403,
            message: `Invalid API Key: ${apiKey}`,
            error: 'INVALID_API_KEY',
            availableKeys: allApiKeys.map(config => ({
                alias: config.alias,
                description: config.description
            }))
        });
        return;
    }
    req.apiKey = apiKey;
    req.apiKeyConfig = apiKeyConfig;
    console.log(`[${new Date().toLocaleTimeString()}] 🔑 API Key认证成功: ${apiKeyConfig.alias} (${apiKey})`);
    next();
    return;
}
function getApiKeyStats() {
    const allApiKeys = (0, configManager_1.getAllApiKeys)();
    return {
        validKeys: allApiKeys.length,
        keys: allApiKeys.map(config => ({
            alias: config.alias,
            description: config.description,
            hasOpenApiConfig: !!(config.openapi.accessKey && config.openapi.accessSecret)
        }))
    };
}
//# sourceMappingURL=apiKeyAuth.js.map