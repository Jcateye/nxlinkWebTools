# 新的Webhook API指南

## 概述

新的Webhook API设计采用了更简洁和灵活的架构，通过URL参数直接传递 `taskId` 和 `templateId`，不再依赖配置文件中的表单映射关系。

## 主要变化

### 1. 接口URL结构变更

**旧版本：**
```
POST /api/webhook/form-submission
```

**新版本：**
```
POST /api/webhook/{taskId}/form-submission?templateId={templateId}
```

### 2. 移除表单映射依赖

- ❌ 不再需要 `config/form-mapping.config.ts` 配置文件
- ✅ 直接在URL中指定目标任务
- ✅ 使用模板系统进行字段映射

### 3. 模板系统

#### 模板配置方式

系统支持两种模板配置方式：

##### 1. 配置文件方式（推荐）
通过修改 `config/form-templates.config.ts` 文件来配置模板：

```typescript
// 添加新模板示例
{
  templateId: 'custom_form',
  name: '自定义表单',
  description: '适用于特殊业务场景的表单',
  fieldMapping: {
    phone: 'phone_field',      // 电话号码字段
    name: 'name_field',        // 姓名字段
    email: 'email_field',      // 邮箱字段
    company: 'company_field',  // 公司字段
    message: 'message_field'   // 留言字段
  },
  enabled: true,
  tags: ['custom', 'business'],
  useCase: '特殊业务场景'
}
```

##### 2. API方式（开发调试）
虽然当前版本主要通过配置文件管理，但预留了API接口用于未来扩展：

```bash
# 获取所有模板
GET /api/webhook/templates

# 获取模板详情
GET /api/webhook/templates/{templateId}

# 添加新模板（暂未实现）
POST /api/webhook/templates

# 更新模板（暂未实现）
PUT /api/webhook/templates/{templateId}

# 删除模板（暂未实现）
DELETE /api/webhook/templates/{templateId}
```

#### 内置模板

系统预置了5个常用模板，每个模板都包含详细的适用场景和字段映射：

##### Contact模板 (`contact`)
- **适用场景**: 网站联系表单、客户咨询
- **标签**: contact, website, standard
```json
{
  "templateId": "contact",
  "name": "联系我们表单",
  "description": "标准联系表单模板，适用于网站联系表单",
  "fieldMapping": {
    "phone": "field_5",    // 电话号码 -> phoneNumber
    "name": "field_2",     // 姓名 -> name
    "email": "field_6",    // 邮箱 -> params["email"]
    "message": "field_3"   // 留言 -> params["message"]
  }
}
```

##### Registration模板 (`registration`)
- **适用场景**: 活动报名、展会登记
- **标签**: registration, event, business
```json
{
  "templateId": "registration",
  "name": "活动报名表单",
  "description": "活动报名表单模板，包含公司信息",
  "fieldMapping": {
    "phone": "field_5",     // 电话号码 -> phoneNumber
    "name": "field_2",      // 姓名 -> name
    "email": "field_6",     // 邮箱 -> params["email"]
    "company": "field_3",   // 公司 -> params["company"]
    "message": "field_4"    // 留言 -> params["message"]
  }
}
```

##### Inquiry模板 (`inquiry`)
- **适用场景**: 产品咨询、售前咨询
- **标签**: inquiry, product, consultation
```json
{
  "templateId": "inquiry",
  "name": "产品咨询表单",
  "description": "产品咨询表单模板，适用于产品页面的咨询表单",
  "fieldMapping": {
    "phone": "field_5",     // 电话号码 -> phoneNumber
    "name": "field_2",      // 姓名 -> name
    "email": "field_6",     // 邮箱 -> params["email"]
    "company": "field_3",   // 公司 -> params["company"]
    "message": "field_4"    // 留言 -> params["message"]
  }
}
```

##### Feedback模板 (`feedback`)
- **适用场景**: 用户反馈、满意度调查
- **标签**: feedback, survey, user
```json
{
  "templateId": "feedback",
  "name": "意见反馈表单",
  "description": "用户意见反馈表单模板",
  "fieldMapping": {
    "phone": "field_5",     // 电话号码 -> phoneNumber
    "name": "field_2",      // 姓名 -> name
    "email": "field_6",     // 邮箱 -> params["email"]
    "message": "field_3",   // 留言 -> params["message"]
    "region": "field_4"     // 地区 -> params["region"]
  }
}
```

##### Demo模板 (`demo`)
- **适用场景**: 产品演示申请、试用申请
- **标签**: demo, trial, sales
```json
{
  "templateId": "demo",
  "name": "演示申请表单",
  "description": "产品演示申请表单模板",
  "fieldMapping": {
    "phone": "field_5",     // 电话号码 -> phoneNumber
    "name": "field_2",      // 姓名 -> name
    "email": "field_6",     // 邮箱 -> params["email"]
    "company": "field_3",   // 公司 -> params["company"]
    "message": "field_4"    // 留言 -> params["message"]
  }
}
```

### 字段映射规则

系统使用简洁的字段映射规则：

#### 核心映射规则
- **`phone`** → `phoneNumber` (直接映射到AppendNumber接口的phoneNumber字段)
- **`name`** → `name` (直接映射到AppendNumber接口的name字段)
- **其他字段** → `params`数组 (使用字段key作为参数名称)

#### 示例
```javascript
// 表单数据
{
  "entry": {
    "field_5": "13800138000",    // phone字段
    "field_2": "张三",          // name字段
    "field_6": "zhangsan@example.com", // email字段
    "field_3": "留言内容"       // message字段
  }
}

// 映射到AppendNumber接口
{
  "list": [{
    "phoneNumber": "13800138000",      // ✅ phone -> phoneNumber
    "name": "张三",                    // ✅ name -> name
    "params": [
      { "name": "email", "value": "zhangsan@example.com" },    // ✅ email -> params["email"]
      { "name": "message", "value": "留言内容" }               // ✅ message -> params["message"]
    ]
  }]
}
```

### 自定义模板配置

#### 1. 修改配置文件
编辑 `config/form-templates.config.ts` 文件，在 `DEFAULT_FORM_TEMPLATES` 数组中添加新模板：

```typescript
// 在DEFAULT_FORM_TEMPLATES数组中添加
{
  templateId: 'survey',           // 模板ID（唯一标识）
  name: '市场调研表单',             // 模板名称
  description: '市场调研问卷表单模板', // 模板描述
  fieldMapping: {
    phone: 'mobile_phone',       // 电话号码 -> phoneNumber
    name: 'full_name',           // 姓名 -> name
    email: 'email_address',      // 邮箱 -> params["email"]
    age: 'age_group',           // 年龄段 -> params["age"]
    occupation: 'job_title',    // 职业 -> params["occupation"]
    feedback: 'survey_feedback' // 反馈 -> params["feedback"]
  },
  enabled: true,                  // 是否启用
  tags: ['survey', 'market'],    // 标签（用于分类）
  useCase: '市场调研、用户访谈',   // 适用场景
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}
```

#### 2. 重启服务
修改配置文件后，需要重启后端服务以加载新的模板配置。

#### 3. 测试新模板
```bash
# 测试新添加的survey模板
curl -X POST "http://localhost:8400/api/webhook/9cf75e77-223e-4f17-8da5-40b4c6da467b/form-submission?templateId=survey" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "entry": {
      "mobile_phone": "13800138000",
      "full_name": "张三",
      "email_address": "zhangsan@example.com",
      "age_group": "25-34",
      "job_title": "工程师",
      "survey_feedback": "对产品很感兴趣"
    }
  }'
```

**对应的AppendNumber接口数据结构：**
```json
{
  "taskId": "9cf75e77-223e-4f17-8da5-40b4c6da467b",
  "list": [{
    "contactId": "auto-generated-id",
    "phoneNumber": "13800138000",           // phone -> phoneNumber
    "name": "张三",                         // name -> name
    "params": [
      { "name": "email", "value": "zhangsan@example.com" },       // email -> params["email"]
      { "name": "age", "value": "25-34" },                        // age -> params["age"]
      { "name": "occupation", "value": "工程师" },               // occupation -> params["occupation"]
      { "name": "feedback", "value": "对产品很感兴趣" }           // feedback -> params["feedback"]
    ]
  }]
}
```

#### 4. 禁用模板
如果需要临时禁用某个模板，只需将其 `enabled` 设置为 `false`：

```typescript
{
  templateId: 'old_template',
  // ... 其他配置
  enabled: false,  // 禁用此模板
  // ...
}
```

## API接口说明

### 1. 表单数据推送

**接口地址：**
```
POST /api/webhook/{taskId}/form-submission?templateId={templateId}&countryCode={countryCode}
```

**URL参数：**
- `taskId` (必填): 目标任务ID
- `templateId` (可选): 模板ID，默认为 `contact`
- `countryCode` (可选): 国家代码，默认为 `86`

**请求头：**
```
Content-Type: application/json
Authorization: Bearer {apiKey}
```

**请求体示例：**
```json
{
  "form": "contact_form_001",
  "form_name": "联系我们",
  "entry": {
    "serial_number": 12345,
    "field_5": "13800138000",
    "field_2": "张三",
    "field_6": "zhangsan@example.com",
    "field_3": "我想了解产品详情",
    "created_at": "2024-01-01T10:00:00Z",
    "creator_name": "访客",
    "info_region": {
      "province": "广东省",
      "city": "深圳市"
    }
  }
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "表单数据处理成功",
  "data": { /* OpenAPI响应数据 */ },
  "request": {
    "taskId": "9cf75e77-223e-4f17-8da5-40b4c6da467b",
    "templateId": "contact",
    "templateName": "联系我们表单",
    "countryCode": "86",
    "phoneNumber": "13800138000",
    "formId": "contact_form_001",
    "paramsCount": 5
  }
}
```

### 2. 获取可用模板列表

**接口地址：**
```
GET /api/webhook/templates
```

**响应示例：**
```json
{
  "code": 200,
  "message": "可用模板列表",
  "data": {
    "templates": [
      {
        "templateId": "contact",
        "name": "联系我们表单",
        "description": "标准联系表单模板"
      },
      {
        "templateId": "registration",
        "name": "活动报名表单",
        "description": "活动报名表单模板"
      },
      {
        "templateId": "inquiry",
        "name": "产品咨询表单",
        "description": "产品咨询表单模板"
      }
    ],
    "description": "支持的表单模板配置"
  }
}
```

### 3. 获取模板详情

**接口地址：**
```
GET /api/webhook/templates/{templateId}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "模板详情",
  "data": {
    "templateId": "contact",
    "name": "联系我们表单",
    "description": "标准联系表单模板",
    "fieldMapping": {
      "phone": "field_5",
      "name": "field_2",
      "email": "field_6",
      "message": "field_3"
    }
  }
}
```

## 实际使用示例

### 1. 使用Contact模板

```bash
# 使用默认模板（contact）
curl -X POST "http://localhost:8400/api/webhook/9cf75e77-223e-4f17-8da5-40b4c6da467b/form-submission" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "form": "website_contact",
    "form_name": "网站联系表单",
    "entry": {
      "field_5": "13800138000",
      "field_2": "张三",
      "field_6": "zhangsan@example.com",
      "field_3": "我想咨询产品"
    }
  }'
```

### 2. 使用Registration模板

```bash
# 明确指定模板
curl -X POST "http://localhost:8400/api/webhook/9cf75e77-223e-4f17-8da5-40b4c6da467b/form-submission?templateId=registration&countryCode=86" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "form": "event_signup",
    "form_name": "活动报名",
    "entry": {
      "field_5": "13900139000",
      "field_2": "李四",
      "field_6": "lisi@example.com",
      "field_3": "华为科技有限公司",
      "field_4": "参加产品发布会"
    }
  }'
```

## 字段映射说明

### Contact模板字段映射
- `field_5` → 电话号码 (必填)
- `field_2` → 姓名
- `field_6` → 邮箱
- `field_3` → 留言

### Registration模板字段映射
- `field_5` → 电话号码 (必填)
- `field_2` → 姓名
- `field_6` → 邮箱
- `field_3` → 公司
- `field_4` → 留言

### Inquiry模板字段映射
- `field_5` → 电话号码 (必填)
- `field_2` → 姓名
- `field_6` → 邮箱
- `field_3` → 公司
- `field_4` → 留言

## 优势

1. **简化配置**：无需维护表单映射配置文件
2. **灵活性**：可以为不同类型的表单选择合适的模板
3. **扩展性**：可以轻松添加新的模板
4. **一致性**：两个接口（Webhook和公开API）使用相同的模板系统
5. **易维护**：模板配置集中管理，修改方便

## 迁移指南

### 从旧版本迁移

如果您之前使用旧版本，需要进行以下调整：

1. **更新Webhook URL**：
   ```
   旧: POST /api/webhook/form-submission
   新: POST /api/webhook/{taskId}/form-submission?templateId={templateId}
   ```

2. **移除表单映射配置**：
   - 删除或忽略 `config/form-mapping.config.ts` 中的相关配置
   - 直接在URL中指定taskId

3. **更新集成代码**：
   - Webhook推送时需要包含taskId
   - 选择合适的模板ID

## 故障排除

### 常见问题

1. **模板不存在**
   ```
   错误: TEMPLATE_NOT_FOUND
   解决: 使用 GET /api/webhook/templates 查看可用模板
   ```

2. **必填字段缺失**
   ```
   错误: MISSING_PHONE_NUMBER
   解决: 检查请求体中的电话号码字段是否正确
   ```

3. **任务ID无效**
   ```
   错误: 确保URL中的taskId是有效的AI呼叫任务ID
   ```
