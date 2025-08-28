# 追加号码API接口调用示例

## 目录
1. [接口概述](#接口概述)
2. [认证方式](#认证方式)
3. [请求参数](#请求参数)
4. [响应格式](#响应格式)
5. [错误处理](#错误处理)
6. [代码示例](#代码示例)
   - [JavaScript/Node.js](#javascriptnodejs)
   - [Python](#python)
   - [Java](#java)
   - [C#](#c)
   - [Go](#go)
   - [PHP](#php)

## 接口概述

**接口地址**: `POST http://localhost:8400/api/openapi/append-numbers`

**功能描述**: 向指定任务批量追加号码，支持多租户架构

**支持环境**:
- 开发环境: `http://localhost:8400` (端口8400)
- 生产环境: 根据部署情况调整

## 认证方式

### 方式1: x-api-key 请求头
```http
x-api-key: demo-api-key-1
```

### 方式2: Authorization Bearer Token
```http
Authorization: Bearer demo-api-key-1
```

### 可用的API Key (示例)
```json
[
  {
    "apiKey": "demo-api-key-1",
    "alias": "营销云内部环境",
    "description": "开发环境API Key 1"
  },
  {
    "apiKey": "demo-api-key-2",
    "alias": "客户测试环境（勿删）",
    "description": "客户测试环境"
  },
  {
    "apiKey": "cqdLgWcrRV2fq9ejABvVsQm9qmxFe7Xy",
    "alias": "小语种测试",
    "description": "小语种测试"
  }
]
```

## 请求参数

### 基本参数
```json
{
  "taskId": "string",           // 必填：任务ID
  "phoneNumbers": [             // 必填：号码列表
    "13800000001",              // 简单格式：只有号码
    {                           // 复杂格式：号码+参数
      "phoneNumber": "13800000002",
      "params": [
        {
          "name": "姓名",
          "value": "张三"
        },
        {
          "name": "备注",
          "value": "VIP客户"
        }
      ]
    }
  ]
}
```

### 完整参数
```json
{
  "taskId": "23ac8c5d-4e43-4669-bff8-1ab1f8436933",  // 必填：任务ID
  "phoneNumbers": [...],                            // 必填：号码列表
  "autoFlowId": 123,                                // 可选：机器人ID
  "countryCode": "86",                              // 可选：国家码
  "params": [                                       // 可选：全局参数
    {
      "name": "默认备注",
      "value": "批量导入"
    }
  ]
}
```

## 响应格式

### 成功响应
```json
{
  "code": 200,
  "message": "追加号码完成",
  "data": {
    "total": 2,
    "success": 2,
    "failed": 0,
    "results": [
      {
        "phoneNumber": "13800000001",
        "success": true,
        "contactId": "a1b2c3d4-1234-5678-9012-abcdef123456",
        "response": {
          "code": 0,
          "message": "success",
          "traceId": "97cc18eb-a91c-4968-bd02-5f1bde2bdfd0"
        }
      },
      {
        "phoneNumber": "13800000002",
        "success": true,
        "contactId": "b2c3d4e5-2345-6789-0123-bcdef2345678",
        "response": {
          "code": 0,
          "message": "success",
          "traceId": "97cc18eb-a91c-4968-bd02-5f1bde2bdfd0"
        }
      }
    ]
  }
}
```

### 部分成功响应
```json
{
  "code": 207,
  "message": "部分号码追加成功",
  "data": {
    "total": 3,
    "success": 2,
    "failed": 1,
    "results": [
      {
        "phoneNumber": "13800000001",
        "success": true,
        "contactId": "a1b2c3d4-1234-5678-9012-abcdef123456",
        "response": {
          "code": 0,
          "message": "success"
        }
      },
      {
        "phoneNumber": "13800000002",
        "success": false,
        "error": "Duplicate contactIds are not allowed",
        "response": {
          "code": 20000,
          "message": "Duplicate contactIds are not allowed: a1b2c3d4-1234-5678-9012-abcdef123456"
        }
      }
    ]
  }
}
```

## 错误处理

### 常见错误码

| 错误码 | 描述 | 解决方案 |
|--------|------|----------|
| 401 | API Key缺失 | 检查请求头中是否包含有效的API Key |
| 403 | API Key无效 | 确认API Key是否正确且未过期 |
| 400 | 参数错误 | 检查taskId和phoneNumbers是否正确 |
| 500 | 服务器错误 | 检查服务器日志，联系管理员 |

### 错误响应示例
```json
{
  "code": 401,
  "message": "API Key is required. Please provide x-api-key header or Authorization Bearer token.",
  "error": "MISSING_API_KEY"
}
```

## 代码示例

### JavaScript/Node.js

```javascript
const axios = require('axios');

// 配置
const API_BASE_URL = 'http://localhost:8400';
const API_KEY = 'demo-api-key-1';

// 简单调用
async function appendNumbersSimple(taskId, phoneNumbers) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/openapi/append-numbers`, {
      taskId: taskId,
      phoneNumbers: phoneNumbers
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });

    console.log('响应:', response.data);
    return response.data;
  } catch (error) {
    console.error('错误:', error.response?.data || error.message);
    throw error;
  }
}

// 复杂调用（包含参数）
async function appendNumbersWithParams(taskId, phoneData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/openapi/append-numbers`, {
      taskId: taskId,
      phoneNumbers: phoneData,
      autoFlowId: 123,
      countryCode: '86'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });

    console.log('响应:', response.data);
    return response.data;
  } catch (error) {
    console.error('错误:', error.response?.data || error.message);
    throw error;
  }
}

// 使用示例
async function example() {
  // 简单格式
  await appendNumbersSimple('23ac8c5d-4e43-4669-bff8-1ab1f8436933', [
    '13800000001',
    '13800000002'
  ]);

  // 复杂格式
  await appendNumbersWithParams('23ac8c5d-4e43-4669-bff8-1ab1f8436933', [
    {
      phoneNumber: '13800000001',
      params: [
        { name: '姓名', value: '张三' },
        { name: '备注', value: 'VIP客户' }
      ]
    }
  ]);
}

example();
```

### Python

```python
import requests
import json

# 配置
API_BASE_URL = 'http://localhost:8400'
API_KEY = 'demo-api-key-1'

def append_numbers_simple(task_id, phone_numbers):
    """简单格式调用"""
    url = f"{API_BASE_URL}/api/openapi/append-numbers"

    headers = {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
    }

    data = {
        'taskId': task_id,
        'phoneNumbers': phone_numbers
    }

    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()

        result = response.json()
        print('响应:', json.dumps(result, indent=2, ensure_ascii=False))
        return result

    except requests.exceptions.RequestException as e:
        print(f'请求错误: {e}')
        if hasattr(e, 'response') and e.response:
            print(f'错误详情: {e.response.text}')
        raise

def append_numbers_with_params(task_id, phone_data):
    """复杂格式调用"""
    url = f"{API_BASE_URL}/api/openapi/append-numbers"

    headers = {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
    }

    data = {
        'taskId': task_id,
        'phoneNumbers': phone_data,
        'autoFlowId': 123,
        'countryCode': '86'
    }

    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()

        result = response.json()
        print('响应:', json.dumps(result, indent=2, ensure_ascii=False))
        return result

    except requests.exceptions.RequestException as e:
        print(f'请求错误: {e}')
        if hasattr(e, 'response') and e.response:
            print(f'错误详情: {e.response.text}')
        raise

# 使用示例
if __name__ == '__main__':
    # 简单格式
    append_numbers_simple('23ac8c5d-4e43-4669-bff8-1ab1f8436933', [
        '13800000001',
        '13800000002'
    ])

    # 复杂格式
    append_numbers_with_params('23ac8c5d-4e43-4669-bff8-1ab1f8436933', [
        {
            'phoneNumber': '13800000001',
            'params': [
                {'name': '姓名', 'value': '张三'},
                {'name': '备注', 'value': 'VIP客户'}
            ]
        }
    ])
```

### Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

public class AppendNumbersAPI {

    private static final String API_BASE_URL = "http://localhost:8400";
    private static final String API_KEY = "demo-api-key-1";
    private static final HttpClient httpClient = HttpClient.newHttpClient();
    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static void main(String[] args) {
        try {
            // 简单格式调用
            appendNumbersSimple("23ac8c5d-4e43-4669-bff8-1ab1f8436933",
                List.of("13800000001", "13800000002"));

            // 复杂格式调用
            appendNumbersWithParams("23ac8c5d-4e43-4669-bff8-1ab1f8436933");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void appendNumbersSimple(String taskId, List<String> phoneNumbers)
            throws Exception {

        String url = API_BASE_URL + "/api/openapi/append-numbers";

        // 构建请求体
        Map<String, Object> requestBody = Map.of(
            "taskId", taskId,
            "phoneNumbers", phoneNumbers
        );

        String jsonBody = objectMapper.writeValueAsString(requestBody);

        // 构建请求
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .header("x-api-key", API_KEY)
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
            .build();

        // 发送请求
        HttpResponse<String> response = httpClient.send(request,
            HttpResponse.BodyHandlers.ofString());

        System.out.println("响应状态码: " + response.statusCode());
        System.out.println("响应内容: " + response.body());
    }

    public static void appendNumbersWithParams(String taskId) throws Exception {

        String url = API_BASE_URL + "/api/openapi/append-numbers";

        // 构建复杂的请求体
        Map<String, Object> phoneData1 = Map.of(
            "phoneNumber", "13800000001",
            "params", List.of(
                Map.of("name", "姓名", "value", "张三"),
                Map.of("name", "备注", "value", "VIP客户")
            )
        );

        Map<String, Object> requestBody = Map.of(
            "taskId", taskId,
            "phoneNumbers", List.of(phoneData1),
            "autoFlowId", 123,
            "countryCode", "86"
        );

        String jsonBody = objectMapper.writeValueAsString(requestBody);

        // 构建请求
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .header("x-api-key", API_KEY)
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
            .build();

        // 发送请求
        HttpResponse<String> response = httpClient.send(request,
            HttpResponse.BodyHandlers.ofString());

        System.out.println("响应状态码: " + response.statusCode());
        System.out.println("响应内容: " + response.body());
    }
}
```

### C#

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.Collections.Generic;

class AppendNumbersAPI
{
    private static readonly string API_BASE_URL = "http://localhost:8400";
    private static readonly string API_KEY = "demo-api-key-1";
    private static readonly HttpClient httpClient = new HttpClient();

    static async Task Main(string[] args)
    {
        try
        {
            // 简单格式调用
            await AppendNumbersSimple("23ac8c5d-4e43-4669-bff8-1ab1f8436933",
                new List<string> { "13800000001", "13800000002" });

            // 复杂格式调用
            await AppendNumbersWithParams("23ac8c5d-4e43-4669-bff8-1ab1f8436933");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"错误: {ex.Message}");
        }
    }

    static async Task AppendNumbersSimple(string taskId, List<string> phoneNumbers)
    {
        string url = $"{API_BASE_URL}/api/openapi/append-numbers";

        var requestBody = new
        {
            taskId = taskId,
            phoneNumbers = phoneNumbers
        };

        string jsonBody = JsonConvert.SerializeObject(requestBody);

        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Add("x-api-key", API_KEY);
        request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

        HttpResponseMessage response = await httpClient.SendAsync(request);
        string responseContent = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"响应状态码: {(int)response.StatusCode}");
        Console.WriteLine($"响应内容: {responseContent}");
    }

    static async Task AppendNumbersWithParams(string taskId)
    {
        string url = $"{API_BASE_URL}/api/openapi/append-numbers";

        var phoneData = new[]
        {
            new
            {
                phoneNumber = "13800000001",
                params = new[]
                {
                    new { name = "姓名", value = "张三" },
                    new { name = "备注", value = "VIP客户" }
                }
            }
        };

        var requestBody = new
        {
            taskId = taskId,
            phoneNumbers = phoneData,
            autoFlowId = 123,
            countryCode = "86"
        };

        string jsonBody = JsonConvert.SerializeObject(requestBody);

        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Add("x-api-key", API_KEY);
        request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

        HttpResponseMessage response = await httpClient.SendAsync(request);
        string responseContent = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"响应状态码: {(int)response.StatusCode}");
        Console.WriteLine($"响应内容: {responseContent}");
    }
}
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

const (
    API_BASE_URL = "http://localhost:8400"
    API_KEY       = "demo-api-key-1"
)

type PhoneData struct {
    PhoneNumber string `json:"phoneNumber"`
    Params      []Param `json:"params,omitempty"`
}

type Param struct {
    Name  string `json:"name"`
    Value string `json:"value"`
}

type AppendNumbersRequest struct {
    TaskId       string      `json:"taskId"`
    PhoneNumbers interface{} `json:"phoneNumbers"` // Can be []string or []PhoneData
    AutoFlowId   int         `json:"autoFlowId,omitempty"`
    CountryCode  string      `json:"countryCode,omitempty"`
}

func appendNumbersSimple(taskId string, phoneNumbers []string) error {
    url := API_BASE_URL + "/api/openapi/append-numbers"

    requestBody := AppendNumbersRequest{
        TaskId:       taskId,
        PhoneNumbers: phoneNumbers,
    }

    jsonData, err := json.Marshal(requestBody)
    if err != nil {
        return fmt.Errorf("JSON编码错误: %v", err)
    }

    req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    if err != nil {
        return fmt.Errorf("创建请求错误: %v", err)
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", API_KEY)

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return fmt.Errorf("发送请求错误: %v", err)
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return fmt.Errorf("读取响应错误: %v", err)
    }

    fmt.Printf("响应状态码: %d\n", resp.StatusCode)
    fmt.Printf("响应内容: %s\n", string(body))

    return nil
}

func appendNumbersWithParams(taskId string) error {
    url := API_BASE_URL + "/api/openapi/append-numbers"

    phoneData := []PhoneData{
        {
            PhoneNumber: "13800000001",
            Params: []Param{
                {Name: "姓名", Value: "张三"},
                {Name: "备注", Value: "VIP客户"},
            },
        },
    }

    requestBody := AppendNumbersRequest{
        TaskId:       taskId,
        PhoneNumbers: phoneData,
        AutoFlowId:   123,
        CountryCode:  "86",
    }

    jsonData, err := json.Marshal(requestBody)
    if err != nil {
        return fmt.Errorf("JSON编码错误: %v", err)
    }

    req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    if err != nil {
        return fmt.Errorf("创建请求错误: %v", err)
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", API_KEY)

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return fmt.Errorf("发送请求错误: %v", err)
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return fmt.Errorf("读取响应错误: %v", err)
    }

    fmt.Printf("响应状态码: %d\n", resp.StatusCode)
    fmt.Printf("响应内容: %s\n", string(body))

    return nil
}

func main() {
    // 简单格式
    err := appendNumbersSimple("23ac8c5d-4e43-4669-bff8-1ab1f8436933",
        []string{"13800000001", "13800000002"})
    if err != nil {
        fmt.Printf("简单格式调用错误: %v\n", err)
    }

    // 复杂格式
    err = appendNumbersWithParams("23ac8c5d-4e43-4669-bff8-1ab1f8436933")
    if err != nil {
        fmt.Printf("复杂格式调用错误: %v\n", err)
    }
}
```

### PHP

```php
<?php

const API_BASE_URL = 'http://localhost:8400';
const API_KEY = 'demo-api-key-1';

function appendNumbersSimple($taskId, $phoneNumbers) {
    $url = API_BASE_URL . '/api/openapi/append-numbers';

    $data = [
        'taskId' => $taskId,
        'phoneNumbers' => $phoneNumbers
    ];

    $jsonData = json_encode($data, JSON_UNESCAPED_UNICODE);

    $ch = curl_init();

    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $jsonData,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-key: ' . API_KEY
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        echo 'cURL错误: ' . curl_error($ch) . "\n";
        curl_close($ch);
        return false;
    }

    curl_close($ch);

    echo "响应状态码: {$httpCode}\n";
    echo "响应内容: {$response}\n";

    return json_decode($response, true);
}

function appendNumbersWithParams($taskId) {
    $url = API_BASE_URL . '/api/openapi/append-numbers';

    $phoneData = [
        [
            'phoneNumber' => '13800000001',
            'params' => [
                ['name' => '姓名', 'value' => '张三'],
                ['name' => '备注', 'value' => 'VIP客户']
            ]
        ]
    ];

    $data = [
        'taskId' => $taskId,
        'phoneNumbers' => $phoneData,
        'autoFlowId' => 123,
        'countryCode' => '86'
    ];

    $jsonData = json_encode($data, JSON_UNESCAPED_UNICODE);

    $ch = curl_init();

    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $jsonData,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-key: ' . API_KEY
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        echo 'cURL错误: ' . curl_error($ch) . "\n";
        curl_close($ch);
        return false;
    }

    curl_close($ch);

    echo "响应状态码: {$httpCode}\n";
    echo "响应内容: {$response}\n";

    return json_decode($response, true);
}

// 使用示例
// 简单格式
$result1 = appendNumbersSimple('23ac8c5d-4e43-4669-bff8-1ab1f8436933', [
    '13800000001',
    '13800000002'
]);

// 复杂格式
$result2 = appendNumbersWithParams('23ac8c5d-4e43-4669-bff8-1ab1f8436933');

?>
```

## 总结

通过以上示例，你可以：

1. **获取API Key**: 从系统管理员处获取有效的API Key
2. **选择认证方式**: 使用 `x-api-key` 请求头或 `Authorization Bearer Token`
3. **构建请求**: 根据你的需求选择简单格式或复杂格式
4. **处理响应**: 检查响应码和结果，处理可能的错误情况
5. **批量处理**: 接口支持一次处理多个号码，提高效率

接口支持多租户架构，每个API Key对应独立的nxlink OpenAPI配置，确保不同系统的调用相互隔离和安全。
