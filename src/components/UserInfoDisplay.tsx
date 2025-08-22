import React, { useEffect, useState } from 'react';
import { Card, Button, Spin, Typography, Divider, Space, Tag } from 'antd';
import { UserOutlined, TeamOutlined, InfoCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { getCurrentUserInfo } from '../services/api';
import { useUserContext } from '../context/UserContext';

const { Title, Text } = Typography;

interface UserInfo {
  user?: {
    id?: number;
    name?: string;
    email?: string;
    company?: string;
  };
  tenant?: {
    id?: number;
    name?: string;
  };
  auth?: string;
  [key: string]: any;
}

const UserInfoDisplay: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagUserInfo, setTagUserInfo] = useState<UserInfo | null>(null);
  const [faqUserInfo, setFaqUserInfo] = useState<UserInfo | null>(null);
  const { tagUserParams, faqUserParams } = useUserContext();

  // 获取用户信息
  const fetchUserInfo = async () => {
    // 如果没有任何授权token，则不请求
    if (!tagUserParams?.authorization && !faqUserParams?.sourceAuthorization) {
      console.log('🚫 [UserInfoDisplay] 跳过用户信息获取：没有有效的授权token');
      setTagUserInfo(null);
      setFaqUserInfo(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // 如果有Tag参数，获取Tag用户信息
      if (tagUserParams?.authorization) {
        try {
          const tagInfo = await getCurrentUserInfo('tag');
          setTagUserInfo(tagInfo);
        } catch (err) {
          console.error('获取Tag用户信息失败', err);
        }
      }
      
      // 如果有FAQ参数，获取FAQ用户信息
      if (faqUserParams?.sourceAuthorization) {
        try {
          const faqInfo = await getCurrentUserInfo('faq');
          setFaqUserInfo(faqInfo);
        } catch (err) {
          console.error('获取FAQ用户信息失败', err);
        }
      }
      
    } catch (err) {
      setError('获取用户信息失败，请检查网络连接或凭证。');
      console.error('获取用户信息失败', err);
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取用户信息
  useEffect(() => {
    fetchUserInfo();
  }, [tagUserParams, faqUserParams]);

  // 渲染单个用户信息卡片
  const renderUserInfoCard = (userInfo: UserInfo | null, title: string, type: string) => {
    if (!userInfo) {
      return (
        <Card title={title} style={{ marginBottom: 16 }}>
          <Text type="secondary">未设置{type}凭证或获取信息失败</Text>
        </Card>
      );
    }

    return (
      <Card 
        title={
          <Space>
            {title}
            {userInfo.user?.name && (
              <Tag color="blue">{userInfo.user.name}</Tag>
            )}
          </Space>
        } 
        style={{ marginBottom: 16 }}
        extra={
          <Button 
            type="text" 
            icon={<InfoCircleOutlined />} 
            onClick={() => console.log(`${type}用户详情:`, userInfo)}
          >
            详情
          </Button>
        }
      >
        <div>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong><UserOutlined /> 用户:</Text> {userInfo.user?.name || '未知'}
              {userInfo.user?.email && <Text style={{ marginLeft: 8 }}>({userInfo.user.email})</Text>}
            </div>
            
            <div>
              <Text strong><TeamOutlined /> 公司/租户:</Text> {userInfo.company || userInfo.tenant?.name || '未知'}
              {userInfo.tenant?.id && <Text type="secondary" style={{ marginLeft: 8 }}>ID: {userInfo.tenant.id}</Text>}
            </div>
          </Space>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <Card 
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>用户认证信息</Title>
          </Space>
        }
        extra={
          <Button 
            type="primary" 
            icon={<SyncOutlined />} 
            onClick={fetchUserInfo}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin tip="获取用户信息中..." />
          </div>
        ) : error ? (
          <Text type="danger">{error}</Text>
        ) : (
          <>
            {renderUserInfoCard(tagUserInfo, "标签系统认证信息", "标签")}
            {renderUserInfoCard(faqUserInfo, "FAQ系统认证信息", "FAQ")}
          </>
        )}
      </Card>
    </div>
  );
};

export default UserInfoDisplay; 