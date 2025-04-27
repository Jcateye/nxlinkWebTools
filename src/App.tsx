import React, { useRef, useState } from 'react';
import { Layout, Typography, Menu, Row, Col, Button, Card, Divider } from 'antd';
import { ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import TagParamsForm from './components/TagParamsForm';
import FaqParamsForm from './components/FaqParamsForm';
import TagGroupMigration, { TagGroupMigrationHandle } from './components/TagGroupMigration';
import FaqGroupMigration, { FaqGroupMigrationHandle } from './components/FaqGroupMigration';
import TargetFaqGroupMigration, { TargetFaqGroupMigrationHandle } from './components/TargetFaqGroupMigration';
import TagImport from './components/TagImport';
import FaqImport from './components/FaqImport';
import { UserProvider } from './context/UserContext';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const tagGroupMigrationRef = useRef<TagGroupMigrationHandle>(null);
  const faqGroupMigrationRef = useRef<FaqGroupMigrationHandle>(null);
  const targetFaqGroupMigrationRef = useRef<TargetFaqGroupMigrationHandle>(null);
  const [activeMenu, setActiveMenu] = useState<string>('tag');

  // 提供刷新分组列表的方法
  const refreshTagGroups = () => {
    if (tagGroupMigrationRef.current && tagGroupMigrationRef.current.refreshGroups) {
      tagGroupMigrationRef.current.refreshGroups();
    }
  };

  // 刷新FAQ分组列表
  const refreshFaqGroups = () => {
    if (faqGroupMigrationRef.current && faqGroupMigrationRef.current.refreshFaqs) {
      faqGroupMigrationRef.current.refreshFaqs();
    }
  };

  // 刷新目标FAQ分组列表
  const refreshTargetFaqGroups = () => {
    if (targetFaqGroupMigrationRef.current && targetFaqGroupMigrationRef.current.refreshFaqs) {
      targetFaqGroupMigrationRef.current.refreshFaqs();
    }
  };

  // 处理菜单切换
  const handleMenuClick = (key: string) => {
    setActiveMenu(key);
  };

  // 渲染当前活动内容
  const renderContent = () => {
    switch (activeMenu) {
      case 'tag':
        return (
          <>
            <TagParamsForm />
            <TagGroupMigration ref={tagGroupMigrationRef} />
            <TagImport onImportComplete={refreshTagGroups} />
          </>
        );
      case 'faq':
        return (
          <>
            <Row gutter={24} style={{ width: '100%' }}>
              {/* 左侧：源租户面板 */}
              <Col span={11}>
                <Card title="源租户" style={{ height: '100%', marginBottom: 16 }}>
                  <FaqParamsForm formType="source" />
                  <FaqGroupMigration ref={faqGroupMigrationRef} />
                </Card>
                <FaqImport onImportComplete={refreshFaqGroups} formType="source" />
              </Col>
              {/* 中间：双向迁移按钮 */}
              <Col span={2} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <Button
                  icon={<ArrowRightOutlined />}
                  type="primary"
                  onClick={() => faqGroupMigrationRef.current?.migrateToTarget()}
                  title="迁移到目标租户"
                />
                <Button
                  icon={<ArrowLeftOutlined />}
                  type="default"
                  onClick={() => targetFaqGroupMigrationRef.current?.migrateToSource()}
                  title="迁移到源租户"
                />
              </Col>
              {/* 右侧：目标租户面板 */}
              <Col span={11}>
                <Card title="目标租户" style={{ height: '100%', marginBottom: 16 }}>
                  <FaqParamsForm formType="target" />
                  <TargetFaqGroupMigration ref={targetFaqGroupMigrationRef} />
                </Card>
                <FaqImport onImportComplete={refreshTargetFaqGroups} formType="target" />
              </Col>
            </Row>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <UserProvider>
      <Layout className="layout">
        <Header className="header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Title level={4} style={{ color: 'white', margin: '16px 24px 16px 0' }}>
              NxLink 工具箱
            </Title>
            <Menu
              theme="dark"
              mode="horizontal"
              selectedKeys={[activeMenu]}
              onClick={({key}) => handleMenuClick(key)}
              items={[
                { key: 'tag', label: '标签迁移工具' },
                { key: 'faq', label: 'FAQ迁移工具' }
              ]}
              style={{ flex: 1 }}
            />
          </div>
        </Header>
        
        <Content className="content">
          <div className="container">
            {renderContent()}
          </div>
        </Content>
        
        <Footer className="footer">
          NxLink 工具箱 ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </UserProvider>
  );
};

export default App; 