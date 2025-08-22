import React, { useState, useEffect } from 'react';
import { Spin, Alert, List, Card, Avatar, Button } from 'antd';
import { UserOutlined, DownloadOutlined } from '@ant-design/icons';
import { getConversationDetail } from '../../services/api';
import { Conversation, Message } from '../../types';

interface ConversationDetailProps {
  conversation: Conversation;
}

const ConversationDetail: React.FC<ConversationDetailProps> = ({ conversation }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getConversationDetail(conversation.relate_session_id);
        if (response.code === 0) {
          setMessages(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch conversation details');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [conversation]);

  const handleExport = () => {
    const chatHistory = messages
      .filter(msg => msg.msgType === 24 || msg.msgType === 31 || msg.msgType === 34)
      .map(item => {
        const { text } = parseMsgInfo(item.msgInfo);
        const role = item.direction === 1 ? 'user' : 'assistant';
        const timestamp = new Date(item.createTs).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });
        return `[${timestamp}] ${role}: ${text}`;
      })
      .join('\\n\\n');

    const blob = new Blob([chatHistory], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `conversation-${conversation.relate_session_id}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseMsgInfo = (msgInfo: string | null) => {
    if (!msgInfo) return { text: 'No message content' };
    try {
      const info = JSON.parse(msgInfo);
      return {
        text: info.text || '...',
        audio_url: info.audio_url || null,
        name: info.name || null
      };
    } catch (e) {
      return { text: msgInfo };
    }
  };

  if (loading) {
    return <Spin />;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <>
      <Button
        icon={<DownloadOutlined />}
        onClick={handleExport}
        style={{ marginBottom: '16px' }}
        disabled={messages.length === 0}
      >
        导出聊天记录
      </Button>
      <div style={{ height: '55vh', overflowY: 'auto', padding: '16px', border: '1px solid #f0f0f0', borderRadius: '2px' }}>
        <List
          itemLayout="horizontal"
          dataSource={messages.filter(msg => msg.msgType === 24 || msg.msgType === 31 || msg.msgType === 34)}
          renderItem={item => {
            const { text, name } = parseMsgInfo(item.msgInfo);
            const isUser = item.direction === 1;
            const alignStyle: React.CSSProperties = isUser ? { textAlign: 'left' } : { textAlign: 'right' };
            const bubbleStyle: React.CSSProperties = {
              background: isUser ? '#e6f7ff' : '#f0f0f0',
              padding: '8px 12px',
              borderRadius: '12px',
              display: 'inline-block',
              maxWidth: '70%',
              ...alignStyle
            };

            return (
              <List.Item style={{ borderBottom: 'none', ...alignStyle }}>
                <div style={{ width: '100%'}}>
                  <div style={alignStyle}>
                  <Avatar icon={<UserOutlined />} style={{ background: isUser ? '#1890ff' : '#bfbfbf', marginRight: '8px', marginLeft: '8px', float: isUser ? 'left' : 'right' }} />
                    <Card size="small" style={bubbleStyle}>
                      <p><strong>{name}</strong></p>
                      <p>{text}</p>
                    </Card>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      </div>
    </>
  );
};

export default ConversationDetail;
