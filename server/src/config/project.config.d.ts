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
export declare function getProjectConfig(): ProjectConfig;
export declare function validateConfig(config: ProjectConfig): {
    valid: boolean;
    errors: string[];
};
export declare function printConfigInfo(config: ProjectConfig): void;
export declare const PROJECT_CONFIG: ProjectConfig;
//# sourceMappingURL=project.config.d.ts.map