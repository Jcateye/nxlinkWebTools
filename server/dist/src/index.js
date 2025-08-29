"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./utils/logger");
const { PROJECT_CONFIG, printConfigInfo } = await Promise.resolve().then(() => __importStar(require('../../config/project.config')));
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const auth_1 = require("./middleware/auth");
const auth_2 = __importDefault(require("./routes/auth"));
const providers_1 = __importDefault(require("./routes/providers"));
const prompts_1 = __importDefault(require("./routes/prompts"));
const tests_1 = __importDefault(require("./routes/tests"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const openapi_1 = __importDefault(require("./routes/openapi"));
const apiKeyManagement_1 = __importDefault(require("./routes/apiKeyManagement"));
const formWebhook_1 = __importDefault(require("./routes/formWebhook"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const corsOrigins = PROJECT_CONFIG.server.corsOrigin.split(',').map(origin => origin.trim());
const io = new socket_io_1.Server(server, {
    cors: {
        origin: corsOrigins,
        methods: ["GET", "POST"]
    }
});
const PORT = Number(process.env.PORT) || PROJECT_CONFIG.server.port;
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: corsOrigins,
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use('/api', rateLimiter_1.rateLimiter);
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});
app.use('/api/auth', auth_2.default);
app.use('/api/providers', auth_1.authMiddleware, providers_1.default);
app.use('/api/prompts', auth_1.authMiddleware, prompts_1.default);
app.use('/api/tests', auth_1.authMiddleware, tests_1.default);
app.use('/api/analytics', auth_1.authMiddleware, analytics_1.default);
app.use('/api/openapi', openapi_1.default);
app.use('/internal-api/keys', apiKeyManagement_1.default);
app.use('/api/webhook', formWebhook_1.default);
io.on('connection', (socket) => {
    logger_1.logger.info(`客户端已连接: ${socket.id}`);
    socket.on('join-test-session', (sessionId) => {
        socket.join(`test-${sessionId}`);
        logger_1.logger.info(`客户端 ${socket.id} 加入测试会话: ${sessionId}`);
    });
    socket.on('leave-test-session', (sessionId) => {
        socket.leave(`test-${sessionId}`);
        logger_1.logger.info(`客户端 ${socket.id} 离开测试会话: ${sessionId}`);
    });
    socket.on('disconnect', () => {
        logger_1.logger.info(`客户端已断开连接: ${socket.id}`);
    });
});
app.set('io', io);
app.use(errorHandler_1.errorHandler);
app.use('*', (req, res) => {
    res.status(404).json({ error: '接口不存在' });
});
async function startServer() {
    try {
        printConfigInfo(PROJECT_CONFIG);
        logger_1.logger.info('数据库初始化跳过（API Key管理使用文件存储）');
        server.listen(PORT, () => {
            logger_1.logger.info(`🚀 LLM测试系统后端服务已启动!`);
            logger_1.logger.info(`📍 服务地址: http://localhost:${PORT}`);
            logger_1.logger.info(`🌐 环境: ${PROJECT_CONFIG.server.nodeEnv}`);
            logger_1.logger.info(`📊 健康检查: http://localhost:${PORT}/health`);
            logger_1.logger.info(`🔗 WebSocket已启用`);
            logger_1.logger.info(`🔑 OpenAPI接口: http://localhost:${PORT}/api/openapi`);
            logger_1.logger.info(`\n按 Ctrl+C 停止服务\n`);
        });
    }
    catch (error) {
        logger_1.logger.error('服务启动失败:', error);
        process.exit(1);
    }
}
process.on('SIGTERM', () => {
    logger_1.logger.info('收到SIGTERM信号，正在关闭服务器...');
    server.close(() => {
        logger_1.logger.info('服务器已关闭');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger_1.logger.info('收到SIGINT信号，正在关闭服务器...');
    server.close(() => {
        logger_1.logger.info('服务器已关闭');
        process.exit(0);
    });
});
startServer();
//# sourceMappingURL=index.js.map