import React, { useState } from 'react';
import { Card, Typography, Button, Dropdown, Menu, Space, message } from 'antd';
import { SoundOutlined, LoadingOutlined, CaretRightOutlined, PauseOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { DialogueLine as DialogueLineType, DialogueRole, TTSProvider } from '../types/scriptTest';
import { generateTTS } from '../services/ttsService';

const { Text } = Typography;

interface DialogueLineProps {
  line: DialogueLineType;
  onUpdate: (line: DialogueLineType) => void;
  onDelete: (id: string) => void;
}

const DialogueLineComponent: React.FC<DialogueLineProps> = ({ line, onUpdate, onDelete }) => {
  const [audioGenerating, setAudioGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(line.content);
  const [audioPlayer] = useState(new Audio());

  // 处理播放/暂停
  const handlePlayPause = () => {
    if (!line.audioUrl) return;

    const updatedLine = { ...line };
    
    if (line.isPlaying) {
      // 暂停播放
      audioPlayer.pause();
      updatedLine.isPlaying = false;
    } else {
      // 播放音频
      audioPlayer.src = line.audioUrl;
      audioPlayer.play()
        .then(() => {
          // 播放完成后自动更新状态
          audioPlayer.onended = () => {
            onUpdate({ ...line, isPlaying: false });
          };
        })
        .catch(error => {
          console.error('播放音频失败:', error);
          message.error('播放音频失败');
          onUpdate({ ...line, isPlaying: false });
        });
      
      updatedLine.isPlaying = true;
    }

    onUpdate(updatedLine);
  };

  // 使用火山引擎生成TTS
  const handleGenerateVolcanoTTS = async () => {
    try {
      setAudioGenerating(true);
      const audioUrl = await generateTTS(line.content, TTSProvider.VOLCANO);
      
      // 更新对话行
      const updatedLine = { 
        ...line, 
        audioUrl, 
        ttsProvider: TTSProvider.VOLCANO 
      };
      
      onUpdate(updatedLine);
      message.success('TTS生成成功');
    } catch (error) {
      console.error('生成TTS失败:', error);
      message.error('生成TTS失败');
    } finally {
      setAudioGenerating(false);
    }
  };

  // 使用11labs生成TTS
  const handleGenerateElevenLabsTTS = async () => {
    try {
      setAudioGenerating(true);
      const audioUrl = await generateTTS(line.content, TTSProvider.ELEVENLABS);
      
      // 更新对话行
      const updatedLine = { 
        ...line, 
        audioUrl, 
        ttsProvider: TTSProvider.ELEVENLABS 
      };
      
      onUpdate(updatedLine);
      message.success('TTS生成成功');
    } catch (error) {
      console.error('生成TTS失败:', error);
      message.error('生成TTS失败');
    } finally {
      setAudioGenerating(false);
    }
  };

  // TTS菜单
  const ttsMenu = (
    <Menu>
      <Menu.Item key="1" onClick={handleGenerateVolcanoTTS}>
        火山引擎
      </Menu.Item>
      <Menu.Item key="2" onClick={handleGenerateElevenLabsTTS}>
        11labs
      </Menu.Item>
    </Menu>
  );

  // 编辑对话内容
  const handleEditContent = () => {
    setIsEditing(true);
    setEditContent(line.content);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (editContent.trim() === '') return;
    
    const updatedLine = { 
      ...line,
      content: editContent.trim(),
      // 如果内容变更，清除之前的音频
      audioUrl: line.content !== editContent.trim() ? undefined : line.audioUrl,
      ttsProvider: line.content !== editContent.trim() ? undefined : line.ttsProvider
    };
    
    onUpdate(updatedLine);
    setIsEditing(false);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  return (
    <Card 
      size="small" 
      style={{ 
        marginBottom: 8, 
        background: line.role === DialogueRole.AGENT ? '#f0f8ff' : '#fff',
        borderLeft: line.role === DialogueRole.AGENT ? '3px solid #1890ff' : '3px solid #52c41a'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 4 }}>
            <Text strong>
              {line.role === DialogueRole.AGENT ? '客服' : '客户'}
            </Text>
            {line.ttsProvider && (
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                TTS引擎: {line.ttsProvider === TTSProvider.VOLCANO ? '火山引擎' : '11labs'}
              </Text>
            )}
          </div>
          
          {isEditing ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px',
                  minHeight: '60px',
                  marginBottom: '8px'
                }}
              />
              <div>
                <Button type="primary" size="small" onClick={handleSaveEdit} style={{ marginRight: 8 }}>
                  保存
                </Button>
                <Button size="small" onClick={handleCancelEdit}>
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Text>{line.content}</Text>
          )}
        </div>
        
        <Space>
          {audioGenerating ? (
            <Button icon={<LoadingOutlined />} size="small" disabled>
              生成中...
            </Button>
          ) : (
            <>
              {line.audioUrl ? (
                <Button 
                  icon={line.isPlaying ? <PauseOutlined /> : <CaretRightOutlined />} 
                  size="small"
                  onClick={handlePlayPause}
                >
                  {line.isPlaying ? '暂停' : '播放'}
                </Button>
              ) : (
                <Dropdown overlay={ttsMenu} placement="bottomRight">
                  <Button icon={<SoundOutlined />} size="small">
                    生成语音
                  </Button>
                </Dropdown>
              )}
            </>
          )}
          
          {!isEditing && (
            <>
              <Button icon={<EditOutlined />} size="small" onClick={handleEditContent}>
                编辑
              </Button>
              <Button 
                icon={<DeleteOutlined />} 
                size="small" 
                danger 
                onClick={() => onDelete(line.id)}
              >
                删除
              </Button>
            </>
          )}
        </Space>
      </div>
    </Card>
  );
};

export default DialogueLineComponent; 