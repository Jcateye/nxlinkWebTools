import fs from 'fs';
import path from 'path';
import { ExternalApiKeyConfig } from '../../../config/project.config';

/**
 * 配置文件管理器
 * 用于管理动态添加的API Key配置
 */

const CONFIG_FILE_PATH = path.join(process.cwd(), 'config', 'api-keys.json');

export interface ApiKeysConfig {
  version: string;
  lastUpdated: string;
  keys: ExternalApiKeyConfig[];
}

// 默认配置结构
const DEFAULT_CONFIG: ApiKeysConfig = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  keys: []
};

/**
 * 确保配置文件存在
 */
function ensureConfigFile(): void {
  try {
    // 确保config目录存在
    const configDir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // 如果配置文件不存在，创建默认配置
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
      console.log(`✅ 已创建配置文件: ${CONFIG_FILE_PATH}`);
    }
  } catch (error) {
    console.error('❌ 创建配置文件失败:', error);
    throw error;
  }
}

/**
 * 读取配置文件
 */
export function readApiKeysConfig(): ApiKeysConfig {
  try {
    ensureConfigFile();
    const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ 读取配置文件失败:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * 写入配置文件
 */
export function writeApiKeysConfig(config: ApiKeysConfig): void {
  try {
    ensureConfigFile();
    config.lastUpdated = new Date().toISOString();
    const data = JSON.stringify(config, null, 2);
    fs.writeFileSync(CONFIG_FILE_PATH, data);
    console.log(`✅ 配置文件已更新: ${CONFIG_FILE_PATH}`);
  } catch (error) {
    console.error('❌ 写入配置文件失败:', error);
    throw error;
  }
}

/**
 * 获取所有API Keys（包括环境变量和配置文件中的）
 */
export function getAllApiKeys(): ExternalApiKeyConfig[] {
  // 从环境变量获取，清除require缓存以确保获取最新配置
  const configPath = require.resolve('../../../config/project.config');
  delete require.cache[configPath];
  const { PROJECT_CONFIG } = require('../../../config/project.config');
  const envKeys: ExternalApiKeyConfig[] = PROJECT_CONFIG.externalApiKeys || [];

  // 从配置文件获取
  const config = readApiKeysConfig();
  const fileKeys: ExternalApiKeyConfig[] = config.keys || [];

  // 使用 Map 进行去重合并，优先使用“文件配置”覆盖“环境变量”
  const map = new Map<string, ExternalApiKeyConfig>();

  // 先放入环境变量
  envKeys.forEach(k => map.set(k.apiKey, k));

  // 再用文件配置覆盖（深合并 openapi）
  fileKeys.forEach(fileKey => {
    const envKey = map.get(fileKey.apiKey);
    if (!envKey) {
      map.set(fileKey.apiKey, fileKey);
    } else {
      map.set(fileKey.apiKey, {
        ...envKey,
        ...fileKey,
        openapi: { ...envKey.openapi, ...fileKey.openapi }
      });
    }
  });

  return Array.from(map.values());
}

/**
 * 添加API Key
 */
export function addApiKey(apiKeyConfig: ExternalApiKeyConfig): void {
  const config = readApiKeysConfig();
  
  // 检查是否已存在
  const exists = config.keys.find(key => key.apiKey === apiKeyConfig.apiKey);
  if (exists) {
    throw new Error(`API Key 已存在: ${apiKeyConfig.apiKey}`);
  }

  // 检查环境变量中是否已存在
  const allKeys = getAllApiKeys();
  const existsInEnv = allKeys.find(key => key.apiKey === apiKeyConfig.apiKey);
  if (existsInEnv) {
    throw new Error(`API Key 已在环境变量中存在: ${apiKeyConfig.apiKey}`);
  }

  config.keys.push(apiKeyConfig);
  writeApiKeysConfig(config);
}

/**
 * 更新API Key
 */
export function updateApiKey(apiKey: string, updates: Partial<ExternalApiKeyConfig>): void {
  const config = readApiKeysConfig();
  
  const index = config.keys.findIndex(key => key.apiKey === apiKey);
  if (index === -1) {
    // 文件中没有，可能来源于环境变量。尝试读取合并并写入文件以便覆盖。
    const allKeys = getAllApiKeys();
    const envKey = allKeys.find(k => k.apiKey === apiKey);
    if (!envKey) {
      throw new Error(`API Key 不存在: ${apiKey}`);
    }

    const merged: ExternalApiKeyConfig = {
      ...envKey,
      ...updates,
      openapi: { ...envKey.openapi, ...(updates.openapi || {}) }
    } as ExternalApiKeyConfig;

    config.keys.push(merged);
    writeApiKeysConfig(config);
    return;
  }

  const merged: ExternalApiKeyConfig = {
    ...config.keys[index],
    ...updates,
    openapi: { ...config.keys[index].openapi, ...(updates.openapi || {}) }
  } as ExternalApiKeyConfig;

  config.keys[index] = merged;
  writeApiKeysConfig(config);
}

/**
 * 删除API Key
 */
export function deleteApiKey(apiKey: string): void {
  const config = readApiKeysConfig();
  // 不在日志中暴露完整的API Key
  const maskedApiKey = apiKey.length > 8 ? apiKey.substring(0, 8) + '***' : apiKey;
  
  const index = config.keys.findIndex(key => key.apiKey === apiKey);
  if (index === -1) {
    // 检查是否是环境变量中的API Key
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

/**
 * 验证API Key配置
 */
export function validateApiKeyConfig(config: Partial<ExternalApiKeyConfig>): string[] {
  const errors: string[] = [];

  if (!config.apiKey || config.apiKey.trim() === '') {
    errors.push('API Key 不能为空');
  }

  if (!config.alias || config.alias.trim() === '') {
    errors.push('别名不能为空');
  }

  if (!config.openapi) {
    errors.push('OpenAPI 配置不能为空');
  } else {
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

/**
 * 获取配置文件统计信息
 */
export function getConfigStats() {
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
