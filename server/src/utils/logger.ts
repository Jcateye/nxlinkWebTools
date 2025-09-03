import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import fs from 'fs';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const maxFileSize = parseInt(process.env.MAX_LOG_FILE_SIZE || '10485760'); // 默认10MB
const maxFiles = process.env.MAX_LOG_FILES || '14d'; // 默认保留14天

// 确保日志目录存在
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志轮转配置
const dailyRotateConfig = {
  datePattern: 'YYYY-MM-DD',
  maxSize: `${maxFileSize}b`,
  maxFiles: maxFiles,
  zippedArchive: true,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  )
};

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'llm-test-backend' },
  transports: [
    // 错误日志 - 按日期轮转
    new DailyRotateFile({
      ...dailyRotateConfig,
      filename: path.join(logDir, 'error-%DATE%.log'),
      level: 'error',
    }),

    // 所有日志 - 按日期轮转
    new DailyRotateFile({
      ...dailyRotateConfig,
      filename: path.join(logDir, 'combined-%DATE%.log'),
    }),

    // 单独的当前日期日志文件（不轮转，用于快速查看）
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: maxFileSize,
      maxFiles: 3, // 保留3个备份文件
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),

    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: maxFileSize,
      maxFiles: 3, // 保留3个备份文件
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
  ],
});

// 如果不是生产环境，也输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let metaStr = '';
        if (Object.keys(meta).length > 0) {
          metaStr = JSON.stringify(meta, null, 2);
        }
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    )
  }));
} 