import React, { useRef, useState, useEffect } from 'react';
import { Layout, Typography, Menu, Row, Col, Button, Card, Divider, Tabs } from 'antd';
import { ArrowRightOutlined, ArrowLeftOutlined, TeamOutlined, QuestionOutlined, SoundOutlined, CommentOutlined, DollarOutlined } from '@ant-design/icons';
import TagParamsForm from './components/TagParamsForm';
import FaqParamsForm from './components/FaqParamsForm';
import TagGroupMigration, { TagGroupMigrationHandle } from './components/TagGroupMigration';
import FaqGroupMigration, { FaqGroupMigrationHandle } from './components/FaqGroupMigration';
import TargetFaqGroupMigration, { TargetFaqGroupMigrationHandle } from './components/TargetFaqGroupMigration';
import TagImport from './components/TagImport';
import FaqImport from './components/FaqImport';
import { UserProvider, useUserContext } from './context/UserContext';
import VoiceList from './components/VoiceList';
import VoiceMigration from './components/VoiceMigration';
import ScriptTestSystem from './components/ScriptTestSystem';
import BillManagementPage from './pages/BillManagementPage';
// import CollaborationManager from './components/CollaborationManager';
import './App.css';
import zhCN from 'antd/lib/locale/zh_CN';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

// 创建内部AppContent组件，可以使用useUserContext
const AppContent = () => {
  const tagGroupMigrationRef = useRef<TagGroupMigrationHandle>(null);
  const faqGroupMigrationRef = useRef<FaqGroupMigrationHandle>(null);
  const targetFaqGroupMigrationRef = useRef<TargetFaqGroupMigrationHandle>(null);
  const [activeMenu, setActiveMenu] = useState<string>('tag');
  const { 
    isCollaborationMode, 
    setCollaborationMode, 
    collaborationSessions, 
    joinCollaborationSession 
  } = useUserContext();

  // 添加URL参数处理逻辑
  useEffect(() => {
    // 从URL中获取协作会话ID
    const urlParams = new URLSearchParams(window.location.search);
    const collaborationId = urlParams.get('collaboration');
    
    if (collaborationId) {
      console.log('检测到协作会话ID:', collaborationId);
      
      // 查找现有会话
      const existingSession = collaborationSessions.find(s => s.id === collaborationId);
      
      if (existingSession) {
        // 已找到会话，直接加入
        console.log('找到匹配的会话，准备加入:', existingSession.name);
        joinCollaborationSession(existingSession);
        setCollaborationMode(true);
        
        // 自动切换到FAQ管理页面
        setActiveMenu('faq');
      } else {
        // 会话不存在本地存储中，尝试作为新会话ID加入
        console.log('本地未找到会话，尝试直接使用ID加入:', collaborationId);
        try {
          // 直接使用ID加入会话
          joinCollaborationSession(collaborationId);
          setCollaborationMode(true);
          setActiveMenu('faq');
        } catch (error) {
          console.error('使用ID加入会话失败:', error);
          alert('无法加入协作会话，ID可能无效或已过期');
        }
      }
      
      // 移除URL参数，避免刷新页面重复处理
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [collaborationSessions, joinCollaborationSession, setCollaborationMode, setActiveMenu]);

  // 提供刷新分组列表的方法
  const refreshTagGroups = () => {
    if (tagGroupMigrationRef.current) {
      tagGroupMigrationRef.current.refreshGroups();
    }
  };

  const refreshFaqGroups = () => {
    if (faqGroupMigrationRef.current) {
      faqGroupMigrationRef.current.refreshFaqs();
    }
  };

  const refreshTargetFaqGroups = () => {
    if (targetFaqGroupMigrationRef.current) {
      targetFaqGroupMigrationRef.current.refreshFaqs();
    }
  };

  // 渲染内容区域
  const renderContent = () => {
    switch (activeMenu) {
      case 'tag':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Row gutter={24} style={{ width: '100%' }}>
              <Col span={24}>
                <Card title="标签迁移" style={{ height: '100%' }}>
                  <TagParamsForm />
                  <TagGroupMigration ref={tagGroupMigrationRef} />
                  <Divider style={{ margin: '12px 0' }}/>
                  <TagImport onImportComplete={refreshTagGroups} />
                </Card>
              </Col>
            </Row>
          </div>
        );
      case 'faq':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* <CollaborationManager /> */}
            <Row gutter={24} style={{ width: '100%' }}>
              {/* 左侧：源租户面板 */}
              <Col span={11}>
                <Card title="源租户" style={{ height: '100%' }}>
                  <FaqParamsForm formType="source" />
                  <FaqGroupMigration ref={faqGroupMigrationRef} />
                  <Divider style={{ margin: '12px 0' }}/>
                  <FaqImport onImportComplete={refreshFaqGroups} formType="source" />
                </Card>
              </Col>
              {/* 中间：双向迁移按钮 */}
              <Col span={2} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <Button
                  icon={<ArrowRightOutlined />}
                  type="primary"
                  onClick={() => faqGroupMigrationRef.current?.handleMigrateOptions?.()}
                  title="迁移到目标租户"
                />
                <Button
                  icon={<ArrowLeftOutlined />}
                  type="default"
                  onClick={() => targetFaqGroupMigrationRef.current?.handleMigrateOptions?.()}
                  title="迁移到源租户"
                />
              </Col>
              {/* 右侧：目标租户面板 */}
              <Col span={11}>
                <Card title="目标租户" style={{ height: '100%' }}>
                  <FaqParamsForm formType="target" />
                  <TargetFaqGroupMigration ref={targetFaqGroupMigrationRef} />
                  <Divider style={{ margin: '12px 0' }}/>
                  <FaqImport onImportComplete={refreshTargetFaqGroups} formType="target" />
                </Card>
              </Col>
            </Row>
          </div>
        );
      case 'voice':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* <CollaborationManager /> */}
            <Row gutter={24} style={{ width: '100%' }}>
              {/* 左侧：源租户面板 */}
              <Col span={11}>
                <Card title="源租户" style={{ height: '100%' }}>
                  <FaqParamsForm formType="source" />
                </Card>
              </Col>
              {/* 中间：空白占位 */}
              <Col span={2}></Col>
              {/* 右侧：目标租户面板 */}
              <Col span={11}>
                <Card title="目标租户" style={{ height: '100%' }}>
                  <FaqParamsForm formType="target" />
                </Card>
              </Col>
            </Row>
            
            <Tabs defaultActiveKey="list" type="card" style={{ marginTop: 16 }}>
              <TabPane tab="声音列表" key="list">
                <Row gutter={24} style={{ width: '100%' }}>
                  <Col span={12}>
                    <VoiceList formType="source" />
                  </Col>
                  <Col span={12}>
                    <VoiceList formType="target" />
                  </Col>
                </Row>
              </TabPane>
              <TabPane tab="声音迁移" key="migrate">
                <VoiceMigration />
              </TabPane>
            </Tabs>
          </div>
        );
      case 'script':
        return <ScriptTestSystem />;
      case 'bill':
        return <BillManagementPage />;
      default:
        return null;
    }
  };

  return (
    <Layout className="app-container">
      <Header className="main-header">
        <div className="header-content">
          <Typography.Title level={3} style={{ color: 'white', margin: 0 }}>
            NxLink 管理工具
          </Typography.Title>
          <Menu
            mode="horizontal"
            selectedKeys={[activeMenu]}
            onSelect={({ key }) => setActiveMenu(key as string)}
            className="main-menu"
          >
            <Menu.Item key="tag" icon={<TeamOutlined />}>标签迁移工具</Menu.Item>
            <Menu.Item key="faq" icon={<QuestionOutlined />}>FAQ管理</Menu.Item>
            <Menu.Item key="voice" icon={<SoundOutlined />}>声音管理</Menu.Item>
            <Menu.Item key="script" icon={<CommentOutlined />}>话术测试系统</Menu.Item>
            <Menu.Item key="bill" icon={<DollarOutlined />}>账单管理</Menu.Item>
          </Menu>
        </div>
      </Header>
      <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px - 70px)' }}>
        {renderContent()}
      </Content>
      <Footer style={{ textAlign: 'center', background: '#f0f2f5', height: '70px' }}>
        NxLink 管理工具 ©2025 Degen
      </Footer>
    </Layout>
  );
};

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App; 