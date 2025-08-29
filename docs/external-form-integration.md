# 外部表单集成指南

## 概述

我们支持多种方式接收外部表单提交的数据来追加号码到任务中。

## 方式一：表单Webhook（推荐用于表单系统）

适用于有完整表单系统（如金数据）的场景。

### 接口信息

- **URL**: `/api/webhook/form-submission`
- **方法**: POST
- **认证**: Header中需要 `X-API-Key`

### 表单映射配置

在 `config/form-mapping.config.ts` 中配置表单ID到任务ID的映射：

```typescript
export const FORM_TASK_MAPPING = {
  'form_ABC123': '4afa5f40316c4e37bc0e2b9a6b1dd5e5', // 表单ID -> 任务ID
  'form_XYZ789': 'another-task-id'
};
```

### 请求格式

```json
{
  "form": "form_ABC123",
  "form_name": "客户信息收集表",
  "entry": {
    "serial_number": 1,
    "field_2": "张三",          // 姓名
    "field_5": "13800138000",   // 电话号码（必填）
    "field_6": "zhang@email.com", // 邮箱
    "creator_name": "系统",
    "info_remote_ip": "192.168.1.1",
    "info_region": {
      "province": "北京市",
      "city": "北京市",
      "district": "朝阳区"
    }
  }
}
```

### 字段映射

| 表单字段 | 说明 | 必填 |
|---------|------|------|
| field_5 | 电话号码 | 是 |
| field_2 | 姓名 | 否 |
| field_6 | 邮箱 | 否 |
| info_region | 地区信息 | 否 |

### 使用示例

```bash
curl -X POST "https://your-domain.com/api/webhook/form-submission" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "form": "form_ABC123",
    "form_name": "客户信息表",
    "entry": {
      "serial_number": 1,
      "field_2": "李四",
      "field_5": "13900139000",
      "field_6": "li@example.com"
    }
  }'
```

## 方式二：公开API（推荐用于无认证能力的系统）

适用于无法设置请求头的简单系统。

### 版本1：通用号码追加（国家代码通过查询参数传递）

- **URL**: `/api/openapi/public/{apiKey}/{taskId}/append-numbers?countryCode={countryCode}`
- **方法**: POST
- **认证**: API Key在URL中

```bash
curl -X POST "https://your-domain.com/api/openapi/public/your-api-key/task-id/append-numbers?countryCode=86" \
  -H "Content-Type: application/json" \
  -d '{
    "phones": [
      {
        "phone": "13800138000",
        "params": [
          { "name": "姓名", "value": "王五" },
          { "name": "来源", "value": "表单提交" }
        ]
      }
    ]
  }'
```

### 版本2：表单数据提交（推荐）

专门为表单系统设计，保持原有的表单数据结构。

- **URL**: `/api/openapi/public/{apiKey}/{taskId}/form-submission?countryCode={countryCode}`
- **方法**: POST
- **认证**: API Key在URL中

```bash
curl -X POST "https://your-domain.com/api/openapi/public/your-api-key/task-id/form-submission?countryCode=86" \
  -H "Content-Type: application/json" \
  -d '{
    "form": "form_ABC123",
    "form_name": "客户信息表",
    "entry": {
      "field_5": "13800138000",
      "field_2": "张三",
      "field_6": "zhang@email.com",
      "info_region": {
        "province": "北京市",
        "city": "北京市",
        "district": "朝阳区"
      }
    }
  }'
```

### 版本3：国家代码在URL中

- **URL**: `/api/openapi/public/{apiKey}/{taskId}/{countryCode}/append-numbers`
- **方法**: POST
- **认证**: API Key在URL中

```bash
curl -X POST "https://your-domain.com/api/openapi/public/your-api-key/task-id/86/append-numbers" \
  -H "Content-Type: application/json" \
  -d '{
    "phones": [
      {
        "phone": "13800138000",
        "params": [
          { "name": "姓名", "value": "赵六" }
        ]
      }
    ]
  }'
```

## 方式三：标准API（需要认证能力）

适用于有完整开发能力的系统。

- **URL**: `/api/openapi/append-numbers`
- **方法**: POST
- **认证**: Header中需要 `X-API-Key`

```bash
curl -X POST "https://your-domain.com/api/openapi/append-numbers" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "taskId": "task-id",
    "countryCode": "86",
    "phones": [
      {
        "phone": "13800138000",
        "params": [
          { "name": "姓名", "value": "钱七" }
        ]
      }
    ]
  }'
```

## 实际应用场景

### 场景1：金数据表单集成

1. 在金数据创建表单，获取表单ID
2. 配置表单Webhook URL为：`https://your-domain.com/api/webhook/form-submission`
3. 在请求头中添加 `X-API-Key`
4. 在 `form-mapping.config.ts` 中配置表单ID映射

### 场景2：简单HTML表单

```html
<!DOCTYPE html>
<html>
<head>
    <title>号码提交表单</title>
</head>
<body>
    <form id="phoneForm">
        <input type="text" id="name" placeholder="姓名" required>
        <input type="tel" id="phone" placeholder="电话号码" required>
        <input type="email" id="email" placeholder="邮箱">
        <button type="submit">提交</button>
    </form>

    <script>
    document.getElementById('phoneForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const apiKey = 'your-api-key';
        const taskId = 'your-task-id';
        
        // 方式1：使用通用接口
        // const data = {
        //     phones: [{
        //         phone: document.getElementById('phone').value,
        //         params: [
        //             { name: "姓名", value: document.getElementById('name').value }
        //         ]
        //     }]
        // };
        // const url = `https://your-domain.com/api/openapi/public/${apiKey}/${taskId}/append-numbers?countryCode=86`;
        
        // 方式2：使用表单专用接口（推荐）
        const data = {
            form: "web_form_001",
            form_name: "网站注册表单",
            entry: {
                field_5: document.getElementById('phone').value,
                field_2: document.getElementById('name').value,
                field_6: document.getElementById('email').value
            }
        };
        const url = `https://your-domain.com/api/openapi/public/${apiKey}/${taskId}/form-submission?countryCode=86`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert('提交成功！');
            document.getElementById('phoneForm').reset();
        } else {
            const error = await response.json();
            alert(`提交失败：${error.message}`);
        }
    };
    </script>
</body>
</html>
```

### 场景3：第三方系统Webhook

许多CRM、营销系统支持配置Webhook，可以直接使用公开API：

1. **Webhook URL**: 
   ```
   https://your-domain.com/api/openapi/public/{apiKey}/{taskId}/append-numbers?countryCode={{country_code}}
   ```

2. **请求体模板**（根据系统调整）:
   ```json
   {
     "phones": [{
       "phone": "{{phone}}",
       "params": [
         { "name": "姓名", "value": "{{name}}" },
         { "name": "邮箱", "value": "{{email}}" }
       ]
     }]
   }
   ```

## 最佳实践

1. **选择合适的方式**
   - 有表单系统：使用表单Webhook
   - 无认证能力：使用公开API
   - 有开发能力：使用标准API

2. **安全建议**
   - 定期更换API Key
   - 使用HTTPS传输
   - 限制API Key权限

3. **数据验证**
   - 验证电话号码格式
   - 限制单次提交数量
   - 实现防重复提交

4. **错误处理**
   - 实现重试机制
   - 记录失败日志
   - 提供用户反馈

## 常见问题

### Q: 国家代码不填会怎样？

使用版本1的接口时，`countryCode` 是必填参数，不提供会返回400错误。

### Q: 如何批量提交？

单次请求可以包含多个号码：

```json
{
  "phones": [
    { "phone": "13800138001", "params": [...] },
    { "phone": "13800138002", "params": [...] },
    // 最多1000个
  ]
}
```

### Q: 提交失败怎么办？

1. 检查API Key是否有效
2. 确认任务ID是否正确
3. 验证数据格式
4. 查看错误信息详情
