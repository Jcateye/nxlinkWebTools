#!/usr/bin/env node

/**
 * 测试API Key删除功能和环境变量处理
 */

const BASE_URL = 'http://localhost:8400';

async function testApiKeyManagement() {
  console.log('🧪 API Key删除功能测试\n');

  try {
    // 1. 获取API Key列表
    console.log('1️⃣ 获取API Key列表:');
    const listResponse = await fetch(`${BASE_URL}/internal-api/keys/list`);
    const listResult = await listResponse.json();
    
    if (listResult.code === 200) {
      console.log(`   总数: ${listResult.data.totalKeys}`);
      listResult.data.keys.forEach((key, index) => {
        const source = key.isFromEnv ? '环境变量' : '配置文件';
        const deletable = key.isFromEnv ? '❌ 不可删除' : '✅ 可删除';
        console.log(`   ${index + 1}. ${key.alias} (${key.apiKey.substring(0, 8)}***) - ${source} ${deletable}`);
      });
    }

    console.log('\n2️⃣ 测试删除环境变量API Key:');
    // 2. 尝试删除环境变量API Key (demo-api-key-2)
    const deleteEnvResponse = await fetch(`${BASE_URL}/internal-api/keys/delete/demo-api-key-2`, {
      method: 'DELETE'
    });
    const deleteEnvResult = await deleteEnvResponse.json();
    console.log(`   结果: ${deleteEnvResult.message}`);
    console.log(`   状态码: ${deleteEnvResult.code} ${deleteEnvResult.code === 500 ? '✅ 正确拒绝' : '❌ 应该拒绝'}`);

    console.log('\n3️⃣ 测试删除不存在的API Key:');
    // 3. 尝试删除不存在的API Key
    const deleteNonExistentResponse = await fetch(`${BASE_URL}/internal-api/keys/delete/nonexistent-key`, {
      method: 'DELETE'
    });
    const deleteNonExistentResult = await deleteNonExistentResponse.json();
    console.log(`   结果: ${deleteNonExistentResult.message}`);
    console.log(`   状态码: ${deleteNonExistentResult.code} ${deleteNonExistentResult.code === 500 ? '✅ 正确拒绝' : '❌ 应该拒绝'}`);

    console.log('\n4️⃣ 创建临时API Key进行删除测试:');
    // 4. 创建一个临时API Key用于测试删除
    const tempApiKey = {
      apiKey: 'temp-test-key-' + Date.now(),
      alias: '临时测试Key',
      description: '用于测试删除功能',
      openapi: {
        accessKey: 'test-access-key',
        accessSecret: 'test-access-secret',
        bizType: '8',
        baseUrl: 'https://api-westus.nxlink.ai'
      }
    };

    const addResponse = await fetch(`${BASE_URL}/internal-api/keys/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tempApiKey)
    });
    const addResult = await addResponse.json();
    
    if (addResult.code === 200) {
      console.log(`   ✅ 临时API Key创建成功: ${tempApiKey.alias}`);
      
      console.log('\n5️⃣ 删除临时API Key:');
      // 5. 删除刚创建的临时API Key
      const deleteTempResponse = await fetch(`${BASE_URL}/internal-api/keys/delete/${tempApiKey.apiKey}`, {
        method: 'DELETE'
      });
      const deleteTempResult = await deleteTempResponse.json();
      console.log(`   结果: ${deleteTempResult.message}`);
      console.log(`   状态码: ${deleteTempResult.code} ${deleteTempResult.code === 200 ? '✅ 删除成功' : '❌ 删除失败'}`);
    } else {
      console.log(`   ❌ 临时API Key创建失败: ${addResult.message}`);
    }

    console.log('\n6️⃣ 验证最终列表:');
    // 6. 最终验证列表
    const finalListResponse = await fetch(`${BASE_URL}/internal-api/keys/list`);
    const finalListResult = await finalListResponse.json();
    
    if (finalListResult.code === 200) {
      console.log(`   最终总数: ${finalListResult.data.totalKeys}`);
      finalListResult.data.keys.forEach((key, index) => {
        const source = key.isFromEnv ? '环境变量' : '配置文件';
        console.log(`   ${index + 1}. ${key.alias} (${key.apiKey.substring(0, 8)}***) - ${source}`);
      });
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  console.log('\n🎯 测试完成！');
}

// 运行测试
testApiKeyManagement();
