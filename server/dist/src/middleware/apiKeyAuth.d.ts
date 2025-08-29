import { Request, Response, NextFunction } from 'express';
import { ExternalApiKeyConfig } from '../../../config/project.config';
export interface AuthenticatedRequest extends Request {
    apiKey?: string;
    apiKeyConfig?: ExternalApiKeyConfig;
}
export declare function apiKeyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
export declare function getApiKeyStats(): {
    validKeys: number;
    keys: {
        alias: string;
        description: string | undefined;
        hasOpenApiConfig: boolean;
    }[];
};
//# sourceMappingURL=apiKeyAuth.d.ts.map