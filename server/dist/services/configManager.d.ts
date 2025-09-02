import { ExternalApiKeyConfig } from '../config/project.config';
export interface ApiKeysConfig {
    version: string;
    lastUpdated: string;
    keys: ExternalApiKeyConfig[];
}
export declare function readApiKeysConfig(): ApiKeysConfig;
export declare function writeApiKeysConfig(config: ApiKeysConfig): void;
export declare function getAllApiKeys(): ExternalApiKeyConfig[];
export declare function addApiKey(apiKeyConfig: ExternalApiKeyConfig): void;
export declare function updateApiKey(apiKey: string, updates: Partial<ExternalApiKeyConfig>): void;
export declare function deleteApiKey(apiKey: string): void;
export declare function validateApiKeyConfig(config: Partial<ExternalApiKeyConfig>): string[];
export declare function getConfigStats(): {
    totalKeys: number;
    fileKeys: number;
    envKeys: number;
    lastUpdated: string;
    version: string;
    configFilePath: string;
};
//# sourceMappingURL=configManager.d.ts.map