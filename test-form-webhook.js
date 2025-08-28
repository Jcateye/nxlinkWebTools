#!/usr/bin/env node

/**
 * 表单Webhook接口测试脚本
 */

const http = require('http');

// 测试数据 - 模拟金数据推送格式
const testData = {
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
};

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

console.log('🚀 开始测试表单Webhook接口...');
console.log('📡 发送数据到:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('📝 测试数据:', JSON.stringify(testData, null, 2));

const req = http.request(options, (res) => {
  console.log(`\n📊 响应状态码: ${res.statusCode}`);
  console.log(`📋 响应头:`, res.headers);

  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const jsonResponse = JSON.parse(responseData);
      console.log('\n✅ 响应内容:');
      console.log(JSON.stringify(jsonResponse, null, 2));

      if (jsonResponse.code === 200) {
        console.log('\n🎉 测试成功! 表单数据已成功处理并追加号码');
      } else {
        console.log('\n❌ 测试失败:', jsonResponse.message);
      }
    } catch (error) {
      console.log('\n❌ 解析响应失败:', error.message);
      console.log('📄 原始响应:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ 请求失败:', error.message);
  console.log('\n🔍 请确保:');
  console.log('1. 后端服务正在运行 (端口8400)');
  console.log('2. 表单映射配置正确');
  console.log('3. taskID已正确配置');
});

req.write(JSON.stringify(testData));
req.end();

console.log('\n⏳ 发送请求中...');

// 添加超时处理
setTimeout(() => {
  console.log('\n⏰ 请求超时，请检查后端服务是否正常运行');
  process.exit(1);
}, 10000);
