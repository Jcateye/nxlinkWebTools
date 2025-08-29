# 表单提交接口请求示例

## 重要更新
- **countryCode参数现已可选**：不传countryCode时自动使用默认值"86"（中国）
- **支持多种国家代码**：1（美国）、86（中国）、44（英国）、65（新加坡）等

## 英文表单提交 (English Form Submission)

**接口URL格式**：
```
POST /api/openapi/public/{apiKey}/{taskId}/form-submission?countryCode={countryCode}
```

**参数说明**：
- `countryCode`: 国家代码（可选），默认值为"86"（中国）
  - 不传或为空时自动使用"86"
  - 支持：1（美国）、86（中国）、44（英国）、65（新加坡）等

### 请求示例

#### cURL命令
```bash
curl -X POST "https://your-domain.com/api/openapi/public/riKJb6WOXF2kgQgYxTEG9JBA55aq9Y26/4afa5f40316c4e37bc0e2b9a6b1dd5e5/form-submission?countryCode=1" \
  -H "Content-Type: application/json" \
  -d '{
    "form": "english_contact_form",
    "form_name": "English Contact Form",
    "entry": {
      "field_5": "2125551234",
      "field_2": "John Smith",
      "field_6": "john.smith@example.com",
      "field_3": "I am interested in your services",
      "field_4": "Please contact me at your earliest convenience",
      "info_region": {
        "province": "New York",
        "city": "New York City",
        "district": "Manhattan"
      }
    }
  }'
```

#### 字段说明
| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| form | string | 可选 | 表单ID标识 | "english_contact_form" |
| form_name | string | 可选 | 表单显示名称 | "English Contact Form" |
| entry.field_5 | string | 必填 | 电话号码 | "2125551234" |
| entry.field_2 | string | 可选 | 姓名 | "John Smith" |
| entry.field_6 | string | 可选 | 邮箱 | "john.smith@example.com" |
| entry.field_3 | string | 可选 | 留言内容 | "I am interested in your services" |
| entry.field_4 | string | 可选 | 其他信息 | "Please contact me..." |
| entry.info_region | object | 可选 | 地区信息 | {...} |

#### JavaScript示例
```javascript
const apiKey = 'riKJb6WOXF2kgQgYxTEG9JBA55aq9Y26';
const taskId = '4afa5f40316c4e37bc0e2b9a6b1dd5e5';
const countryCode = '1'; // 美国

const formData = {
  form: "english_contact_form",
  form_name: "English Contact Form",
  entry: {
    field_5: "2125551234",
    field_2: "John Smith",
    field_6: "john.smith@example.com",
    field_3: "I am interested in your services",
    field_4: "Please contact me at your earliest convenience",
    info_region: {
      province: "New York",
      city: "New York City",
      district: "Manhattan"
    }
  }
};

fetch(`https://your-domain.com/api/openapi/public/${apiKey}/${taskId}/form-submission?countryCode=${countryCode}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(formData)
})
.then(response => response.json())
.then(result => {
  console.log('Success:', result);
})
.catch(error => {
  console.error('Error:', error);
});
```

---

## 中文表单提交 (Chinese Form Submission)

**接口URL格式**：
```
POST /api/openapi/public/{apiKey}/{taskId}/form-submission?countryCode={countryCode}
```

**参数说明**：
- `countryCode`: 国家代码（可选），默认值为"86"（中国）
  - 不传或为空时自动使用"86"
  - 支持：1（美国）、86（中国）、44（英国）、65（新加坡）等

### 请求示例

#### cURL命令
```bash
curl -X POST "https://your-domain.com/api/openapi/public/riKJb6WOXF2kgQgYxTEG9JBA55aq9Y26/4afa5f40316c4e37bc0e2b9a6b1dd5e5/form-submission?countryCode=86" \
  -H "Content-Type: application/json" \
  -d '{
    "form": "chinese_contact_form",
    "form_name": "中文联系表单",
    "entry": {
      "field_5": "13800138000",
      "field_2": "张三",
      "field_6": "zhang.san@example.com",
      "field_3": "我对您的产品和服务很感兴趣",
      "field_4": "希望能够尽快收到您的回复",
      "info_region": {
        "province": "北京市",
        "city": "北京市",
        "district": "朝阳区"
      }
    }
  }'
```

#### 字段说明
| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| form | string | 可选 | 表单ID标识 | "chinese_contact_form" |
| form_name | string | 可选 | 表单显示名称 | "中文联系表单" |
| entry.field_5 | string | 必填 | 电话号码 | "13800138000" |
| entry.field_2 | string | 可选 | 姓名 | "张三" |
| entry.field_6 | string | 可选 | 邮箱 | "zhang.san@example.com" |
| entry.field_3 | string | 可选 | 留言内容 | "我对您的产品和服务很感兴趣" |
| entry.field_4 | string | 可选 | 其他信息 | "希望能够尽快收到您的回复" |
| entry.info_region | object | 可选 | 地区信息 | {...} |

#### JavaScript示例
```javascript
const apiKey = 'riKJb6WOXF2kgQgYxTEG9JBA55aq9Y26';
const taskId = '4afa5f40316c4e37bc0e2b9a6b1dd5e5';
const countryCode = '86'; // 中国

const formData = {
  form: "chinese_contact_form",
  form_name: "中文联系表单",
  entry: {
    field_5: "13800138000",
    field_2: "张三",
    field_6: "zhang.san@example.com",
    field_3: "我对您的产品和服务很感兴趣",
    field_4: "希望能够尽快收到您的回复",
    info_region: {
      province: "北京市",
      city: "北京市",
      district: "朝阳区"
    }
  }
};

fetch(`https://your-domain.com/api/openapi/public/${apiKey}/${taskId}/form-submission?countryCode=${countryCode}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(formData)
})
.then(response => response.json())
.then(result => {
  console.log('成功:', result);
})
.catch(error => {
  console.error('错误:', error);
});
```

---

## 响应格式

### 成功响应
```json
{
  "code": 200,
  "message": "表单数据处理成功",
  "data": {
    "code": 1003,
    "message": "Authentication failed (invalid signature)"
  },
  "request": {
    "taskId": "4afa5f40316c4e37bc0e2b9a6b1dd5e5",
    "countryCode": "86",
    "phoneNumber": "13800138000",
    "formId": "chinese_contact_form"
  }
}
```

### 错误响应

#### 缺少国家代码
```json
{
  "code": 400,
  "message": "Missing required query parameter: countryCode",
  "error": "MISSING_COUNTRY_CODE"
}
```

#### 缺少电话号码
```json
{
  "code": 400,
  "message": "Missing required field: field_5 (phone number)",
  "error": "MISSING_PHONE_NUMBER"
}
```

#### 缺少entry字段
```json
{
  "code": 400,
  "message": "Invalid form data: missing entry",
  "error": "INVALID_FORM_DATA"
}
```

#### API Key无效
```json
{
  "code": 401,
  "message": "Invalid API Key",
  "error": "UNAUTHORIZED"
}
```

---

## 字段映射规则

### 标准字段映射
- `field_5`: 电话号码（必填）
- `field_2`: 姓名
- `field_6`: 邮箱
- `field_3`: 自定义字段1
- `field_4`: 自定义字段2
- `info_region`: 地区信息对象

### 参数转换
系统会自动将表单字段转换为API参数：
- `field_5` → `phoneNumber`（电话号码）
- `field_2` → 姓名参数
- `field_6` → 邮箱参数
- `field_3` → 自定义参数1
- `field_4` → 自定义参数2
- `info_region` → 地区参数

### 地区信息处理
```javascript
// 输入格式
{
  "info_region": {
    "province": "北京市",
    "city": "北京市",
    "district": "朝阳区"
  }
}

// 转换后格式
{
  "name": "地区",
  "value": "北京市北京市朝阳区"
}
```

---

## 使用说明

1. **URL参数**：API Key和taskID必须在URL路径中提供
2. **查询参数**：countryCode必须通过查询参数提供
3. **请求体**：表单数据通过JSON格式在请求体中传递
4. **字段要求**：field_5（电话号码）是必填字段
5. **字符编码**：支持UTF-8编码，可以包含中文字符
6. **数据验证**：系统会自动验证电话号码格式和必需字段
