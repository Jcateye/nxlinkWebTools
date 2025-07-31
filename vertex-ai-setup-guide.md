# Google Vertex AI 配置指南

## 概述

Google Vertex AI 是 Google Cloud Platform 上的机器学习平台，提供 Gemini 模型的企业级部署。与 Google AI Studio 不同，Vertex AI 需要更多的配置步骤，但提供更强的企业功能和安全性。

## 配置步骤

### 1. 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 记录项目ID（Project ID）

### 2. 启用 Vertex AI API

1. 在 Google Cloud Console 中，导航到 API & Services > Library
2. 搜索 "Vertex AI API"
3. 点击启用

### 3. 设置认证

#### 方法1：服务账户密钥（推荐用于生产环境）

1. 导航到 IAM & Admin > Service Accounts
2. 创建新的服务账户
3. 为服务账户分配以下角色：
   - Vertex AI User
   - AI Platform Developer
4. 创建并下载 JSON 密钥文件
5. 使用 Google Cloud SDK 生成访问令牌：

```bash
# 设置环境变量
export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/service-account-key.json"

# 获取访问令牌
gcloud auth application-default print-access-token
```

#### 方法2：用户账户认证（适用于开发环境）

```bash
# 登录 Google Cloud
gcloud auth login

# 设置默认项目
gcloud config set project YOUR_PROJECT_ID

# 获取访问令牌
gcloud auth print-access-token
```

### 4. 在系统中配置

在LLM配置页面中：

1. **厂商名称**：选择 "Google Vertex AI"
2. **API Key**：输入从上述步骤获得的访问令牌
3. **Project ID**：输入您的 Google Cloud 项目ID
4. **Region**：选择合适的区域（推荐 us-central1）

## API URL 格式

Vertex AI 的 API URL 格式为：
```
https://{region}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{region}/publishers/google/models/{model}:generateContent
```

例如：
```
https://us-central1-aiplatform.googleapis.com/v1/projects/my-project-123/locations/us-central1/publishers/google/models/gemini-2.5-pro:generateContent
```

## 支持的模型

- **gemini-2.5-pro**: 最新的旗舰模型
- **gemini-2.5-flash**: 高速版本
- **gemini-2.0-flash**: 实时交互优化
- **gemini-1.5-pro**: 稳定版旗舰模型
- **gemini-1.5-flash**: 稳定版高速模型

## 区域选择

推荐的区域：

- **us-central1**: 美国中部（推荐，功能最全）
- **us-east1**: 美国东部
- **europe-west1**: 欧洲西部
- **asia-northeast1**: 亚洲东北部（日本）

## 注意事项

### 1. 访问令牌过期

OAuth 2.0 访问令牌通常在1小时后过期。您需要：

- 定期刷新令牌
- 或使用服务账户密钥自动获取新令牌

### 2. 配额和限制

- 每分钟请求数限制
- 每日令牌使用限制
- 根据项目配置可能有所不同

### 3. 计费

- Vertex AI 按使用量计费
- 价格可能与 Google AI Studio 不同
- 查看 [Vertex AI 定价](https://cloud.google.com/vertex-ai/pricing)

## 故障排除

### 常见错误

1. **403 Forbidden**: 
   - 检查服务账户权限
   - 确认 Vertex AI API 已启用

2. **401 Unauthorized**:
   - 检查访问令牌是否有效
   - 确认令牌未过期

3. **404 Not Found**:
   - 检查项目ID是否正确
   - 确认区域设置正确

### 测试连接

使用 curl 测试连接：

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us-central1/publishers/google/models/gemini-2.5-pro:generateContent" \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello, how are you?"}]
    }]
  }'
```

## 与 Google AI Studio 的区别

| 特性 | Google AI Studio | Google Vertex AI |
|------|------------------|------------------|
| 认证方式 | API Key | OAuth 2.0 |
| 企业功能 | 基础 | 完整 |
| 数据治理 | 有限 | 完整 |
| 私有网络 | 不支持 | 支持 |
| SLA | 无 | 有 |
| 定价 | 简单 | 复杂但灵活 |

## 推荐配置

对于不同使用场景的推荐配置：

### 开发环境
- Region: us-central1
- 认证: 用户账户
- 模型: gemini-2.5-flash

### 生产环境
- Region: 根据用户位置选择
- 认证: 服务账户
- 模型: gemini-2.5-pro
- 设置适当的配额和监控 