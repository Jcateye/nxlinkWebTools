#!/usr/bin/env node

/**
 * 测试模板配置功能
 */

const http = require('http');

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:8400',
  taskId: '9cf75e77-223e-4f17-8da5-40b4c6da467b',
  apiKey: 'test-api-key'
};

// 测试不同模板的数据
const testData = {
  contact: {
    "form": "contact_test",
    "form_name": "联系我们测试",
    "entry": {
      "serial_number": 1001,
      "field_5": "13800138000",
      "field_2": "张三",
      "field_6": "zhangsan@example.com",
      "field_3": "我想咨询产品",
      "created_at": new Date().toISOString()
    }
  },
  registration: {
    "form": "registration_test",
    "form_name": "活动报名测试",
    "entry": {
      "serial_number": 1002,
      "field_5": "13900139000",
      "field_2": "李四",
      "field_6": "lisi@example.com",
      "field_3": "华为科技有限公司",
      "field_4": "参加产品发布会",
      "created_at": new Date().toISOString()
    }
  },
  feedback: {
    "form": "feedback_test",
    "form_name": "意见反馈测试",
    "entry": {
      "serial_number": 1003,
      "field_5": "13700137000",
      "field_2": "王五",
      "field_6": "wangwu@example.com",
      "field_3": "产品体验很好",
      "field_4": "北京市朝阳区",
      "created_at": new Date().toISOString()
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

// 测试获取模板列表
async function testGetTemplates() {
  console.log(`\n📋 测试获取模板列表`);

  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/webhook/templates`, 'GET');

    console.log(`📊 响应状态: ${response.status}`);
    if (response.status === 200 && response.data.code === 200) {
      console.log(`✅ 获取模板列表成功`);
      console.log(`📋 可用模板: ${response.data.data.templates.map(t => t.templateId).join(', ')}`);
      return true;
    } else {
      console.log(`❌ 获取模板列表失败:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`💥 获取模板列表出错:`, error.message);
    return false;
  }
}

// 测试模板详情
async function testGetTemplateDetail(templateId) {
  console.log(`\n📋 测试获取模板详情: ${templateId}`);

  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/webhook/templates/${templateId}`, 'GET');

    console.log(`📊 响应状态: ${response.status}`);
    if (response.status === 200 && response.data.code === 200) {
      console.log(`✅ 获取模板详情成功`);
      console.log(`📋 模板名称: ${response.data.data.name}`);
      console.log(`📋 字段映射:`, response.data.data.fieldMapping);
      return true;
    } else {
      console.log(`❌ 获取模板详情失败:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`💥 获取模板详情出错:`, error.message);
    return false;
  }
}

// 测试表单提交
async function testFormSubmission(templateId) {
  console.log(`\n📝 测试表单提交: ${templateId}模板`);

  const url = `${TEST_CONFIG.baseUrl}/api/webhook/${TEST_CONFIG.taskId}/form-submission?templateId=${templateId}`;
  const data = testData[templateId];

  if (!data) {
    console.log(`⚠️  没有找到${templateId}模板的测试数据，跳过测试`);
    return true;
  }

  try {
    const response = await makeRequest(url, 'POST', data);

    console.log(`📡 请求URL: ${url}`);
    console.log(`📊 响应状态: ${response.status}`);

    if (response.status === 200 && response.data.code === 200) {
      console.log(`✅ ${templateId}表单提交成功`);
      console.log(`📋 处理参数数量: ${response.data.data.paramsCount}`);
      return true;
    } else {
      console.log(`❌ ${templateId}表单提交失败:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`💥 ${templateId}表单提交出错:`, error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试模板配置功能\n');
  console.log(`📍 服务地址: ${TEST_CONFIG.baseUrl}`);
  console.log(`🎯 任务ID: ${TEST_CONFIG.taskId}`);
  console.log(`🔑 API Key: ${TEST_CONFIG.apiKey.substring(0, 8)}***\n`);

  // 测试获取模板列表
  const templatesSuccess = await testGetTemplates();

  if (!templatesSuccess) {
    console.log('❌ 无法获取模板列表，停止测试');
    return;
  }

  // 测试模板详情
  const templateIds = ['contact', 'registration', 'feedback'];
  for (const templateId of templateIds) {
    await testGetTemplateDetail(templateId);
  }

  // 测试表单提交
  const results = [];
  for (const templateId of templateIds) {
    const success = await testFormSubmission(templateId);
    results.push({ templateId, success });
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
    console.log('🎉 所有测试都通过了！模板配置功能工作正常。');
  } else {
    console.log('⚠️ 部分测试失败，请检查模板配置。');
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testGetTemplates, testGetTemplateDetail, testFormSubmission };
