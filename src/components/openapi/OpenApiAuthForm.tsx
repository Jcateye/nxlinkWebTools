import { useEffect, useState } from 'react';
import { Form, Input, Button, Space, message, Tooltip } from 'antd';
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
      // 用户有保存的配置，直接使用
      form.setFieldsValue(cfg);
      setIsConfigured(true);
    } else {
      // 如果没有保存的配置，检查是否有环境变量配置
      const defaultConfig = OPENAPI_CONFIG.defaultAuth;
      if (defaultConfig.accessKey && defaultConfig.accessSecret) {
        // 有环境变量配置，但不在前端显示真实值
        // 只设置 bizType，其他字段留空让用户填写
        form.setFieldsValue({
          bizType: defaultConfig.bizType
        });
        // 不自动保存，等用户填写完整信息后再保存
        setIsConfigured(false);
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

  // 检查后台配置状态
  const hasBackendConfig = OPENAPI_CONFIG.defaultAuth.accessKey && OPENAPI_CONFIG.defaultAuth.accessSecret;

  return (
    <div style={{ marginBottom: 16, padding: 16, backgroundColor: isConfigured ? '#f6ffed' : '#fff2e8', border: `1px solid ${isConfigured ? '#b7eb8f' : '#ffbb96'}`, borderRadius: 6 }}>
      <div style={{ marginBottom: 8, color: isConfigured ? '#52c41a' : '#fa8c16', fontWeight: 'bold' }}>
        {isConfigured ? '✅ OpenAPI 鉴权已配置' : '⚠️ 请配置 OpenAPI 鉴权信息'}
      </div>
      {!isConfigured && hasBackendConfig && (
        <div style={{ marginBottom: 12, fontSize: '12px', color: '#666', backgroundColor: '#f0f0f0', padding: '8px', borderRadius: '4px' }}>
          💡 提示：后台已配置默认值，但为了安全起见，需要您在前端重新填写 accessKey 和 accessSecret
        </div>
      )}
      <Form form={form} layout="inline" onFinish={onFinish}>
        <Form.Item label="accessKey" name="accessKey" rules={[{ required: true, message: '请输入 accessKey' }]}>
          <Input 
            placeholder="请输入 accessKey" 
            style={{ width: 260 }}
            addonAfter={
              <Tooltip title={hasBackendConfig ? "后台已配置，前端需要重新填写" : "后台未配置"}>
                <span style={{ fontSize: '12px', color: hasBackendConfig ? '#52c41a' : '#999' }}>
                  {hasBackendConfig ? '✅ 后台已配置' : '❌ 后台未配置'}
                </span>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item label="accessSecret" name="accessSecret" rules={[{ required: true, message: '请输入 accessSecret' }]}>
          <Input.Password 
            placeholder="请输入 accessSecret" 
            style={{ width: 300 }}
            addonAfter={
              <Tooltip title={hasBackendConfig ? "后台已配置，前端需要重新填写" : "后台未配置"}>
                <span style={{ fontSize: '12px', color: hasBackendConfig ? '#52c41a' : '#999' }}>
                  {hasBackendConfig ? '✅ 后台已配置' : '❌ 后台未配置'}
                </span>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item label="bizType" name="bizType" rules={[{ required: true, message: '请输入业务类型' }]} initialValue={'8'}>
          <Input 
            placeholder="业务类型，例如 8" 
            style={{ width: 120 }}
            addonAfter={
              <Tooltip title={hasBackendConfig ? "后台已配置，前端需要重新填写" : "后台未配置"}>
                <span style={{ fontSize: '12px', color: hasBackendConfig ? '#52c41a' : '#999' }}>
                  {hasBackendConfig ? '✅ 后台已配置' : '❌ 后台未配置'}
                </span>
              </Tooltip>
            }
          />
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


