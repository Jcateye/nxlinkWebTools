import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';
import { setupSwagger } from './utils/swagger';
import { initDatabase } from './utils/database';

// 路由
import authRoutes from './routes/auth';
import providerRoutes from './routes/providers';
import promptRoutes from './routes/prompts';
import testRoutes from './routes/tests';
import analyticsRoutes from './routes/analytics';

// Socket处理
import { setupSocketHandlers } from './sockets/testSocket';

// 加载环境变量
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3010",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8001;

// 全局中间件
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3010",
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
    // 初始化数据库
    await initDatabase();
    logger.info('数据库连接成功');
    
    // 启动服务器
    server.listen(PORT, () => {
      logger.info(`🚀 LLM测试系统后端服务已启动!`);
      logger.info(`📍 服务地址: http://localhost:${PORT}`);
      logger.info(`🌐 环境: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📊 健康检查: http://localhost:${PORT}/health`);
      logger.info(`🔗 WebSocket已启用`);
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