import React from 'react';
import { Button, Card, Typography, Space, Tooltip, Modal } from 'antd';
import { SyncOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useUserContext } from '../context/UserContext';

const { Text, Paragraph } = Typography;

const SessionManager: React.FC = () => {
  const { sessionId } = useUserContext();

  // 重置会话，创建新的会话ID
  const resetSession = () => {
    Modal.confirm({
      title: '确定要重置会话吗？',
      content: '重置会话将清除当前浏览器中保存的所有参数，并创建一个新的会话ID。您需要重新输入所有参数。',
      onOk: () => {
        localStorage.removeItem('sessionId');
        localStorage.removeItem(`userParams_${sessionId}`);
        window.location.reload(); // 重新加载页面以获取新会话
      },
      okText: '确定重置',
      cancelText: '取消',
    });
  };

  return (
    <Card 
      size="small" 
      style={{ marginBottom: 16 }}
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span>会话信息</span>
          <Tooltip title="每个会话都是独立的，不同用户或不同浏览器窗口使用不同的会话ID，数据互不影响。">
            <InfoCircleOutlined style={{ marginLeft: 8 }} />
          </Tooltip>
        </div>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Paragraph>
          <Text strong>当前会话ID: </Text>
          <Text code copyable>{sessionId}</Text>
        </Paragraph>
        
        <Text type="secondary">
          此会话ID确保您的操作与其他用户隔离。即使在同一台服务器上，不同用户的操作也不会互相影响。
        </Text>
        
        <Button 
          icon={<SyncOutlined />} 
          onClick={resetSession}
          size="small"
          style={{ marginTop: 8 }}
        >
          重置会话
        </Button>
      </Space>
    </Card>
  );
};

export default SessionManager; 