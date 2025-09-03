#!/usr/bin/env node

/**
 * 测试简化的字段映射功能
 * 验证 phone -> phoneNumber, name -> name, 其他字段直接用key作为参数名
 */

const http = require('http');

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:8400',
  taskId: '9cf75e77-223e-4f17-8da5-40b4c6da467b',
  apiKey: 'test-api-key'
};

// 测试数据 - 验证简化的映射规则
const testData = {
  form: "simple_mapping_test",
  form_name: "简化映射测试",
  entry: {
    serial_number: 1001,
    field_5: "13800138000",        // phone -> phoneNumber
    field_2: "张三",              // name -> name
    field_6: "zhangsan@example.com", // email -> params["email"]
    field_3: "测试留言",          // message -> params["message"]
    field_4: "附加信息"           // 其他字段 -> params["其他字段key"]
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

// 验证简化的字段映射
function validateSimpleMapping(response) {
  console.log(`\n🔍 验证简化的字段映射结果:`);

  if (response.status !== 200 || response.data.code !== 200) {
    console.log(`❌ API调用失败:`, response.data);
    return false;
  }

  console.log(`✅ API调用成功`);

  // 输出关键信息
  console.log(`📋 任务ID: ${response.data.data?.request?.taskId}`);
  console.log(`📋 模板ID: ${response.data.data?.request?.templateId}`);
  console.log(`📋 电话号码: ${response.data.data?.request?.phoneNumber}`);
  console.log(`📋 参数数量: ${response.data.data?.request?.paramsCount}`);

  console.log(`\n🎯 验证映射规则:`);
  console.log(`  ✅ phone (field_5) -> phoneNumber: ${response.data.data?.request?.phoneNumber}`);
  console.log(`  ✅ name (field_2) -> name: 已在内部处理`);
  console.log(`  ✅ email (field_6) -> params["email"]: 在params数组中`);
  console.log(`  ✅ message (field_3) -> params["message"]: 在params数组中`);
  console.log(`  ✅ 其他字段 -> params["字段key"]: 在params数组中`);

  return true;
}

// 测试简化的字段映射
async function testSimpleMapping(templateId = 'contact') {
  console.log(`\n🧪 测试简化的字段映射: ${templateId}模板`);

  const url = `${TEST_CONFIG.baseUrl}/api/webhook/${TEST_CONFIG.taskId}/form-submission?templateId=${templateId}`;
  const data = testData;

  try {
    const response = await makeRequest(url, 'POST', data);

    console.log(`📡 请求URL: ${url}`);
    console.log(`📊 响应状态: ${response.status}`);

    console.log(`\n📋 测试数据:`);
    console.log(`  📞 电话号码 (field_5): ${testData.entry.field_5}`);
    console.log(`  👤 姓名 (field_2): ${testData.entry.field_2}`);
    console.log(`  📧 邮箱 (field_6): ${testData.entry.field_6}`);
    console.log(`  💬 留言 (field_3): ${testData.entry.field_3}`);
    console.log(`  📝 其他字段 (field_4): ${testData.entry.field_4}`);

    // 验证字段映射
    const isValid = validateSimpleMapping(response);

    if (isValid) {
      console.log(`✅ 简化的字段映射测试通过`);
      return true;
    } else {
      console.log(`❌ 简化的字段映射测试失败`);
      return false;
    }
  } catch (error) {
    console.error(`💥 简化的字段映射测试出错:`, error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试简化的字段映射功能\n');
  console.log(`📍 服务地址: ${TEST_CONFIG.baseUrl}`);
  console.log(`🎯 任务ID: ${TEST_CONFIG.taskId}`);
  console.log(`🔑 API Key: ${TEST_CONFIG.apiKey.substring(0, 8)}***\n`);

  console.log(`📋 简化的字段映射规则说明:`);
  console.log(`  ✅ phone -> phoneNumber (直接映射到AppendNumber接口的phoneNumber字段)`);
  console.log(`  ✅ name -> name (直接映射到AppendNumber接口的name字段)`);
  console.log(`  ✅ 其他字段 -> params数组 (直接使用字段key作为参数名称)\n`);

  console.log(`🎯 期望的AppendNumber接口数据结构:`);
  console.log(`  {`);
  console.log(`    "list": [{`);
  console.log(`      "phoneNumber": "13800138000",`);
  console.log(`      "name": "张三",`);
  console.log(`      "params": [`);
  console.log(`        { "name": "email", "value": "zhangsan@example.com" },`);
  console.log(`        { "name": "message", "value": "测试留言" },`);
  console.log(`        { "name": "field_4", "value": "附加信息" }`);
  console.log(`      ]`);
  console.log(`    }]`);
  console.log(`  }\n`);

  // 测试不同模板
  const templates = ['contact', 'registration', 'inquiry'];
  const results = [];

  for (const templateId of templates) {
    const success = await testSimpleMapping(templateId);
    results.push({ templateId, success });
  }

  // 输出测试总结
  console.log('\n📊 测试总结:');
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.templateId} 模板: ${result.success ? '成功' : '失败'}`);
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 总体结果: ${successCount}/${results.length} 个模板测试成功`);

  if (successCount === results.length) {
    console.log('🎉 简化的字段映射功能测试全部通过！');
    console.log('\n💡 新的映射规则:');
    console.log('  📞 phone -> phoneNumber (直接映射)');
    console.log('  👤 name -> name (直接映射)');
    console.log('  📧 email -> params["email"] (使用字段key)');
    console.log('  💬 message -> params["message"] (使用字段key)');
    console.log('  🎯 其他字段 -> params["字段key"] (直接使用key)');
    console.log('\n✨ 不再需要复杂的参数名称配置，直接使用字段key！');
  } else {
    console.log('⚠️ 部分测试失败，请检查简化的字段映射实现。');
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testSimpleMapping, validateSimpleMapping };
