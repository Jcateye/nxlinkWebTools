"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROJECT_CONFIG = void 0;
exports.getProjectConfig = getProjectConfig;
exports.validateConfig = validateConfig;
exports.printConfigInfo = printConfigInfo;
const DEFAULT_CONFIG = {
    server: {
        port: 8400,
        corsOrigin: 'http://localhost:3010',
        nodeEnv: 'development',
        jwtSecret: 'your-jwt-secret-key-change-in-production',
        jwtExpiresIn: '7d',
        logLevel: 'info',
        adminPassword: 'F511522591'
    },
    openapi: {
        accessKey: 'AK-764887602601150724-2786',
        accessSecret: '0de4a159402a4e3494f76669ac92d6e6',
        bizType: '8',
        baseUrl: 'https://api-westus.nxlink.ai'
    },
    externalApiKeys: [],
    database: {
        url: 'sqlite:./database.db'
    },
    frontend: {
        openapi: {
            accessKey: 'your-openapi-access-key',
            accessSecret: 'your-openapi-access-secret',
            bizType: '8'
        }
    }
};
const PRODUCTION_CONFIG = {
    server: {
        port: Number(process.env.PORT) || 8450,
        corsOrigin: process.env.CORS_ORIGIN || 'https://sit2025.nxlink.ai,https://nxlink.ai,https://nxlink.nxcloud.com,https://nxcloud.com',
        nodeEnv: 'production',
        jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
        jwtExpiresIn: '7d',
        logLevel: process.env.LOG_LEVEL || 'warn',
        adminPassword: process.env.ADMIN_PASSWORD || 'F511522591'
    },
    openapi: {
        accessKey: process.env.OPENAPI_ACCESS_KEY || '',
        accessSecret: process.env.OPENAPI_ACCESS_SECRET || '',
        bizType: process.env.OPENAPI_BIZ_TYPE || '8',
        baseUrl: 'https://api-westus.nxlink.ai'
    },
    externalApiKeys: [
        ...(process.env.EXTERNAL_API_KEY_1 ? [{
                apiKey: process.env.EXTERNAL_API_KEY_1,
                alias: process.env.EXTERNAL_API_KEY_1_ALIAS || '生产平台1',
                description: process.env.EXTERNAL_API_KEY_1_DESC || '生产环境API Key 1',
                openapi: {
                    accessKey: process.env.EXTERNAL_API_KEY_1_OPENAPI_ACCESS_KEY || '',
                    accessSecret: process.env.EXTERNAL_API_KEY_1_OPENAPI_ACCESS_SECRET || '',
                    bizType: process.env.EXTERNAL_API_KEY_1_OPENAPI_BIZ_TYPE || '8',
                    baseUrl: process.env.EXTERNAL_API_KEY_1_OPENAPI_BASE_URL || 'https://api-westus.nxlink.ai'
                }
            }] : []),
        ...(process.env.EXTERNAL_API_KEY_2 ? [{
                apiKey: process.env.EXTERNAL_API_KEY_2,
                alias: process.env.EXTERNAL_API_KEY_2_ALIAS || '生产平台2',
                description: process.env.EXTERNAL_API_KEY_2_DESC || '生产环境API Key 2',
                openapi: {
                    accessKey: process.env.EXTERNAL_API_KEY_2_OPENAPI_ACCESS_KEY || '',
                    accessSecret: process.env.EXTERNAL_API_KEY_2_OPENAPI_ACCESS_SECRET || '',
                    bizType: process.env.EXTERNAL_API_KEY_2_OPENAPI_BIZ_TYPE || '8',
                    baseUrl: process.env.EXTERNAL_API_KEY_2_OPENAPI_BASE_URL || 'https://api-westus.nxlink.ai'
                }
            }] : [])
    ],
    database: {
        url: process.env.DATABASE_URL || 'sqlite:./database.db'
    },
    frontend: {
        openapi: {
            accessKey: process.env.VITE_OPENAPI_ACCESS_KEY || '',
            accessSecret: process.env.VITE_OPENAPI_ACCESS_SECRET || '',
            bizType: process.env.VITE_OPENAPI_BIZ_TYPE || '8'
        }
    }
};
const DEVELOPMENT_CONFIG = {
    server: {
        port: Number(process.env.PORT) || 8400,
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3010',
        nodeEnv: 'development',
        jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-key',
        jwtExpiresIn: '7d',
        logLevel: process.env.LOG_LEVEL || 'info',
        adminPassword: process.env.ADMIN_PASSWORD || 'F511522591'
    },
    openapi: {
        accessKey: process.env.OPENAPI_ACCESS_KEY || 'your-openapi-access-key',
        accessSecret: process.env.OPENAPI_ACCESS_SECRET || 'your-openapi-access-secret',
        bizType: process.env.OPENAPI_BIZ_TYPE || '8',
        baseUrl: 'https://api-westus.nxlink.ai'
    },
    externalApiKeys: [],
    database: {
        url: process.env.DATABASE_URL || 'sqlite:./database.db'
    },
    frontend: {
        openapi: {
            accessKey: process.env.VITE_OPENAPI_ACCESS_KEY || 'your-openapi-access-key',
            accessSecret: process.env.VITE_OPENAPI_ACCESS_SECRET || 'your-openapi-access-secret',
            bizType: process.env.VITE_OPENAPI_BIZ_TYPE || '8'
        }
    }
};
function mergeConfig(base, override) {
    return {
        server: { ...base.server, ...override.server },
        openapi: { ...base.openapi, ...override.openapi },
        externalApiKeys: override.externalApiKeys !== undefined ? override.externalApiKeys : base.externalApiKeys,
        database: { ...base.database, ...override.database },
        frontend: {
            openapi: { ...base.frontend.openapi, ...override.frontend?.openapi }
        }
    };
}
function getProjectConfig() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    switch (nodeEnv) {
        case 'production':
            return mergeConfig(DEFAULT_CONFIG, PRODUCTION_CONFIG);
        case 'development':
        default:
            return mergeConfig(DEFAULT_CONFIG, DEVELOPMENT_CONFIG);
    }
}
function validateConfig(config) {
    const errors = [];
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
function printConfigInfo(config) {
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
    const validation = validateConfig(config);
    if (!validation.valid) {
        console.log('⚠️  配置警告:');
        validation.errors.forEach(error => console.log(`   - ${error}`));
    }
    else {
        console.log('✅ 配置验证通过');
    }
    console.log('');
}
exports.PROJECT_CONFIG = getProjectConfig();
//# sourceMappingURL=project.config.js.map