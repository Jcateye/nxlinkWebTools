import { useEffect, useState } from 'react';
import { Form, Input, Button, Space, message } from 'antd';
import { loadOpenApiAuth, saveOpenApiAuth, OpenApiAuthConfig } from '../../services/openApiService';
import { OPENAPI_CONFIG } from '../../config/apiConfig';

interface Props {
  onSaved?: (cfg: OpenApiAuthConfig) => void;
}

export default function OpenApiAuthForm({ onSaved }: Props) {
  const [form] = Form.useForm<OpenApiAuthConfig>();
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const cfg = loadOpenApiAuth();
    if (cfg) {
      form.setFieldsValue(cfg);
      setIsConfigured(true);
    } else {
      // 如果没有保存的配置，使用默认配置
      const defaultConfig = OPENAPI_CONFIG.defaultAuth;
      if (defaultConfig.accessKey && defaultConfig.accessSecret) {
        form.setFieldsValue(defaultConfig);
        // 自动保存默认配置
        saveOpenApiAuth(defaultConfig);
        setIsConfigured(true);
        onSaved?.(defaultConfig);
      }
    }
  }, [form, onSaved]);

  const onFinish = (values: OpenApiAuthConfig) => {
    try {
      saveOpenApiAuth(values);
      setIsConfigured(true);
      message.success('鉴权配置保存成功');
      onSaved?.(values);
    } catch (error) {
      message.error('保存失败，请重试');
    }
  };

  const handleReset = () => {
    form.resetFields();
    setIsConfigured(false);
    localStorage.removeItem('nxlink_openapi_auth');
    message.info('鉴权配置已清除');
  };

  return (
    <div style={{ marginBottom: 16, padding: 16, backgroundColor: isConfigured ? '#f6ffed' : '#fff2e8', border: `1px solid ${isConfigured ? '#b7eb8f' : '#ffbb96'}`, borderRadius: 6 }}>
      <div style={{ marginBottom: 8, color: isConfigured ? '#52c41a' : '#fa8c16', fontWeight: 'bold' }}>
        {isConfigured ? '✅ OpenAPI 鉴权已配置' : '⚠️ 请配置 OpenAPI 鉴权信息'}
      </div>
      <Form form={form} layout="inline" onFinish={onFinish}>
        <Form.Item label="accessKey" name="accessKey" rules={[{ required: true, message: '请输入 accessKey' }]}>
          <Input placeholder="请输入 accessKey" style={{ width: 260 }} />
        </Form.Item>
        <Form.Item label="accessSecret" name="accessSecret" rules={[{ required: true, message: '请输入 accessSecret' }]}>
          <Input.Password placeholder="请输入 accessSecret" style={{ width: 300 }} />
        </Form.Item>
        <Form.Item label="bizType" name="bizType" rules={[{ required: true, message: '请输入业务类型' }]} initialValue={'8'}>
          <Input placeholder="业务类型，例如 8" style={{ width: 120 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              {isConfigured ? '更新鉴权' : '保存鉴权'}
            </Button>
            <Button onClick={handleReset} disabled={!isConfigured}>
              清除配置
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}


