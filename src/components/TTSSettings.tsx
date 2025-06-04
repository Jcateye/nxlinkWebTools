import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Tabs, Button, message } from 'antd';
import { SettingOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { getTTSConfig, setTTSConfig, generateTTS } from '../services/ttsService';
import { TTSProvider } from '../types/scriptTest';

const { TabPane } = Tabs;

interface TTSSettingsProps {
  visible: boolean;
  onClose: () => void;
}

const TTSSettings: React.FC<TTSSettingsProps> = ({ visible, onClose }) => {
  const [volcanoForm] = Form.useForm();
  const [elevenLabsForm] = Form.useForm();
  const [testText, setTestText] = useState('这是一段用于测试TTS的文本。');
  const [audioPlayer] = useState(new Audio());
  const [testing, setTesting] = useState(false);

  // 初始化表单
  useEffect(() => {
    if (visible) {
      const config = getTTSConfig();
      volcanoForm.setFieldsValue({
        apiKey: config.volcanoApiKey || '',
        apiSecret: config.volcanoApiSecret || '',
        speakerId: config.volcanoSpeakerId || 'S_7RQrrs3n1'
      });
      
      elevenLabsForm.setFieldsValue({
        apiKey: config.elevenLabsApiKey || ''
      });
    }
  }, [visible, volcanoForm, elevenLabsForm]);

  // 保存火山引擎设置
  const saveVolcanoSettings = () => {
    volcanoForm.validateFields().then(values => {
      setTTSConfig({
        volcanoApiKey: values.apiKey,
        volcanoApiSecret: values.apiSecret,
        volcanoSpeakerId: values.speakerId
      });
      message.success('火山引擎设置已保存');
    });
  };

  // 保存11labs设置
  const saveElevenLabsSettings = () => {
    elevenLabsForm.validateFields().then(values => {
      setTTSConfig({
        elevenLabsApiKey: values.apiKey
      });
      message.success('11labs设置已保存');
    });
  };

  // 测试火山引擎TTS
  const testVolcanoTTS = async () => {
    try {
      setTesting(true);
      const audioUrl = await generateTTS(testText, TTSProvider.VOLCANO);
      
      // 播放音频
      audioPlayer.src = audioUrl;
      await audioPlayer.play();
      
      message.success('火山引擎TTS测试成功');
    } catch (error) {
      console.error('测试失败:', error);
      message.error('测试失败');
    } finally {
      setTesting(false);
    }
  };

  // 测试11labs TTS
  const testElevenLabsTTS = async () => {
    try {
      setTesting(true);
      const audioUrl = await generateTTS(testText, TTSProvider.ELEVENLABS);
      
      // 播放音频
      audioPlayer.src = audioUrl;
      await audioPlayer.play();
      
      message.success('11labs TTS测试成功');
    } catch (error) {
      console.error('测试失败:', error);
      message.error('测试失败');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal
      title={<span><SettingOutlined /> TTS设置</span>}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Tabs defaultActiveKey="volcano">
        <TabPane tab="火山引擎" key="volcano">
          <Form form={volcanoForm} layout="vertical">
            <Form.Item
              name="apiKey"
              label="API Key"
              rules={[{ required: true, message: '请输入API Key' }]}
            >
              <Input.Password placeholder="请输入火山引擎API Key" />
            </Form.Item>
            <Form.Item
              name="apiSecret"
              label="API Secret"
              rules={[{ required: true, message: '请输入API Secret' }]}
            >
              <Input.Password placeholder="请输入火山引擎API Secret" />
            </Form.Item>
            <Form.Item
              name="speakerId"
              label="Speaker ID"
              rules={[{ required: true, message: '请输入Speaker ID' }]}
            >
              <Input placeholder="请输入Speaker ID" />
            </Form.Item>
            
            <Form.Item label="测试文本">
              <Input.TextArea
                value={testText}
                onChange={e => setTestText(e.target.value)}
                rows={2}
                placeholder="输入测试文本"
              />
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" onClick={saveVolcanoSettings} style={{ marginRight: 8 }}>
                保存设置
              </Button>
              <Button 
                icon={<PlayCircleOutlined />} 
                onClick={testVolcanoTTS}
                loading={testing}
              >
                测试
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
        
        <TabPane tab="11labs" key="elevenlabs">
          <Form form={elevenLabsForm} layout="vertical">
            <Form.Item
              name="apiKey"
              label="API Key"
              rules={[{ required: true, message: '请输入API Key' }]}
            >
              <Input.Password placeholder="请输入11labs API Key" />
            </Form.Item>
            
            <Form.Item label="测试文本">
              <Input.TextArea
                value={testText}
                onChange={e => setTestText(e.target.value)}
                rows={2}
                placeholder="输入测试文本"
              />
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" onClick={saveElevenLabsSettings} style={{ marginRight: 8 }}>
                保存设置
              </Button>
              <Button 
                icon={<PlayCircleOutlined />} 
                onClick={testElevenLabsTTS}
                loading={testing}
              >
                测试
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default TTSSettings; 