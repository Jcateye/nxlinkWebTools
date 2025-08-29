# 公开表单API使用示例

## 概述

公开表单API专门为表单系统设计，支持将表单数据直接提交到指定任务，无需Header认证。

- **URL格式**: `/api/openapi/public/{apiKey}/{taskId}/form-submission?countryCode={countryCode}`
- **方法**: POST
- **认证**: API Key在URL中

## 基本示例

### 1. 完整表单提交

```bash
curl -X POST "https://api.example.com/api/openapi/public/YOUR_API_KEY/TASK_ID/form-submission?countryCode=86" \
  -H "Content-Type: application/json" \
  -d '{
    "form": "contact_form_001",
    "form_name": "联系我们表单",
    "entry": {
      "field_5": "13800138000",
      "field_2": "张三",
      "field_6": "zhang@example.com",
      "field_3": "我对产品很感兴趣",
      "field_4": "请尽快联系我",
      "info_region": {
        "province": "广东省",
        "city": "深圳市",
        "district": "南山区"
      }
    }
  }'
```

### 2. 最简表单提交（只有必填字段）

```bash
curl -X POST "https://api.example.com/api/openapi/public/YOUR_API_KEY/TASK_ID/form-submission?countryCode=86" \
  -H "Content-Type: application/json" \
  -d '{
    "entry": {
      "field_5": "13900139000"
    }
  }'
```

## 集成示例

### JavaScript/HTML表单

```html
<!DOCTYPE html>
<html>
<head>
    <title>客户信息收集</title>
    <meta charset="UTF-8">
    <style>
        form { max-width: 500px; margin: 50px auto; padding: 20px; }
        input, select, textarea { width: 100%; padding: 8px; margin: 10px 0; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; cursor: pointer; }
    </style>
</head>
<body>
    <form id="customerForm">
        <h2>客户信息表</h2>
        
        <label>国家/地区：</label>
        <select id="countryCode" required>
            <option value="86">中国 (+86)</option>
            <option value="1">美国 (+1)</option>
            <option value="44">英国 (+44)</option>
        </select>
        
        <label>电话号码：</label>
        <input type="tel" id="phone" required placeholder="请输入电话号码">
        
        <label>姓名：</label>
        <input type="text" id="name" placeholder="请输入姓名">
        
        <label>邮箱：</label>
        <input type="email" id="email" placeholder="请输入邮箱">
        
        <label>留言：</label>
        <textarea id="message" rows="4" placeholder="请输入留言"></textarea>
        
        <button type="submit">提交</button>
    </form>

    <script>
    const API_KEY = 'YOUR_API_KEY';
    const TASK_ID = 'YOUR_TASK_ID';
    const API_URL = 'https://api.example.com';

    document.getElementById('customerForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const countryCode = document.getElementById('countryCode').value;
        const formData = {
            form: "website_contact_form",
            form_name: "网站联系表单",
            entry: {
                field_5: document.getElementById('phone').value,
                field_2: document.getElementById('name').value || undefined,
                field_6: document.getElementById('email').value || undefined,
                field_3: document.getElementById('message').value || undefined,
            }
        };
        
        // 移除undefined的字段
        Object.keys(formData.entry).forEach(key => 
            formData.entry[key] === undefined && delete formData.entry[key]
        );
        
        try {
            const response = await fetch(
                `${API_URL}/api/openapi/public/${API_KEY}/${TASK_ID}/form-submission?countryCode=${countryCode}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                }
            );
            
            const result = await response.json();
            
            if (response.ok) {
                alert('提交成功！我们会尽快与您联系。');
                document.getElementById('customerForm').reset();
            } else {
                alert(`提交失败：${result.message}`);
            }
        } catch (error) {
            alert('网络错误，请稍后重试');
            console.error(error);
        }
    };
    </script>
</body>
</html>
```

### PHP示例

```php
<?php
// 表单处理脚本
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $apiKey = 'YOUR_API_KEY';
    $taskId = 'YOUR_TASK_ID';
    $countryCode = $_POST['country_code'] ?? '86';
    
    $formData = [
        'form' => 'php_contact_form',
        'form_name' => 'PHP联系表单',
        'entry' => [
            'field_5' => $_POST['phone'],
            'field_2' => $_POST['name'] ?? '',
            'field_6' => $_POST['email'] ?? '',
            'field_3' => $_POST['message'] ?? ''
        ]
    ];
    
    // 过滤空值
    $formData['entry'] = array_filter($formData['entry']);
    
    $url = "https://api.example.com/api/openapi/public/{$apiKey}/{$taskId}/form-submission?countryCode={$countryCode}";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($formData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode == 200) {
        echo json_encode(['success' => true, 'message' => '提交成功']);
    } else {
        $result = json_decode($response, true);
        echo json_encode(['success' => false, 'message' => $result['message'] ?? '提交失败']);
    }
    exit;
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>PHP表单示例</title>
    <meta charset="UTF-8">
</head>
<body>
    <form method="POST" action="">
        <select name="country_code">
            <option value="86">中国 (+86)</option>
            <option value="1">美国 (+1)</option>
        </select>
        <input type="tel" name="phone" placeholder="电话号码" required>
        <input type="text" name="name" placeholder="姓名">
        <input type="email" name="email" placeholder="邮箱">
        <textarea name="message" placeholder="留言"></textarea>
        <button type="submit">提交</button>
    </form>
</body>
</html>
```

### Python Flask示例

```python
from flask import Flask, request, jsonify, render_template_string
import requests

app = Flask(__name__)

API_KEY = 'YOUR_API_KEY'
TASK_ID = 'YOUR_TASK_ID'
API_BASE_URL = 'https://api.example.com'

# HTML模板
HTML_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>Python表单示例</title>
    <meta charset="UTF-8">
</head>
<body>
    <form id="contactForm">
        <h2>联系表单</h2>
        <select id="countryCode">
            <option value="86">中国 (+86)</option>
            <option value="1">美国 (+1)</option>
        </select>
        <input type="tel" id="phone" placeholder="电话号码" required>
        <input type="text" id="name" placeholder="姓名">
        <input type="email" id="email" placeholder="邮箱">
        <button type="submit">提交</button>
    </form>
    
    <script>
    document.getElementById('contactForm').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            country_code: document.getElementById('countryCode').value,
            phone: document.getElementById('phone').value,
            name: document.getElementById('name').value,
            email: document.getElementById('email').value
        };
        
        const response = await fetch('/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        alert(result.message);
    };
    </script>
</body>
</html>
'''

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/submit', methods=['POST'])
def submit_form():
    data = request.json
    country_code = data.get('country_code', '86')
    
    form_data = {
        'form': 'python_form',
        'form_name': 'Python联系表单',
        'entry': {
            'field_5': data.get('phone'),
            'field_2': data.get('name', ''),
            'field_6': data.get('email', '')
        }
    }
    
    # 移除空值
    form_data['entry'] = {k: v for k, v in form_data['entry'].items() if v}
    
    url = f"{API_BASE_URL}/api/openapi/public/{API_KEY}/{TASK_ID}/form-submission?countryCode={country_code}"
    
    try:
        response = requests.post(url, json=form_data)
        if response.status_code == 200:
            return jsonify({'success': True, 'message': '提交成功'})
        else:
            return jsonify({'success': False, 'message': response.json().get('message', '提交失败')})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

if __name__ == '__main__':
    app.run(debug=True)
```

## 第三方系统集成

### Zapier Webhook

1. 创建Webhook触发器
2. 配置URL：
   ```
   https://api.example.com/api/openapi/public/YOUR_API_KEY/YOUR_TASK_ID/form-submission?countryCode=86
   ```
3. 配置请求体映射：
   ```json
   {
     "form": "{{form_id}}",
     "form_name": "{{form_name}}",
     "entry": {
       "field_5": "{{phone}}",
       "field_2": "{{name}}",
       "field_6": "{{email}}"
     }
   }
   ```

### Google Forms + Apps Script

```javascript
function onFormSubmit(e) {
  const API_KEY = 'YOUR_API_KEY';
  const TASK_ID = 'YOUR_TASK_ID';
  const COUNTRY_CODE = '86';
  
  // 获取表单响应
  const response = e.response;
  const items = response.getItemResponses();
  
  // 映射表单字段（根据实际表单调整）
  const formData = {
    form: 'google_form_001',
    form_name: '谷歌表单',
    entry: {
      field_5: items[0].getResponse(), // 电话号码
      field_2: items[1].getResponse(), // 姓名
      field_6: items[2].getResponse()  // 邮箱
    }
  };
  
  // 发送到API
  const url = `https://api.example.com/api/openapi/public/${API_KEY}/${TASK_ID}/form-submission?countryCode=${COUNTRY_CODE}`;
  
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(formData)
  });
}
```

## 错误处理最佳实践

### 1. 前端表单验证

```javascript
function validatePhone(phone, countryCode) {
  const patterns = {
    '86': /^1[3-9]\d{9}$/,        // 中国手机号
    '1': /^\d{10}$/,              // 美国电话
    '44': /^(07\d{9}|01\d{9,10})$/ // 英国电话
  };
  
  return patterns[countryCode]?.test(phone) || false;
}

// 使用示例
const phone = document.getElementById('phone').value;
const countryCode = document.getElementById('countryCode').value;

if (!validatePhone(phone, countryCode)) {
  alert('请输入正确的电话号码格式');
  return;
}
```

### 2. 重试机制

```javascript
async function submitWithRetry(url, data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      // 4xx错误不重试
      if (response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }
      
      // 5xx错误重试
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

## 常见问题

### Q: 字段映射关系是什么？

| 字段 | 说明 | 示例 |
|------|------|------|
| field_5 | 电话号码（必填） | "13800138000" |
| field_2 | 姓名 | "张三" |
| field_6 | 邮箱 | "zhang@example.com" |
| field_3 | 自定义字段1 | 任意文本 |
| field_4 | 自定义字段2 | 任意文本 |

### Q: 如何处理不同国家的电话格式？

建议在前端进行格式验证，并在提交时去除非数字字符：

```javascript
function cleanPhoneNumber(phone) {
  return phone.replace(/\D/g, '');
}
```

### Q: 表单ID是必填的吗？

不是。`form` 和 `form_name` 都是可选字段，主要用于标识数据来源。
