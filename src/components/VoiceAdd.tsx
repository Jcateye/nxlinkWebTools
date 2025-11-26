import React, { useState } from 'react';
import { Card, Form, Input, Button, Select, Radio, message, Upload, Typography, Space } from 'antd';
import { UploadOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getCurrentDataCenter } from '../config/apiConfig';
import { useUserContext } from '../context/UserContext';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 语言选项
const languageOptions = [
  { value: 'en-US', label: '英语 (美国)' },
  { value: 'en-GB', label: '英语 (英国)' },
  { value: 'en-SG', label: '英语 (新加坡)' },
  { value: 'es-ES', label: '西班牙语 (西班牙)' },
  { value: 'es-MX', label: '西班牙语 (墨西哥)' },
  { value: 'zh-CN', label: '中文 (普通话)' },
  { value: 'zh-HK', label: '中文 (粤语)' },
  { value: 'ja-JP', label: '日语' },
  { value: 'ko-KR', label: '韩语' },
  { value: 'fr-FR', label: '法语' },
  { value: 'de-DE', label: '德语' },
  { value: 'ru-RU', label: '俄语' },
  { value: 'id-ID', label: '印尼语' },
  { value: 'ms-MY', label: '马来语' },
  { value: 'vi-VN', label: '越南语' },
  { value: 'th-TH', label: '泰语' },
  { value: 'hi-IN', label: '印地语' },
  { value: 'fil-PH', label: '菲律宾语' }
];

// 供应商选项
const vendorOptions = [
  { value: '11', label: 'Amazon Polly' },
  { value: '12', label: 'Google Cloud TTS' },
  { value: '13', label: 'ElevenLabs' },
  { value: '14', label: 'Azure TTS' }
];

// 组件属性定义
interface VoiceAddProps {
  formType: 'source' | 'target';
  onSuccess?: () => void;
}

const VoiceAdd: React.FC<VoiceAddProps> = ({ formType, onSuccess }) => {
  const [form] = Form.useForm();
  const { faqUserParams } = useUserContext();
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [fileList, setFileList] = useState<any[]>([]);

  // 获取对应的授权信息
  const getAuthorization = () => {
    if (!faqUserParams) return null;
    return formType === 'source' 
      ? faqUserParams.sourceAuthorization 
      : faqUserParams.targetAuthorization;
  };

  // 处理文件上传
  const handleUpload = async (file: File) => {
    const authorization = getAuthorization();
    if (!authorization) {
      message.warning(`请先完成${formType === 'source' ? '源' : '目标'}租户身份认证`);
      return false;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      // 这里假设有上传文件的API，实际使用时需要替换为真实的上传API
      const baseURL = getCurrentDataCenter().baseURL;
      const response = await axios.post(
        `${baseURL}/admin/nx_flow/upload`, 
        formData, 
        {
          headers: {
            'authorization': authorization,
            'system_id': '5',
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.data.code === 0 && response.data.data) {
        setAudioUrl(response.data.data.url);
        message.success('音频文件上传成功');
        return false; // 阻止默认上传行为
      } else {
        message.error('音频上传失败: ' + (response.data.message || '未知错误'));
      }
    } catch (error) {
      console.error('上传失败:', error);
      message.error('音频上传失败，请重试');
    } finally {
      setLoading(false);
    }
    return false;
  };

  // 表单提交处理
  const handleSubmit = async (values: any) => {
    const authorization = getAuthorization();
    if (!authorization) {
      message.warning(`请先完成${formType === 'source' ? '源' : '目标'}租户身份认证`);
      return;
    }

    if (!audioUrl && !values.url) {
      message.warning('请上传声音样本或提供有效的音频URL');
      return;
    }

    setLoading(true);
    try {
      // 构建请求参数
      const payload = {
        name: values.name,
        gender: parseInt(values.gender),
        language: values.language,
        vendor: values.vendor,
        des: values.des || '',
        content: values.content || 'Hello, this is a voice sample.',
        url: audioUrl || values.url,
        bgTimbreId: 1,
        emotionArr: [],
        prompt: JSON.stringify({
          languageVoice: null,
          speakingSpeed: 0,
          similarityBoost: 0.35,
          stability: 0.5,
          volume: 100,
          pitch: 0,
          speed: 1,
          model: "eleven_turbo_v2_5",
          emotion: [],
          category: "premade",
          accent: values.accent || "American",
          age: "middle-aged",
          gender: values.gender === '1' ? "male" : "female",
          description: "expressive",
          languages: [values.language.split('-')[0]],
          use_case: "social media"
        })
      };

      // 发送请求
      const baseURL = getCurrentDataCenter().baseURL;
      const response = await axios.post(
        `${baseURL}/admin/nx_flow/voiceConfig`, 
        payload, 
        {
          headers: {
            'authorization': authorization,
            'system_id': '5',
            'Content-Type': 'application/json;charset=UTF-8'
          }
        }
      );
      
      if (response.data.code === 0) {
        message.success('声音添加成功');
        form.resetFields();
        setAudioUrl('');
        setFileList([]);
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        message.error('添加失败: ' + (response.data.message || '未知错误'));
      }
    } catch (error) {
      console.error('添加声音失败:', error);
      message.error('添加声音失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 上传组件配置
  const uploadProps = {
    beforeUpload: handleUpload,
    fileList,
    onChange({ fileList }: any) {
      setFileList(fileList);
    },
    accept: 'audio/*',
    maxCount: 1
  };

  return (
    <Card title={<Title level={5}>{`添加${formType === 'source' ? '源' : '目标'}租户声音`}</Title>} style={{ marginBottom: 16 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          gender: '1',
          language: 'en-US',
          vendor: '13'
        }}
      >
        <Form.Item 
          name="name" 
          label="声音名称" 
          rules={[{ required: true, message: '请输入声音名称' }]}
        >
          <Input placeholder="例如：客服女声、英语男声" />
        </Form.Item>

        <Form.Item 
          name="gender" 
          label="性别" 
          rules={[{ required: true, message: '请选择性别' }]}
        >
          <Radio.Group>
            <Radio value="1">男</Radio>
            <Radio value="2">女</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item 
          name="language" 
          label="语言" 
          rules={[{ required: true, message: '请选择语言' }]}
        >
          <Select placeholder="选择语言">
            {languageOptions.map(option => (
              <Option key={option.value} value={option.value}>{option.label}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
          name="vendor" 
          label="供应商" 
          rules={[{ required: true, message: '请选择供应商' }]}
        >
          <Select placeholder="选择供应商">
            {vendorOptions.map(option => (
              <Option key={option.value} value={option.value}>{option.label}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
          name="content" 
          label="示例文本"
        >
          <TextArea rows={3} placeholder="输入一段示例文本，用于展示和试听" />
        </Form.Item>

        <Form.Item 
          name="des" 
          label="描述"
        >
          <TextArea rows={2} placeholder="声音描述（可选）" />
        </Form.Item>

        <Form.Item 
          name="accent" 
          label="口音（仅用于ElevenLabs）"
        >
          <Select placeholder="选择口音">
            <Option value="American">美式</Option>
            <Option value="British">英式</Option>
            <Option value="Australian">澳式</Option>
            <Option value="African">非洲</Option>
            <Option value="Asian">亚洲</Option>
            <Option value="European">欧洲</Option>
          </Select>
        </Form.Item>

        <Form.Item label="声音样本">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} loading={loading}>上传音频文件</Button>
            </Upload>
            
            {!audioUrl && (
              <Form.Item 
                name="url" 
                noStyle
              >
                <Input placeholder="或输入音频文件URL" style={{ marginTop: 8 }} />
              </Form.Item>
            )}
            
            {audioUrl && (
              <div style={{ marginTop: 8 }}>
                <audio controls src={audioUrl} style={{ width: '100%' }} />
              </div>
            )}
          </Space>
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading} 
            icon={<SaveOutlined />}
          >
            保存
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default VoiceAdd; 