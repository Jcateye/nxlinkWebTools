import React, { useEffect, useState } from 'react';
import { Card, List, Avatar, Typography, Button, Empty, Spin, message, Tag } from 'antd';
import { SoundOutlined, UserOutlined, WomanOutlined, ManOutlined } from '@ant-design/icons';
import { useUserContext } from '../context/UserContext';
import { getVoiceList, playVoiceSample } from '../services/api';
import { Voice } from '../types';

const { Title, Text } = Typography;

// 定义组件属性
interface VoiceListProps {
  formType: 'source' | 'target';
}

// 语言显示映射
const languageMap: Record<string, string> = {
  'en-US': '英语 (美国)',
  'en-GB': '英语 (英国)',
  'en-SG': '英语 (新加坡)',
  'es-ES': '西班牙语 (西班牙)',
  'es-MX': '西班牙语 (墨西哥)',
  'zh-CN': '中文 (普通话)',
  'zh-HK': '中文 (粤语)',
  'ja-JP': '日语',
  'ko-KR': '韩语',
  'fr-FR': '法语',
  'de-DE': '德语',
  'ru-RU': '俄语',
  'id-ID': '印尼语',
  'ms-MY': '马来语',
  'vi-VN': '越南语',
  'th-TH': '泰语',
  'hi-IN': '印地语',
  'fil-PH': '菲律宾语'
};

const VoiceList: React.FC<VoiceListProps> = ({ formType }) => {
  const { faqUserParams } = useUserContext();
  const [loading, setLoading] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);

  useEffect(() => {
    fetchVoices();
  }, [formType, faqUserParams]);

  // 获取对应的授权信息
  const getAuthorization = () => {
    if (!faqUserParams) return null;
    return formType === 'source' 
      ? faqUserParams.sourceAuthorization 
      : faqUserParams.targetAuthorization;
  };

  const fetchVoices = async () => {
    const authorization = getAuthorization();
    if (!authorization) {
      message.warning(`请先完成${formType === 'source' ? '源' : '目标'}租户身份认证`);
      return;
    }

    setLoading(true);
    try {
      const response = await getVoiceList(authorization);
      setVoices(response.list || []);
    } catch (error) {
      console.error(`获取${formType === 'source' ? '源' : '目标'}租户声音列表失败:`, error);
      message.error(`获取${formType === 'source' ? '源' : '目标'}租户声音列表失败`);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (voice: Voice) => {
    try {
      setPlayingId(voice.id);
      await playVoiceSample(voice.url);
      message.success('播放成功');
    } catch (error) {
      message.error('播放失败');
      console.error('播放失败:', error);
    } finally {
      setPlayingId(null);
    }
  };

  // 根据性别返回相应图标
  const getGenderIcon = (gender: number) => {
    switch (gender) {
      case 1:
        return <ManOutlined style={{ color: '#1890ff' }} />;
      case 2:
        return <WomanOutlined style={{ color: '#eb2f96' }} />;
      default:
        return <UserOutlined />;
    }
  };

  return (
    <Card title={<Title level={5}>{formType === 'source' ? '源' : '目标'}租户声音列表</Title>} style={{ marginBottom: 16 }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <Spin size="large" />
        </div>
      ) : voices.length === 0 ? (
        <Empty description={`暂无${formType === 'source' ? '源' : '目标'}租户声音数据`} />
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 2, xl: 2, xxl: 2 }}
          dataSource={voices}
          renderItem={(voice) => (
            <List.Item>
              <Card
                hoverable
                style={{ height: '100%' }}
                actions={[
                  <Button 
                    icon={<SoundOutlined />} 
                    onClick={() => handlePlay(voice)}
                    loading={playingId === voice.id}
                    type="link"
                  >
                    试听
                  </Button>
                ]}
              >
                <Card.Meta
                  avatar={
                    <Avatar icon={getGenderIcon(voice.gender)} />
                  }
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 16, fontWeight: 500 }} ellipsis>
                        {voice.name}
                      </Text>
                    </div>
                  }
                  description={
                    <>
                      <Tag color={voice.gender === 1 ? 'blue' : 'magenta'}>
                        {voice.gender === 1 ? '男' : '女'}
                      </Tag>
                      <Tag color="cyan">
                        {languageMap[voice.language] || voice.language}
                      </Tag>
                      <div style={{ marginTop: 12 }}>
                        <Text type="secondary" ellipsis style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {voice.content || "无示例文本"}
                        </Text>
                      </div>
                    </>
                  }
                />
              </Card>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default VoiceList; 