import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name?: string;
    };
}
export declare const authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=auth.d.ts.map