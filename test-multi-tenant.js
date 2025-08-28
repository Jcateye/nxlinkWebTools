#!/usr/bin/env node

/**
 * 多租户API测试脚本
 * 测试不同API Key的隔离性和配置正确性
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8001';

// 测试用的API Keys
const TEST_API_KEYS = [
  {
    key: 'demo-api-key-1',
    alias: '开发平台1',
    expectedAlias: '开发平台1'
  },
  {
    key: 'demo-api-key-2', 
    alias: '开发平台2',
    expectedAlias: '开发平台2'
  },
  {
    key: 'invalid-key',
    alias: '无效密钥',
    expectedAlias: null
  }
];

// 测试数据
const TEST_PHONE_NUMBERS = [
  '13800000001',
  {
    phoneNumber: '13800000002',
    params: [
      { name: '姓名', value: '张三' },
      { name: '备注', value: 'VIP客户' }
    ]
  }
];

async function testApiKeyStatus(apiKey) {
  console.log(`\n🔍 测试API Key: ${apiKey.key} (${apiKey.alias})`);
  
  try {
    const response = await axios.get(`${BASE_URL}/api/openapi/status`, {
      headers: {
        'x-api-key': apiKey.key
      }
    });
    
    if (response.data.code === 200) {
      const data = response.data.data;
      console.log(`  ✅ 状态检查成功`);
      console.log(`     - API Key: ${data.apiKey}`);
      console.log(`     - 别名: ${data.apiKeyAlias}`);
      console.log(`     - 描述: ${data.apiKeyDescription}`);
      console.log(`     - OpenAPI配置: ${data.hasOpenApiConfig ? '已配置' : '未配置'}`);
      console.log(`     - 服务地址: ${data.openApiBaseUrl}`);
      console.log(`     - 业务类型: ${data.openApiBizType}`);
      
      return true;
    } else {
      console.log(`  ❌ 状态检查失败: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    if (error.response) {
      console.log(`  ❌ API Key验证失败: ${error.response.data.message}`);
    } else {
      console.log(`  ❌ 网络错误: ${error.message}`);
    }
    return false;
  }
}

async function testAppendNumbers(apiKey) {
  console.log(`\n📞 测试追加号码: ${apiKey.key}`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/openapi/append-numbers`, {
      taskId: 'test-task-' + Date.now(),
      phoneNumbers: TEST_PHONE_NUMBERS,
      autoFlowId: 123,
      countryCode: '86'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.key
      }
    });
    
    if (response.data.code === 200) {
      console.log(`  ✅ 追加号码成功`);
      console.log(`     - 成功: ${response.data.data.successCount}`);
      console.log(`     - 失败: ${response.data.data.failCount}`);
      return true;
    } else {
      console.log(`  ❌ 追加号码失败: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    if (error.response) {
      console.log(`  ❌ 追加号码失败: ${error.response.data.message}`);
    } else {
      console.log(`  ❌ 网络错误: ${error.message}`);
    }
    return false;
  }
}

async function testGetAllKeys() {
  console.log(`\n📋 测试获取所有API Keys信息`);
  
  try {
    const response = await axios.get(`${BASE_URL}/api/openapi/keys`);
    
    if (response.data.code === 200) {
      const data = response.data.data;
      console.log(`  ✅ 获取成功`);
      console.log(`     - 总数量: ${data.totalKeys}`);
      
      data.keys.forEach((key, index) => {
        console.log(`     - Key ${index + 1}:`);
        console.log(`       * 别名: ${key.alias}`);
        console.log(`       * 描述: ${key.description}`);
        console.log(`       * OpenAPI配置: ${key.hasOpenApiConfig ? '已配置' : '未配置'}`);
        console.log(`       * 服务地址: ${key.openApiBaseUrl}`);
      });
      
      return true;
    } else {
      console.log(`  ❌ 获取失败: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ 网络错误: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 开始多租户API测试\n');
  console.log('=' .repeat(50));
  
  // 测试获取所有Keys
  await testGetAllKeys();
  
  console.log('\n' + '=' .repeat(50));
  
  // 测试每个API Key
  let successCount = 0;
  let totalTests = 0;
  
  for (const apiKey of TEST_API_KEYS) {
    console.log('\n' + '-'.repeat(30));
    
    // 测试状态检查
    totalTests++;
    if (await testApiKeyStatus(apiKey)) {
      successCount++;
      
      // 如果状态检查成功且不是无效密钥，测试追加号码
      if (apiKey.key !== 'invalid-key') {
        totalTests++;
        if (await testAppendNumbers(apiKey)) {
          successCount++;
        }
      }
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 测试结果汇总');
  console.log(`   成功: ${successCount}/${totalTests}`);
  console.log(`   成功率: ${((successCount / totalTests) * 100).toFixed(1)}%`);
  
  if (successCount === totalTests) {
    console.log('🎉 所有测试通过！多租户功能正常工作。');
  } else {
    console.log('⚠️  部分测试失败，请检查配置和服务状态。');
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('测试执行出错:', error);
    process.exit(1);
  });
}

module.exports = {
  testApiKeyStatus,
  testAppendNumbers,
  testGetAllKeys,
  runTests
};
