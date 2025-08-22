import React, { useState, useEffect } from 'react';
import { Button, message, Card, Typography, Space } from 'antd';
import { KeyOutlined } from '@ant-design/icons';
import AuthModal from './AuthModal';

const { Text } = Typography;
const TOKEN_STORAGE_KEY = 'nxlink_client_token';

const TokenManager: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [authModalVisible, setAuthModalVisible] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  return (
    <div>
      <Card title="NXLink客户端通用Token" bordered={false}>
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              设置用于NXLink客户端所有功能的通用身份认证Token
            </Text>
            
            {/* Token状态显示 */}
            <div style={{ 
              padding: 12, 
              border: `1px solid ${token ? '#b7eb8f' : '#ffccc7'}`,
              borderRadius: 6,
              background: token ? '#f6ffed' : '#fff2f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  <span style={{ color: token ? '#52c41a' : '#ff4d4f' }}>
                    {token ? '✓' : '✗'} {token ? 'Token已设置' : '未设置Token'}
                  </span>
                  {token && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {token.substring(0, 15)}...{token.substring(token.length - 8)}
                    </Text>
                  )}
                </Space>
                <Button
                  type="primary"
                  icon={<KeyOutlined />}
                  onClick={() => setAuthModalVisible(true)}
                  size="small"
                >
                  {token ? '重新设置' : '设置授权'}
                </Button>
              </div>
            </div>
          </Space>
        </div>

        <AuthModal
          visible={authModalVisible}
          onCancel={() => setAuthModalVisible(false)}
          onSuccess={(newToken) => {
            localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
            setToken(newToken);
            setAuthModalVisible(false);
            message.success('Token设置成功！');
            
            // 强制刷新页面以使新Token在所有API实例中生效
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }}
          title="NXLink客户端身份认证"
          description="设置用于NXLink客户端所有功能的通用身份认证Token"
          currentToken={token}
        />
      </Card>
    </div>
  );
};

export default TokenManager; 