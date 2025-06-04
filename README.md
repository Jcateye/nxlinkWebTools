# 标签分组迁移工具

这个工具用于在不同租户之间复制标签分组和标签。

## 功能

1. 保存用户通用参数（nxCloudUserID, sourceTenantID, targetTenantID, authorization）到本地存储
2. 从源租户查询标签分组并展示
3. 支持多选标签分组
4. 将选中的标签分组及其标签复制到目标租户
5. 支持Excel/CSV批量导入标签

## 使用流程

1. 在"通用参数设置"中填写并保存必要的参数
2. 在"标签分组迁移"部分，查看源租户的标签分组列表
3. 选择需要迁移的标签分组
4. 点击"开始迁移"按钮
5. 等待迁移完成，查看结果

## 配置文件说明

项目包含以下主要配置文件：

1. **vite.config.ts**
   - 位置：项目根目录
   - 用途：Vite构建工具配置，包括开发服务器、代理和构建选项
   - 关键配置：
     - `server.port`: 开发服务器端口（默认3000）
     - `server.proxy`: API代理配置，解决跨域问题

2. **server.js**
   - 位置：项目根目录
   - 用途：生产环境Express服务器，提供静态文件和API代理
   - 关键配置：
     - `PORT`: 服务器端口（默认4000）
     - API代理路径：`/api` -> `https://nxlink.nxcloud.com`

3. **src/services/api.ts**
   - 位置：src/services目录
   - 用途：API服务配置，包括Axios实例和API请求函数
   - 关键配置：
     - `baseURL`: API请求基础路径
     - 请求拦截器：添加认证头和系统ID

4. **package.json**
   - 位置：项目根目录
   - 用途：项目依赖和脚本命令
   - 关键脚本：
     - `npm start`: 启动开发服务器
     - `npm run build`: 构建生产版本
     - `npm run prod`: 启动生产服务器

## 开发和构建

### 安装依赖

```bash
npm install
# 安装生产服务器所需依赖
npm install cors express http-proxy-middleware --save
```

### 启动开发服务器

```bash
npm start
```

### 构建生产版本

```bash
npm run build
```

### 启动生产服务器

```bash
npm run prod
```
应用将在 http://localhost:4000 上运行

## 部署说明

### 部署到其他服务器

1. 构建项目并复制以下文件到服务器：
   - `dist/` 目录（构建后的静态文件）
   - `server.js`（生产服务器配置）
   - `package.json`（依赖信息）

2. 在服务器上安装依赖：
   ```bash
   npm install --production
   ```

3. 启动服务器：
   ```bash
   node server.js
   ```
   或使用PM2等进程管理器：
   ```bash
   pm2 start server.js --name tag-migration-tool
   ```

### 修改服务器端口

编辑 `server.js` 文件中的以下行：
```javascript
const PORT = process.env.PORT || 4000;
```

### 修改API地址

如需指向其他API服务器，修改 `server.js` 中的代理配置：
```javascript
app.use('/api', createProxyMiddleware({
  target: 'https://your-api-server.com',
  // ...其他配置
}));
```

## 话术测试系统

话术测试系统是一个用于管理和测试客服话术的工具，具有以下功能：

### 主要功能

1. **测试任务管理**
   - 创建、编辑和删除测试任务
   - 每个任务可包含多个测试案例

2. **测试案例管理**
   - 创建、编辑和删除测试案例
   - 为每个案例添加对话行

3. **对话测试**
   - 支持坐席和客户角色的对话
   - 对每行对话进行预期符合度评估
   - 支持音频播放功能

4. **TTS语音生成**
   - 支持火山引擎和11labs两种TTS服务
   - 为每行对话生成音频
   - 可配置TTS服务的API密钥

5. **导入导出功能**
   - 支持Excel格式导入导出话术测试脚本
   - 每个工作表对应一个测试案例

### 使用方法

1. 点击"新增测试任务"按钮创建任务
2. 在任务中添加测试案例
3. 在测试案例中添加对话行
4. 为对话生成TTS音频并播放
5. 评估对话是否符合预期
6. 需要时可导出测试任务为Excel文件

### TTS服务配置

系统支持两种TTS服务：

1. **火山引擎**：需要配置API Key和API Secret
2. **11labs**：需要配置API Key

可以在设置面板中配置这些API密钥。 