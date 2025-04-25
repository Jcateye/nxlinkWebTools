import React, { useRef } from 'react';
import { Layout, Typography, Divider } from 'antd';
import UserParamsForm from './components/UserParamsForm';
import TagGroupMigration, { TagGroupMigrationHandle } from './components/TagGroupMigration';
import TagImport from './components/TagImport';
import SessionManager from './components/SessionManager';
import { UserProvider } from './context/UserContext';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const tagGroupMigrationRef = useRef<TagGroupMigrationHandle>(null);

  // 提供刷新分组列表的方法
  const refreshTagGroups = () => {
    if (tagGroupMigrationRef.current && tagGroupMigrationRef.current.refreshGroups) {
      tagGroupMigrationRef.current.refreshGroups();
    }
  };

  return (
    <UserProvider>
      <Layout className="layout">
        <Header className="header">
          <Title level={4} style={{ color: 'white', margin: '16px 0' }}>
            标签分组迁移工具
          </Title>
        </Header>
        
        <Content className="content">
          <div className="container">
            <SessionManager />
            <UserParamsForm />
            <Divider />
            <TagGroupMigration ref={tagGroupMigrationRef} />
            <Divider />
            <TagImport onImportComplete={refreshTagGroups} />
          </div>
        </Content>
        
        <Footer className="footer">
          标签分组迁移工具 ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </UserProvider>
  );
};

export default App; 