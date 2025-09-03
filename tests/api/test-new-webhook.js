#!/usr/bin/env node

/**
 * 测试新的Webhook接口（支持URL参数传递taskId和模板id）
 */

const http = require('http');

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:8400',
  taskId: '9cf75e77-223e-4f17-8da5-40b4c6da467b', // 实际的任务ID
  apiKey: 'test-api-key', // 实际的API Key
  templates: ['contact', 'registration', 'inquiry']
};

// 测试数据
const testData = {
  contact: {
    "form": "test_contact_form",
    "form_name": "联系我们表单",
    "entry": {
      "serial_number": 12345,
      "field_5": "13800138000",  // 电话号码
      "field_2": "张三",         // 姓名
      "field_6": "zhangsan@example.com", // 邮箱
      "field_3": "我想了解产品详情",     // 留言
      "created_at": new Date().toISOString(),
      "creator_name": "测试用户",
      "info_region": {
        "province": "广东省",
        "city": "深圳市",
        "district": "南山区"
      }
    }
  },
  registration: {
    "form": "test_registration_form",
    "form_name": "活动报名表单",
    "entry": {
      "serial_number": 12346,
      "field_5": "13900139000",  // 电话号码
      "field_2": "李四",         // 姓名
      "field_6": "lisi@example.com", // 邮箱
      "field_3": "华为科技有限公司", // 公司
      "field_4": "参加华为全连接大会", // 留言
      "created_at": new Date().toISOString(),
      "creator_name": "测试用户2"
    }
  }
};

// 发送HTTP请求的辅助函数
function makeRequest(url, method = 'POST', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_CONFIG.apiKey}`
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({
            status: res.statusCode,
            data: response
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 测试单个模板
async function testTemplate(templateId) {
  console.log(`\n🧪 测试模板: ${templateId}`);

  const url = `${TEST_CONFIG.baseUrl}/api/webhook/${TEST_CONFIG.taskId}/form-submission?templateId=${templateId}`;
  const data = testData[templateId] || testData.contact;

  try {
    const response = await makeRequest(url, 'POST', data);

    console.log(`📡 请求URL: ${url}`);
    console.log(`📊 响应状态: ${response.status}`);
    console.log(`📋 响应数据:`, JSON.stringify(response.data, null, 2));

    if (response.status === 200 && response.data.code === 200) {
      console.log(`✅ ${templateId} 模板测试成功`);
      return true;
    } else {
      console.log(`❌ ${templateId} 模板测试失败`);
      return false;
    }
  } catch (error) {
    console.error(`💥 ${templateId} 模板测试出错:`, error.message);
    return false;
  }
}

// 测试获取模板列表
async function testGetTemplates() {
  console.log(`\n📋 测试获取模板列表`);

  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/webhook/templates`, 'GET');

    console.log(`📊 响应状态: ${response.status}`);
    console.log(`📋 模板列表:`, JSON.stringify(response.data, null, 2));

    if (response.status === 200 && response.data.code === 200) {
      console.log(`✅ 获取模板列表成功`);
      return true;
    } else {
      console.log(`❌ 获取模板列表失败`);
      return false;
    }
  } catch (error) {
    console.error(`💥 获取模板列表出错:`, error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试新的Webhook接口\n');
  console.log(`📍 服务地址: ${TEST_CONFIG.baseUrl}`);
  console.log(`🎯 任务ID: ${TEST_CONFIG.taskId}`);
  console.log(`🔑 API Key: ${TEST_CONFIG.apiKey.substring(0, 8)}***\n`);

  // 测试获取模板列表
  await testGetTemplates();

  // 测试各个模板
  const results = [];
  for (const templateId of TEST_CONFIG.templates) {
    if (testData[templateId]) {
      const success = await testTemplate(templateId);
      results.push({ templateId, success });
    }
  }

  // 输出测试总结
  console.log('\n📊 测试总结:');
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.templateId}: ${result.success ? '成功' : '失败'}`);
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 总体结果: ${successCount}/${results.length} 个模板测试成功`);

  if (successCount === results.length) {
    console.log('🎉 所有测试都通过了！新的Webhook接口工作正常。');
  } else {
    console.log('⚠️ 部分测试失败，请检查接口实现。');
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testTemplate, testGetTemplates };
