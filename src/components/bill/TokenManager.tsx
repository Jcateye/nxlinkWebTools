import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Space, Typography, message, Tooltip } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone, EditOutlined, SaveOutlined, CopyOutlined } from '@ant-design/icons';
import { getBillUserParams, setBillUserParams, hasValidBillToken } from '../../services/billApi';

const { Text, Title } = Typography;

interface TokenManagerProps {
  onTokenChange?: (hasToken: boolean) => void;
}

const TokenManager: React.FC<TokenManagerProps> = ({ onTokenChange }) => {
  const [currentToken, setCurrentToken] = useState<string>('');
  const [editingToken, setEditingToken] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [hasToken, setHasToken] = useState<boolean>(false);

  // 加载当前令牌
  const loadCurrentToken = () => {
    const userParams = getBillUserParams();
    const token = userParams?.authorization || '';
    setCurrentToken(token);
    setEditingToken(token);
    const tokenExists = hasValidBillToken();
    setHasToken(tokenExists);
    onTokenChange?.(tokenExists);
  };

  useEffect(() => {
    loadCurrentToken();
  }, []);

  // 开始编辑
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingToken(currentToken);
    setIsEditing(false);
  };

  // 保存令牌
  const handleSaveToken = () => {
    if (!editingToken.trim()) {
      message.error('API令牌不能为空');
      return;
    }

    try {
      setBillUserParams({ authorization: editingToken.trim() });
      setCurrentToken(editingToken.trim());
      setIsEditing(false);
      const tokenExists = hasValidBillToken();
      setHasToken(tokenExists);
      onTokenChange?.(tokenExists);
      message.success('API令牌已保存');
    } catch (error) {
      console.error('保存API令牌失败:', error);
      message.error('保存API令牌失败');
    }
  };

  // 复制令牌
  const handleCopyToken = async () => {
    if (!currentToken) {
      message.warning('没有可复制的令牌');
      return;
    }

    try {
      await navigator.clipboard.writeText(currentToken);
      message.success('API令牌已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      message.error('复制失败，请手动复制');
    }
  };

  // 格式化显示令牌（显示前6位和后6位，中间用*替代）
  const formatTokenForDisplay = (token: string): string => {
    if (!token) return '';
    if (token.length <= 12) return token;
    return `${token.substring(0, 6)}${'*'.repeat(Math.max(6, token.length - 12))}${token.substring(token.length - 6)}`;
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>
            API令牌管理
          </Title>
          {hasToken && (
            <Text type="success" style={{ fontSize: '12px' }}>
              ✓ 令牌有效
            </Text>
          )}
          {!hasToken && (
            <Text type="danger" style={{ fontSize: '12px' }}>
              ✗ 需要设置令牌
            </Text>
          )}
        </Space>
      }
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: '12px 16px' }}
    >
      {!isEditing ? (
        <Space style={{ width: '100%' }} direction="vertical" size="small">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong>当前令牌：</Text>
            {currentToken ? (
              <>
                <Input.Password
                  value={currentToken}
                  readOnly
                  size="small"
                  style={{ flex: 1, maxWidth: 300 }}
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                  placeholder="未设置API令牌"
                />
                <Tooltip title="复制令牌">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CopyOutlined />} 
                    onClick={handleCopyToken}
                  />
                </Tooltip>
              </>
            ) : (
              <Text type="secondary">未设置</Text>
            )}
            <Button 
              type="primary" 
              size="small" 
              icon={<EditOutlined />} 
              onClick={handleStartEdit}
            >
              {currentToken ? '编辑' : '设置'}
            </Button>
          </div>
          {currentToken && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              显示格式：{formatTokenForDisplay(currentToken)}
            </Text>
          )}
        </Space>
      ) : (
        <Space style={{ width: '100%' }} direction="vertical" size="small">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong>编辑令牌：</Text>
            <Input.Password
              value={editingToken}
              onChange={(e) => setEditingToken(e.target.value)}
              placeholder="请输入API令牌"
              size="small"
              style={{ flex: 1, maxWidth: 300 }}
              onPressEnter={handleSaveToken}
            />
            <Button 
              type="primary" 
              size="small" 
              icon={<SaveOutlined />} 
              onClick={handleSaveToken}
            >
              保存
            </Button>
            <Button 
              size="small" 
              onClick={handleCancelEdit}
            >
              取消
            </Button>
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            提示：API令牌与标签迁移工具共享，修改后两个功能都会使用新令牌
          </Text>
        </Space>
      )}
    </Card>
  );
};

export default TokenManager; 