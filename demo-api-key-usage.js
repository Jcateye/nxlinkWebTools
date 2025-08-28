#!/usr/bin/env node

/**
 * API Key 管理功能演示脚本
 * 展示如何使用新的API Key动态管理功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8001';

// 演示用的API Key配置
const DEMO_API_KEYS = [
  {
    apiKey: 'ecommerce-platform-2025',
    alias: '电商平台',
    description: '电商公司的营销外呼系统，用于订单确认和促销活动',
    openapi: {
      accessKey: 'AK-ECOMMERCE-123456',
      accessSecret: 'SECRET-ECOMMERCE-ABCDEF',
      bizType: '8',
      baseUrl: 'https://api-westus.nxlink.ai'
    }
  },
  {
    apiKey: 'finance-platform-2025',
    alias: '金融平台',
    description: '金融公司的客户服务系统，用于贷款提醒和理财推广',
    openapi: {
      accessKey: 'AK-FINANCE-789012',
      accessSecret: 'SECRET-FINANCE-GHIJKL',
      bizType: '8',
      baseUrl: 'https://api-westus.nxlink.ai'
    }
  },
  {
    apiKey: 'education-platform-2025',
    alias: '教育平台',
    description: '在线教育公司的学员服务系统，用于课程提醒和续费通知',
    openapi: {
      accessKey: 'AK-EDUCATION-345678',
      accessSecret: 'SECRET-EDUCATION-MNOPQR',
      bizType: '8',
      baseUrl: 'https://api-westus.nxlink.ai'
    }
  }
];

async function addDemoApiKey(apiKeyConfig) {
  try {
    console.log(`\n📝 添加 ${apiKeyConfig.alias}...`);
    const response = await axios.post(`${BASE_URL}/api/keys/add`, apiKeyConfig);
    
    if (response.data.code === 200) {
      console.log(`  ✅ 添加成功: ${apiKeyConfig.alias}`);
      return true;
    } else {
      console.log(`  ❌ 添加失败: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    if (error.response?.data?.message?.includes('已存在')) {
      console.log(`  ℹ️  已存在: ${apiKeyConfig.alias}`);
      return true;
    }
    console.log(`  ❌ 添加失败: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function demonstrateApiKeyUsage(apiKey, alias) {
  console.log(`\n🧪 演示 ${alias} 的使用`);
  
  try {
    // 1. 测试API Key状态
    console.log('  1️⃣ 测试API Key状态...');
    const statusResponse = await axios.post(`${BASE_URL}/api/keys/test`, { apiKey });
    if (statusResponse.data.code === 200) {
      console.log(`    ✅ 状态检查通过: ${statusResponse.data.data.testResult.message}`);
    }

    // 2. 模拟使用API Key调用外部接口
    console.log('  2️⃣ 模拟外部平台调用...');
    
    // 模拟追加号码的请求
    const appendResponse = await axios.post(`${BASE_URL}/api/openapi/append-numbers`, {
      taskId: `demo-task-${Date.now()}`,
      phoneNumbers: [
        {
          phoneNumber: '13800000001',
          params: [
            { name: '客户姓名', value: '张三' },
            { name: '平台标识', value: alias }
          ]
        },
        {
          phoneNumber: '13800000002', 
          params: [
            { name: '客户姓名', value: '李四' },
            { name: '平台标识', value: alias }
          ]
        }
      ],
      autoFlowId: 12345,
      countryCode: '86'
    }, {
      headers: {
        'x-api-key': apiKey
      }
    });
    
    if (appendResponse.data.code === 200) {
      const data = appendResponse.data.data;
      console.log(`    ✅ 追加号码成功: 成功${data.successCount}个, 失败${data.failCount}个`);
    }

  } catch (error) {
    console.log(`    ❌ 演示失败: ${error.response?.data?.message || error.message}`);
  }
}

async function showApiKeyStatistics() {
  console.log('\n📊 显示API Key统计信息');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/keys/list`);
    
    if (response.data.code === 200) {
      const data = response.data.data;
      
      console.log('\n' + '='.repeat(60));
      console.log('📈 API Key 管理统计报告');
      console.log('='.repeat(60));
      
      console.log(`📋 总体统计:`);
      console.log(`   • 总API Key数量: ${data.totalKeys}`);
      console.log(`   • 配置文件中: ${data.stats?.fileKeys || 0}`);
      console.log(`   • 环境变量中: ${data.stats?.envKeys || 0}`);
      console.log(`   • 最后更新: ${data.stats?.lastUpdated ? new Date(data.stats.lastUpdated).toLocaleString() : 'N/A'}`);
      
      console.log(`\n🔑 API Key 详细列表:`);
      data.keys.forEach((key, index) => {
        const statusIcon = key.hasOpenApiConfig ? '🟢' : '🔴';
        console.log(`   ${index + 1}. ${statusIcon} ${key.alias}`);
        console.log(`      • API Key: ${key.apiKey}`);
        console.log(`      • 描述: ${key.description}`);
        console.log(`      • 配置状态: ${key.hasOpenApiConfig ? '已配置' : '未配置'}`);
        console.log(`      • 服务地址: ${key.openApiBaseUrl}`);
        console.log(`      • 业务类型: ${key.bizType}`);
        console.log('');
      });
      
    } else {
      console.log('❌ 获取统计信息失败:', response.data.message);
    }
  } catch (error) {
    console.log('❌ 获取统计信息失败:', error.message);
  }
}

async function runDemo() {
  console.log('🎯 API Key 动态管理功能演示');
  console.log('================================');
  console.log('本演示将展示如何动态添加和使用API Key配置');
  
  // 第一步：添加演示API Keys
  console.log('\n🚀 第一步：添加演示API Key配置');
  let successCount = 0;
  
  for (const apiKeyConfig of DEMO_API_KEYS) {
    if (await addDemoApiKey(apiKeyConfig)) {
      successCount++;
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // 延迟500ms
  }
  
  console.log(`\n✨ 添加完成，成功添加 ${successCount}/${DEMO_API_KEYS.length} 个API Key配置`);
  
  // 第二步：显示统计信息
  console.log('\n🚀 第二步：查看API Key配置统计');
  await showApiKeyStatistics();
  
  // 第三步：演示各平台使用
  console.log('\n🚀 第三步：演示各平台API Key使用');
  
  for (const config of DEMO_API_KEYS) {
    await demonstrateApiKeyUsage(config.apiKey, config.alias);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 延迟1秒
  }
  
  // 第四步：演示配置修改
  console.log('\n🚀 第四步：演示配置修改功能');
  const firstConfig = DEMO_API_KEYS[0];
  
  try {
    console.log(`\n✏️ 修改 ${firstConfig.alias} 的配置...`);
    const updateResponse = await axios.put(`${BASE_URL}/api/keys/update/${firstConfig.apiKey}`, {
      description: firstConfig.description + ' (已更新 ' + new Date().toLocaleString() + ')'
    });
    
    if (updateResponse.data.code === 200) {
      console.log(`  ✅ 更新成功: ${firstConfig.alias}`);
    }
  } catch (error) {
    console.log(`  ❌ 更新失败: ${error.response?.data?.message || error.message}`);
  }
  
  // 最终统计
  await showApiKeyStatistics();
  
  console.log('\n🎉 演示完成！');
  console.log('\n💡 您可以：');
  console.log('   1. 访问前端管理界面: http://localhost:4000');
  console.log('   2. 导航到: OpenAPI平台 → API Key管理');
  console.log('   3. 查看、编辑、删除刚才添加的API Key配置');
  console.log('   4. 运行测试脚本: node test-api-key-management.js');
  
  console.log('\n🔧 清理演示数据：');
  console.log('   如果需要删除演示数据，可以在管理界面中手动删除，');
  console.log('   或者运行以下命令：');
  
  DEMO_API_KEYS.forEach(config => {
    console.log(`   curl -X DELETE ${BASE_URL}/api/keys/delete/${config.apiKey}`);
  });
}

// 运行演示
if (require.main === module) {
  runDemo().catch(error => {
    console.error('演示执行出错:', error);
    process.exit(1);
  });
}
