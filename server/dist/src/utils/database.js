"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.initDatabase = initDatabase;
exports.closeDatabase = closeDatabase;
exports.checkDatabaseHealth = checkDatabaseHealth;
exports.cleanDatabase = cleanDatabase;
exports.seedDatabase = seedDatabase;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
const prisma = new client_1.PrismaClient({
    log: [
        {
            emit: 'event',
            level: 'query',
        },
        {
            emit: 'event',
            level: 'error',
        },
        {
            emit: 'event',
            level: 'info',
        },
        {
            emit: 'event',
            level: 'warn',
        },
    ],
});
exports.prisma = prisma;
prisma.$on('query', (e) => {
    logger_1.logger.debug(`查询: ${e.query}`);
    logger_1.logger.debug(`参数: ${e.params}`);
    logger_1.logger.debug(`持续时间: ${e.duration}ms`);
});
prisma.$on('error', (e) => {
    logger_1.logger.error('Prisma错误:', e);
});
prisma.$on('info', (e) => {
    logger_1.logger.info('Prisma信息:', e.message);
});
prisma.$on('warn', (e) => {
    logger_1.logger.warn('Prisma警告:', e.message);
});
async function initDatabase() {
    try {
        await prisma.$connect();
        logger_1.logger.info('数据库连接成功');
        const result = await prisma.$queryRaw `SELECT 1 as test`;
        logger_1.logger.info('数据库状态检查通过');
        return prisma;
    }
    catch (error) {
        logger_1.logger.error('数据库连接失败:', error);
        throw error;
    }
}
async function closeDatabase() {
    try {
        await prisma.$disconnect();
        logger_1.logger.info('数据库连接已关闭');
    }
    catch (error) {
        logger_1.logger.error('关闭数据库连接失败:', error);
        throw error;
    }
}
async function checkDatabaseHealth() {
    try {
        const start = Date.now();
        await prisma.$queryRaw `SELECT 1 as health_check`;
        const duration = Date.now() - start;
        return {
            status: 'healthy',
            responseTime: duration,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        logger_1.logger.error('数据库健康检查失败:', error);
        return {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : '未知错误',
            timestamp: new Date().toISOString()
        };
    }
}
async function cleanDatabase() {
    try {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('生产环境不允许清理数据库');
        }
        await prisma.testLog.deleteMany();
        await prisma.testResult.deleteMany();
        await prisma.testRun.deleteMany();
        await prisma.lLMModel.deleteMany();
        await prisma.lLMProvider.deleteMany();
        await prisma.prompt.deleteMany();
        await prisma.user.deleteMany();
        await prisma.systemConfig.deleteMany();
        logger_1.logger.info('数据库清理完成');
    }
    catch (error) {
        logger_1.logger.error('数据库清理失败:', error);
        throw error;
    }
}
async function seedDatabase() {
    try {
        const defaultUser = await prisma.user.upsert({
            where: { email: process.env.DEFAULT_USER_EMAIL || 'admin@example.com' },
            update: {},
            create: {
                email: process.env.DEFAULT_USER_EMAIL || 'admin@example.com',
                name: process.env.DEFAULT_USER_NAME || 'Admin User'
            }
        });
        logger_1.logger.info(`默认用户已创建: ${defaultUser.email}`);
        const configs = [
            {
                key: 'system.version',
                value: '1.0.0',
                description: '系统版本',
                category: 'system'
            },
            {
                key: 'test.max_concurrent',
                value: '10',
                description: '最大并发测试数',
                category: 'test'
            },
            {
                key: 'test.timeout',
                value: '30000',
                description: '测试超时时间（毫秒）',
                category: 'test'
            }
        ];
        for (const config of configs) {
            await prisma.systemConfig.upsert({
                where: { key: config.key },
                update: { value: config.value },
                create: config
            });
        }
        logger_1.logger.info('默认系统配置已创建');
    }
    catch (error) {
        logger_1.logger.error('数据库初始化失败:', error);
        throw error;
    }
}
exports.default = prisma;
//# sourceMappingURL=database.js.map