# 表单Webhook API文档

## 概述

表单Webhook API用于接收外部表单系统的数据推送，自动处理数据并调用追加号码接口。该API支持多租户架构，可以为不同的表单配置不同的taskID。

## 接口列表

### 1. 表单数据推送接口

**接口地址**: `POST /api/webhook/form-submission`

**功能描述**: 接收表单数据推送，处理后自动追加号码到对应的任务

**请求头**:
```http
Content-Type: application/json
```

**请求参数**:
```json
{
  "form": "E0Tqhk",
  "form_name": "华为全连接大会 | NXAI AI互动体验信息登记",
  "entry": {
    "serial_number": 123,
    "field_2": "张三",           // 姓名 -> 额外参数 name
    "field_5": "13812345678",    // 电话号码 -> Phone Number
    "field_3": "这是一行文字",
    "field_4": "这是一行文字",
    "field_6": "support@jinshuju.net",
    "x_field_1": "这是一行文字",
    "color_mark": "深绿色",
    "creator_name": "小王",
    "created_at": "2025-08-26T09:55:12.740Z",
    "updated_at": "2025-08-26T09:55:12.740Z",
    "info_filling_duration": 123,
    "info_platform": "Macintosh",
    "info_os": "OS X 10.13.6",
    "info_browser": "Chrome 68.0.3440.106",
    "info_region": {
      "province": "陕西省",
      "city": "西安市",
      "district": "雁塔区",
      "street": "高新路"
    },
    "info_remote_ip": "127.0.0.1"
  }
}
```

**字段映射规则**:
- `field_5` → 电话号码 (Phone Number)
- `field_2` → 额外参数的名称和值 (params.name & params.value)
- 其他字段 → 作为额外参数添加到params数组中

**成功响应**:
```json
{
  "code": 200,
  "message": "表单数据处理成功",
  "data": {
    "formId": "E0Tqhk",
    "serialNumber": 123,
    "phoneNumber": "13812345678",
    "taskId": "23ac8c5d-4e43-4669-bff8-1ab1f8436933",
    "appendResult": {
      "code": 200,
      "message": "追加号码完成",
      "data": {
        "total": 1,
        "success": 1,
        "failed": 0,
        "results": [
          {
            "phoneNumber": "13812345678",
            "success": true,
            "contactId": "a1b2c3d4-1234-5678-9012-abcdef123456",
            "response": {
              "code": 0,
              "message": "success"
            }
          }
        ]
      }
    }
  }
}
```

**错误响应**:
```json
{
  "code": 400,
  "message": "No taskID mapping found for form: INVALID_FORM_ID",
  "error": "FORM_NOT_CONFIGURED",
  "availableForms": [
    {
      "formId": "E0Tqhk",
      "formName": "华为全连接大会 | NXAI AI互动体验信息登记",
      "taskId": "23ac8c5d-4e43-4669-bff8-1ab1f8436933",
      "description": "华为全连接大会表单数据推送"
    }
  ]
}
```

### 2. 获取表单映射配置

**接口地址**: `GET /api/webhook/form-mapping`

**功能描述**: 获取当前配置的所有表单映射关系

**响应示例**:
```json
{
  "code": 200,
  "message": "表单映射配置",
  "data": {
    "mappings": [
      {
        "formId": "E0Tqhk",
        "formName": "华为全连接大会 | NXAI AI互动体验信息登记",
        "taskId": "23ac8c5d-4e43-4669-bff8-1ab1f8436933",
        "description": "华为全连接大会表单数据推送"
      }
    ],
    "description": "表单ID到taskID的映射配置"
  }
}
```

### 3. 更新表单映射配置

**接口地址**: `POST /api/webhook/update-mapping`

**功能描述**: 动态更新表单映射配置（开发调试用）

**请求参数**:
```json
{
  "formId": "NEW_FORM_ID",
  "taskId": "NEW_TASK_ID",
  "formName": "新表单名称",
  "description": "新表单描述"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "表单映射更新成功",
  "data": {
    "formId": "NEW_FORM_ID",
    "taskId": "NEW_TASK_ID",
    "formName": "新表单名称",
    "description": "新表单描述",
    "mappings": [...]
  }
}
```

## 配置说明

### 表单映射配置

表单映射配置存储在 `config/form-mapping.config.ts` 文件中：

```typescript
export const DEFAULT_FORM_MAPPINGS: FormMapping[] = [
  {
    formId: 'E0Tqhk',
    taskId: '23ac8c5d-4e43-4669-bff8-1ab1f8436933', // 需要配置实际的taskID
    formName: '华为全连接大会 | NXAI AI互动体验信息登记',
    description: '华为全连接大会表单数据推送',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
```

### 如何配置新的表单映射

1. **方法1**: 直接编辑 `config/form-mapping.config.ts` 文件
2. **方法2**: 调用 `/api/webhook/update-mapping` 接口动态添加

## 数据处理流程

1. **接收数据**: 接收表单推送的JSON数据
2. **验证数据**: 检查必需字段（form, entry, field_5）
3. **查找映射**: 根据formId查找对应的taskId
4. **字段映射**: 将表单字段映射为追加号码所需的格式
5. **数据验证**: 验证电话号码格式
6. **调用API**: 调用追加号码接口
7. **返回结果**: 返回处理结果

## 字段映射详情

### 自动映射的字段

| 表单字段 | 映射到 | 说明 |
|---------|--------|------|
| `field_5` | `phoneNumber` | 电话号码（必填） |
| `field_2` | `params[0].name` & `params[0].value` | 姓名参数 |
| `field_3` | `params[n].name="field_3"` | 额外参数 |
| `field_4` | `params[n].name="field_4"` | 额外参数 |
| `field_6` | `params[n].name="邮箱"` | 邮箱参数 |
| `info_region` | `params[n].name="地区"` | 地区信息 |

### 自动添加的元数据

- **表单名称**: `params[n].name="表单名称"`
- **提交时间**: `params[n].name="提交时间"`
- **创建者**: `params[n].name="创建者"` (如果有)

## 错误处理

### 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 400 | 数据格式错误 | 检查请求JSON格式 |
| 400 | 表单未配置 | 在配置文件中添加表单映射 |
| 400 | 电话号码无效 | 检查field_5字段格式 |
| 500 | 内部处理错误 | 查看服务器日志 |

## 测试示例

### 使用curl测试

```bash
# 1. 测试表单数据推送
curl -X POST 'http://localhost:8400/api/webhook/form-submission' \
  -H 'Content-Type: application/json' \
  -d '{
    "form": "E0Tqhk",
    "form_name": "华为全连接大会 | NXAI AI互动体验信息登记",
    "entry": {
      "serial_number": 123,
      "field_2": "张三",
      "field_5": "13812345678",
      "field_3": "这是一行文字",
      "field_4": "这是一行文字",
      "field_6": "support@jinshuju.net",
      "creator_name": "小王",
      "created_at": "2025-08-26T09:55:12.740Z",
      "info_region": {
        "province": "陕西省",
        "city": "西安市"
      }
    }
  }'

# 2. 查看表单映射配置
curl -X GET 'http://localhost:8400/api/webhook/form-mapping'

# 3. 更新表单映射（添加新表单）
curl -X POST 'http://localhost:8400/api/webhook/update-mapping' \
  -H 'Content-Type: application/json' \
  -d '{
    "formId": "NEW_FORM_ID",
    "taskId": "NEW_TASK_ID",
    "formName": "新表单名称",
    "description": "新表单描述"
  }'
```

## 注意事项

1. **电话号码格式**: 必须是11位中国大陆手机号格式
2. **taskID配置**: 需要在配置文件中预先配置表单ID到taskID的映射
3. **数据安全性**: 接口会记录详细的处理日志
4. **性能考虑**: 每个号码单独调用OpenAPI，适用于小批量处理
5. **错误重试**: 当前版本不包含自动重试机制

## 日志记录

系统会记录详细的处理日志：

```
[2025-08-26 18:22:35] 📝 收到表单数据推送: formId=E0Tqhk, serialNumber=123
[2025-08-26 18:22:35] 🔄 处理表单数据: phoneNumber=13812345678, paramsCount=6
[2025-08-26 18:22:35] ✅ 表单数据处理完成: success=true, total=1, successCount=1
```

## 扩展功能

未来可以扩展的功能：
1. 支持批量表单数据处理
2. 添加数据验证规则配置
3. 支持自定义字段映射
4. 添加数据去重机制
5. 支持异步处理队列
