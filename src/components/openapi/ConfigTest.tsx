import React from 'react';
import { Card, Descriptions, Tag, Button, Space } from 'antd';
import { OPENAPI_CONFIG } from '../../config/apiConfig';

/**
 * 配置测试组件
 * 用于验证配置读取逻辑和显示配置状态
 */
export default function ConfigTest() {
  const config = OPENAPI_CONFIG.defaultAuth;
  
  // 检查配置状态
  const hasAccessKey = !!config.accessKey;
  const hasAccessSecret = !!config.accessSecret;
  const hasBizType = !!config.bizType;
  const isFullyConfigured = hasAccessKey && hasAccessSecret && hasBizType;
  
  // 显示配置值（敏感信息用星号代替）
  const displayAccessKey = hasAccessKey ? '*****' : '未配置';
  const displayAccessSecret = hasAccessSecret ? '*****' : '未配置';
  const displayBizType = config.bizType || '未配置';
  
  return (
    <Card title="OpenAPI 配置测试" style={{ marginBottom: 16 }}>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="配置状态">
          <Tag color={isFullyConfigured ? 'success' : 'warning'}>
            {isFullyConfigured ? '完整配置' : '部分配置'}
          </Tag>
        </Descriptions.Item>
        
        <Descriptions.Item label="accessKey">
          <Space>
            <span>{displayAccessKey}</span>
            <Tag color={hasAccessKey ? 'success' : 'error'}>
              {hasAccessKey ? '已配置' : '未配置'}
            </Tag>
          </Space>
        </Descriptions.Item>
        
        <Descriptions.Item label="accessSecret">
          <Space>
            <span>{displayAccessSecret}</span>
            <Tag color={hasAccessSecret ? 'success' : 'error'}>
              {hasAccessSecret ? '已配置' : '未配置'}
            </Tag>
          </Space>
        </Descriptions.Item>
        
        <Descriptions.Item label="bizType">
          <Space>
            <span>{displayBizType}</span>
            <Tag color={hasBizType ? 'success' : 'error'}>
              {hasBizType ? '已配置' : '未配置'}
            </Tag>
          </Space>
        </Descriptions.Item>
        
        <Descriptions.Item label="环境变量来源">
          <Space direction="vertical" size="small">
            <div>
              <code>VITE_OPENAPI_ACCESS_KEY</code>: {hasAccessKey ? '✅ 已设置' : '❌ 未设置'}
            </div>
            <div>
              <code>VITE_OPENAPI_ACCESS_SECRET</code>: {hasAccessSecret ? '✅ 已设置' : '❌ 未设置'}
            </div>
            <div>
              <code>VITE_OPENAPI_BIZ_TYPE</code>: {hasBizType ? '✅ 已设置' : '❌ 未设置'}
            </div>
          </Space>
        </Descriptions.Item>
      </Descriptions>
      
      <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f6ffed', borderRadius: 6 }}>
        <h4>配置说明：</h4>
        <ul>
          <li>✅ <strong>已配置</strong>：后台环境变量已设置，但前端不显示真实值</li>
          <li>❌ <strong>未配置</strong>：后台环境变量未设置，需要手动配置</li>
          <li>🔒 <strong>安全保护</strong>：敏感信息（accessKey/accessSecret）用 ***** 代替</li>
          <li>💡 <strong>使用方式</strong>：即使后台已配置，前端仍需要重新填写才能使用</li>
        </ul>
      </div>
    </Card>
  );
}
