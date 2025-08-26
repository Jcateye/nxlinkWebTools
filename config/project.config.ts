/**
 * 项目级配置文件
 * 集中管理所有环境变量和配置项
 */

export interface ProjectConfig {
  // 服务器配置
  server: {
    port: number;
    corsOrigin: string;
    nodeEnv: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    logLevel: string;
  };
  
  // OpenAPI配置
  openapi: {
    accessKey: string;
    accessSecret: string;
    bizType: string;
    baseUrl: string;
  };
  
  // 外部API Key配置
  externalApiKeys: string[];
  
  // 数据库配置
  database: {
    url: string;
  };
  
  // 前端配置
  frontend: {
    openapi: {
      accessKey: string;
      accessSecret: string;
      bizType: string;
    };
  };
}

/**
 * 默认配置（基础配置模板）
 * 
 * 使用场景：
 * - 作为所有环境的基础配置模板
 * - 提供配置项的默认值和结构
 * - 当环境变量未设置时的兜底值
 * 
 * 何时使用：
 * - 这个配置本身不会直接使用
 * - 会被开发环境和生产环境配置继承和覆盖
 * - 相当于配置的"模板"或"基类"
 */
const DEFAULT_CONFIG: ProjectConfig = {
  server: {
    port: 8001,                                              // 默认端口
    corsOrigin: 'http://localhost:3010',                     // 默认前端地址
    nodeEnv: 'development',                                  // 默认开发环境
    jwtSecret: 'your-jwt-secret-key-change-in-production',   // 默认JWT密钥（不安全，仅用于开发）
    jwtExpiresIn: '7d',                                      // JWT过期时间
    logLevel: 'info'                                         // 默认日志级别
  },
  
  openapi: {
    accessKey: 'your-openapi-access-key',                    // 占位符，需要在环境中配置真实值
    accessSecret: 'your-openapi-access-secret',              // 占位符，需要在环境中配置真实值
    bizType: '8',                                            // 业务类型，通常为8（语音业务）
    baseUrl: 'https://api-westus.nxlink.ai'                 // OpenAPI服务地址
  },
  
  externalApiKeys: [
    'demo-api-key-1',                                        // 演示用API Key
    'demo-api-key-2'                                         // 演示用API Key
  ],
  
  database: {
    url: 'sqlite:./database.db'                              // 默认SQLite数据库
  },
  
  frontend: {
    openapi: {
      accessKey: 'your-openapi-access-key',                  // 前端使用的OpenAPI配置
      accessSecret: 'your-openapi-access-secret',            // 前端使用的OpenAPI配置
      bizType: '8'                                           // 前端使用的业务类型
    }
  }
};

/**
 * 生产环境配置
 * 
 * 使用场景：
 * - 当 NODE_ENV=production 时使用
 * - 部署到正式服务器时的配置
 * - 面向真实用户的环境
 * 
 * 何时使用：
 * - 执行命令：NODE_ENV=production npm start
 * - 执行命令：npm run build && npm run start:prod
 * - Docker部署时设置环境变量：ENV NODE_ENV=production
 * - 服务器部署时通过环境变量设置
 * 
 * 特点：
 * - 强制从环境变量读取敏感配置（如API密钥）
 * - 使用更严格的安全设置
 * - 日志级别较高（warn），减少日志输出
 * - CORS设置为生产域名
 */
const PRODUCTION_CONFIG: Partial<ProjectConfig> = {
  server: {
    port: 8001,                                                    // 生产环境端口
    corsOrigin: 'https://your-production-domain.com',             // 生产环境前端域名
    nodeEnv: 'production',                                         // 明确标记为生产环境
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production', // 必须通过环境变量设置
    jwtExpiresIn: '7d',                                            // JWT过期时间
    logLevel: 'warn'                                               // 生产环境减少日志输出
  },
  
  openapi: {
    accessKey: process.env.OPENAPI_ACCESS_KEY || '',               // 必须通过环境变量设置
    accessSecret: process.env.OPENAPI_ACCESS_SECRET || '',         // 必须通过环境变量设置
    bizType: process.env.OPENAPI_BIZ_TYPE || '8',                 // 可选，默认为8
    baseUrl: 'https://api-westus.nxlink.ai'                      // 生产环境OpenAPI地址
  },
  
  externalApiKeys: [
    process.env.EXTERNAL_API_KEY_1 || '',                         // 必须通过环境变量设置
    process.env.EXTERNAL_API_KEY_2 || ''                          // 必须通过环境变量设置
  ].filter(Boolean),                                              // 过滤空值
  
  database: {
    url: process.env.DATABASE_URL || 'sqlite:./database.db'       // 生产环境通常使用PostgreSQL/MySQL
  },
  
  frontend: {
    openapi: {
      accessKey: process.env.VITE_OPENAPI_ACCESS_KEY || '',       // 前端构建时从环境变量读取
      accessSecret: process.env.VITE_OPENAPI_ACCESS_SECRET || '', // 前端构建时从环境变量读取
      bizType: process.env.VITE_OPENAPI_BIZ_TYPE || '8'          // 前端构建时从环境变量读取
    }
  }
};

/**
 * 开发环境配置
 * 
 * 使用场景：
 * - 当 NODE_ENV=development 或未设置 NODE_ENV 时使用
 * - 本地开发时的配置
 * - 测试和调试时的环境
 * 
 * 何时使用：
 * - 执行命令：npm run dev（前端开发服务器）
 * - 执行命令：npm start（后端开发服务器）
 * - 执行命令：node server.js（默认开发环境）
 * - 本地开发时不设置 NODE_ENV 环境变量
 * 
 * 特点：
 * - 优先使用环境变量，但提供友好的默认值
 * - 允许使用演示数据（如demo-api-key）
 * - 详细的日志输出（info级别）
 * - 宽松的安全设置，便于开发调试
 */
const DEVELOPMENT_CONFIG: Partial<ProjectConfig> = {
  server: {
    port: Number(process.env.PORT) || 8001,                       // 端口：环境变量 > 8001
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3010', // CORS：环境变量 > 本地前端地址
    nodeEnv: 'development',                                        // 明确标记为开发环境
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-key',    // JWT密钥：环境变量 > 开发用密钥
    jwtExpiresIn: '7d',                                           // JWT过期时间
    logLevel: process.env.LOG_LEVEL || 'info'                    // 日志级别：环境变量 > info
  },
  
  openapi: {
    accessKey: process.env.OPENAPI_ACCESS_KEY || 'your-openapi-access-key',     // 优先环境变量，否则占位符
    accessSecret: process.env.OPENAPI_ACCESS_SECRET || 'your-openapi-access-secret', // 优先环境变量，否则占位符
    bizType: process.env.OPENAPI_BIZ_TYPE || '8',                              // 业务类型，默认8
    baseUrl: 'https://api-westus.nxlink.ai'                                   // OpenAPI地址
  },
  
  externalApiKeys: [
    process.env.EXTERNAL_API_KEY_1 || 'demo-api-key-1',          // 优先环境变量，否则演示密钥
    process.env.EXTERNAL_API_KEY_2 || 'demo-api-key-2'           // 优先环境变量，否则演示密钥
  ],
  
  database: {
    url: process.env.DATABASE_URL || 'sqlite:./database.db'      // 数据库：环境变量 > SQLite
  },
  
  frontend: {
    openapi: {
      accessKey: process.env.VITE_OPENAPI_ACCESS_KEY || 'your-openapi-access-key',     // 前端构建时读取
      accessSecret: process.env.VITE_OPENAPI_ACCESS_SECRET || 'your-openapi-access-secret', // 前端构建时读取
      bizType: process.env.VITE_OPENAPI_BIZ_TYPE || '8'                                // 前端构建时读取
    }
  }
};

/**
 * 合并配置
 */
function mergeConfig(base: ProjectConfig, override: Partial<ProjectConfig>): ProjectConfig {
  return {
    server: { ...base.server, ...override.server },
    openapi: { ...base.openapi, ...override.openapi },
    externalApiKeys: override.externalApiKeys || base.externalApiKeys,
    database: { ...base.database, ...override.database },
    frontend: {
      openapi: { ...base.frontend.openapi, ...override.frontend?.openapi }
    }
  };
}

/**
 * 获取当前环境配置
 * 
 * 配置选择逻辑：
 * 1. 读取 NODE_ENV 环境变量
 * 2. 如果 NODE_ENV=production -> 使用生产环境配置
 * 3. 如果 NODE_ENV=development 或未设置 -> 使用开发环境配置
 * 4. 将选中的环境配置与默认配置合并
 * 
 * 实际使用示例：
 * - 开发时：直接运行 npm start -> NODE_ENV未设置 -> 使用开发环境配置
 * - 生产时：NODE_ENV=production npm start -> 使用生产环境配置
 * - Docker：ENV NODE_ENV=production -> 使用生产环境配置
 */
export function getProjectConfig(): ProjectConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  switch (nodeEnv) {
    case 'production':
      // 生产环境：合并 DEFAULT_CONFIG + PRODUCTION_CONFIG
      return mergeConfig(DEFAULT_CONFIG, PRODUCTION_CONFIG);
    case 'development':
    default:
      // 开发环境：合并 DEFAULT_CONFIG + DEVELOPMENT_CONFIG
      return mergeConfig(DEFAULT_CONFIG, DEVELOPMENT_CONFIG);
  }
}

/**
 * 验证配置
 */
export function validateConfig(config: ProjectConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 验证必要的配置项
  if (!config.openapi.accessKey || config.openapi.accessKey === 'your-openapi-access-key') {
    errors.push('OpenAPI accessKey 未配置或使用默认值');
  }
  
  if (!config.openapi.accessSecret || config.openapi.accessSecret === 'your-openapi-access-secret') {
    errors.push('OpenAPI accessSecret 未配置或使用默认值');
  }
  
  if (config.externalApiKeys.length === 0) {
    errors.push('外部API Key 未配置');
  }
  
  if (config.server.jwtSecret === 'your-jwt-secret-key-change-in-production' && config.server.nodeEnv === 'production') {
    errors.push('生产环境必须配置安全的JWT密钥');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 打印配置信息（隐藏敏感信息）
 */
export function printConfigInfo(config: ProjectConfig): void {
  console.log('🔧 项目配置信息:');
  console.log(`📍 服务端口: ${config.server.port}`);
  console.log(`🌐 环境: ${config.server.nodeEnv}`);
  console.log(`🔗 CORS源: ${config.server.corsOrigin}`);
  console.log(`📊 日志级别: ${config.server.logLevel}`);
  console.log(`🔑 OpenAPI AccessKey: ${config.openapi.accessKey ? '已配置' : '未配置'}`);
  console.log(`🔐 OpenAPI AccessSecret: ${config.openapi.accessSecret ? '已配置' : '未配置'}`);
  console.log(`🏢 OpenAPI BizType: ${config.openapi.bizType}`);
  console.log(`🌍 OpenAPI BaseURL: ${config.openapi.baseUrl}`);
  console.log(`🔑 外部API Keys: ${config.externalApiKeys.length} 个`);
  console.log(`💾 数据库: ${config.database.url}`);
  
  // 验证配置
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.log('⚠️  配置警告:');
    validation.errors.forEach(error => console.log(`   - ${error}`));
  } else {
    console.log('✅ 配置验证通过');
  }
  console.log('');
}

// 导出配置实例
export const PROJECT_CONFIG = getProjectConfig();
