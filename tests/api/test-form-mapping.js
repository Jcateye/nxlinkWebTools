#!/usr/bin/env node

/**
 * 表单映射配置测试脚本
 */

const http = require('http');

// 测试函数
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8400,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonResponse
          });
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}\n原始响应: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`请求失败: ${error.message}`));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testFormMapping() {
  console.log('🚀 开始测试表单映射配置接口...\n');

  try {
    // 1. 获取当前表单映射配置
    console.log('📋 1. 获取表单映射配置');
    const mappingResponse = await makeRequest('/api/webhook/form-mapping');
    console.log(`状态码: ${mappingResponse.statusCode}`);
    console.log('配置内容:');
    console.log(JSON.stringify(mappingResponse.data, null, 2));

    if (mappingResponse.data.code !== 200) {
      console.log('\n❌ 获取配置失败');
      return;
    }

    // 2. 测试表单数据推送
    console.log('\n📝 2. 测试表单数据推送');
    const testData = {
      "form": "E0Tqhk",
      "form_name": "华为全连接大会 | NXAI AI互动体验信息登记",
      "entry": {
        "serial_number": Math.floor(Math.random() * 10000),
        "field_2": "测试用户",
        "field_5": "13800138000",
        "field_3": "测试数据",
        "field_4": "测试描述",
        "field_6": "test@example.com",
        "creator_name": "测试员",
        "created_at": new Date().toISOString(),
        "info_region": {
          "province": "北京市",
          "city": "北京市"
        }
      }
    };

    const submitResponse = await makeRequest('/api/webhook/form-submission', 'POST', testData);
    console.log(`状态码: ${submitResponse.statusCode}`);
    console.log('处理结果:');
    console.log(JSON.stringify(submitResponse.data, null, 2));

    if (submitResponse.data.code === 200) {
      console.log('\n🎉 表单数据推送测试成功!');
    } else {
      console.log('\n❌ 表单数据推送测试失败:', submitResponse.data.message);
    }

    // 3. 测试添加新表单映射（可选）
    console.log('\n🔧 3. 测试添加新表单映射');
    const newMapping = {
      formId: `TEST_${Date.now()}`,
      taskId: 'test-task-id-123',
      formName: '测试表单',
      description: '用于测试的表单映射'
    };

    const updateResponse = await makeRequest('/api/webhook/update-mapping', 'POST', newMapping);
    console.log(`状态码: ${updateResponse.statusCode}`);
    console.log('更新结果:');
    console.log(JSON.stringify(updateResponse.data, null, 2));

    if (updateResponse.data.code === 200) {
      console.log('\n✅ 表单映射更新成功!');

      // 重新获取配置验证
      console.log('\n📋 验证更新后的配置');
      const updatedMapping = await makeRequest('/api/webhook/form-mapping');
      console.log('更新后的配置:');
      console.log(JSON.stringify(updatedMapping.data, null, 2));
    }

  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:');
    console.error(error.message);

    console.log('\n🔍 故障排除提示:');
    console.log('1. 确保后端服务正在运行 (端口8400)');
    console.log('2. 检查 config/form-mapping.config.ts 配置是否正确');
    console.log('3. 确认 taskID 是否有效');
    console.log('4. 查看后端日志获取详细信息');
  }
}

// 运行测试
testFormMapping();
