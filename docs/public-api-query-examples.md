# 公开API使用示例（查询参数版本）

## 概述

国家代码通过查询参数传递，格式：`?countryCode=86`

## 基本用法

### cURL 示例
```bash
curl -X POST "https://api.example.com/api/openapi/public/YOUR_API_KEY/TASK_ID/append-numbers?countryCode=86" \
  -H "Content-Type: application/json" \
  -d '{
    "phones": [
      {
        "phone": "13800138000",
        "params": [
          { "name": "姓名", "value": "张三" },
          { "name": "城市", "value": "北京" }
        ]
      }
    ]
  }'
```

### JavaScript 示例
```javascript
const apiKey = 'YOUR_API_KEY';
const taskId = 'TASK_ID';
const countryCode = '86'; // 中国

const url = `https://api.example.com/api/openapi/public/${apiKey}/${taskId}/append-numbers?countryCode=${countryCode}`;

const data = {
  phones: [
    {
      phone: '13800138000',
      params: [
        { name: '姓名', value: '张三' },
        { name: '城市', value: '北京' }
      ]
    }
  ]
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
.then(response => response.json())
.then(result => console.log(result))
.catch(error => console.error(error));
```

### Python 示例
```python
import requests

api_key = 'YOUR_API_KEY'
task_id = 'TASK_ID'
country_code = '86'  # 中国

url = f"https://api.example.com/api/openapi/public/{api_key}/{task_id}/append-numbers"
params = {'countryCode': country_code}

data = {
    "phones": [
        {
            "phone": "13800138000",
            "params": [
                {"name": "姓名", "value": "张三"},
                {"name": "城市", "value": "北京"}
            ]
        }
    ]
}

response = requests.post(url, params=params, json=data)
print(response.json())
```

### PHP 示例
```php
<?php
$apiKey = 'YOUR_API_KEY';
$taskId = 'TASK_ID';
$countryCode = '86'; // 中国

$url = "https://api.example.com/api/openapi/public/{$apiKey}/{$taskId}/append-numbers?countryCode={$countryCode}";

$data = [
    'phones' => [
        [
            'phone' => '13800138000',
            'params' => [
                ['name' => '姓名', 'value' => '张三'],
                ['name' => '城市', 'value' => '北京']
            ]
        ]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>
```

## 常见国家代码

| 国家/地区 | 代码 |
|-----------|------|
| 美国 | 1 |
| 中国 | 86 |
| 英国 | 44 |
| 日本 | 81 |
| 韩国 | 82 |
| 新加坡 | 65 |
| 澳大利亚 | 61 |
| 加拿大 | 1 |
| 德国 | 49 |
| 法国 | 33 |

## 错误处理

### 缺少国家代码
```json
{
  "code": 400,
  "message": "Missing required query parameter: countryCode",
  "error": "MISSING_COUNTRY_CODE"
}
```

### 无效的API Key
```json
{
  "code": 401,
  "message": "Invalid API Key",
  "error": "UNAUTHORIZED"
}
```

### 空号码数组
```json
{
  "code": 400,
  "message": "Invalid phones data",
  "error": "INVALID_PHONES_DATA"
}
```

## HTML表单集成示例

```html
<!DOCTYPE html>
<html>
<head>
    <title>号码提交表单</title>
    <meta charset="UTF-8">
</head>
<body>
    <h2>客户信息收集</h2>
    <form id="phoneForm">
        <div>
            <label>国家/地区：</label>
            <select id="countryCode" required>
                <option value="86">中国 (+86)</option>
                <option value="1">美国 (+1)</option>
                <option value="44">英国 (+44)</option>
                <option value="65">新加坡 (+65)</option>
            </select>
        </div>
        <div>
            <label>姓名：</label>
            <input type="text" id="name" required>
        </div>
        <div>
            <label>电话：</label>
            <input type="tel" id="phone" required>
        </div>
        <div>
            <label>城市：</label>
            <input type="text" id="city">
        </div>
        <button type="submit">提交</button>
    </form>

    <script>
    document.getElementById('phoneForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const apiKey = 'YOUR_API_KEY';
        const taskId = 'YOUR_TASK_ID';
        const countryCode = document.getElementById('countryCode').value;
        
        const url = `https://api.example.com/api/openapi/public/${apiKey}/${taskId}/append-numbers?countryCode=${countryCode}`;
        
        const data = {
            phones: [{
                phone: document.getElementById('phone').value,
                params: [
                    { name: "姓名", value: document.getElementById('name').value },
                    { name: "城市", value: document.getElementById('city').value || '未填写' }
                ]
            }]
        };
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert('提交成功！');
                document.getElementById('phoneForm').reset();
            } else {
                alert(`提交失败：${result.message}`);
            }
        } catch (error) {
            alert('网络错误，请稍后重试');
        }
    };
    </script>
</body>
</html>
```

## 批量导入示例

```javascript
// 批量导入多个号码
async function batchImport(apiKey, taskId, countryCode, phoneList) {
    const url = `https://api.example.com/api/openapi/public/${apiKey}/${taskId}/append-numbers?countryCode=${countryCode}`;
    
    // 每批最多100个号码
    const batchSize = 100;
    const results = [];
    
    for (let i = 0; i < phoneList.length; i += batchSize) {
        const batch = phoneList.slice(i, i + batchSize);
        
        const data = {
            phones: batch.map(item => ({
                phone: item.phone,
                params: [
                    { name: "姓名", value: item.name },
                    { name: "邮箱", value: item.email || '' },
                    { name: "备注", value: item.note || '' }
                ]
            }))
        };
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            results.push({
                batch: Math.floor(i / batchSize) + 1,
                success: response.ok,
                result: result
            });
            
            // 避免请求过快
            if (i + batchSize < phoneList.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            results.push({
                batch: Math.floor(i / batchSize) + 1,
                success: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// 使用示例
const phoneList = [
    { phone: '13800138001', name: '张三', email: 'zhang@example.com' },
    { phone: '13800138002', name: '李四', email: 'li@example.com' },
    // ... 更多号码
];

batchImport('YOUR_API_KEY', 'TASK_ID', '86', phoneList)
    .then(results => {
        console.log('批量导入完成:', results);
    });
```
