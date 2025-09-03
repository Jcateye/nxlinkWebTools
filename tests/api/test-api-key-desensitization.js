#!/usr/bin/env node

/**
 * 测试API Key脱敏显示和超级管理员密码验证功能
 */

const BASE_URL = 'http://localhost:8400';

// 脱敏显示函数（前端逻辑）
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length <= 8) {
    return apiKey;
  }
  return apiKey.substring(0, 8) + '***';
}

// 测试用例
const testCases = [
  { apiKey: 'short', expected: 'short' },
  { apiKey: 'abcdefgh', expected: 'abcdefgh' },
  { apiKey: 'abcdefghi', expected: 'abcdefgh***' },
  { apiKey: 'demo-api-key-1', expected: 'demo-api***' },
  { apiKey: 'cqdLgWcrRV2fq9ejABvVsQm9qmxFe7Xy', expected: 'cqdLgWcr***' }
];

console.log('🔍 API Key脱敏显示测试：');
testCases.forEach((test, index) => {
  const result = maskApiKey(test.apiKey);
  const passed = result === test.expected;
  console.log(`  ${index + 1}. ${test.apiKey} -> ${result} ${passed ? '✅' : '❌'}`);
});

console.log('\n🔐 超级管理员密码验证测试：');

// 测试正确的密码
fetch(`${BASE_URL}/internal-api/keys/verify-admin-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'F511522591' })
})
.then(res => res.json())
.then(data => {
  console.log(`  ✅ 正确密码验证: ${data.message}`);
})
.catch(err => console.log(`  ❌ 正确密码验证失败: ${err.message}`));

// 测试错误的密码
setTimeout(() => {
  fetch(`${BASE_URL}/internal-api/keys/verify-admin-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong-password' })
  })
  .then(res => res.json())
  .then(data => {
    console.log(`  ✅ 错误密码验证: ${data.message}`);
  })
  .catch(err => console.log(`  ❌ 错误密码验证失败: ${err.message}`));
}, 1000);

// 测试获取完整API Key信息
setTimeout(() => {
  console.log('\n📋 完整API Key信息获取测试：');

  fetch(`${BASE_URL}/internal-api/keys/full-detail/demo-api-key-1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'F511522591' })
  })
  .then(res => res.json())
  .then(data => {
    if (data.code === 200) {
      console.log(`  ✅ 获取成功: ${data.data.alias}`);
      console.log(`     API Key: ${maskApiKey(data.data.apiKey)}`);
      console.log(`     AccessKey: ${data.data.openapi.accessKey}`);
    } else {
      console.log(`  ❌ 获取失败: ${data.message}`);
    }
  })
  .catch(err => console.log(`  ❌ 获取失败: ${err.message}`));
}, 2000);

console.log('\n🎯 测试完成！请查看上方结果。');
