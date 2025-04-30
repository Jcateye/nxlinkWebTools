import React, { useState, useEffect, MouseEvent } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Drawer, 
  List, 
  Typography, 
  Input, 
  Modal, 
  Form, 
  Empty, 
  Switch, 
  Tag, 
  Tooltip, 
  Badge, 
  message, 
  Divider, 
  Popconfirm,
  Avatar,
  Collapse,
  notification
} from 'antd';
import { 
  TeamOutlined, 
  UserOutlined, 
  PlusOutlined, 
  LoginOutlined, 
  LogoutOutlined, 
  DeleteOutlined, 
  CopyOutlined, 
  SyncOutlined,
  ShareAltOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  DownOutlined,
  UserAddOutlined,
  MessageOutlined,
  CaretRightOutlined
} from '@ant-design/icons';
import { useUserContext } from '../context/UserContext';
import { CollaborationSession } from '../types';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import copy from 'copy-to-clipboard';
import * as collaborationService from '../services/collaboration';

const { Text, Title } = Typography;
const { Search } = Input;
const { Panel } = Collapse;

interface CollaborationManagerProps {
  onFinish?: () => void;
}

const CollaborationManager: React.FC<CollaborationManagerProps> = ({ onFinish }) => {
  const { 
    isCollaborationMode, 
    setCollaborationMode, 
    collaborationSessions, 
    activeCollaborationSession,
    createCollaborationSession,
    joinCollaborationSession,
    leaveCollaborationSession,
    updateCollaborationSession,
    deleteCollaborationSession,
    userInfo
  } = useUserContext();
  
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionIdToJoin, setSessionIdToJoin] = useState('');
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [messages, setMessages] = useState<Array<{id: string, userId: string, username: string, text: string, timestamp: number}>>([]);
  const [messageText, setMessageText] = useState<string>('');
  const [activeUsers, setActiveUsers] = useState<Array<{userId: string, username: string}>>([]);
  const [sessionListVisible, setSessionListVisible] = useState<boolean>(false);
  const [chatDrawerVisible, setChatDrawerVisible] = useState<boolean>(false);
  
  // 添加同步状态
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncSuccessCount, setSyncSuccessCount] = useState<number>(0);
  
  // 根据搜索条件过滤会话列表
  const filteredSessions = collaborationSessions.filter(session => 
    session.name.toLowerCase().includes(searchText.toLowerCase()) ||
    session.creatorName.toLowerCase().includes(searchText.toLowerCase())
  );
  
  // 监听协作模式变化
  useEffect(() => {
    if (isCollaborationMode && activeCollaborationSession) {
      // 初始化Socket.io连接
      const socket = collaborationService.initSocket(
        activeCollaborationSession.id,
        userInfo?.userId || 'anonymous',
        userInfo?.username || 'Anonymous'
      );

      // 注册事件监听
      collaborationService.onUserJoined((user) => {
        message.success(`${user.username} 加入了协作会话`);
        setActiveUsers(prev => {
          const existingUser = prev.find(u => u.userId === user.userId);
          if (!existingUser) {
            return [...prev, user];
          }
          return prev;
        });
      });

      collaborationService.onUserLeft((user) => {
        message.info(`${user.username} 离开了协作会话`);
        setActiveUsers(prev => prev.filter(u => u.userId !== user.userId));
      });

      collaborationService.onMessage((data) => {
        setMessages(prev => [...prev, data]);
      });

      collaborationService.onSessionDataUpdate((data) => {
        // 根据收到的数据更新本地状态
        console.log('收到会话数据更新:', data);
        if (data.userParams) {
          updateCollaborationSession({
            ...activeCollaborationSession,
            userParams: data.userParams
          });
        }
      });

      // 监听授权信息更新
      collaborationService.onAuthUpdate((authData) => {
        console.log('收到授权信息更新:', authData);
        if (authData.sourceAuthorization || authData.targetAuthorization) {
          // 使用更醒目的消息通知
          const senderInfo = authData.senderName ? `来自 ${authData.senderName} 的` : '';
          
          // 显示全局通知
          notification.success({
            message: '收到授权信息更新',
            description: `${senderInfo}授权信息已更新并自动填充到表单中`,
            duration: 8,
            placement: 'topRight',
            icon: <SyncOutlined spin />,
            onClick: () => {
              // 点击通知时可以做一些操作，如聚焦到表单
              const sourceInput = document.querySelector('textarea[placeholder*="源租户"]') as HTMLTextAreaElement;
              if (sourceInput) sourceInput.focus();
            }
          });
          
          // 更新表单中的授权信息
          if (authData.sourceAuthorization) {
            try {
              const sourceInput = document.querySelector('textarea[placeholder*="源租户"]') as HTMLTextAreaElement;
              if (sourceInput) {
                sourceInput.value = authData.sourceAuthorization;
                // 触发input事件以确保React组件状态更新
                const event = new Event('input', { bubbles: true });
                sourceInput.dispatchEvent(event);
                
                // 高亮提示更新的输入框
                sourceInput.style.backgroundColor = '#e6f7ff';
                setTimeout(() => {
                  sourceInput.style.backgroundColor = '';
                }, 3000);
                
                console.log('已更新源租户授权信息');
              } else {
                console.warn('未找到源租户授权信息输入框');
              }
            } catch (error) {
              console.error('更新源租户授权信息时出错:', error);
            }
          }
          
          if (authData.targetAuthorization) {
            try {
              const targetInput = document.querySelector('textarea[placeholder*="目标租户"]') as HTMLTextAreaElement;
              if (targetInput) {
                targetInput.value = authData.targetAuthorization;
                // 触发input事件以确保React组件状态更新
                const event = new Event('input', { bubbles: true });
                targetInput.dispatchEvent(event);
                
                // 高亮提示更新的输入框
                targetInput.style.backgroundColor = '#e6f7ff';
                setTimeout(() => {
                  targetInput.style.backgroundColor = '';
                }, 3000);
                
                console.log('已更新目标租户授权信息');
              } else {
                console.warn('未找到目标租户授权信息输入框');
              }
            } catch (error) {
              console.error('更新目标租户授权信息时出错:', error);
            }
          }
          
          // 添加到聊天记录
          if (authData.senderName && authData.senderId !== userInfo?.userId) {
            const newMessage = {
              id: uuidv4(),
              userId: authData.senderId || 'system',
              username: authData.senderName || 'System',
              text: '分享了授权信息',
              timestamp: authData.timestamp || Date.now()
            };
            setMessages(prev => [...prev, newMessage]);
            
            // 如果聊天窗口没有打开，提示打开
            if (!chatDrawerVisible) {
              message.info({
                content: (
                  <span>
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={() => setChatDrawerVisible(true)}
                      style={{ padding: 0 }}
                    >
                      打开聊天窗口
                    </Button>
                    &nbsp;查看详细信息
                  </span>
                ),
                icon: <MessageOutlined />,
                duration: 5
              });
            }
          }
        } else {
          console.warn('收到的授权信息为空');
        }
      });

      // 加入会话
      collaborationService.joinSession(activeCollaborationSession);
    } else {
      // 断开连接
      collaborationService.disconnectSocket();
      setActiveUsers([]);
      setMessages([]);
    }

    return () => {
      // 组件卸载时移除所有监听并断开连接
      collaborationService.removeAllListeners();
      collaborationService.disconnectSocket();
    };
  }, [isCollaborationMode, activeCollaborationSession, userInfo]);
  
  // 创建新会话
  const handleCreateSession = () => {
    if (!sessionName.trim()) {
      message.error('请输入有效的会话名称');
      return;
    }
    
    const newSession: CollaborationSession = {
      id: uuidv4(),
      name: sessionName.trim(),
      createdAt: Date.now(),
      createdBy: userInfo?.userId || 'anonymous',
      creatorName: userInfo?.username || 'Anonymous',
      userParams: {
        companyId: localStorage.getItem('companyId') || '',
        tenantId: localStorage.getItem('tenantId') || '',
        token: localStorage.getItem('token') || '',
      }
    };

    createCollaborationSession(newSession);
    joinCollaborationSession(newSession);
    setCollaborationMode(true);
    setCreateModalVisible(false);
    setSessionName('');
    message.success('协作会话创建成功');
    
    if (onFinish) {
      onFinish();
    }
  };
  
  // 加入会话
  const handleJoinSession = () => {
    if (!sessionIdToJoin.trim()) {
      message.error('请输入有效的会话ID');
      return;
    }

    // 检查是否已经存在该会话
    const existingSession = collaborationSessions.find(s => s.id === sessionIdToJoin.trim());
    if (existingSession) {
      joinCollaborationSession(existingSession);
      setCollaborationMode(true);
      setJoinModalVisible(false);
      setSessionIdToJoin('');
      message.success('已加入协作会话');
      if (onFinish) {
        onFinish();
      }
      return;
    }

    message.error('无效的会话ID');
  };
  
  // 离开会话
  const handleLeaveSession = () => {
    if (activeCollaborationSession) {
      leaveCollaborationSession();
      setCollaborationMode(false);
      collaborationService.leaveSession();
      message.info('已离开协作会话');
      if (onFinish) {
        onFinish();
      }
    }
  };
  
  // 删除会话
  const handleDeleteSession = (sessionId: string) => {
    deleteCollaborationSession(sessionId);
    message.success('会话已删除');
  };
  
  // 复制会话ID
  const handleCopySessionId = (sessionId: string) => {
    copy(sessionId);
    message.success('会话ID已复制到剪贴板');
  };
  
  // 共享会话信息
  const handleShare = () => {
    if (!activeCollaborationSession) {
      message.error('没有活动的协作会话');
      return;
    }
    
    setShareModalVisible(true);
  };
  
  // 生成会话链接
  const generateShareLink = () => {
    if (!activeCollaborationSession) return '';
    
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?collaboration=${activeCollaborationSession.id}`;
  };
  
  // 复制共享链接
  const copyShareLink = () => {
    const link = generateShareLink();
    copy(link);
    message.success('共享链接已复制到剪贴板');
    setShareModalVisible(false);
  };
  
  // 格式化时间
  const formatTime = (timestamp: number) => {
    return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
  };
  
  // 发送消息
  const handleSendMessage = () => {
    if (!messageText.trim() || !isCollaborationMode || !activeCollaborationSession) return;

    const newMessage = {
      id: uuidv4(),
      userId: userInfo?.userId || 'anonymous',
      username: userInfo?.username || 'Anonymous',
      text: messageText.trim(),
      timestamp: Date.now()
    };

    collaborationService.sendMessage(messageText.trim());
    setMessages(prev => [...prev, newMessage]);
    setMessageText('');
  };
  
  // 添加一个函数来同步授权信息
  const syncAuthorizationInfo = () => {
    if (!isCollaborationMode || !activeCollaborationSession) {
      message.error('请先启用协作模式并加入会话');
      return;
    }

    // 获取源租户和目标租户的授权信息
    const sourceInput = document.querySelector('textarea[placeholder*="源租户"]') as HTMLTextAreaElement;
    const targetInput = document.querySelector('textarea[placeholder*="目标租户"]') as HTMLTextAreaElement;
    
    if (!sourceInput && !targetInput) {
      message.error('未找到授权信息输入框，请确保当前页面包含授权信息输入区域');
      return;
    }
    
    const authData = {
      sourceAuthorization: sourceInput?.value || '',
      targetAuthorization: targetInput?.value || '',
      senderName: userInfo?.username || 'Anonymous',
      senderId: userInfo?.userId || 'anonymous'
    };
    
    if (!authData.sourceAuthorization && !authData.targetAuthorization) {
      message.error('未找到有效的授权信息，请先输入授权信息');
      return;
    }
    
    // 设置同步中状态
    setIsSyncing(true);
    
    // 尝试同步授权信息，并通过回调处理结果
    const syncResult = collaborationService.syncAuthInfo(authData, (result) => {
      setIsSyncing(false);
      
      if (result.success) {
        setLastSyncTime(result.timestamp || Date.now());
        setSyncSuccessCount(prev => prev + 1);
        
        // 显示成功消息，包含接收者数量
        const recipientInfo = result.recipients !== undefined ? 
          (result.recipients > 0 ? `已发送给 ${result.recipients} 位协作成员` : '发送成功，但当前无其他在线成员') : 
          '';
        
        message.success({
          content: `授权信息已同步到协作会话 [${activeCollaborationSession.name}] ${recipientInfo}`,
          icon: <SyncOutlined />,
          duration: 5
        });
        
        // 如果没有接收者，显示警告
        if (result.recipients === 0) {
          notification.warning({
            message: '无在线接收者',
            description: '授权信息已同步，但当前没有其他在线协作成员。您可以邀请更多成员加入会话以共享授权信息。',
            duration: 8
          });
        }
        
        console.log('授权信息同步成功:', authData, result);
        
        // 添加到聊天记录
        const newMessage = {
          id: uuidv4(),
          userId: userInfo?.userId || 'anonymous',
          username: userInfo?.username || 'Anonymous',
          text: `发送了授权信息${result.recipients ? ` (${result.recipients} 位接收者)` : ''}`,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, newMessage]);
        
        // 高亮提示已同步的输入框，表示此信息已发送
        if (authData.sourceAuthorization && sourceInput) {
          sourceInput.style.backgroundColor = '#f6ffed';
          setTimeout(() => {
            sourceInput.style.backgroundColor = '';
          }, 2000);
        }
        
        if (authData.targetAuthorization && targetInput) {
          targetInput.style.backgroundColor = '#f6ffed';
          setTimeout(() => {
            targetInput.style.backgroundColor = '';
          }, 2000);
        }
      } else {
        // 显示错误消息
        message.error({
          content: `授权信息同步失败: ${result.error || '未知错误'}`,
          duration: 4
        });
        
        notification.error({
          message: '授权信息同步失败',
          description: `无法向协作成员发送授权信息。原因: ${result.error || '服务器未响应'}`,
          duration: 8
        });
        
        console.error('授权信息同步失败:', result.error);
      }
    });
    
    if (syncResult) {
      // 立即显示同步中提示
      notification.info({
        message: '正在同步授权信息',
        description: '正在向所有在线协作成员发送授权信息，请稍候...',
        icon: <SyncOutlined spin />,
        duration: 2,
        placement: 'topRight'
      });
    } else {
      setIsSyncing(false);
      message.error('授权信息同步失败，无法连接到协作服务器');
    }
  };
  
  // 渲染协作状态标签
  const renderCollaborationStatus = () => {
    if (!isCollaborationMode) {
      return <Tag color="default">协作模式：关闭</Tag>;
    }
    
    return (
      <Space>
        <Tag color="success">协作模式：开启</Tag>
        {activeCollaborationSession && (
          <Tag color="processing">
            当前会话：{activeCollaborationSession.name}
          </Tag>
        )}
        {activeUsers.length > 0 && (
          <Tooltip title={`${activeUsers.length} 位用户在线`}>
            <Badge count={activeUsers.length} offset={[5, 0]}>
              <Tag icon={<TeamOutlined />}>在线用户</Tag>
            </Badge>
          </Tooltip>
        )}
        <Tooltip title={lastSyncTime ? `上次同步: ${formatTime(lastSyncTime)}` : "将当前授权信息同步给其他协作成员"}>
          <Button 
            size="small" 
            type="primary" 
            onClick={syncAuthorizationInfo}
            icon={<SyncOutlined spin={isSyncing} />}
            style={{ background: "#52c41a", borderColor: "#52c41a" }}
            loading={isSyncing}
            disabled={isSyncing}
          >
            {isSyncing ? '同步中...' : '同步授权信息'}
            {syncSuccessCount > 0 && !isSyncing && <Badge count={syncSuccessCount} size="small" offset={[3, -3]} />}
          </Button>
        </Tooltip>
      </Space>
    );
  };
  
  // 添加同步状态显示
  const renderSyncStatus = () => {
    if (!isCollaborationMode || !activeCollaborationSession) return null;
    
    return (
      <div style={{ 
        background: '#f6ffed', 
        border: '1px solid #b7eb8f', 
        padding: '8px 12px', 
        borderRadius: '4px',
        marginBottom: '8px'
      }}>
        <Space align="start">
          <SyncOutlined style={{ color: '#52c41a' }} spin={isSyncing} />
          <div>
            <Text strong>授权信息同步</Text>
            <div>
              <Text type="secondary">
                在迁移页面填写授权信息后，点击"同步授权信息"按钮与协作成员共享
                {lastSyncTime && !isSyncing && (
                  <span style={{ marginLeft: 8 }}>
                    上次同步: {formatTime(lastSyncTime)}
                  </span>
                )}
                {isSyncing && <span style={{ marginLeft: 8 }}>正在同步...</span>}
              </Text>
            </div>
          </div>
        </Space>
      </div>
    );
  };
  
  // 渲染折叠面板的标题
  const renderCollapseHeader = () => {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <Space>
          <TeamOutlined />
          <span>协作模式</span>
          {isCollaborationMode && activeCollaborationSession && (
            <Tag color="processing">{activeCollaborationSession.name}</Tag>
          )}
        </Space>
        <Switch
          checked={isCollaborationMode}
          onChange={(checked, event) => handleToggleCollaborationMode(checked, event as MouseEvent)}
          size="small"
        />
      </div>
    );
  };
  
  const cardContent = (
    <Card 
      title={
        <Space>
          <TeamOutlined />
          <span>协作模式</span>
          {renderCollaborationStatus()}
        </Space>
      }
      extra={
        <Button type="primary" onClick={() => setDrawerVisible(true)}>
          管理会话
        </Button>
      }
      style={{ width: '100%', marginBottom: 0 }}
      bordered={false}
    >
      {!isCollaborationMode ? (
        <Empty 
          description="开启协作模式，与团队共享授权信息" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Space>
            <Button type="primary" onClick={() => setCreateModalVisible(true)}>
              <PlusOutlined /> 创建会话
            </Button>
            <Button onClick={() => setJoinModalVisible(true)}>
              <LoginOutlined /> 加入会话
            </Button>
            <Button onClick={() => setDrawerVisible(true)}>
              <TeamOutlined /> 管理会话
            </Button>
          </Space>
        </Empty>
      ) : activeCollaborationSession ? (
        <div>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>当前会话: </Text>
              <Text>{activeCollaborationSession.name}</Text>
              <Tag color="blue" style={{ marginLeft: 8 }}>
                创建者: {activeCollaborationSession.creatorName}
              </Tag>
            </div>
            
            <Space wrap>
              <Button 
                type="primary" 
                onClick={handleShare}
                icon={<ShareAltOutlined />}
                size="small"
              >
                分享
              </Button>
              <Button 
                onClick={handleLeaveSession}
                icon={<LogoutOutlined />}
                danger
                size="small"
              >
                退出
              </Button>
              <Button
                type="primary"
                onClick={syncAuthorizationInfo}
                icon={<SyncOutlined />}
                style={{ background: "#52c41a", borderColor: "#52c41a" }}
                size="small"
              >
                同步授权
              </Button>
              <Button
                onClick={() => setDrawerVisible(true)}
                icon={<TeamOutlined />}
                size="small"
              >
                管理会话
              </Button>
            </Space>
            
            <Divider style={{ margin: '8px 0' }} />
            
            {renderSyncStatus()}
            
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <ClockCircleOutlined /> 创建于: {formatTime(activeCollaborationSession.createdAt)}
              </Text>
            </div>
          </Space>
        </div>
      ) : (
        <Empty 
          description="未加入任何会话" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Space>
            <Button type="primary" onClick={() => setCreateModalVisible(true)}>
              <PlusOutlined /> 创建会话
            </Button>
            <Button onClick={() => setJoinModalVisible(true)}>
              <LoginOutlined /> 加入会话
            </Button>
            <Button onClick={() => setDrawerVisible(true)}>
              <TeamOutlined /> 管理会话
            </Button>
          </Space>
        </Empty>
      )}
    </Card>
  );
  
  // 切换协作模式
  const handleToggleCollaborationMode = (checked: boolean, event: MouseEvent) => {
    event.stopPropagation();
    setCollaborationMode(checked);
    if (!checked) {
      collaborationService.leaveSession();
    }
  };
  
  const renderSessionItem = (session: CollaborationSession) => {
    const isCreator = session.createdBy === userInfo?.userId;
    
    return (
      <List.Item
        key={session.id}
        actions={[
          <Tooltip title={session.id === activeCollaborationSession?.id ? '当前会话' : '加入会话'}>
            <Button
              type={session.id === activeCollaborationSession?.id ? 'primary' : 'default'}
              icon={session.id === activeCollaborationSession?.id ? <TeamOutlined /> : <LoginOutlined />}
              onClick={() => {
                if (session.id !== activeCollaborationSession?.id) {
                  joinCollaborationSession(session);
                }
              }}
              disabled={session.id === activeCollaborationSession?.id}
            >
              {session.id === activeCollaborationSession?.id ? '当前' : '加入'}
            </Button>
          </Tooltip>,
          <Tooltip title="复制会话ID">
            <Button
              icon={<CopyOutlined />}
              onClick={() => handleCopySessionId(session.id)}
            />
          </Tooltip>,
          isCreator && (
            <Tooltip title="删除会话">
              <Popconfirm
                title="确定要删除此会话吗？"
                onConfirm={() => handleDeleteSession(session.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Tooltip>
          )
        ]}
      >
        <List.Item.Meta
          avatar={
            <Badge dot={session.id === activeCollaborationSession?.id}>
              <Avatar icon={<TeamOutlined />} />
            </Badge>
          }
          title={
            <Space>
              <Text strong>{session.name}</Text>
              {session.id === activeCollaborationSession?.id && <Tag color="blue">当前</Tag>}
              {isCreator && <Tag color="green">创建者</Tag>}
            </Space>
          }
          description={
            <div>
              <Space direction="vertical">
                <Text type="secondary">ID: {session.id}</Text>
                <Text type="secondary">
                  创建时间: {formatTime(session.createdAt)}
                </Text>
                <Text type="secondary">
                  创建者: {session.creatorName}
                </Text>
              </Space>
            </div>
          }
        />
      </List.Item>
    );
  };
  
  return (
    <div style={{ marginBottom: 20, position: 'relative', zIndex: 5 }}>
      <Collapse 
        defaultActiveKey={[]} 
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        style={{ 
          marginBottom: 0,
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
      >
        <Panel 
          header={renderCollapseHeader()} 
          key="1"
          style={{ padding: 0 }}
        >
          <Card 
            style={{ 
              width: '100%', 
              margin: 0, 
              padding: 0, 
              border: 'none',
              borderRadius: 0
            }}
            bodyStyle={{ padding: '12px 16px' }}
            bordered={false}
          >
            {!isCollaborationMode ? (
              <Empty 
                description="开启协作模式，与团队共享授权信息" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Space>
                  <Button type="primary" onClick={() => setCreateModalVisible(true)}>
                    <PlusOutlined /> 创建会话
                  </Button>
                  <Button onClick={() => setJoinModalVisible(true)}>
                    <LoginOutlined /> 加入会话
                  </Button>
                  <Button onClick={() => setDrawerVisible(true)}>
                    <TeamOutlined /> 管理会话
                  </Button>
                </Space>
              </Empty>
            ) : activeCollaborationSession ? (
              <div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>当前会话: </Text>
                    <Text>{activeCollaborationSession.name}</Text>
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      创建者: {activeCollaborationSession.creatorName}
                    </Tag>
                  </div>
                  
                  <Space wrap>
                    <Button 
                      type="primary" 
                      onClick={handleShare}
                      icon={<ShareAltOutlined />}
                      size="small"
                    >
                      分享
                    </Button>
                    <Button 
                      onClick={handleLeaveSession}
                      icon={<LogoutOutlined />}
                      danger
                      size="small"
                    >
                      退出
                    </Button>
                    <Button
                      type="primary"
                      onClick={syncAuthorizationInfo}
                      icon={<SyncOutlined />}
                      style={{ background: "#52c41a", borderColor: "#52c41a" }}
                      size="small"
                    >
                      同步授权
                    </Button>
                    <Button
                      onClick={() => setDrawerVisible(true)}
                      icon={<TeamOutlined />}
                      size="small"
                    >
                      管理会话
                    </Button>
                  </Space>
                  
                  <Divider style={{ margin: '8px 0' }} />
                  
                  {renderSyncStatus()}
                  
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      <ClockCircleOutlined /> 创建于: {formatTime(activeCollaborationSession.createdAt)}
                    </Text>
                  </div>
                </Space>
              </div>
            ) : (
              <Empty 
                description="未加入任何会话" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Space>
                  <Button type="primary" onClick={() => setCreateModalVisible(true)}>
                    <PlusOutlined /> 创建会话
                  </Button>
                  <Button onClick={() => setJoinModalVisible(true)}>
                    <LoginOutlined /> 加入会话
                  </Button>
                  <Button onClick={() => setDrawerVisible(true)}>
                    <TeamOutlined /> 管理会话
                  </Button>
                </Space>
              </Empty>
            )}
          </Card>
        </Panel>
      </Collapse>
      
      {/* 会话管理抽屉 */}
      <Drawer
        title="协作会话管理"
        width={500}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setCreateModalVisible(true)} type="primary">
              <PlusOutlined /> 创建会话
            </Button>
            <Button onClick={() => setJoinModalVisible(true)}>
              <LoginOutlined /> 加入会话
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索会话名称"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(value) => setSearchText(value)}
            style={{ width: '100%' }}
          />
        </div>
        
        {filteredSessions.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={filteredSessions}
            renderItem={renderSessionItem}
          />
        ) : (
          <Empty description="暂无协作会话" />
        )}
      </Drawer>
      
      {/* 创建会话模态框 */}
      <Modal
        title="创建协作会话"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={handleCreateSession}
        okText="创建"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <p>创建一个新的协作会话，可与团队成员共享。</p>
        </div>
        <Form form={form}>
          <Form.Item
            label="会话名称"
            name="sessionName"
            rules={[{ required: true, message: '请输入会话名称' }]}
          >
            <Input 
              placeholder="输入一个描述性的会话名称" 
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 加入会话模态框 */}
      <Modal
        title="加入协作会话"
        open={joinModalVisible}
        onCancel={() => setJoinModalVisible(false)}
        onOk={handleJoinSession}
        okText="加入"
        cancelText="取消"
        confirmLoading={false}
      >
        <div style={{ marginBottom: 16 }}>
          <p>输入会话ID，加入已有的协作会话。</p>
        </div>
        <Form>
          <Form.Item
            label="会话ID"
            name="sessionId"
            rules={[{ required: true, message: '请输入会话ID' }]}
          >
            <Input 
              placeholder="输入会话ID" 
              value={sessionIdToJoin}
              onChange={(e) => setSessionIdToJoin(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 共享会话模态框 */}
      <Modal
        title="分享协作会话"
        open={shareModalVisible}
        onCancel={() => setShareModalVisible(false)}
        footer={[
          <Button key="copy" type="primary" onClick={copyShareLink}>
            复制链接
          </Button>,
          <Button key="cancel" onClick={() => setShareModalVisible(false)}>
            取消
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <p>分享以下链接或会话ID给团队成员，邀请他们加入协作。</p>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <Text strong>会话ID：</Text>
          <div style={{ display: 'flex', marginTop: 8 }}>
            <Input 
              value={activeCollaborationSession?.id || ''} 
              readOnly 
            />
            <Button 
              icon={<CopyOutlined />} 
              onClick={() => handleCopySessionId(activeCollaborationSession?.id || '')}
              style={{ marginLeft: 8 }}
            >
              复制
            </Button>
          </div>
        </div>
        
        <div>
          <Text strong>共享链接：</Text>
          <div style={{ display: 'flex', marginTop: 8 }}>
            <Input 
              value={generateShareLink()} 
              readOnly 
            />
            <Button 
              icon={<CopyOutlined />} 
              onClick={copyShareLink}
              style={{ marginLeft: 8 }}
            >
              复制
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* 会话列表抽屉 */}
      <Drawer
        title="我的协作会话"
        placement="right"
        onClose={() => setSessionListVisible(false)}
        open={sessionListVisible}
        width={320}
      >
        <Search
          placeholder="搜索会话"
          allowClear
          onSearch={value => setSearchText(value)}
          onChange={e => setSearchText(e.target.value)}
          style={{ marginBottom: 16 }}
        />

        {filteredSessions.length === 0 ? (
          <Empty description="暂无协作会话" />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={filteredSessions}
            renderItem={session => (
              <List.Item
                actions={[
                  <Button 
                    key="join" 
                    type="link" 
                    size="small"
                    onClick={() => {
                      joinCollaborationSession(session);
                      setCollaborationMode(true);
                      setSessionListVisible(false);
                    }}
                  >
                    加入
                  </Button>,
                  <Button 
                    key="copy" 
                    type="link" 
                    size="small"
                    onClick={() => handleCopySessionId(session.id)}
                    icon={<CopyOutlined />}
                  />,
                  <Popconfirm
                    key="delete"
                    title="确定要删除此会话吗？"
                    onConfirm={() => handleDeleteSession(session.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button 
                      type="link" 
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  title={session.name}
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        创建者: {session.creatorName}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        创建时间: {dayjs(session.createdAt).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
      
      {/* 聊天抽屉 */}
      <Drawer
        title={`聊天 - ${activeCollaborationSession?.name || ''}`}
        placement="right"
        onClose={() => setChatDrawerVisible(false)}
        open={chatDrawerVisible}
        width={320}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
          <div style={{ overflowY: 'auto', flex: 1, marginBottom: 16 }}>
            {messages.length === 0 ? (
              <Empty description="暂无消息" style={{ marginTop: 100 }} />
            ) : (
              messages.map(msg => (
                <div 
                  key={msg.id} 
                  style={{ 
                    marginBottom: 16,
                    textAlign: msg.userId === userInfo?.userId ? 'right' : 'left'
                  }}
                >
                  <div style={{ marginBottom: 4 }}>
                    <Text 
                      type="secondary" 
                      style={{ fontSize: '12px' }}
                    >
                      {msg.userId === userInfo?.userId ? '你' : msg.username} · {dayjs(msg.timestamp).format('HH:mm:ss')}
                    </Text>
                  </div>
                  <div 
                    style={{ 
                      backgroundColor: msg.userId === userInfo?.userId ? '#1890ff' : '#f0f0f0',
                      color: msg.userId === userInfo?.userId ? 'white' : 'black',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      display: 'inline-block',
                      maxWidth: '80%',
                      wordBreak: 'break-word'
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>
          <div>
            <Input.TextArea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="输入消息..."
              autoSize={{ minRows: 2, maxRows: 4 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              type="primary" 
              onClick={handleSendMessage} 
              style={{ marginTop: 8, float: 'right' }}
              disabled={!messageText.trim()}
            >
              发送
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default CollaborationManager; 