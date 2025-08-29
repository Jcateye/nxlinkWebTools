import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// 创建Prisma客户端实例
const prisma = new PrismaClient({
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

// 监听Prisma日志事件
prisma.$on('query', (e: any) => {
  logger.debug(`查询: ${e.query}`);
  logger.debug(`参数: ${e.params}`);
  logger.debug(`持续时间: ${e.duration}ms`);
});

prisma.$on('error', (e: any) => {
  logger.error('Prisma错误:', e);
});

prisma.$on('info', (e: any) => {
  logger.info('Prisma信息:', e.message);
});

prisma.$on('warn', (e: any) => {
  logger.warn('Prisma警告:', e.message);
});

// 初始化数据库连接
export async function initDatabase() {
  try {
    // 测试数据库连接
    await prisma.$connect();
    logger.info('数据库连接成功');
    
    // 检查数据库状态
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    logger.info('数据库状态检查通过');
    
    return prisma;
  } catch (error) {
    logger.error('数据库连接失败:', error);
    throw error;
  }
}

// 关闭数据库连接
export async function closeDatabase() {
  try {
    await prisma.$disconnect();
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接失败:', error);
    throw error;
  }
}

// 数据库健康检查
export async function checkDatabaseHealth() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1 as health_check`;
    const duration = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: duration,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('数据库健康检查失败:', error);
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    };
  }
}

// 清理数据库（开发环境使用）
export async function cleanDatabase() {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('生产环境不允许清理数据库');
    }
    
    // 按照依赖关系顺序删除数据
    await prisma.testLog.deleteMany();
    await prisma.testResult.deleteMany();
    await prisma.testRun.deleteMany();
    await prisma.lLMModel.deleteMany();
    await prisma.lLMProvider.deleteMany();
    await prisma.prompt.deleteMany();
    await prisma.user.deleteMany();
    await prisma.systemConfig.deleteMany();
    
    logger.info('数据库清理完成');
  } catch (error) {
    logger.error('数据库清理失败:', error);
    throw error;
  }
}

// 初始化默认数据
export async function seedDatabase() {
  try {
    // 创建默认用户
    const defaultUser = await prisma.user.upsert({
      where: { email: process.env.DEFAULT_USER_EMAIL || 'admin@example.com' },
      update: {},
      create: {
        email: process.env.DEFAULT_USER_EMAIL || 'admin@example.com',
        name: process.env.DEFAULT_USER_NAME || 'Admin User'
      }
    });
    
    logger.info(`默认用户已创建: ${defaultUser.email}`);
    
    // 创建系统配置
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
    
    logger.info('默认系统配置已创建');
    
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    throw error;
  }
}

// 导出Prisma客户端实例
export { prisma };
export default prisma; 