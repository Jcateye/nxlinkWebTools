import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

import { logger } from './utils/logger';
import { PROJECT_CONFIG, printConfigInfo } from './config/project.config';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';
// import { setupSwagger } from './utils/swagger';
// import { initDatabase } from './utils/database';

// 路由
import authRoutes from './routes/auth';
import providerRoutes from './routes/providers';
import promptRoutes from './routes/prompts';
import testRoutes from './routes/tests';
import analyticsRoutes from './routes/analytics';
import openApiRoutes from './routes/openapi';
import apiKeyManagementRoutes from './routes/apiKeyManagement';
import formWebhookRoutes from './routes/formWebhook';
import publicApiRoutes from './routes/publicApi';

// Socket处理
// import { setupSocketHandlers } from './sockets/testSocket';

// 加载环境变量
// 根据NODE_ENV加载对应的环境配置文件
const nodeEnv = process.env.NODE_ENV || 'development';
const envFiles = [
  `.env.${nodeEnv}`,
  '../production.env', // 兼容旧的配置文件名
  '.env'
];

let envLoaded = false;
for (const envFile of envFiles) {
  const envPath = path.resolve(envFile);
  if (require('fs').existsSync(envPath)) {
    console.log(`🔧 后端加载环境配置: ${envFile}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log(`⚠️  后端未找到环境配置文件，使用默认配置`);
  dotenv.config(); // 使用默认的.env文件
}

const app = express();
const server = createServer(app);
// 处理多域名CORS配置
const corsOrigins = PROJECT_CONFIG.server.corsOrigin.split(',').map(origin => origin.trim());

const io = new SocketIOServer(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"]
  }
});

// 优先使用环境变量 PORT（由启动脚本注入），否则使用配置端口
const PORT = Number(process.env.PORT) || PROJECT_CONFIG.server.port;

// 全局中间件
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API限流
app.use('/api', rateLimiter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/providers', authMiddleware, providerRoutes);
app.use('/api/prompts', authMiddleware, promptRoutes);
app.use('/api/tests', authMiddleware, testRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/openapi', openApiRoutes); // OpenAPI路由不需要内部认证，使用API Key认证
app.use('/api/openapi', publicApiRoutes); // 公开API路由，API Key在URL中传递
app.use('/internal-api/keys', apiKeyManagementRoutes); // API Key管理路由（内部API）
app.use('/api/webhook', formWebhookRoutes); // 表单Webhook路由（外部API）

// Socket.IO 连接处理
io.on('connection', (socket) => {
  logger.info(`客户端已连接: ${socket.id}`);
  
  // 加入测试会话
  socket.on('join-test-session', (sessionId: string) => {
    socket.join(`test-${sessionId}`);
    logger.info(`客户端 ${socket.id} 加入测试会话: ${sessionId}`);
  });
  
  // 离开测试会话
  socket.on('leave-test-session', (sessionId: string) => {
    socket.leave(`test-${sessionId}`);
    logger.info(`客户端 ${socket.id} 离开测试会话: ${sessionId}`);
  });
  
  // 断开连接
  socket.on('disconnect', () => {
    logger.info(`客户端已断开连接: ${socket.id}`);
  });
});

// 将 io 实例添加到 app 中，供路由使用
app.set('io', io);

// 错误处理中间件
app.use(errorHandler);

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
async function startServer() {
  try {
    // 打印配置信息
    printConfigInfo(PROJECT_CONFIG);
    
    // 初始化数据库（暂时跳过，API Key管理不需要数据库）
    // await initDatabase();
    logger.info('数据库初始化跳过（API Key管理使用文件存储）');
    
    // 启动服务器
    server.listen(PORT, () => {
      logger.info(`🚀 LLM测试系统后端服务已启动!`);
      logger.info(`📍 服务地址: http://localhost:${PORT}`);
      logger.info(`🌐 环境: ${PROJECT_CONFIG.server.nodeEnv}`);
      logger.info(`📊 健康检查: http://localhost:${PORT}/health`);
      logger.info(`🔗 WebSocket已启用`);
      logger.info(`🔑 OpenAPI接口: http://localhost:${PORT}/api/openapi`);
      logger.info(`\n按 Ctrl+C 停止服务\n`);
    });
    
  } catch (error) {
    logger.error('服务启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

// 启动服务器
startServer(); 