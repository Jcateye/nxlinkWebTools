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

# 复制配置文件
COPY config ./config

# 复制后端相关文件
COPY server/package*.json ./server/
COPY server/tsconfig*.json ./server/
COPY server/src ./server/src

# 安装依赖并构建 (移除构建工具，只使用npm)
WORKDIR /app/server
RUN npm ci --production=false && npm run build

# 阶段3: 生产镜像
FROM node:18-alpine AS production

# 安装生产环境所需工具
RUN apk add --no-cache tini

WORKDIR /app

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 复制必要文件
COPY --from=frontend-builder /app/dist ./dist
COPY --from=backend-builder /app/server/dist ./server/dist
COPY --from=backend-builder /app/config ./config

# 复制生产环境文件
COPY server/config ./server/config
COPY server/public ./server/public
COPY server/routes ./server/routes
COPY server.js ./
COPY start.js ./
COPY ecosystem.config.js ./

# 复制package.json文件
COPY package*.json ./
COPY server/package*.json ./server/

# 安装生产依赖
RUN npm ci --production
WORKDIR /app/server
RUN npm ci --production
WORKDIR /app

# 创建日志目录
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 8350 8450

# 使用 tini 作为 PID 1
ENTRYPOINT ["/sbin/tini", "--"]

# 启动服务
CMD ["node", "start.js", "prod"]
