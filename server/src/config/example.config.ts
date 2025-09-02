/**
 * 配置使用示例
 * 展示如何在项目中使用配置系统
 */

import { PROJECT_CONFIG, validateConfig, printConfigInfo } from './project.config';

// ===== 基本使用示例 =====

// 1. 获取配置
console.log('OpenAPI AccessKey:', PROJECT_CONFIG.openapi.accessKey);
console.log('服务器端口:', PROJECT_CONFIG.server.port);
console.log('外部API Keys:', PROJECT_CONFIG.externalApiKeys);

// 2. 验证配置
const validation = validateConfig(PROJECT_CONFIG);
if (!validation.valid) {
  console.error('配置验证失败:', validation.errors);
}

// 3. 打印配置信息
printConfigInfo(PROJECT_CONFIG);

// ===== 在不同模块中使用配置 =====

// 在Express服务器中使用
export function createServer() {
  const port = PROJECT_CONFIG.server.port;
  const corsOrigin = PROJECT_CONFIG.server.corsOrigin;
  
  console.log(`服务器将在端口 ${port} 启动`);
  console.log(`CORS源设置为: ${corsOrigin}`);
}

// 在OpenAPI客户端中使用
export function createOpenApiClient() {
  const config = PROJECT_CONFIG.openapi;
  
  return {
    baseURL: config.baseUrl,
    auth: {
      accessKey: config.accessKey,
      accessSecret: config.accessSecret,
      bizType: config.bizType
    }
  };
}

// 在API Key验证中使用
export function validateApiKey(apiKey: string): boolean {
  return PROJECT_CONFIG.externalApiKeys.some((key: any) => key.apiKey === apiKey);
}

// ===== 环境特定配置示例 =====

// 检查是否为生产环境
export function isProduction(): boolean {
  return PROJECT_CONFIG.server.nodeEnv === 'production';
}

// 根据环境获取不同配置
export function getLogLevel(): string {
  return isProduction() ? 'warn' : 'info';
}

// ===== 配置更新示例 =====

// 动态更新配置（仅用于演示，实际项目中不建议）
export function updateConfig() {
  // 注意：PROJECT_CONFIG 是只读的，不能直接修改
  // 如需动态配置，应该创建新的配置对象
  
  const newConfig = {
    ...PROJECT_CONFIG,
    server: {
      ...PROJECT_CONFIG.server,
      port: 9001
    }
  };
  
  console.log('新配置端口:', newConfig.server.port);
}

// ===== 配置调试工具 =====

export function debugConfig() {
  console.log('=== 配置调试信息 ===');
  
  // 检查必要的环境变量
  const requiredEnvVars = [
    'OPENAPI_ACCESS_KEY',
    'OPENAPI_ACCESS_SECRET',
    'EXTERNAL_API_KEY_1'
  ];
  
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    console.log(`${envVar}: ${value ? '已设置' : '未设置'}`);
  });
  
  // 检查配置完整性
  const validation = validateConfig(PROJECT_CONFIG);
  console.log('配置验证结果:', validation.valid ? '通过' : '失败');
  
  if (!validation.valid) {
    validation.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
}

// ===== 配置测试工具 =====

export function testConfig() {
  console.log('=== 配置测试 ===');
  
  try {
    // 测试OpenAPI配置
    const openApiConfig = PROJECT_CONFIG.openapi;
    console.log('OpenAPI配置测试:', {
      hasAccessKey: !!openApiConfig.accessKey,
      hasAccessSecret: !!openApiConfig.accessSecret,
      bizType: openApiConfig.bizType,
      baseUrl: openApiConfig.baseUrl
    });
    
    // 测试外部API Key配置
    console.log('外部API Key测试:', {
      count: PROJECT_CONFIG.externalApiKeys.length,
      keys: PROJECT_CONFIG.externalApiKeys.map((key: any) => key.apiKey.substring(0, 8) + '...')
    });
    
    // 测试服务器配置
    console.log('服务器配置测试:', {
      port: PROJECT_CONFIG.server.port,
      nodeEnv: PROJECT_CONFIG.server.nodeEnv,
      corsOrigin: PROJECT_CONFIG.server.corsOrigin
    });
    
    console.log('✅ 所有配置测试通过');
    
  } catch (error) {
    console.error('❌ 配置测试失败:', error);
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  debugConfig();
  testConfig();
}
