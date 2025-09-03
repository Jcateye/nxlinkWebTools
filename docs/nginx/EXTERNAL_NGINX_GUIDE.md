# 外部Nginx配置指南

## 📋 概述

本项目已移除容器内的Nginx和Redis服务，现在使用外部Nginx进行反向代理。本指南介绍如何配置外部Nginx服务器。

## 🚀 快速部署步骤

### 1. 启动应用容器

```bash
# 开发环境
docker-compose up -d

# 或生产环境
docker-compose -f docker-compose.prod.yml up -d
```

应用将在端口8350上运行。

### 2. 配置外部Nginx

#### 开发环境配置

```bash
# 复制配置文件到Nginx
sudo cp nginx-external-simple.conf /etc/nginx/sites-available/nxlink

# 创建符号链接
sudo ln -s /etc/nginx/sites-available/nxlink /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载配置
sudo systemctl reload nginx
```

#### 生产环境配置

```bash
# 编辑配置文件
sudo vim /etc/nginx/sites-available/nxlink

# 复制 nginx-external.conf 的内容并修改：
# - server_name: 替换为您的域名
# - ssl_certificate: 设置SSL证书路径
# - proxy_pass: 确保指向正确的应用端口

# 创建符号链接并重载
sudo ln -s /etc/nginx/sites-available/nxlink /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔧 配置说明

### 核心配置项

```nginx
# 应用端口（根据您的Docker配置调整）
proxy_pass http://localhost:8350;

# WebSocket支持（重要）
location /socket.io/ {
    proxy_pass http://localhost:8350;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_buffering off;
    proxy_cache off;
}

# 文件上传大小限制
client_max_body_size 10M;
```

### SSL配置（生产环境）

```bash
# 获取Let's Encrypt证书
sudo certbot --nginx -d your-domain.com

# 或手动配置
ssl_certificate /path/to/cert.pem;
ssl_certificate_key /path/to/key.pem;
```

## 📊 验证配置

### 测试基本功能

```bash
# 测试主页
curl http://your-domain.com/

# 测试API
curl http://your-domain.com/api/health

# 测试WebSocket连接
# 在浏览器中访问应用并检查实时功能
```

### 监控和日志

```bash
# 查看Nginx日志
sudo tail -f /var/log/nginx/nxlink_access.log
sudo tail -f /var/log/nginx/nxlink_error.log

# 查看应用日志
docker-compose logs -f nxlink-app
```

## 🛠️ 故障排除

### 常见问题

#### 1. 502 Bad Gateway
```bash
# 检查应用是否正常运行
docker-compose ps

# 检查应用端口
curl http://localhost:8350/health

# 检查防火墙
sudo ufw status
```

#### 2. WebSocket连接失败
```nginx
# 确保WebSocket配置正确
location /socket.io/ {
    proxy_pass http://localhost:8350;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_buffering off;  # 关键配置
    proxy_cache off;      # 关键配置
}
```

#### 3. 文件上传失败
```nginx
# 检查上传大小限制
client_max_body_size 10M;

# 检查代理超时
proxy_read_timeout 60s;
proxy_send_timeout 60s;
```

### 性能优化

```nginx
# 启用Gzip压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# 静态资源缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# 连接池
upstream nxlink_backend {
    server localhost:8350;
    keepalive 32;
}
```

## 🔒 安全配置

### 基本安全头

```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 防火墙配置

```bash
# 只开放必要端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw --force enable
```

## 📈 监控配置

### 健康检查

```bash
# 添加健康检查端点
curl http://your-domain.com/health
```

### 日志轮转

```bash
# 配置logrotate
sudo vim /etc/logrotate.d/nginx

/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 www-data adm
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

## 🎯 使用场景

### 开发环境
- 使用 `nginx-external-simple.conf`
- 无SSL，直接通过端口80访问
- 简化配置，快速启动

### 生产环境
- 使用 `nginx-external.conf`
- 启用SSL和安全配置
- 配置域名和证书
- 添加监控和日志

### 负载均衡
```nginx
upstream nxlink_backend {
    server app1:8350;
    server app2:8350;
    server app3:8350;
}
```

---

## 📞 支持

如遇到配置问题，请检查：
1. Nginx配置文件语法：`sudo nginx -t`
2. 应用容器状态：`docker-compose ps`
3. 网络连接：`telnet localhost 8350`
4. 日志文件：`/var/log/nginx/`
