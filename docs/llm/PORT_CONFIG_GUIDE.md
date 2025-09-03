# 端口配置修改指南

## 当前端口配置

| 服务 | 开发环境 | 生产环境 | 配置文件位置 |
|------|----------|----------|--------------|
| 前端 | 3010 | - | `start.js` + `vite.config.ts` |
| 后端 | 8400 | 8400 | `start.js` + `config/project.config.ts` |
| 生产服务器 | - | 8300 | `start.js` + `server.js` |

## 修改步骤

### 1. 修改启动脚本端口 (start.js)

```javascript
// 在 start.js 中找到 environments 对象，修改对应端口
const environments = {
  dev: {
    frontend: { port: 3010 },  // 修改前端开发端口
    backend: { port: 8400 }    // 修改后端开发端口
  },
  prod: {
    backend: { port: 8400 },   // 修改后端生产端口
    server: { port: 8300 }     // 修改生产服务器端口
  }
}
```

### 2. 修改后端配置端口 (config/project.config.ts)

```typescript
const DEFAULT_CONFIG: ProjectConfig = {
  server: {
    port: 8400,  // 修改后端默认端口
    // ...
  }
}
```

### 3. 修改生产服务器端口 (server.js)

```javascript
const PORT = process.env.PORT || 8300;  // 修改生产服务器端口
```

### 4. 修改前端代理配置 (vite.config.ts)

```typescript
export default defineConfig({
  server: {
    port: 3010,  // 修改前端开发端口
    proxy: {
      '/internal-api': {
        target: 'http://localhost:8400',  // 修改后端代理端口
        // ...
      }
    }
  }
})
```

## 推荐端口配置方案

### 方案 1: 当前配置（推荐）
- 前端开发: 3010
- 后端: 8400  
- 生产服务器: 8300

### 方案 2: 传统配置
- 前端开发: 3000
- 后端: 8000
- 生产服务器: 4000

### 方案 3: 企业级配置
- 前端开发: 3010
- 后端: 8080
- 生产服务器: 80 (需要管理员权限)

## 修改后的验证步骤

1. 修改配置文件
2. 重启所有服务：`npm run clean && npm run dev:all`
3. 验证服务可访问性：
   ```bash
   curl http://localhost:新前端端口
   curl http://localhost:新后端端口/health
   ```

## 注意事项

1. **端口冲突**: 确保新端口没有被其他服务占用
2. **防火墙**: 生产环境确保端口已开放
3. **代理配置**: 修改端口后需要同步更新所有代理配置
4. **环境变量**: 可以通过环境变量动态覆盖端口配置
5. **文档更新**: 修改后记得更新 `docs/startup-guide.md`

## 环境变量覆盖

你也可以通过环境变量临时修改端口，无需修改代码：

```bash
export FRONTEND_PORT=3000
export BACKEND_PORT=8000
export SERVER_PORT=4000

npm run dev:all
```
