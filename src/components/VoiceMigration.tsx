import React, { useState, useEffect } from 'react';
import { Card, List, Checkbox, Button, message, Typography, Avatar, Tag, Empty, Spin, Divider, Alert, Row, Col } from 'antd';
import { SoundOutlined, UserOutlined, WomanOutlined, ManOutlined, SyncOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Voice } from '../types';
import { useUserContext } from '../context/UserContext';
import { getVoiceList, playVoiceSample } from '../services/api';
import axios from 'axios';

const { Title, Text } = Typography;

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

const VoiceMigration: React.FC = () => {
  const { faqUserParams } = useUserContext();
  const [sourceVoices, setSourceVoices] = useState<Voice[]>([]);
  const [targetVoices, setTargetVoices] = useState<Voice[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [targetLoading, setTargetLoading] = useState(false);
  const [selectedVoices, setSelectedVoices] = useState<number[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migratedNames, setMigratedNames] = useState<string[]>([]);

  useEffect(() => {
    if (faqUserParams) {
      fetchSourceVoices();
      fetchTargetVoices();
    }
  }, [faqUserParams]);

  const fetchSourceVoices = async () => {
    if (!faqUserParams || !faqUserParams.sourceAuthorization) {
      message.warning('请先完成源租户身份认证');
      return;
    }

    setSourceLoading(true);
    try {
      const response = await getVoiceList(faqUserParams.sourceAuthorization);
      setSourceVoices(response.list || []);
    } catch (error) {
      console.error('获取源租户声音列表失败:', error);
      message.error('获取源租户声音列表失败');
    } finally {
      setSourceLoading(false);
    }
  };

  const fetchTargetVoices = async () => {
    if (!faqUserParams || !faqUserParams.targetAuthorization) {
      message.warning('请先完成目标租户身份认证');
      return;
    }

    setTargetLoading(true);
    try {
      const response = await getVoiceList(faqUserParams.targetAuthorization);
      setTargetVoices(response.list || []);
    } catch (error) {
      console.error('获取目标租户声音列表失败:', error);
      message.error('获取目标租户声音列表失败');
    } finally {
      setTargetLoading(false);
    }
  };

  const handlePlay = async (voice: Voice) => {
    try {
      setPlayingId(voice.id);
      await playVoiceSample(voice.url);
    } catch (error) {
      message.error('播放失败');
      console.error('播放失败:', error);
    } finally {
      setPlayingId(null);
    }
  };

  const handleSelect = (voiceId: number) => {
    setSelectedVoices(prev => {
      if (prev.includes(voiceId)) {
        return prev.filter(id => id !== voiceId);
      } else {
        return [...prev, voiceId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedVoices.length === sourceVoices.length) {
      setSelectedVoices([]);
    } else {
      setSelectedVoices(sourceVoices.map(voice => voice.id));
    }
  };

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

  // 检查声音是否已在目标租户中存在（基于名称）
  const isVoiceExistsInTarget = (voice: Voice) => {
    return targetVoices.some(targetVoice => targetVoice.name === voice.name);
  };

  const handleMigration = async () => {
    if (!faqUserParams || !faqUserParams.targetAuthorization) {
      message.warning('请先完成目标租户身份认证');
      return;
    }

    if (selectedVoices.length === 0) {
      message.warning('请至少选择一个声音进行迁移');
      return;
    }

    setMigrating(true);
    setMigratedNames([]);
    
    try {
      const successNames: string[] = [];
      
      // 过滤出选择的声音
      const voicesToMigrate = sourceVoices.filter(voice => selectedVoices.includes(voice.id));
      
      for (const voice of voicesToMigrate) {
        try {
          // 判断目标租户是否已存在同名声音
          if (isVoiceExistsInTarget(voice)) {
            message.warning(`声音 "${voice.name}" 在目标租户中已存在，将跳过`);
            continue;
          }
          
          // 构建迁移请求参数
          const payload = {
            name: voice.name,
            gender: voice.gender,
            language: voice.language,
            vendor: voice.vendor,
            des: voice.des || '',
            content: voice.content,
            url: voice.url,
            bgTimbreId: voice.bgTimbreId || 1,
            emotionArr: [],
            prompt: voice.prompt || '{}'
          };

          // 发送请求
          const response = await axios.post(
            '/api/admin/nx_flow/voiceConfig', 
            payload, 
            {
              headers: {
                'authorization': faqUserParams.targetAuthorization,
                'system_id': '5',
                'Content-Type': 'application/json;charset=UTF-8'
              }
            }
          );
          
          if (response.data.code === 0) {
            successNames.push(voice.name);
          } else {
            console.error(`迁移声音 "${voice.name}" 失败:`, response.data);
            message.error(`迁移声音 "${voice.name}" 失败: ${response.data.message || '未知错误'}`);
          }
        } catch (error) {
          console.error(`迁移声音 "${voice.name}" 失败:`, error);
          message.error(`迁移声音 "${voice.name}" 失败，请重试`);
        }
      }
      
      if (successNames.length > 0) {
        message.success(`成功迁移 ${successNames.length} 个声音`);
        setMigratedNames(successNames);
        // 刷新目标租户声音列表
        fetchTargetVoices();
      } else {
        message.warning('没有声音被成功迁移');
      }
    } catch (error) {
      console.error('迁移声音失败:', error);
      message.error('迁移声音失败，请重试');
    } finally {
      setMigrating(false);
    }
  };

  // 是否显示全选按钮
  const showSelectAll = sourceVoices.length > 0;
  
  // 是否已全选
  const allSelected = sourceVoices.length > 0 && selectedVoices.length === sourceVoices.length;

  return (
    <>
      {migratedNames.length > 0 && (
        <Alert
          message="迁移成功"
          description={
            <div>
              <p>以下声音已成功迁移到目标租户：</p>
              <ul>
                {migratedNames.map((name, index) => (
                  <li key={index}>{name}</li>
                ))}
              </ul>
            </div>
          }
          type="success"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={24} style={{ width: '100%' }}>
        {/* 左侧：源租户声音列表 */}
        <Col span={11}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={5}>源租户声音列表</Title>
                {showSelectAll && (
                  <Checkbox
                    checked={allSelected}
                    onChange={handleSelectAll}
                  >
                    全选
                  </Checkbox>
                )}
              </div>
            }
            style={{ marginBottom: 16 }}
          >
            {sourceLoading ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <Spin size="large" />
              </div>
            ) : sourceVoices.length === 0 ? (
              <Empty description="暂无源租户声音数据" />
            ) : (
              <List
                grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 1, xl: 1, xxl: 2 }}
                dataSource={sourceVoices}
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
                      extra={
                        <Checkbox
                          checked={selectedVoices.includes(voice.id)}
                          onChange={() => handleSelect(voice.id)}
                          disabled={isVoiceExistsInTarget(voice)}
                        />
                      }
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
                            {isVoiceExistsInTarget(voice) && (
                              <Tag color="orange">目标租户已存在</Tag>
                            )}
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
        </Col>

        {/* 中间：迁移按钮 */}
        <Col span={2} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            onClick={handleMigration}
            loading={migrating}
            disabled={selectedVoices.length === 0}
            size="large"
            style={{ marginBottom: 16 }}
          >
            迁移
          </Button>
        </Col>

        {/* 右侧：目标租户声音列表 */}
        <Col span={11}>
          <Card
            title={<Title level={5}>目标租户声音列表</Title>}
            style={{ marginBottom: 16 }}
          >
            {targetLoading ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <Spin size="large" />
              </div>
            ) : targetVoices.length === 0 ? (
              <Empty description="暂无目标租户声音数据" />
            ) : (
              <List
                grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 1, xl: 1, xxl: 2 }}
                dataSource={targetVoices}
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
        </Col>
      </Row>
    </>
  );
};

export default VoiceMigration; 