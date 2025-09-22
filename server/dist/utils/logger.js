"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logLevel = process.env.LOG_LEVEL || 'info';
const maxFileSize = parseInt(process.env.MAX_LOG_FILE_SIZE || '10485760');
const maxFiles = process.env.MAX_LOG_FILES || '14d';
const logDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir, { recursive: true });
}
const dailyRotateConfig = {
    datePattern: 'YYYY-MM-DD',
    maxSize: `${maxFileSize}b`,
    maxFiles: maxFiles,
    zippedArchive: true,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
    }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json())
};
exports.logger = winston_1.default.createLogger({
    level: logLevel,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
    }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'llm-test-backend' },
    transports: [
        new winston_daily_rotate_file_1.default({
            ...dailyRotateConfig,
            filename: path_1.default.join(logDir, 'error-%DATE%.log'),
            level: 'error',
        }),
        new winston_daily_rotate_file_1.default({
            ...dailyRotateConfig,
            filename: path_1.default.join(logDir, 'combined-%DATE%.log'),
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'error.log'),
            level: 'error',
            maxsize: maxFileSize,
            maxFiles: 3,
            tailable: true,
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json())
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'combined.log'),
            maxsize: maxFileSize,
            maxFiles: 3,
            tailable: true,
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json())
        }),
    ],
});
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
            let metaStr = '';
            if (Object.keys(meta).length > 0) {
                metaStr = JSON.stringify(meta, null, 2);
            }
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
        }))
    }));
}
//# sourceMappingURL=logger.js.map