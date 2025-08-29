"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readApiKeysConfig = readApiKeysConfig;
exports.writeApiKeysConfig = writeApiKeysConfig;
exports.getAllApiKeys = getAllApiKeys;
exports.addApiKey = addApiKey;
exports.updateApiKey = updateApiKey;
exports.deleteApiKey = deleteApiKey;
exports.validateApiKeyConfig = validateApiKeyConfig;
exports.getConfigStats = getConfigStats;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CONFIG_FILE_PATH = path_1.default.join(process.cwd(), 'config', 'api-keys.json');
const DEFAULT_CONFIG = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    keys: []
};
function ensureConfigFile() {
    try {
        const configDir = path_1.default.dirname(CONFIG_FILE_PATH);
        if (!fs_1.default.existsSync(configDir)) {
            fs_1.default.mkdirSync(configDir, { recursive: true });
        }
        if (!fs_1.default.existsSync(CONFIG_FILE_PATH)) {
            fs_1.default.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
            console.log(`✅ 已创建配置文件: ${CONFIG_FILE_PATH}`);
        }
    }
    catch (error) {
        console.error('❌ 创建配置文件失败:', error);
        throw error;
    }
}
function readApiKeysConfig() {
    try {
        ensureConfigFile();
        const data = fs_1.default.readFileSync(CONFIG_FILE_PATH, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('❌ 读取配置文件失败:', error);
        return DEFAULT_CONFIG;
    }
}
function writeApiKeysConfig(config) {
    try {
        ensureConfigFile();
        config.lastUpdated = new Date().toISOString();
        const data = JSON.stringify(config, null, 2);
        fs_1.default.writeFileSync(CONFIG_FILE_PATH, data);
        console.log(`✅ 配置文件已更新: ${CONFIG_FILE_PATH}`);
    }
    catch (error) {
        console.error('❌ 写入配置文件失败:', error);
        throw error;
    }
}
function getAllApiKeys() {
    const configPath = require.resolve('../../../config/project.config');
    delete require.cache[configPath];
    const { PROJECT_CONFIG } = require('../../../config/project.config');
    const envKeys = PROJECT_CONFIG.externalApiKeys || [];
    const config = readApiKeysConfig();
    const fileKeys = config.keys || [];
    const map = new Map();
    envKeys.forEach(k => map.set(k.apiKey, k));
    fileKeys.forEach(fileKey => {
        const envKey = map.get(fileKey.apiKey);
        if (!envKey) {
            map.set(fileKey.apiKey, fileKey);
        }
        else {
            map.set(fileKey.apiKey, {
                ...envKey,
                ...fileKey,
                openapi: { ...envKey.openapi, ...fileKey.openapi }
            });
        }
    });
    return Array.from(map.values());
}
function addApiKey(apiKeyConfig) {
    const config = readApiKeysConfig();
    const exists = config.keys.find(key => key.apiKey === apiKeyConfig.apiKey);
    if (exists) {
        throw new Error(`API Key 已存在: ${apiKeyConfig.apiKey}`);
    }
    const allKeys = getAllApiKeys();
    const existsInEnv = allKeys.find(key => key.apiKey === apiKeyConfig.apiKey);
    if (existsInEnv) {
        throw new Error(`API Key 已在环境变量中存在: ${apiKeyConfig.apiKey}`);
    }
    config.keys.push(apiKeyConfig);
    writeApiKeysConfig(config);
}
function updateApiKey(apiKey, updates) {
    const config = readApiKeysConfig();
    const index = config.keys.findIndex(key => key.apiKey === apiKey);
    if (index === -1) {
        const allKeys = getAllApiKeys();
        const envKey = allKeys.find(k => k.apiKey === apiKey);
        if (!envKey) {
            throw new Error(`API Key 不存在: ${apiKey}`);
        }
        const merged = {
            ...envKey,
            ...updates,
            openapi: { ...envKey.openapi, ...(updates.openapi || {}) }
        };
        config.keys.push(merged);
        writeApiKeysConfig(config);
        return;
    }
    const merged = {
        ...config.keys[index],
        ...updates,
        openapi: { ...config.keys[index].openapi, ...(updates.openapi || {}) }
    };
    config.keys[index] = merged;
    writeApiKeysConfig(config);
}
function deleteApiKey(apiKey) {
    const config = readApiKeysConfig();
    const maskedApiKey = apiKey.length > 8 ? apiKey.substring(0, 8) + '***' : apiKey;
    const index = config.keys.findIndex(key => key.apiKey === apiKey);
    if (index === -1) {
        const allKeys = getAllApiKeys();
        const envKey = allKeys.find(k => k.apiKey === apiKey);
        if (envKey) {
            throw new Error(`无法删除环境变量中的API Key: ${maskedApiKey}，请修改项目配置文件`);
        }
        throw new Error(`API Key 不存在: ${maskedApiKey}`);
    }
    const removedKey = config.keys[index];
    config.keys.splice(index, 1);
    writeApiKeysConfig(config);
    console.log(`✅ API Key已删除: ${removedKey.alias} (${maskedApiKey})`);
}
function validateApiKeyConfig(config) {
    const errors = [];
    if (!config.apiKey || config.apiKey.trim() === '') {
        errors.push('API Key 不能为空');
    }
    if (!config.alias || config.alias.trim() === '') {
        errors.push('别名不能为空');
    }
    if (!config.openapi) {
        errors.push('OpenAPI 配置不能为空');
    }
    else {
        if (!config.openapi.accessKey || config.openapi.accessKey.trim() === '') {
            errors.push('OpenAPI AccessKey 不能为空');
        }
        if (!config.openapi.accessSecret || config.openapi.accessSecret.trim() === '') {
            errors.push('OpenAPI AccessSecret 不能为空');
        }
        if (!config.openapi.bizType || config.openapi.bizType.trim() === '') {
            errors.push('业务类型不能为空');
        }
        if (!config.openapi.baseUrl || config.openapi.baseUrl.trim() === '') {
            errors.push('服务地址不能为空');
        }
    }
    return errors;
}
function getConfigStats() {
    const config = readApiKeysConfig();
    const allKeys = getAllApiKeys();
    return {
        totalKeys: allKeys.length,
        fileKeys: config.keys.length,
        envKeys: allKeys.length - config.keys.length,
        lastUpdated: config.lastUpdated,
        version: config.version,
        configFilePath: CONFIG_FILE_PATH
    };
}
//# sourceMappingURL=configManager.js.map