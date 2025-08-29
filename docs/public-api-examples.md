# 公开API使用示例

## PHP示例

```php
<?php
// 配置
$apiKey = 'your-api-key';
$taskId = 'your-task-id';
$countryCode = '86'; // 中国

// 追加号码
$url = "https://your-domain.com/api/openapi/public/{$apiKey}/{$taskId}/{$countryCode}/append-numbers";

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
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode == 200) {
    $result = json_decode($response, true);
    echo "追加成功: " . $result['message'];
} else {
    echo "追加失败: " . $response;
}
?>
```

## Python示例

```python
import requests
import json

# 配置
api_key = 'your-api-key'
task_id = 'your-task-id'
country_code = '86'  # 中国

# 追加号码
url = f"https://your-domain.com/api/openapi/public/{api_key}/{task_id}/{country_code}/append-numbers"

data = {
    "phones": [
        {
            "phone": "13800138000",
            "params": [
                {"name": "姓名", "value": "张三"},
                {"name": "城市", "value": "北京"}
            ]
        },
        {
            "phone": "13900139000",
            "params": [
                {"name": "姓名", "value": "李四"},
                {"name": "城市", "value": "上海"}
            ]
        }
    ]
}

response = requests.post(url, json=data)

if response.status_code == 200:
    result = response.json()
    print(f"追加成功: {result['message']}")
    print(f"成功数量: {result['request']['phoneCount']}")
else:
    print(f"追加失败: {response.status_code}")
    print(response.json())

# 获取通话记录
records_url = f"https://your-domain.com/api/openapi/public/{api_key}/{task_id}/call-records"
params = {
    "pageNumber": 1,
    "pageSize": 20
}

records_response = requests.get(records_url, params=params)
if records_response.status_code == 200:
    records = records_response.json()
    print(f"总记录数: {records['data']['total']}")
    for record in records['data']['records']:
        print(f"号码: {record['phoneNumber']}, 状态: {record['status']}")
```

## Java示例

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import com.google.gson.Gson;
import java.util.*;

public class PublicApiExample {
    private static final String API_KEY = "your-api-key";
    private static final String TASK_ID = "your-task-id";
    private static final String COUNTRY_CODE = "86";
    private static final String BASE_URL = "https://your-domain.com";
    
    public static void main(String[] args) throws Exception {
        // 创建HTTP客户端
        HttpClient client = HttpClient.newHttpClient();
        Gson gson = new Gson();
        
        // 构建请求数据
        Map<String, Object> data = new HashMap<>();
        List<Map<String, Object>> phones = new ArrayList<>();
        
        Map<String, Object> phone1 = new HashMap<>();
        phone1.put("phone", "13800138000");
        List<Map<String, String>> params1 = new ArrayList<>();
        params1.add(Map.of("name", "姓名", "value", "张三"));
        params1.add(Map.of("name", "城市", "value", "北京"));
        phone1.put("params", params1);
        phones.add(phone1);
        
        data.put("phones", phones);
        
        // 构建请求
        String url = String.format("%s/api/openapi/public/%s/%s/%s/append-numbers",
            BASE_URL, API_KEY, TASK_ID, COUNTRY_CODE);
            
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(data)))
            .build();
            
        // 发送请求
        HttpResponse<String> response = client.send(request, 
            HttpResponse.BodyHandlers.ofString());
            
        System.out.println("响应状态码: " + response.statusCode());
        System.out.println("响应内容: " + response.body());
    }
}
```

## JavaScript/Node.js示例

```javascript
const axios = require('axios');

// 配置
const API_KEY = 'your-api-key';
const TASK_ID = 'your-task-id';
const COUNTRY_CODE = '86'; // 中国
const BASE_URL = 'https://your-domain.com';

async function appendNumbers() {
  const url = `${BASE_URL}/api/openapi/public/${API_KEY}/${TASK_ID}/${COUNTRY_CODE}/append-numbers`;
  
  const data = {
    phones: [
      {
        phone: '13800138000',
        params: [
          { name: '姓名', value: '张三' },
          { name: '城市', value: '北京' }
        ]
      },
      {
        phone: '13900139000',
        params: [
          { name: '姓名', value: '李四' },
          { name: '城市', value: '上海' }
        ]
      }
    ]
  };

  try {
    const response = await axios.post(url, data);
    console.log('追加成功:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('追加失败:', error.response.status, error.response.data);
    } else {
      console.error('请求错误:', error.message);
    }
  }
}

async function getCallRecords() {
  const url = `${BASE_URL}/api/openapi/public/${API_KEY}/${TASK_ID}/call-records`;
  
  try {
    const response = await axios.get(url, {
      params: {
        pageNumber: 1,
        pageSize: 20
      }
    });
    
    console.log('总记录数:', response.data.data.total);
    response.data.data.records.forEach(record => {
      console.log(`号码: ${record.phoneNumber}, 状态: ${record.status}`);
    });
  } catch (error) {
    console.error('获取记录失败:', error.response?.data || error.message);
  }
}

// 执行示例
appendNumbers();
// getCallRecords();
```

## C#示例

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class PublicApiExample
{
    private const string ApiKey = "your-api-key";
    private const string TaskId = "your-task-id";
    private const string CountryCode = "86";
    private const string BaseUrl = "https://your-domain.com";
    
    static async Task Main(string[] args)
    {
        using var client = new HttpClient();
        
        // 追加号码
        var appendUrl = $"{BaseUrl}/api/openapi/public/{ApiKey}/{TaskId}/{CountryCode}/append-numbers";
        
        var data = new
        {
            phones = new[]
            {
                new
                {
                    phone = "13800138000",
                    @params = new[]
                    {
                        new { name = "姓名", value = "张三" },
                        new { name = "城市", value = "北京" }
                    }
                }
            }
        };
        
        var json = JsonConvert.SerializeObject(data);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await client.PostAsync(appendUrl, content);
        var responseContent = await response.Content.ReadAsStringAsync();
        
        if (response.IsSuccessStatusCode)
        {
            Console.WriteLine($"追加成功: {responseContent}");
        }
        else
        {
            Console.WriteLine($"追加失败: {response.StatusCode} - {responseContent}");
        }
    }
}
```

## 错误处理建议

1. **网络重试机制**
   ```python
   import time
   
   def api_call_with_retry(url, data=None, max_retries=3):
       for i in range(max_retries):
           try:
               if data:
                   response = requests.post(url, json=data, timeout=30)
               else:
                   response = requests.get(url, timeout=30)
               
               if response.status_code == 200:
                   return response.json()
               elif response.status_code == 401:
                   raise Exception("API Key无效")
               elif response.status_code >= 500:
                   if i < max_retries - 1:
                       time.sleep(2 ** i)  # 指数退避
                       continue
               
               raise Exception(f"API错误: {response.status_code}")
           except requests.exceptions.RequestException as e:
               if i < max_retries - 1:
                   time.sleep(2 ** i)
                   continue
               raise e
   ```

2. **批量处理**
   ```javascript
   // 将大批量号码分批处理
   async function batchAppendNumbers(allPhones, batchSize = 100) {
     const results = [];
     
     for (let i = 0; i < allPhones.length; i += batchSize) {
       const batch = allPhones.slice(i, i + batchSize);
       const batchData = { phones: batch };
       
       try {
         const response = await axios.post(appendUrl, batchData);
         results.push(response.data);
         
         // 避免请求过于频繁
         if (i + batchSize < allPhones.length) {
           await new Promise(resolve => setTimeout(resolve, 1000));
         }
       } catch (error) {
         console.error(`批次 ${i / batchSize + 1} 失败:`, error.message);
       }
     }
     
     return results;
   }
   ```

3. **日志记录**
   ```php
   function logApiCall($action, $request, $response, $statusCode) {
       $log = [
           'timestamp' => date('Y-m-d H:i:s'),
           'action' => $action,
           'request' => $request,
           'response' => $response,
           'status_code' => $statusCode
       ];
       
       error_log(json_encode($log) . "\n", 3, 'api_calls.log');
   }
   ```
