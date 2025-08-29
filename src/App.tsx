import { useRef, useState, useEffect } from 'react';
import { Layout, Typography, Menu, Row, Col, Button, Card, Divider, Tabs } from 'antd';
import { ArrowRightOutlined, ArrowLeftOutlined, TeamOutlined, QuestionOutlined, SoundOutlined, CommentOutlined, DollarOutlined, SettingOutlined, AppstoreOutlined, ExperimentOutlined, PhoneOutlined, ApiOutlined, CloudServerOutlined, KeyOutlined } from '@ant-design/icons';
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
import MemberManagementPage from './pages/MemberManagementPage';
import PromptValidationPage from './pages/PromptValidationPage';
import VendorAppManagementPage from './pages/VendorAppManagementPage';
import OpenApiActivityPage from './pages/OpenApiActivityPage';
import ApiKeyManagementPage from './pages/ApiKeyManagementPage';
import PhoneNumberValidator from './components/PhoneNumberValidator';
import ConversationManagementPage from './pages/ConversationManagementPage';
import NXLinkTokenManager from './components/NXLinkTokenManager';
import './App.css';

const { Header, Content, Sider } = Layout;
const { TabPane } = Tabs;
const { SubMenu } = Menu;

// 创建内部AppContent组件，可以使用useUserContext
const AppContent = () => {
  const tagGroupMigrationRef = useRef<TagGroupMigrationHandle>(null);
  const faqGroupMigrationRef = useRef<FaqGroupMigrationHandle>(null);
  const targetFaqGroupMigrationRef = useRef<TargetFaqGroupMigrationHandle>(null);
  const [activeMenu, setActiveMenu] = useState<string>('tag');
  const [collapsed, setCollapsed] = useState(false);
  const { 
    setCollaborationMode, 
    collaborationSessions, 
    joinCollaborationSession 
  } = useUserContext();

  // 添加URL参数处理逻辑
  useEffect(() => {
    // 监听来自页面内部的菜单导航事件
    const handler = (e: any) => {
      const key = e?.detail?.key;
      if (key) setActiveMenu(key);
    };
    window.addEventListener('navigate-menu', handler);

    // 支持通过 ?menu=xxx 直接导航
    const menuParam = new URLSearchParams(window.location.search).get('menu');
    if (menuParam) setActiveMenu(menuParam);

    return () => window.removeEventListener('navigate-menu', handler);
  }, []);

  // 处理 URL 中的协作会话参数
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

  // 获取页面标题
  const getPageTitle = () => {
    const titles: Record<string, string> = {
      'tag': '标签迁移工具',
      'bill': '账单管理',
      'faq': 'FAQ管理',
      'voice': '声音管理',
      'script': '话术测试系统',
      'member': '成员管理',
      'prompt': '提示词验证',
      'phone': '电话号码检测',
      'vendor-app': '供应商应用管理',
      'conversation': '会话管理',
      'settings': '通用设置',
      'openapi-activity': 'OpenAPI 活动管理',
      'apikey-management': 'API Key 管理',
    };
    return titles[activeMenu] || 'NxLink 管理工具';
  };

  // 渲染内容区域
  const renderContent = () => {
    switch (activeMenu) {
      case 'tag':
        return (
          <Card title="标签迁移" style={{ height: '100%' }}>
            <TagParamsForm />
            <TagGroupMigration ref={tagGroupMigrationRef} />
            <Divider style={{ margin: '12px 0' }}/>
            <TagImport onImportComplete={refreshTagGroups} />
          </Card>
        );
      case 'bill':
        return <BillManagementPage />;
      case 'faq':
        return (
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
        );
      case 'voice':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
      case 'member':
        return <MemberManagementPage />;
      case 'prompt':
        return <PromptValidationPage />;
      case 'phone':
        return <PhoneNumberValidator />;
      case 'vendor-app':
        return <VendorAppManagementPage />;
      case 'conversation':
        return <ConversationManagementPage />;
      case 'openapi-activity':
        return <OpenApiActivityPage />;
      case 'apikey-management':
        return <ApiKeyManagementPage />;
      case 'settings':
        return <NXLinkTokenManager />;
      default:
        return (
          <Card>
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Typography.Title level={3}>欢迎使用 NxLink 管理工具</Typography.Title>
              <Typography.Paragraph>请从左侧菜单选择功能模块</Typography.Paragraph>
            </div>
          </Card>
        );
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 左侧菜单 */}
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        width={250}
        theme="dark"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div style={{ 
          height: 32, 
          margin: 16, 
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          {collapsed ? 'NX' : 'NxLink'}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeMenu]}
          onSelect={({ key }) => setActiveMenu(key as string)}
          defaultOpenKeys={['admin', 'client']}
          style={{ borderRight: 0 }}
        >
          <SubMenu 
            key="admin" 
            icon={<SettingOutlined />} 
            title="运营后台工具"
            style={{ marginBottom: 8 }}
          >
            <Menu.Item key="tag" icon={<TeamOutlined />}>
              标签迁移工具
            </Menu.Item>
            <Menu.Item key="bill" icon={<DollarOutlined />}>
              账单管理
            </Menu.Item>
            <Menu.Item key="vendor-app" icon={<ApiOutlined />}>
              供应商应用管理
            </Menu.Item>
          </SubMenu>
          
          <SubMenu 
            key="client" 
            icon={<AppstoreOutlined />} 
            title="NXLink客户端"
            style={{ marginBottom: 8 }}
          >
            <Menu.Item key="faq" icon={<QuestionOutlined />}>
              FAQ管理
            </Menu.Item>
            <Menu.Item key="voice" icon={<SoundOutlined />}>
              声音管理
            </Menu.Item>
            <Menu.Item key="script" icon={<CommentOutlined />}>
              话术测试系统
            </Menu.Item>
            <Menu.Item key="member" icon={<TeamOutlined />}>
              成员管理
            </Menu.Item>
            <Menu.Item key="conversation" icon={<CommentOutlined />}>
              会话管理
            </Menu.Item>
          </SubMenu>

          <SubMenu
            key="openapi"
            icon={<CloudServerOutlined />}
            title="OpenAPI平台"
          >
            <Menu.Item key="apikey-management" icon={<KeyOutlined />}>
              API Key管理
            </Menu.Item>
          </SubMenu>

          <SubMenu
            key="client-settings"
            icon={<SettingOutlined />}
            title="客户端设置"
          >
            <Menu.Item key="settings">
              通用设置
            </Menu.Item>
          </SubMenu>
          
          <Menu.Item 
            key="prompt" 
            icon={<ExperimentOutlined />}
            style={{ marginTop: 8 }}
          >
            提示词验证
          </Menu.Item>
          
          <Menu.Item 
            key="phone" 
            icon={<PhoneOutlined />}
            style={{ marginTop: 8 }}
          >
            电话号码检测
          </Menu.Item>
        </Menu>
      </Sider>

      {/* 右侧主要内容区域 */}
      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'margin-left 0.2s' }}>
        {/* 顶部标题栏 */}
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography.Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            {getPageTitle()}
          </Typography.Title>
          <div style={{ color: '#666' }}>
            NxLink 管理工具 v1.0
          </div>
        </Header>

        {/* 内容区域 */}
        <Content style={{ 
          margin: '24px',
          minHeight: 'calc(100vh - 112px)',
          background: '#f0f2f5'
        }}>
          {renderContent()}
        </Content>
      </Layout>
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