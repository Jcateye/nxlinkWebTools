# 表单提交API修复说明

## 问题描述

公开表单提交接口调用失败，返回错误：
```
"Additional number information cannot be empty"
```

## 问题原因

外部OpenAPI对请求体格式有严格要求。通过对比成功的标准接口和失败的表单接口，发现关键差异在于请求体结构。

### ❌ 错误的格式（之前使用的）
```json
{
  "taskId": "xxx",
  "phoneNumbers": [{
    "phoneNumber": "xxx",
    "params": []
  }]
}
```

### ✅ 正确的格式（现在使用的）
```json
{
  "taskId": "xxx",
  "list": [{
    "contactId": "generated-contact-id",
    "phoneNumber": "xxx",
    "name": "xxx",
    "params": []
  }]
}
```

## 关键差异

1. **字段名称**：必须使用 `list` 而不是 `phoneNumbers`
2. **必需字段**：
   - `contactId`：每个号码的唯一标识符（使用MD5生成）
   - `name`：联系人名称（可以使用电话号码作为默认值）
   - `phoneNumber`：电话号码
   - `params`：参数数组（必须是空数组 `[]`）

## 修复方案

在 `server/src/routes/publicApi.ts` 中：

1. 添加 `generateContactIdFromPhone` 函数用于生成唯一的 contactId
2. 修改请求体构建逻辑，使用正确的 `list` 格式
3. 确保 `params` 始终为空数组

## 测试结果

### ✅ 成功案例1
```bash
curl -X POST "http://localhost:8400/api/openapi/public/O1acegg4WCoqyv2GqtVFzlFhFDSgBCdG/9cf75e77-223e-4f17-8da5-40b4c6da467b/form-submission" \
  -H "Content-Type: application/json" \
  -d '{
    "form": "test_form",
    "entry": {
      "field_5": "85255311709",
      "field_2": "Test User"
    }
  }'
```

响应：
```json
{
  "code": 200,
  "message": "表单数据处理成功",
  "data": {
    "errList": [],
    "successCount": 1,
    "totalCount": 1
  }
}
```

### ✅ 成功案例2（带国家代码）
```bash
curl -X POST "http://localhost:8400/api/openapi/public/O1acegg4WCoqyv2GqtVFzlFhFDSgBCdG/9cf75e77-223e-4f17-8da5-40b4c6da467b/form-submission?countryCode=86" \
  -H "Content-Type: application/json" \
  -d '{
    "form": "chinese_form",
    "entry": {
      "field_5": "13800138001",
      "field_2": "张三",
      "field_6": "zhang@example.com"
    }
  }'
```

响应：
```json
{
  "code": 200,
  "message": "表单数据处理成功",
  "data": {
    "errList": [],
    "successCount": 1,
    "totalCount": 1
  }
}
```

## 重要提示

1. **contactId生成**：使用电话号码的MD5哈希加上时间戳确保唯一性
2. **params必须为空**：外部API对于这个特定接口要求 `params` 必须是空数组
3. **任务状态**：确保任务处于运行状态（taskStatus: 3），暂停的任务无法添加号码

## 总结

问题已完全解决。关键在于理解外部API的具体要求，使用正确的请求体格式。现在公开表单提交接口可以正常工作了。
