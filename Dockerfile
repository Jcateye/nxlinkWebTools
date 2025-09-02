# 多阶段构建
# 阶段1: 构建前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# 复制前端相关文件
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src ./src
COPY public ./public

# 安装依赖并构建
RUN npm ci --production=false && npm run build

# 阶段2: 构建后端
FROM node:18-alpine AS backend-builder

WORKDIR /app

# 复制后端相关文件
COPY server/package*.json ./server/
COPY server/tsconfig.json ./server/
COPY server/src ./server/src
COPY server/routes ./server/routes

# 安装依赖并构建
WORKDIR /app/server
RUN npm ci --production=false && npm run build

# 阶段3: 生产镜像
FROM node:18-alpine AS production

# 安装生产环境所需工具
RUN apk add --no-cache tini curl

WORKDIR /app

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 复制构建产物
COPY --from=frontend-builder /app/dist ./dist
COPY --from=backend-builder /app/server/dist ./server/dist

# 复制项目文件
COPY package*.json ./
COPY server.js ./
COPY start.js ./
COPY ecosystem.config.js ./

# 复制配置目录
COPY config ./config

# 复制后端文件
COPY server/package*.json ./server/
COPY server/routes ./server/routes
COPY server/public ./server/public

# 创建必要的目录
RUN mkdir -p logs uploads server/uploads server/config

# 创建基础API配置文件
RUN echo '{"version":"1.0.0","lastUpdated":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","keys":[]}' > server/config/api-keys.json

# 安装生产依赖
RUN npm ci --production --silent

# 安装后端生产依赖
WORKDIR /app/server
RUN npm ci --production --silent

# 回到工作目录
WORKDIR /app

# 设置目录权限
RUN chown -R nodejs:nodejs /app

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 8350 8450

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8450/health || exit 1

# 使用 tini 作为 PID 1
ENTRYPOINT ["/sbin/tini", "--"]

# 启动服务
CMD ["node", "start.js", "prod"]
