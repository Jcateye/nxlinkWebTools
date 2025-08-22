import React, { useState } from 'react';
import { Layout, Tabs, Card, Typography, Space } from 'antd';
import { ExperimentOutlined, SettingOutlined, FileTextOutlined, HistoryOutlined } from '@ant-design/icons';
import LLMConfig from '../components/promptValidation/LLMConfig';
import PromptManagement from '../components/promptValidation/PromptManagement';
import BatchTest from '../components/promptValidation/BatchTest';
import TestResults from '../components/promptValidation/TestResults';


const { Content } = Layout;
const { TabPane } = Tabs;
const { Title } = Typography;

const PromptValidationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('llm-config');

  return (
    <Layout style={{ minHeight: '100%', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={4} style={{ margin: 0 }}>提示词验证系统</Title>
            </div>
          }
          style={{ height: '100%' }}
          bodyStyle={{ padding: '0 24px 24px' }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            size="large"
          >
            <TabPane
              tab={
                <span>
                  <SettingOutlined />
                  LLM配置
                </span>
              }
              key="llm-config"
            >
              <LLMConfig />
            </TabPane>
            
            <TabPane
              tab={
                <span>
                  <FileTextOutlined />
                  提示词管理
                </span>
              }
              key="prompt-management"
            >
              <PromptManagement />
            </TabPane>
            
            <TabPane
              tab={
                <span>
                  <ExperimentOutlined />
                  批量测试
                </span>
              }
              key="batch-test"
            >
              <BatchTest />
            </TabPane>
            
            <TabPane
              tab={
                <span>
                  <HistoryOutlined />
                  测试结果
                </span>
              }
              key="test-results"
            >
              <TestResults />
            </TabPane>
          </Tabs>
        </Card>
      </Content>
    </Layout>
  );
};

export default PromptValidationPage; 