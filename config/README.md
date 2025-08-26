# 项目配置管理

本目录包含项目的配置管理相关文件。

## 文件说明

### `project.config.ts`
项目级配置文件，集中管理所有环境变量和配置项。

**主要功能：**
- 统一配置管理
- 环境区分（开发/生产）
- 配置验证
- 配置信息打印

### `env.template`
环境变量模板文件，包含所有需要配置的环境变量。

## 使用方法

### 1. 配置环境变量

复制环境变量模板并填写实际值：

```bash
# 复制模板文件
cp config/env.template .env

# 编辑环境变量
vim .env
```

### 2. 在代码中使用配置

**后端使用：**
```typescript
import { PROJECT_CONFIG } from '../config/project.config';

// 使用OpenAPI配置
const accessKey = PROJECT_CONFIG.openapi.accessKey;
const port = PROJECT_CONFIG.server.port;
```

**前端使用：**
```typescript
import { OPENAPI_CONFIG } from './config/apiConfig';

// 使用前端配置
const accessKey = OPENAPI_CONFIG.defaultAuth.accessKey;
```

### 3. 配置验证

项目启动时会自动验证配置：

```bash
npm run dev
```

输出示例：
```
🔧 项目配置信息:
📍 服务端口: 8001
🌐 环境: development
🔑 OpenAPI AccessKey: 已配置
🔐 OpenAPI AccessSecret: 已配置
✅ 配置验证通过
```

## 配置项说明

### 服务器配置
- `PORT`: 服务器端口（默认：8001）
- `NODE_ENV`: 运行环境（development/production）
- `CORS_ORIGIN`: 允许跨域的源地址
- `JWT_SECRET`: JWT签名密钥
- `LOG_LEVEL`: 日志级别

### OpenAPI配置
- `OPENAPI_ACCESS_KEY`: nxlink OpenAPI访问密钥
- `OPENAPI_ACCESS_SECRET`: nxlink OpenAPI访问密钥
- `OPENAPI_BIZ_TYPE`: 业务类型（通常为8）

### 外部API Key
- `EXTERNAL_API_KEY_1/2`: 外部平台调用我们API时的认证密钥

### 前端配置
- `VITE_*`: 前端Vite构建时使用的环境变量

## 环境区分

### 开发环境
- 使用默认配置和环境变量
- 详细日志输出
- 宽松的安全设置

### 生产环境
- 强制使用环境变量
- 警告级别日志
- 严格的安全验证

## 安全注意事项

1. **敏感信息保护**
   - 不要将包含真实密钥的`.env`文件提交到版本控制
   - 使用强密码和随机生成的密钥
   - 定期更换API密钥

2. **前端变量**
   - `VITE_*`变量会暴露在客户端代码中
   - 不要在前端变量中放置敏感信息

3. **生产环境**
   - 必须配置安全的JWT密钥
   - 使用HTTPS
   - 配置适当的CORS策略

## 故障排除

### 配置验证失败
如果看到配置警告，请检查：
1. 环境变量是否正确设置
2. 是否使用了默认的示例值
3. 生产环境是否配置了安全密钥

### 前端配置不生效
1. 确保环境变量以`VITE_`开头
2. 重启开发服务器
3. 检查`import.meta.env`是否正确

### API Key认证失败
1. 检查`EXTERNAL_API_KEY_*`配置
2. 确认API Key在请求头中正确传递
3. 查看服务器日志获取详细错误信息

## 配置更新

当添加新的配置项时：

1. 更新`project.config.ts`中的类型定义
2. 在相应的环境配置中添加默认值
3. 更新`env.template`模板文件
4. 更新此README文档

## 示例配置

### 开发环境示例
```bash
# .env
OPENAPI_ACCESS_KEY=dev-access-key
OPENAPI_ACCESS_SECRET=dev-access-secret
EXTERNAL_API_KEY_1=dev-api-key-1
```

### 生产环境示例
```bash
# .env.production
NODE_ENV=production
OPENAPI_ACCESS_KEY=prod-xxxxxxxxxxxxxxxx
OPENAPI_ACCESS_SECRET=prod-xxxxxxxxxxxxxxxx
JWT_SECRET=prod-random-jwt-secret-key
EXTERNAL_API_KEY_1=prod-secure-api-key-1
```
