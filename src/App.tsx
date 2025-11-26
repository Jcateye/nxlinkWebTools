import { useRef, useState, useEffect, useCallback } from 'react';
import { Layout, Typography, Menu, Row, Col, Button, Card, Divider, Tabs, Space, Modal, Input } from 'antd';
import { message } from 'antd';
import { ArrowRightOutlined, ArrowLeftOutlined, TeamOutlined, QuestionOutlined, SoundOutlined, CommentOutlined, DollarOutlined, SettingOutlined, AppstoreOutlined, ExperimentOutlined, PhoneOutlined, ApiOutlined, CloudServerOutlined, KeyOutlined, PieChartOutlined } from '@ant-design/icons';
import axios from 'axios';
import type { MenuProps } from 'antd';
import TagParamsForm from './components/TagParamsForm';
import { getCurrentDataCenter } from './config/apiConfig';
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
import BillAnalysisPage from './pages/BillAnalysisPage';
import BillTrackingPage from './pages/BillTrackingPage';
import MemberManagementPage from './pages/MemberManagementPage';
import VendorAppManagementPage from './pages/VendorAppManagementPage';
import OpenApiActivityPage from './pages/OpenApiActivityPage';
import ApiKeyManagementPage from './pages/ApiKeyManagementPage';
import PhoneNumberValidator from './components/PhoneNumberValidator';
import ConversationManagementPage from './pages/ConversationManagementPage';
import NXLinkTokenManager from './components/NXLinkTokenManager';
import ExternalAppFrame from './components/ExternalAppFrame';
import './App.css';

const { Header, Content, Sider } = Layout;
const { TabPane } = Tabs;
const { SubMenu } = Menu;

const DEFAULT_PROMPT_LAB_BASE_URL = 'http://localhost:3000';
const DEFAULT_PROMPT_LAB_PATH_PREFIX = '/prompt-lab';
const ADMIN_MENU_KEYS = new Set(['tag', 'bill', 'bill-analysis', 'bill-tracking', 'vendor-app', 'prompt']);
const ADMIN_TOKEN_STORAGE_KEYS = ['admin_api_token', 'plat_token'];
const ADMIN_TOKEN_CACHE_KEY = 'admin_token_validation_cache';
const ADMIN_TOKEN_CACHE_DURATION = 15 * 60 * 1000; // 15分钟缓存

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, '');
const normalizePrefix = (prefix: string) => (prefix.startsWith('/') ? prefix : `/${prefix}`);

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
    joinCollaborationSession,
    tagUserParams,
    setTagUserParams
  } = useUserContext();
  const promptLabBaseUrl = import.meta.env.VITE_PROMPT_LAB_BASE_URL || DEFAULT_PROMPT_LAB_BASE_URL;
  const promptLabPathPrefix = import.meta.env.VITE_PROMPT_LAB_PATH_PREFIX || DEFAULT_PROMPT_LAB_PATH_PREFIX;
  const promptLabUrl = `${normalizeBaseUrl(promptLabBaseUrl)}${normalizePrefix(promptLabPathPrefix)}`;
  const [adminTokenValid, setAdminTokenValid] = useState(false);
  const [adminTokenChecking, setAdminTokenChecking] = useState(false);
  const [adminTokenInfo, setAdminTokenInfo] = useState<{ company?: string; tenant?: string } | null>(null);
  const [adminTokenError, setAdminTokenError] = useState<string | null>(null);
  const [adminTokenModalVisible, setAdminTokenModalVisible] = useState(false);
  const [adminTokenValue, setAdminTokenValue] = useState('');
  const [adminTokenModalSaving, setAdminTokenModalSaving] = useState(false);

  const getAdminToken = useCallback(() => {
    return (
      localStorage.getItem('admin_api_token') ||
      localStorage.getItem('plat_token') ||
      tagUserParams?.authorization ||
      ''
    );
  }, [tagUserParams?.authorization]);

  const validateAdminToken = useCallback(async (forceRefresh = false): Promise<{ valid: boolean; reason?: string }> => {
    setAdminTokenChecking(true);
    const token = getAdminToken();

    if (!token) {
      const reason = '尚未配置运营后台API令牌';
      setAdminTokenValid(false);
      setAdminTokenInfo(null);
      setAdminTokenError(reason);
      setAdminTokenChecking(false);
      return { valid: false, reason };
    }

    // 检查缓存
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(ADMIN_TOKEN_CACHE_KEY);
        if (cached) {
          const { timestamp, token: cachedToken, data } = JSON.parse(cached);
          const now = Date.now();
          if (cachedToken === token && (now - timestamp < ADMIN_TOKEN_CACHE_DURATION)) {
            setAdminTokenValid(true);
            setAdminTokenInfo(data);
            setAdminTokenError(null);
            setAdminTokenChecking(false);
            return { valid: true };
          }
        }
      } catch (e) {
        // 忽略缓存解析错误
      }
    }

    try {
      // 这里走运营后台固定的 HK 环境，不跟随前端数据中心切换，
      // 并且后端要求 PUT 请求「无请求体、Content-Length: 0」
      const response = await axios({
        method: 'put',
        url: '/api/admin/saas_plat/user/is_login',
        headers: {
          // 尽量贴近线上浏览器请求头
          Accept: 'application/json, text/plain, */*',
          authorization: token,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Dest': 'empty',
          system_id: '4',
          lang: 'zh_CN',
        },
        // 不传 data，避免 axios 自动序列化出 "null" 或 "\"\""
      });

      if (response.data?.code === 0 && response.data?.data?.state === 1) {
        const info = {
          company: response.data?.data?.userInfo?.company,
          tenant: response.data?.data?.userInfo?.tenantName,
        };
        
        // 更新状态
        setAdminTokenValid(true);
        setAdminTokenInfo(info);
        setAdminTokenError(null);

        // 写入缓存
        localStorage.setItem(ADMIN_TOKEN_CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          token,
          data: info
        }));

        return { valid: true };
      }

      const reason = response.data?.message || '运营后台API令牌验证失败';
      setAdminTokenValid(false);
      setAdminTokenInfo(null);
      setAdminTokenError(reason);
      localStorage.removeItem(ADMIN_TOKEN_CACHE_KEY); // 验证失败清除缓存
      return { valid: false, reason };
    } catch (error: any) {
      const reason =
        error?.response?.data?.message ||
        error?.message ||
        '运营后台API令牌验证失败';
      setAdminTokenValid(false);
      setAdminTokenInfo(null);
      setAdminTokenError(reason);
      localStorage.removeItem(ADMIN_TOKEN_CACHE_KEY); // 验证失败清除缓存
      return { valid: false, reason };
    } finally {
      setAdminTokenChecking(false);
    }
  }, [getAdminToken]);

  const guardAdminNavigation = useCallback((menuKey: string, onSuccess?: () => void) => {
    const proceed = () => {
      if (onSuccess) {
        onSuccess();
      } else {
        setActiveMenu(menuKey);
      }
    };

    if (adminTokenValid) {
      proceed();
      return;
    }

    validateAdminToken().then((result) => {
      if (result.valid) {
        proceed();
      } else {
        message.warning(result.reason || '请先配置运营后台API令牌');
        setAdminTokenModalVisible(true);
      }
    });
  }, [adminTokenValid, validateAdminToken]);

  const redirectToPromptLab = useCallback(() => {
    window.location.href = promptLabUrl;
  }, [promptLabUrl]);

  const handleMenuSelect: MenuProps['onSelect'] = ({ key }) => {
    const menuKey = key as string;
    if (menuKey === 'prompt') {
      guardAdminNavigation(menuKey, redirectToPromptLab);
      return;
    }
    if (ADMIN_MENU_KEYS.has(menuKey)) {
      guardAdminNavigation(menuKey);
      return;
    }
    setActiveMenu(menuKey);
  };

  const handleSaveAdminToken = async () => {
    const trimmed = adminTokenValue.trim();
    if (!trimmed) {
      message.error('请输入运营后台API令牌');
      return;
    }
    setAdminTokenModalSaving(true);

    // 统一保存到本地，作为运营后台工具的全局API令牌
    localStorage.setItem('admin_api_token', trimmed);
    localStorage.setItem('plat_token', trimmed);

    // 同步到标签迁移 / 账单等工具共用的 TagUserParams.authorization
    try {
      const unifiedTagParams = tagUserParams
        ? { ...tagUserParams, authorization: trimmed }
        : {
            nxCloudUserID: '',
            sourceTenantID: '',
            targetTenantID: '',
            authorization: trimmed,
          };
      setTagUserParams(unifiedTagParams);
    } catch (e) {
      console.warn('同步运营后台API令牌到标签参数时出错（可忽略）:', e);
    }
    // 强制刷新验证，不使用缓存
    const result = await validateAdminToken(true);
    setAdminTokenModalSaving(false);
    if (result.valid) {
      message.success('令牌已保存并通过校验');
      setAdminTokenModalVisible(false);
    } else {
      message.error(result.reason || '令牌校验失败，请重新尝试');
    }
  };

  const handleClearAdminToken = () => {
    localStorage.removeItem('admin_api_token');
    localStorage.removeItem('plat_token');
    localStorage.removeItem(ADMIN_TOKEN_CACHE_KEY);
    setAdminTokenValue('');
    setAdminTokenValid(false);
    setAdminTokenInfo(null);
    setAdminTokenError('尚未配置运营后台API令牌');
    message.info('已清除运营后台API令牌');
  };

  useEffect(() => {
    validateAdminToken();
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || ADMIN_TOKEN_STORAGE_KEYS.includes(event.key)) {
        validateAdminToken();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [validateAdminToken]);

  useEffect(() => {
    if (adminTokenModalVisible) {
      setAdminTokenValue(getAdminToken());
    }
  }, [adminTokenModalVisible, getAdminToken]);

  useEffect(() => {
    // 监听来自页面内部的菜单导航事件
    const handler = (e: any) => {
      const key = e?.detail?.key;
      if (!key) return;
      if (key === 'prompt') {
        guardAdminNavigation(key, redirectToPromptLab);
        return;
      }
      if (ADMIN_MENU_KEYS.has(key)) {
        guardAdminNavigation(key);
        return;
      }
      setActiveMenu(key);
    };
    window.addEventListener('navigate-menu', handler);

    // 支持通过 ?menu=xxx 直接导航
    const menuParam = new URLSearchParams(window.location.search).get('menu');
    if (menuParam === 'prompt') {
      guardAdminNavigation('prompt', redirectToPromptLab);
    } else if (menuParam && ADMIN_MENU_KEYS.has(menuParam)) {
      guardAdminNavigation(menuParam);
    } else if (menuParam) {
      setActiveMenu(menuParam);
    }

    return () => window.removeEventListener('navigate-menu', handler);
  }, [guardAdminNavigation, redirectToPromptLab]);

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
      'bill-analysis': '账单数据分析',
      'bill-tracking': 'DG消费追踪',
      'faq': 'FAQ管理',
      'voice': '声音管理',
      'script': '话术测试系统',
      'member': '成员管理',
      'prompt': '提示词验证（独立应用）',
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
    if (ADMIN_MENU_KEYS.has(activeMenu) && activeMenu !== 'prompt' && !adminTokenValid) {
      return (
        <Card title="需要运营后台登录">
          <Typography.Paragraph>
            访问该模块前请先配置运营后台 API 令牌并通过校验。可在右上角点击「设置令牌」进行配置。
          </Typography.Paragraph>
          <Space>
            <Button type="primary" onClick={() => setAdminTokenModalVisible(true)}>
              设置令牌
            </Button>
            <Button onClick={() => validateAdminToken(true)} loading={adminTokenChecking}>
              重新校验
            </Button>
          </Space>
          {adminTokenError && (
            <Typography.Paragraph type="danger" style={{ marginTop: 16 }}>
              最近一次校验失败：{adminTokenError}
            </Typography.Paragraph>
          )}
        </Card>
      );
    }

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
      case 'bill-analysis':
        return <BillAnalysisPage />;
      case 'bill-tracking':
        return <BillTrackingPage />;
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
        return (
          <Card
            title="提示词验证（独立应用）"
            extra={
              <Button type="link" href={promptLabUrl} target="_blank" rel="noreferrer">
                新窗口打开
              </Button>
            }
          >
            <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
              提示词验证功能已迁移到独立项目，统一使用路径前缀
              <Typography.Text code style={{ margin: '0 4px' }}>
                {promptLabPathPrefix}
              </Typography.Text>
              进行访问。
            </Typography.Paragraph>
            <ExternalAppFrame
              src={promptLabUrl}
              title="提示词验证独立应用"
              minHeight={900}
            />
          </Card>
        );
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
    <>
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
          onSelect={handleMenuSelect}
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
            <Menu.Item key="bill-analysis" icon={<PieChartOutlined />}>
              账单数据分析
            </Menu.Item>
            <Menu.Item key="bill-tracking" icon={<PieChartOutlined />}>
              DG消费追踪
            </Menu.Item>
            <Menu.Item key="vendor-app" icon={<ApiOutlined />}>
              供应商应用管理
            </Menu.Item>
            <Menu.Item key="prompt" icon={<ExperimentOutlined />}>
              提示词验证
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
          <Space size="middle" align="center">
            <Typography.Text style={{ color: adminTokenValid ? '#52c41a' : '#faad14' }}>
              {adminTokenValid
                ? `运营后台令牌已就绪${adminTokenInfo?.company ? ` · ${adminTokenInfo.company}` : adminTokenInfo?.tenant ? ` · ${adminTokenInfo.tenant}` : ''}`
                : adminTokenChecking ? '正在校验运营后台令牌...' : '运营后台令牌未验证'}
            </Typography.Text>
            <Button
              size="small"
              loading={adminTokenChecking}
              onClick={() => validateAdminToken(true)}
            >
              重新校验
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={() => setAdminTokenModalVisible(true)}
            >
              设置令牌
            </Button>
          </Space>
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

      <Modal
        title="运营后台 API 令牌"
        open={adminTokenModalVisible}
        onCancel={() => setAdminTokenModalVisible(false)}
        footer={[
          <Button key="clear" danger onClick={handleClearAdminToken}>
            清除
          </Button>,
          <Button key="cancel" onClick={() => setAdminTokenModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={adminTokenModalSaving || adminTokenChecking}
            onClick={handleSaveAdminToken}
          >
            保存并校验
          </Button>,
        ]}
      >
        <Typography.Paragraph>
          该令牌可通过运营后台浏览器开发者工具中的 Cookie 或请求头获取（通常为 plat_token/authorization）。粘贴后点击保存即可校验。
        </Typography.Paragraph>
        <Input.TextArea
          rows={4}
          value={adminTokenValue}
          onChange={(e) => setAdminTokenValue(e.target.value)}
          placeholder="粘贴 plat_token / authorization"
        />
        {adminTokenError && (
          <Typography.Paragraph type="danger" style={{ marginTop: 12 }}>
            {adminTokenError}
          </Typography.Paragraph>
        )}
      </Modal>
    </>
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