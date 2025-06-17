# Nginx 生产环境接口代理失败修复指南

## 问题诊断

在生产环境中，前端应用通过 `http://<服务器IP>:<端口>/api/...` 的路径请求后端接口时，出现超时或失败。经排查，原因是部署在前端服务器上的 Nginx 反向代理配置不正确，未能正确处理和转发 `/api` 路径的请求。

开发环境（Vite）的代理配置会将 `/api` 请求重写（去掉 `/api` 前缀）并转发到目标服务器，而生产环境的 Nginx 没有执行相同的重写操作，导致后端服务收到了无法识别的 URL，从而请求失败。

## 解决方案

需要修改 Nginx 的配置文件（通常位于 `/etc/nginx/nginx.conf` 或 `/etc/nginx/conf.d/` 目录下），为前端应用的 `server` 块添加或修改 `location /api/` 的配置，以确保请求被正确重写和转发。

### Nginx 配置示例

假设您的后端服务运行在 `http://127.0.0.1:8080`（请根据您的实际情况修改此地址）。

```nginx
server {
    listen 4000; # 假设前端应用监听此端口
    server_name your_domain_or_ip; # 您的域名或IP

    # ... 其他静态文件处理等配置 ...

    # API 代理配置
    location /api/ {
        # 关键步骤：重写URL，去掉/api前缀
        # 例如，将 /api/admin/login 重写为 /admin/login
        rewrite ^/api/(.*)$ /$1 break;

        # 设置代理转发的目标地址
        proxy_pass http://127.0.0.1:8080; # 重要：替换为您的后端服务地址

        # 设置代理请求头，确保后端能获取到真实信息
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 解决WebSocket代理问题（如果需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 增加代理超时时间（可选，但建议）
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # ... 其他配置 ...
}
```

### 操作步骤

1.  **找到配置文件**：通过 SSH 连接到您的生产服务器 (`10.75.29.88`)，找到正在为 `4000` 端口提供服务的 Nginx 配置文件。
2.  **备份配置**：在修改前，请务必备份当前的配置文件：`cp original.conf original.conf.bak`。
3.  **修改配置**：使用 `vim` 或 `nano` 编辑器，参照上面的示例修改 `location /api/` 部分。
4.  **检查语法**：保存文件后，执行 `sudo nginx -t` 命令检查 Nginx 配置语法是否正确。
5.  **重新加载配置**：如果语法无误，执行 `sudo systemctl reload nginx` 或 `sudo nginx -s reload` 来使新配置生效。
6.  **测试**：重新尝试在您的应用中执行标签迁移操作，问题应该已经解决。

---

如果问题仍然存在，请检查：
- `proxy_pass` 的地址是否正确指向了正在运行的后端服务。
- 后端服务的防火墙设置是否允许来自 Nginx 代理的连接。
- 查看 Nginx 的错误日志 (`/var/log/nginx/error.log`) 以获取更详细的线索。

## 🔍 问题确认

通过测试发现：
- ✅ **直接访问** `http://localhost:4000/api/home/api/faqTenantLanguage` → 正常返回数据
- ❌ **nginx代理** `https://10.75.29.104/api/home/api/faqTenantLanguage` → 500错误，NPE异常

## 🚨 可能原因

### 1. **请求头转发不完整**
nginx可能没有转发关键的请求头，导致后端处理异常。

### 2. **负载均衡配置问题**
如果有多个后端实例，某些实例可能有问题。

### 3. **SSL终止导致的上下文丢失**
HTTPS到HTTP的转换可能丢失了某些请求信息。

## 🛠️ 修复方案

### 方案1：检查nginx配置中的请求头转发

在nginx配置中添加完整的请求头转发：

```nginx
location /api/ {
    proxy_pass http://backend;
    
    # 转发所有必要的请求头
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # 转发自定义请求头
    proxy_set_header authorization $http_authorization;
    proxy_set_header system_id $http_system_id;
    proxy_set_header time_zone $http_time_zone;
    proxy_set_header currentdomain $http_currentdomain;
    proxy_set_header createts $http_createts;
    proxy_set_header lang $http_lang;
    
    # 其他重要配置
    proxy_pass_request_headers on;
    proxy_buffering off;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

### 方案2：添加调试信息

在nginx配置中添加调试日志：

```nginx
# 在nginx.conf的http段添加
log_format debug_format '$remote_addr - $remote_user [$time_local] '
                        '"$request" $status $body_bytes_sent '
                        '"$http_referer" "$http_user_agent" '
                        'authorization: "$http_authorization" '
                        'system_id: "$http_system_id"';

# 在location中启用调试日志
location /api/ {
    access_log /var/log/nginx/api_debug.log debug_format;
    # ... 其他配置
}
```

### 方案3：检查上游服务器配置

```nginx
upstream backend {
    # 如果有多个后端实例，检查健康状态
    server localhost:4000 weight=1 max_fails=3 fail_timeout=30s;
    # server localhost:4001 weight=1 max_fails=3 fail_timeout=30s;
    
    # 添加健康检查（需要nginx-plus或第三方模块）
    # health_check;
    
    # 会话保持（如果需要）
    # ip_hash;
}
```

### 方案4：临时绕过方案

如果急需解决，可以临时配置nginx直接转发到已知健康的实例：

```nginx
location /api/ {
    # 临时直接转发到健康的实例
    proxy_pass http://localhost:4000;
    
    # 必要的请求头转发
    proxy_set_header Host $http_host;
    proxy_set_header authorization $http_authorization;
    proxy_set_header system_id $http_system_id;
    proxy_pass_request_headers on;
}
```

## 🔧 具体操作步骤

### 步骤1：定位nginx配置文件

```bash
# 查找nginx配置文件
sudo find /etc -name "nginx.conf" 2>/dev/null
sudo find /usr/local -name "nginx.conf" 2>/dev/null

# 查看nginx进程和配置
ps aux | grep nginx
sudo nginx -t  # 测试配置语法
```

### 步骤2：检查当前配置

```bash
# 查看当前nginx配置
sudo nginx -T | grep -A 20 -B 5 "location.*api"
```

### 步骤3：备份并修改配置

```bash
# 备份配置
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)

# 编辑配置
sudo vim /etc/nginx/sites-available/default
# 或者
sudo vim /etc/nginx/conf.d/default.conf
```

### 步骤4：重新加载配置

```bash
# 测试配置语法
sudo nginx -t

# 重新加载配置（无中断）
sudo nginx -s reload

# 如果重载失败，重启nginx
sudo systemctl restart nginx
```

### 步骤5：验证修复

```bash
# 测试API是否正常
curl -s --insecure "https://10.75.29.104/api/home/api/faqTenantLanguage" \
  -H "authorization: YOUR_TOKEN" \
  -H "system_id: 5" | jq .
```

## 🚨 应急处理

如果问题严重影响生产环境：

### 1. 立即回滚
```bash
# 恢复备份配置
sudo cp /etc/nginx/nginx.conf.backup.YYYYMMDD_HHMMSS /etc/nginx/nginx.conf
sudo nginx -s reload
```

### 2. 临时直连
临时修改前端API基础URL，直接访问后端：
```javascript
// 临时修改
const API_BASE_URL = 'http://localhost:4000/api';
```

### 3. 健康检查
定期执行检查脚本：
```bash
# 每分钟检查一次
watch -n 60 './scripts/check-backend-instances.sh'
```

## 📊 监控建议

### 1. 添加API监控
- 设置API响应时间监控
- 添加错误率报警
- 监控nginx错误日志

### 2. 自动重试机制
前端已实现，确保：
- NPE错误自动重试
- 指数退避策略
- 错误统计和报警

### 3. 健康检查
定期检查后端实例状态，自动处理异常实例。

## 🎯 长期解决方案

1. **容器化部署**：使用Docker/K8s统一管理
2. **服务发现**：动态后端实例管理
3. **熔断器模式**：防止故障扩散
4. **分布式追踪**：更好的问题定位 