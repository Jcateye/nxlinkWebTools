/**
 * 项目级配置文件
 * 集中管理所有环境变量和配置项
 */
export interface OpenApiConfig {
    accessKey: string;
    accessSecret: string;
    bizType: string;
    baseUrl: string;
}
export interface ExternalApiKeyConfig {
    apiKey: string;
    alias: string;
    description?: string;
    openapi: OpenApiConfig;
}
export interface ProjectConfig {
    server: {
        port: number;
        corsOrigin: string;
        nodeEnv: string;
        jwtSecret: string;
        jwtExpiresIn: string;
        logLevel: string;
        adminPassword: string;
    };
    openapi: OpenApiConfig;
    externalApiKeys: ExternalApiKeyConfig[];
    database: {
        url: string;
    };
    frontend: {
        openapi: {
            accessKey: string;
            accessSecret: string;
            bizType: string;
        };
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
export declare function getProjectConfig(): ProjectConfig;
/**
 * 验证配置
 */
export declare function validateConfig(config: ProjectConfig): {
    valid: boolean;
    errors: string[];
};
/**
 * 打印配置信息（隐藏敏感信息）
 */
export declare function printConfigInfo(config: ProjectConfig): void;
export declare const PROJECT_CONFIG: ProjectConfig;
