# 🌐 Nginx配置文档

本目录包含项目所有Nginx反向代理配置相关文档和配置文件。

## 📁 目录内容

```
docs/nginx/
├── nginx.conf                    # 主Nginx配置文件 ⭐⭐⭐⭐⭐
├── nginx-webtools-optimized.conf # WebTools优化配置 ⭐⭐⭐⭐⭐
├── nginx-external.conf           # 外部访问配置 ⭐⭐⭐⭐
├── nginx-external-simple.conf    # 简化外部配置 ⭐⭐⭐
├── nginx.active.conf             # 当前激活配置 ⭐⭐⭐
├── nginx-config-explanation.md   # 配置详细说明 ⭐⭐⭐⭐⭐
├── EXTERNAL_NGINX_GUIDE.md      # 外部Nginx指南 ⭐⭐⭐⭐
└── README.md                     # 本说明文档
```

## 📋 文件说明

### 核心配置文件

#### `nginx.conf` ⭐⭐⭐⭐⭐
主Nginx配置文件，包含基本的反向代理和静态文件服务配置。

**适用环境**: 开发环境、简单生产环境
**重要性**: ⭐⭐⭐⭐⭐ (基础配置)

#### `nginx-webtools-optimized.conf` ⭐⭐⭐⭐⭐
针对NxLink WebTools优化过的Nginx配置，包含性能优化和安全配置。

**特性**:
- 🚀 性能优化配置
- 🔒 安全头配置
- 📊 日志优化
- 🗜️ Gzip压缩

**适用环境**: 生产环境
**重要性**: ⭐⭐⭐⭐⭐ (生产配置)

#### `nginx-external.conf` ⭐⭐⭐⭐
外部访问专用配置，适用于CDN或外部代理场景。

**适用环境**: CDN集成、外部代理
**重要性**: ⭐⭐⭐⭐ (专用配置)

#### `nginx-external-simple.conf` ⭐⭐⭐
简化版的外部访问配置，适合快速部署。

**适用环境**: 快速测试、临时部署
**重要性**: ⭐⭐⭐ (简化配置)

#### `nginx.active.conf` ⭐⭐⭐
当前系统激活的Nginx配置备份。

**用途**: 配置版本控制、快速恢复
**重要性**: ⭐⭐⭐ (备份配置)

### 文档文件

#### `nginx-config-explanation.md` ⭐⭐⭐⭐⭐
Nginx配置详细说明文档，包含：
- 配置项解释
- 性能优化说明
- 安全配置指南
- 故障排除

**重要性**: ⭐⭐⭐⭐⭐ (核心文档)

#### `EXTERNAL_NGINX_GUIDE.md` ⭐⭐⭐⭐
外部Nginx配置指南，适用于复杂的网络架构。

**内容**: 负载均衡、多域名配置、SSL证书配置
**重要性**: ⭐⭐⭐⭐ (高级文档)

## 🚀 配置使用指南

### 1. 选择合适的配置

#### 开发环境
```bash
# 使用基础配置
cp docs/nginx/nginx.conf /etc/nginx/nginx.conf

# 重启Nginx
sudo nginx -t && sudo nginx -s reload
```

#### 生产环境
```bash
# 使用优化配置
cp docs/nginx/nginx-webtools-optimized.conf /etc/nginx/nginx.conf

# 测试配置
sudo nginx -t

# 重启服务
sudo systemctl restart nginx
```

#### 外部访问
```bash
# 外部代理配置
cp docs/nginx/nginx-external.conf /etc/nginx/nginx.conf

# 或使用简化配置
cp docs/nginx/nginx-external-simple.conf /etc/nginx/nginx.conf
```

### 2. 自定义配置

#### 修改端口
```nginx
server {
    listen 80;           # 修改为实际端口
    server_name localhost;

    location / {
        proxy_pass http://localhost:8400;  # 修改为实际后端地址
    }
}
```

#### 添加SSL
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # ... 其他配置
}
```

## 🔧 配置优化

### 性能优化

#### 启用Gzip压缩
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss;
```

#### 设置缓存头
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### 连接优化
```nginx
worker_connections 1024;
keepalive_timeout 65;
client_max_body_size 50M;
```

### 安全配置

#### 安全头
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

#### 限制访问
```nginx
# 限制HTTP方法
if ($request_method !~ ^(GET|HEAD|POST|PUT|DELETE|OPTIONS)$ ) {
    return 405;
}

# IP白名单
allow 192.168.1.0/24;
deny all;
```

## 📊 监控和日志

### 日志配置
```nginx
# 访问日志
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                '$status $body_bytes_sent "$http_referer" '
                '"$http_user_agent" "$http_x_forwarded_for"';

access_log /var/log/nginx/access.log main;

# 错误日志
error_log /var/log/nginx/error.log warn;
```

### 监控指标
```bash
# 查看Nginx状态
sudo nginx -T

# 查看活动连接
sudo netstat -tlnp | grep nginx

# 查看日志
sudo tail -f /var/log/nginx/access.log
```

## 🔍 故障排除

### 常见问题

1. **502 Bad Gateway**
   ```bash
   # 检查后端服务状态
   curl http://localhost:8400

   # 检查Nginx错误日志
   sudo tail -f /var/log/nginx/error.log
   ```

2. **403 Forbidden**
   ```bash
   # 检查文件权限
   ls -la /var/www/html

   # 检查Nginx用户权限
   ps aux | grep nginx
   ```

3. **配置测试失败**
   ```bash
   # 测试配置语法
   sudo nginx -t

   # 查看详细错误
   sudo nginx -T
   ```

## 📈 性能调优

### 工作进程优化
```nginx
# 根据CPU核心数设置
worker_processes auto;

# 事件处理优化
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}
```

### 缓存优化
```nginx
# 代理缓存
proxy_cache_path /tmp/nginx_cache levels=1:2 keys_zone=my_cache:10m max_size=1g;

location /api/ {
    proxy_cache my_cache;
    proxy_cache_valid 200 1h;
}
```

## 🔄 配置管理

### 配置版本控制
```bash
# 备份当前配置
cp /etc/nginx/nginx.conf docs/nginx/nginx.active.conf

# 提交到版本控制
git add docs/nginx/
git commit -m "Update Nginx configuration"
```

### 配置热重载
```bash
# 测试配置
sudo nginx -t

# 热重载（不中断服务）
sudo nginx -s reload

# 验证配置生效
curl -I http://localhost
```

## 📚 相关文档

- [Docker部署](../docker/README.md)
- [环境配置](../env/README.md)
- [部署指南](../deployment/DEPLOYMENT_GUIDE.md)
- [项目配置](../../config/README.md)

## 🔗 外部链接

- [Nginx官方文档](https://nginx.org/en/docs/)
- [Nginx配置最佳实践](https://www.nginx.com/blog/nginx-configuration-best-practices/)
- [Nginx安全配置](https://www.nginx.com/blog/mitigating-ddos-attacks-with-nginx-and-nginx-plus/)

---

**最后更新**: 2025年1月
**维护者**: 开发团队
