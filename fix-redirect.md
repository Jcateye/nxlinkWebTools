# 解决HK环境重定向问题

## 问题原因

1. **vite.config.ts 配置错误**：HK环境的target缺少 `/hk` 路径
2. **服务器重定向**：`nxlink.nxcloud.com/hk` 服务器返回重定向到 `nxlink.ai`

## 已实施的修复

### 1. 开发环境 (3010端口)
修复了 `vite.config.ts`：
```javascript
'/api/hk': {
  target: 'https://nxlink.nxcloud.com/hk',  // 添加了 /hk
  changeOrigin: true,
  secure: false,
  rewrite: (path) => path.replace(/^\/api\/hk/, ''),
},
```

### 2. 生产环境 (4000端口)
更新了 `server.js`：
- 添加了 `followRedirects: false` 防止自动跟随重定向
- 设置正确的请求头（Host, Origin, Referer）
- 保留认证头信息
- 拦截并修改重定向响应

## 立即行动

### 开发环境
重启开发服务器：
```bash
# 停止当前服务 (Ctrl+C)
npm run dev
```

### 生产环境
重启生产服务器：
```bash
# 停止当前服务 (Ctrl+C)
npm run prod
```

## 验证步骤

1. 清除浏览器缓存
2. 切换到HK环境
3. 查看网络请求是否正常
4. 检查控制台是否还有CORS错误

## 如果仍有问题

可能是服务器端的配置问题，需要：
1. 联系后端团队确认 `nxlink.nxcloud.com/hk` 的重定向规则
2. 检查是否需要特殊的认证方式
3. 确认API路径是否正确