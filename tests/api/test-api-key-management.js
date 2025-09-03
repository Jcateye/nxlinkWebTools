#!/usr/bin/env node

/**
 * API Key 管理功能测试脚本
 * 测试添加、查询、更新、删除API Key的功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8001';

// 测试API Key配置
const TEST_API_KEY = {
  apiKey: 'test-platform-key-' + Date.now(),
  alias: '测试平台',
  description: '这是一个测试用的API Key',
  openapi: {
    accessKey: 'AK-test-123456',
    accessSecret: 'secret-test-123456',
    bizType: '8',
    baseUrl: 'https://api-westus.nxlink.ai'
  }
};

async function testAddApiKey() {
  console.log('\n🔧 测试添加API Key');
  try {
    const response = await axios.post(`${BASE_URL}/api/keys/add`, TEST_API_KEY);
    
    if (response.data.code === 200) {
      console.log('  ✅ 添加成功:', response.data.message);
      console.log('     API Key:', response.data.data.apiKey);
      console.log('     别名:', response.data.data.alias);
      return true;
    } else {
      console.log('  ❌ 添加失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('  ❌ 添加失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testListApiKeys() {
  console.log('\n📋 测试获取API Keys列表');
  try {
    const response = await axios.get(`${BASE_URL}/api/keys/list`);
    
    if (response.data.code === 200) {
      const data = response.data.data;
      console.log('  ✅ 获取成功');
      console.log('     总数量:', data.totalKeys);
      console.log('     配置文件中的Keys:', data.stats?.fileKeys);
      console.log('     环境变量中的Keys:', data.stats?.envKeys);
      
      console.log('     API Keys:');
      data.keys.forEach((key, index) => {
        console.log(`       ${index + 1}. ${key.alias} (${key.apiKey})`);
        console.log(`          描述: ${key.description}`);
        console.log(`          配置状态: ${key.hasOpenApiConfig ? '已配置' : '未配置'}`);
      });
      
      return data.keys.length > 0;
    } else {
      console.log('  ❌ 获取失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('  ❌ 获取失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testApiKeyDetail(apiKey) {
  console.log(`\n🔍 测试获取API Key详情: ${apiKey}`);
  try {
    const response = await axios.get(`${BASE_URL}/api/keys/detail/${apiKey}`);
    
    if (response.data.code === 200) {
      const data = response.data.data;
      console.log('  ✅ 获取成功');
      console.log('     API Key:', data.apiKey);
      console.log('     别名:', data.alias);
      console.log('     描述:', data.description);
      console.log('     OpenAPI配置:');
      console.log('       Access Key:', data.openapi.accessKey);
      console.log('       Access Secret:', data.openapi.accessSecret);
      console.log('       业务类型:', data.openapi.bizType);
      console.log('       服务地址:', data.openapi.baseUrl);
      return true;
    } else {
      console.log('  ❌ 获取失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('  ❌ 获取失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testApiKeyTest(apiKey) {
  console.log(`\n🧪 测试API Key有效性: ${apiKey}`);
  try {
    const response = await axios.post(`${BASE_URL}/api/keys/test`, { apiKey });
    
    if (response.data.code === 200) {
      const data = response.data.data;
      console.log('  ✅ 测试完成');
      console.log('     测试结果:', data.testResult.isValid ? '有效' : '无效');
      console.log('     测试消息:', data.testResult.message);
      console.log('     测试时间:', new Date(data.testResult.timestamp).toLocaleString());
      return true;
    } else {
      console.log('  ❌ 测试失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('  ❌ 测试失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testUpdateApiKey(apiKey) {
  console.log(`\n✏️ 测试更新API Key: ${apiKey}`);
  try {
    const updates = {
      alias: '测试平台-已更新',
      description: '这是一个已更新的测试API Key'
    };
    
    const response = await axios.put(`${BASE_URL}/api/keys/update/${apiKey}`, updates);
    
    if (response.data.code === 200) {
      console.log('  ✅ 更新成功:', response.data.message);
      console.log('     新别名:', response.data.data.alias);
      return true;
    } else {
      console.log('  ❌ 更新失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('  ❌ 更新失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testDeleteApiKey(apiKey) {
  console.log(`\n🗑️ 测试删除API Key: ${apiKey}`);
  try {
    const response = await axios.delete(`${BASE_URL}/api/keys/delete/${apiKey}`);
    
    if (response.data.code === 200) {
      console.log('  ✅ 删除成功:', response.data.message);
      return true;
    } else {
      console.log('  ❌ 删除失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('  ❌ 删除失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetStats() {
  console.log('\n📊 测试获取统计信息');
  try {
    const response = await axios.get(`${BASE_URL}/api/keys/stats`);
    
    if (response.data.code === 200) {
      const data = response.data.data;
      console.log('  ✅ 获取成功');
      console.log('     总Keys:', data.totalKeys);
      console.log('     文件Keys:', data.fileKeys);
      console.log('     环境Keys:', data.envKeys);
      console.log('     最后更新:', data.lastUpdated);
      console.log('     版本:', data.version);
      console.log('     配置文件路径:', data.configFilePath);
      return true;
    } else {
      console.log('  ❌ 获取失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('  ❌ 获取失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runFullTest() {
  console.log('🚀 开始API Key管理功能完整测试\n');
  console.log('=' .repeat(50));
  
  let successCount = 0;
  let totalTests = 0;
  
  // 1. 测试添加
  totalTests++;
  if (await testAddApiKey()) {
    successCount++;
    
    // 2. 测试列表
    totalTests++;
    if (await testListApiKeys()) {
      successCount++;
    }
    
    // 3. 测试详情
    totalTests++;
    if (await testApiKeyDetail(TEST_API_KEY.apiKey)) {
      successCount++;
    }
    
    // 4. 测试验证
    totalTests++;
    if (await testApiKeyTest(TEST_API_KEY.apiKey)) {
      successCount++;
    }
    
    // 5. 测试更新
    totalTests++;
    if (await testUpdateApiKey(TEST_API_KEY.apiKey)) {
      successCount++;
    }
    
    // 6. 再次测试列表（验证更新）
    totalTests++;
    if (await testListApiKeys()) {
      successCount++;
    }
    
    // 7. 测试删除
    totalTests++;
    if (await testDeleteApiKey(TEST_API_KEY.apiKey)) {
      successCount++;
    }
  }
  
  // 8. 测试统计信息
  totalTests++;
  if (await testGetStats()) {
    successCount++;
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 测试结果汇总');
  console.log(`   成功: ${successCount}/${totalTests}`);
  console.log(`   成功率: ${((successCount / totalTests) * 100).toFixed(1)}%`);
  
  if (successCount === totalTests) {
    console.log('🎉 所有测试通过！API Key管理功能正常工作。');
  } else {
    console.log('⚠️  部分测试失败，请检查服务器状态和配置。');
  }
}

// 运行测试
if (require.main === module) {
  runFullTest().catch(error => {
    console.error('测试执行出错:', error);
    process.exit(1);
  });
}

module.exports = {
  testAddApiKey,
  testListApiKeys,
  testApiKeyDetail,
  testApiKeyTest,
  testUpdateApiKey,
  testDeleteApiKey,
  testGetStats,
  runFullTest
};
