import React, { useState, useEffect, useRef } from 'react';
import { Card, Tag, Space, Typography, Avatar, Descriptions, Spin, message, Tooltip, Button } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, BankOutlined, CrownOutlined, IdcardOutlined, ReloadOutlined } from '@ant-design/icons';
import { useUserContext } from '../context/UserContext';
import { nxlinkClientIsLogin } from '../services/api';

const { Text, Title } = Typography;

interface UserInfo {
  id: number;
  phone: string;
  email: string;
  nickname: string;
  company: string;
  defaultTenantId: number;
  customerId: number;
  customerCode: string;
  customerType: string | null;
  roleName: string;
  tenantName: string;
  tenantNickName: string;
  systemRoles: Array<{
    system_id: number;
    role_id: number;
    role_name: string;
    tenant_id: number | null;
    role_unique_key: string | null;
    is_default: number | null;
  }>;
  source: number;
  shaPwd: string;
  uuid: string;
}

interface UserInfoCardProps {
  compact?: boolean; // 是否使用紧凑模式
  showRefresh?: boolean; // 是否显示刷新按钮
  style?: React.CSSProperties;
}

const UserInfoCard: React.FC<UserInfoCardProps> = ({ 
  compact = false, 
  showRefresh = true,
  style = {}
}) => {
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [tokenRemainSec, setTokenRemainSec] = useState<number>(0);
  const { faqUserParams } = useUserContext();
  const fetchingRef = useRef(false);
  const lastTokenRef = useRef<string>('');
  const cacheTimeRef = useRef<number>(0);

  // 获取用户信息
  const fetchUserInfo = async (forceRefresh = false) => {
    // 检查是否有任何可用的token（让nxlinkClientIsLogin自己按优先级选择）
    const hasAnyToken = faqUserParams?.sourceAuthorization || 
                       localStorage.getItem('nxlink_source_token') || 
                       localStorage.getItem('nxlink_client_token');
    
    if (!hasAnyToken) {
      console.log('🚫 [UserInfoCard] 跳过用户信息获取：没有有效的授权token');
      setUserInfo(null);
      return;
    }

    // 防止重复请求
    if (fetchingRef.current) {
      console.log('🚫 [UserInfoCard] 跳过：正在获取用户信息中...');
      return;
    }

    // 检查缓存（5分钟内不重复请求）
    const currentToken = faqUserParams?.sourceAuthorization || '';
    const now = Date.now();
    if (!forceRefresh && 
        lastTokenRef.current === currentToken && 
        userInfo &&
        now - cacheTimeRef.current < 5 * 60 * 1000) {
      console.log('✅ [UserInfoCard] 使用缓存的用户信息');
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    try {
      console.log('👤 [UserInfoCard] 开始获取用户信息（使用最新登录token）...');
      // 不传入特定token，让nxlinkClientIsLogin按优先级自动选择最新的
      const response = await nxlinkClientIsLogin();
      
      if (response.code === 0 && response.data) {
        setUserInfo(response.data.userInfo);
        setTokenRemainSec(response.data.tokenRemainSec || 0);
        // 更新缓存
        lastTokenRef.current = currentToken;
        cacheTimeRef.current = now;
        console.log('✅ [UserInfoCard] 用户信息获取成功:', response.data.userInfo);
      } else {
        console.error('❌ [UserInfoCard] 用户信息获取失败:', response.message);
        message.error('获取用户信息失败: ' + (response.message || '未知错误'));
        setUserInfo(null);
      }
    } catch (error: any) {
      console.error('❌ [UserInfoCard] 用户信息获取异常:', error);
      message.error('获取用户信息失败');
      setUserInfo(null);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // 监听token变化，自动获取用户信息
  useEffect(() => {
    const hasAnyToken = faqUserParams?.sourceAuthorization || 
                       localStorage.getItem('nxlink_source_token') || 
                       localStorage.getItem('nxlink_client_token');
    
    if (hasAnyToken) {
      fetchUserInfo();
    } else {
      setUserInfo(null);
      setTokenRemainSec(0);
    }
  }, [faqUserParams?.sourceAuthorization]); // 保持原有依赖，主要监听FAQ授权变化

  // 格式化剩余时间
  const formatRemainTime = (seconds: number): string => {
    if (seconds <= 0) return '已过期';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  // 获取角色标签颜色
  const getRoleColor = (roleName: string): string => {
    const roleColors: Record<string, string> = {
      '管理员': 'red',
      '客服专员': 'blue',
      '普通用户': 'default'
    };
    return roleColors[roleName] || 'default';
  };

  // 如果没有任何可用的token，显示提示
  const hasAnyToken = faqUserParams?.sourceAuthorization || 
                     localStorage.getItem('nxlink_source_token') || 
                     localStorage.getItem('nxlink_client_token');
  
  if (!hasAnyToken) {
    if (compact) {
      return (
        <Card size="small" style={{ ...style, textAlign: 'center' }}>
          <Text type="secondary">请先完成身份认证</Text>
        </Card>
      );
    }
    return null;
  }

  // 加载状态
  if (loading) {
    return (
      <Card 
        title={compact ? undefined : "用户信息"} 
        size={compact ? "small" : "default"}
        style={style}
      >
        <div style={{ textAlign: 'center', padding: compact ? 8 : 20 }}>
          <Spin size={compact ? "small" : "default"} />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">获取用户信息中...</Text>
          </div>
        </div>
      </Card>
    );
  }

  // 紧凑模式
  if (compact && userInfo) {
    return (
      <Card 
        size="small" 
        style={{ ...style }}
        actions={showRefresh ? [
          <Button 
            key="refresh"
            type="text" 
            icon={<ReloadOutlined />} 
            onClick={() => fetchUserInfo(true)}
            loading={loading}
            size="small"
          >
            刷新
          </Button>
        ] : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar 
            size={32} 
            icon={<UserOutlined />} 
            style={{ backgroundColor: '#1890ff' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>{userInfo.nickname}</div>
            <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userInfo.tenantName}
            </div>
          </div>
          <Tag color={getRoleColor(userInfo.roleName)} size="small">
            {userInfo.roleName}
          </Tag>
        </div>
      </Card>
    );
  }

  // 完整模式
  if (userInfo) {
    return (
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>当前用户信息</span>
            {showRefresh && (
              <Button 
                type="text" 
                icon={<ReloadOutlined />} 
                onClick={() => fetchUserInfo(true)}
                loading={loading}
                size="small"
              >
                刷新
              </Button>
            )}
          </div>
        }
        style={style}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          <Avatar 
            size={64} 
            icon={<UserOutlined />} 
            style={{ backgroundColor: '#1890ff' }}
          />
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
              {userInfo.nickname}
            </Title>
            <Space wrap>
              <Tag color={getRoleColor(userInfo.roleName)} icon={<CrownOutlined />}>
                {userInfo.roleName}
              </Tag>
              <Tag color="blue">
                ID: {userInfo.id}
              </Tag>
              {tokenRemainSec > 0 && (
                <Tooltip title="Token剩余有效时间">
                  <Tag color={tokenRemainSec < 3600 ? 'orange' : 'green'}>
                    ⏰ {formatRemainTime(tokenRemainSec)}
                  </Tag>
                </Tooltip>
              )}
            </Space>
          </div>
        </div>

        <Descriptions column={1} size="small">
          <Descriptions.Item 
            label={<><MailOutlined /> 邮箱</>}
          >
            <Text copyable>{userInfo.email}</Text>
          </Descriptions.Item>
          
          <Descriptions.Item 
            label={<><PhoneOutlined /> 电话</>}
          >
            <Text copyable>{userInfo.phone}</Text>
          </Descriptions.Item>
          
          <Descriptions.Item 
            label={<><BankOutlined /> 公司</>}
          >
            {userInfo.company}
          </Descriptions.Item>
          
          <Descriptions.Item 
            label={<><IdcardOutlined /> 租户</>}
          >
            {userInfo.tenantName} ({userInfo.tenantNickName})
          </Descriptions.Item>
          
          <Descriptions.Item label="客户代码">
            <Text code>{userInfo.customerCode}</Text>
          </Descriptions.Item>
          
          <Descriptions.Item label="默认租户ID">
            {userInfo.defaultTenantId}
          </Descriptions.Item>
        </Descriptions>

        {userInfo.systemRoles && userInfo.systemRoles.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong>系统角色:</Text>
            <div style={{ marginTop: 8 }}>
              <Space wrap>
                {userInfo.systemRoles.map((role, index) => (
                  <Tag 
                    key={index}
                    color={role.is_default ? 'blue' : 'default'}
                  >
                    {role.role_name} 
                    {role.system_id && ` (系统${role.system_id})`}
                    {role.is_default && ' ⭐'}
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        )}
      </Card>
    );
  }

  return null;
};

export default UserInfoCard;
