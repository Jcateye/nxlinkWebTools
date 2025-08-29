declare const prisma: any;
export declare function initDatabase(): Promise<any>;
export declare function closeDatabase(): Promise<void>;
export declare function checkDatabaseHealth(): Promise<{
    status: string;
    responseTime: number;
    timestamp: string;
    error?: undefined;
} | {
    status: string;
    error: string;
    timestamp: string;
    responseTime?: undefined;
}>;
export declare function cleanDatabase(): Promise<void>;
export declare function seedDatabase(): Promise<void>;
export { prisma };
export default prisma;
//# sourceMappingURL=database.d.ts.map