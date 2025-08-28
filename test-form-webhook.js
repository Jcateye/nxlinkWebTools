#!/usr/bin/env node

/**
 * 表单Webhook接口测试脚本
 * 支持测试多个表单配置
 */

const http = require('http');

// 获取命令行参数
const args = process.argv.slice(2);
const targetForm = args[0] || 'all'; // all, E0Tqhk, wE4D2a

// 测试数据集合
const testDataSets = {
  'E0Tqhk': {
    "form": "E0Tqhk",
    "form_name": "华为全连接大会 | NXAI AI互动体验信息登记",
    "entry": {
      "serial_number": Math.floor(Math.random() * 10000),
      "field_2": "张三",           // 姓名 -> 额外参数 name
      "field_5": "13812345678",    // 电话号码 -> Phone Number
      "field_3": "这是一行文字",
      "field_4": "这是一行文字",
      "field_6": "support@jinshuju.net",
      "x_field_1": "这是一行文字",
      "color_mark": "深绿色",
      "creator_name": "小王",
      "created_at": new Date().toISOString(),
      "updated_at": new Date().toISOString(),
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
  },
  'wE4D2a': {
    "form": "wE4D2a",
    "form_name": "HUAWEI CONNECT 2025 | NXAI AI Interactive Experience Sign-up",
    "entry": {
      "serial_number": Math.floor(Math.random() * 10000),
      "field_2": "John Doe",       // 姓名 -> 额外参数 name
      "field_5": "13887654321",    // 电话号码 -> Phone Number
      "field_3": "This is a line of text",
      "field_4": "This is another line of text",
      "field_6": "support@jinshuju.net",
      "x_field_1": "Additional text field",
      "color_mark": "Dark Green",
      "creator_name": "Xiao Wang",
      "created_at": new Date().toISOString(),
      "updated_at": new Date().toISOString(),
      "info_filling_duration": 156,
      "info_platform": "Macintosh",
      "info_os": "OS X 10.13.6",
      "info_browser": "Chrome 68.0.3440.106",
      "info_region": {
        "province": "Shaanxi Province",
        "city": "Xi'an City",
        "district": "Yanta District",
        "street": "Gaoxin Road"
      },
      "info_remote_ip": "127.0.0.1"
    }
  }
};

// 测试函数
async function testFormWebhook(formId, testData) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8400,
      path: '/api/webhook/form-submission',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(testData))
      }
    };

    console.log(`\n🧪 测试表单: ${formId}`);
    console.log('📡 发送数据到:', `http://${options.hostname}:${options.port}${options.path}`);
    console.log('📝 测试数据:', JSON.stringify(testData, null, 2));

    const req = http.request(options, (res) => {
      console.log(`📊 响应状态码: ${res.statusCode}`);

      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData);
          console.log('✅ 响应内容:');
          console.log(JSON.stringify(jsonResponse, null, 2));

          if (jsonResponse.code === 200) {
            console.log('🎉 测试成功! 表单数据已成功处理并追加号码');
            resolve(jsonResponse);
          } else {
            console.log('❌ 测试失败:', jsonResponse.message);
            resolve(jsonResponse);
          }
        } catch (error) {
          console.log('❌ 解析响应失败:', error.message);
          console.log('📄 原始响应:', responseData);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ 请求失败:', error.message);
      reject(error);
    });

    req.write(JSON.stringify(testData));
    req.end();
  });
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试表单Webhook接口...');

  const formsToTest = targetForm === 'all'
    ? Object.keys(testDataSets)
    : [targetForm];

  console.log(`📋 将测试表单: ${formsToTest.join(', ')}`);

  const results = [];

  for (const formId of formsToTest) {
    if (!testDataSets[formId]) {
      console.log(`\n❌ 表单 ${formId} 不存在，可用表单: ${Object.keys(testDataSets).join(', ')}`);
      continue;
    }

    try {
      const result = await testFormWebhook(formId, testDataSets[formId]);
      results.push({ formId, success: result.code === 200, result });
    } catch (error) {
      console.log(`\n❌ 表单 ${formId} 测试过程中出错:`, error.message);
      results.push({ formId, success: false, error: error.message });
    }

    // 在测试之间稍作等待
    if (formsToTest.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 输出测试总结
  console.log('\n📊 测试总结:');
  console.log('='.repeat(50));
  results.forEach(({ formId, success }) => {
    const status = success ? '✅ 成功' : '❌ 失败';
    console.log(`${status} - ${formId}`);
  });

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  console.log(`\n总计: ${successCount}/${totalCount} 个表单测试成功`);

  if (successCount === totalCount) {
    console.log('🎉 所有表单测试均通过!');
  } else {
    console.log('\n🔍 故障排除提示:');
    console.log('1. 确保后端服务正在运行 (端口8400)');
    console.log('2. 检查表单映射配置是否正确');
    console.log('3. 确认taskID已正确配置');
    console.log('4. 查看后端日志获取详细信息');
  }
}

// 错误处理包装器
function handleError(error) {
  console.error('\n❌ 测试脚本执行失败:', error.message);
  console.log('\n🔍 故障排除提示:');
  console.log('1. 确保后端服务正在运行 (端口8400)');
  console.log('2. 检查网络连接');
  console.log('3. 确认测试数据格式正确');
  process.exit(1);
}

// 执行测试
if (targetForm !== 'all' && !testDataSets[targetForm]) {
  console.log(`❌ 无效的表单ID: ${targetForm}`);
  console.log(`📋 可用的表单ID: ${Object.keys(testDataSets).join(', ')}`);
  console.log('💡 使用方法:');
  console.log('  node test-form-webhook.js          # 测试所有表单');
  console.log('  node test-form-webhook.js E0Tqhk   # 测试中文表单');
  console.log('  node test-form-webhook.js wE4D2a   # 测试英文表单');
  process.exit(1);
}

runTests().catch(handleError);
