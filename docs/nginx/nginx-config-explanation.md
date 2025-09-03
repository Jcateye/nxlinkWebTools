# Nginx配置详细解读

## 1. IP白名单配置 (geo模块)
```nginx
geo $allowed_ip {
    default 0;  # 默认值0表示拒绝访问
    10.0.0.0/8 1;        # A类私有网络 (10.0.0.0-10.255.255.255)
    172.16.0.0/12 1;     # B类私有网络 (172.16.0.0-172.31.255.255)
    192.168.0.0/16 1;    # C类私有网络 (192.168.0.0-192.168.255.255)
    52.82.74.116 1;      # 金时数据服务器IP
    61.141.64.109 1;     # 深圳办公室出口IP
}
```
**作用**: 定义一个变量$allowed_ip，根据客户端IP判断是否允许访问

## 2. 限流配置 (limit_req_zone)
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;
```
**作用**: 
- `api_limit`: API接口限制每秒10个请求
- `general_limit`: 一般请求限制每秒30个请求
- `10m`: 分配10MB内存存储限流状态

## 3. SSL安全配置
```nginx
ssl_protocols TLSv1.2 TLSv1.3;  # 只允许安全的TLS版本
ssl_session_cache shared:SSL:10m;  # SSL会话缓存，提高性能
ssl_session_timeout 10m;  # 会话超时时间
```

## 4. 安全响应头
```nginx
add_header X-Frame-Options "SAMEORIGIN";  # 防止点击劫持
add_header X-Content-Type-Options "nosniff";  # 防止MIME类型嗅探
add_header X-XSS-Protection "1; mode=block";  # XSS保护
add_header Content-Security-Policy "...";  # 内容安全策略
```

## 5. 路由配置说明

### 健康检查路由
```nginx
location = /health {
    access_log off;  # 不记录健康检查日志
}
```

### API代理路由
```nginx
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;  # 限流：允许突发20个请求
    proxy_pass http://localhost:8350;  # 代理到Node.js服务
}
```

### 静态文件缓存
```nginx
location ~* \.(js|css|png|jpg...)$ {
    expires 1y;  # 缓存1年
    add_header Cache-Control "public, immutable";  # 不可变缓存
}
```

### 前端路由处理
```nginx
location / {
    try_files $uri $uri/ /index.html;  # SPA路由回退到index.html
}
```

## 6. 安全防护

### IP白名单检查
```nginx
if ($allowed_ip = 0) {
    return 403;  # 非白名单IP返回403禁止访问
}
```

### 敏感文件保护
```nginx
location ~ /\. {
    deny all;  # 禁止访问隐藏文件(.env, .git等)
}
```

## 7. 性能优化

- **静态文件直接由nginx处理**，不经过Node.js
- **gzip压缩**减少传输大小
- **代理缓冲**提高代理性能
- **SSL会话复用**减少握手开销

## 8. 监控和日志

```nginx
access_log /var/log/nginx/webtools_access.log;  # 访问日志
error_log /var/log/nginx/webtools_error.log;    # 错误日志
```