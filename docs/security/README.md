# 🔒 安全文档

本目录包含项目安全配置和最佳实践相关的文档。

## 📁 目录内容

```
docs/security/
├── API_KEY_SECURITY_README.md    # API密钥安全指南 ⭐⭐⭐⭐⭐
└── README.md                     # 本说明文档
```

## 📋 文档说明

### 核心安全文档

#### `API_KEY_SECURITY_README.md` ⭐⭐⭐⭐⭐
API密钥安全管理和最佳实践指南。

**内容特色**:
- 🔑 API密钥生命周期管理
- 🔒 安全存储和传输
- 🛡️ 访问控制策略
- 📊 监控和审计
- 🚨 安全事件响应

**重要性**: ⭐⭐⭐⭐⭐ (核心安全文档)

## 🔑 API密钥安全管理

### 密钥生成
```bash
# 生成强密钥
openssl rand -hex 32

# 或使用专门工具
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 安全存储
```bash
# 环境变量（推荐）
export API_KEY="your-secure-key"

# 或使用密钥管理服务
# AWS Secrets Manager
# HashiCorp Vault
# Azure Key Vault
```

### 密钥轮换
```bash
# 定期轮换密钥
# 1. 生成新密钥
NEW_KEY=$(openssl rand -hex 32)

# 2. 更新配置
sed -i "s/OLD_KEY/$NEW_KEY/g" .env.production

# 3. 重启服务
sudo systemctl restart nxlink-webtools

# 4. 验证功能
curl -H "Authorization: Bearer $NEW_KEY" http://localhost:8400/api/test

# 5. 停用旧密钥
# 记录旧密钥停用时间
echo "Old key deactivated at $(date)" >> key_rotation.log
```

## 🛡️ 安全配置

### HTTPS配置
```nginx
# Nginx SSL配置
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;

    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # HSTS头
    add_header Strict-Transport-Security "max-age=63072000" always;
}
```

### 防火墙配置
```bash
# UFW防火墙配置
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8400

# 限制SSH访问
sudo ufw allow from 192.168.1.0/24 to any port 22

# 查看状态
sudo ufw status
```

### 文件权限
```bash
# 设置文件权限
sudo chown -R nxlink:nxlink /var/www/nxlinkWebTools
sudo chmod -R 755 /var/www/nxlinkWebTools
sudo chmod 600 /var/www/nxlinkWebTools/.env.production

# 设置密钥文件权限
sudo chmod 400 /etc/ssl/private/yourdomain.key
```

## 📊 安全监控

### 日志监控
```bash
# 配置日志轮转
sudo nano /etc/logrotate.d/nxlink-webtools

/var/log/nxlink-webtools/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nxlink nxlink
    postrotate
        systemctl reload nxlink-webtools
    endscript
}
```

### 入侵检测
```bash
# 安装Fail2Ban
sudo apt install fail2ban

# 配置SSH防护
sudo nano /etc/fail2ban/jail.local

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

### 审计日志
```typescript
// 应用层审计
const auditLog = {
  timestamp: new Date().toISOString(),
  userId: req.user?.id,
  action: 'api_call',
  resource: req.path,
  method: req.method,
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  statusCode: res.statusCode,
  duration: Date.now() - startTime
};

// 记录审计日志
logger.info('AUDIT', auditLog);
```

## 🚨 安全事件响应

### 事件检测
```bash
# 监控异常活动
# 1. 异常登录尝试
grep "Failed password" /var/log/auth.log | tail -10

# 2. 异常API调用
grep "401\|403" /var/log/nxlink-webtools/access.log | tail -10

# 3. 高频请求
awk '{print $1}' /var/log/nxlink-webtools/access.log | sort | uniq -c | sort -nr | head -10
```

### 响应流程
```bash
# 1. 隔离受影响系统
sudo ufw deny from attacker_ip

# 2. 备份证据
sudo cp /var/log/nxlink-webtools/access.log /var/log/security-incident-$(date +%Y%m%d).log

# 3. 更改所有密钥
# 生成新密钥
NEW_API_KEY=$(openssl rand -hex 32)

# 更新配置并重启
sed -i "s/API_KEY=.*/API_KEY=$NEW_API_KEY/" .env.production
sudo systemctl restart nxlink-webtools

# 4. 通知相关方
echo "Security incident detected and mitigated at $(date)" | mail -s "Security Alert" admin@company.com

# 5. 事后分析
# 分析攻击向量
# 更新安全策略
# 改进监控规则
```

## 🔐 加密最佳实践

### 数据传输加密
```typescript
// HTTPS强制跳转
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### 敏感数据加密
```typescript
import crypto from 'crypto';

// 加密函数
function encrypt(text: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY!);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// 解密函数
function decrypt(encrypted: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY!);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

## 📋 安全检查清单

### 部署前检查
- [ ] SSL证书已安装并配置正确
- [ ] 防火墙规则已配置
- [ ] 文件权限已正确设置
- [ ] 敏感配置文件已加密
- [ ] 日志轮转已配置

### 运行时监控
- [ ] 定期检查密钥是否泄露
- [ ] 监控异常登录尝试
- [ ] 定期更新依赖包
- [ ] 监控系统资源使用
- [ ] 备份策略已实施

### 应急准备
- [ ] 事件响应流程已制定
- [ ] 联系人列表已更新
- [ ] 备份恢复流程已测试
- [ ] 安全工具已安装

## 📚 相关文档

- [环境配置](../env/README.md)
- [部署指南](../deployment/DEPLOYMENT_GUIDE.md)
- [Nginx配置](../nginx/README.md)
- [项目配置](../../config/README.md)

## 🔗 外部资源

- [OWASP安全指南](https://owasp.org/www-project-top-ten/)
- [NIST网络安全框架](https://www.nist.gov/cyberframework)
- [SSL配置生成器](https://ssl-config.mozilla.org/)
- [安全头参考](https://securityheaders.com/)

---

**最后更新**: 2025年1月
**维护者**: 开发团队
