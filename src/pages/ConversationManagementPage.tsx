import React, { useState } from 'react';
import { Row, Col, Card } from 'antd';
import { Conversation } from '../types';
import ConversationList from '../components/conversation/ConversationList';
import ConversationDetail from '../components/conversation/ConversationDetail';

const ConversationManagementPage: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={24}>
        <Col span={8}>
          <Card title="会话列表">
            <ConversationList onSelectConversation={setSelectedConversation} />
          </Card>
        </Col>
        <Col span={16}>
          <Card title="会话详情">
            {selectedConversation ? (
              <ConversationDetail conversation={selectedConversation} />
            ) : (
              <p>请从左侧选择一个会话查看详情</p>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ConversationManagementPage;
