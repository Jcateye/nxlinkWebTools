import React, { useState } from 'react';
import { 
  Modal, 
  Tabs, 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  message, 
  Space,
  Typography,
  Row,
  Col,
  Divider,
  Checkbox
} from 'antd';
import { 
  LoginOutlined,
  KeyOutlined,
  MailOutlined, 
  PhoneOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  SaveOutlined
} from '@ant-design/icons';
import { nxlinkClientLogin, generateDeviceId, generateLoginKey } from '../services/api';
import { LoginResponse } from '../types';

const { TabPane } = Tabs;
const { Option } = Select;
const { Text } = Typography;

interface AuthModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (token: string, method: 'login' | 'manual', remember?: boolean) => void;
  title?: string;
  description?: string;
  currentToken?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  visible, 
  onCancel, 
  onSuccess, 
  title = "身份认证",
  description,
  currentToken = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [activeAuthType, setActiveAuthType] = useState<'login' | 'manual'>('login');
  const [activeLoginType, setActiveLoginType] = useState<'email' | 'phone'>('phone');
  const [token, setToken] = useState(currentToken);
  const [remember, setRemember] = useState<boolean>(true);

  // 处理登录
  const handleLogin = async (values: any) => {
    setLoading(true);
    
    try {
      const deviceId = generateDeviceId();
      const loginKey = generateLoginKey();
      
      const loginData = {
        password: values.password,
        ...(activeLoginType === 'email' ? { email: values.email } : { phone: values.phone }),
        loginMethod: activeLoginType === 'email' ? 0 : 1,
        key: loginKey,
        deviceUniqueIdentification: deviceId
      };

      console.log('执行登录操作:', { ...loginData, password: '[HIDDEN]' });
      
      const response: LoginResponse = await nxlinkClientLogin(loginData);
      
      if (response.code === 0 && response.data?.token) {
        message.success('登录成功！');
        onSuccess(response.data.token, 'login', remember);
      } else {
        message.error(response.message || '登录失败');
      }
    } catch (error: any) {
      console.error('登录失败:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('登录失败，请检查网络连接或稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 处理手动输入Token
  const handleManualToken = () => {
    if (!token.trim()) {
      message.error('请输入Token');
      return;
    }
    
    message.success('Token已设置');
    onSuccess(token.trim(), 'manual', remember);
  };

  // 渲染登录表单
  const renderLoginForm = () => (
    <Tabs 
      activeKey={activeLoginType} 
      onChange={(key) => setActiveLoginType(key as 'email' | 'phone')}
      type="card"
      size="small"
      centered
    >
      <TabPane 
        tab={
          <Space>
            <MailOutlined />
            邮箱/账号登录
          </Space>
        } 
        key="email"
      >
        <Form
          name="emailLogin"
          onFinish={handleLogin}
          layout="vertical"
        >
          <Form.Item
            name="email"
            label="邮箱地址"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="请输入邮箱地址"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              size="large"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              icon={<LoginOutlined />}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </TabPane>

      <TabPane 
        tab={
          <Space>
            <PhoneOutlined />
            手机登录
          </Space>
        } 
        key="phone"
      >
        <Form
          name="phoneLogin"
          onFinish={handleLogin}
          layout="vertical"
        >
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
            ]}
          >
            <Input
              addonBefore={
                <Select defaultValue="+86" style={{ width: 70 }}>
                  <Option value="+86">+86</Option>
                </Select>
              }
              placeholder="13751030137"
              size="large"
              maxLength={11}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              size="large"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              icon={<LoginOutlined />}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </TabPane>
    </Tabs>
  );

  // 渲染手动输入Token表单
  const renderManualTokenForm = () => (
    <Form layout="vertical">
      <Form.Item label="身份认证Token">
        <Input.TextArea
          rows={4}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="请输入您的身份认证Token"
          prefix={<KeyOutlined />}
        />
      </Form.Item>
      <Form.Item>
        <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)}>自动登录（下次打开自动恢复Token）</Checkbox>
      </Form.Item>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
        获取路径: NXLink网页界面-开发者工具(F12)-应用（Application）-左边目录的Cookies-nxlink域名下Name是"token"的Value
      </Text>
      <Button
        type="primary"
        onClick={handleManualToken}
        disabled={!token.trim()}
        size="large"
        block
        icon={<SaveOutlined />}
      >
        设置Token
      </Button>
    </Form>
  );

  return (
    <Modal
      title={
        <Space>
          <KeyOutlined />
          {title}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      {description && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f6f8fa', borderRadius: 6 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {description}
          </Text>
        </div>
      )}

      <Tabs
        activeKey={activeAuthType}
        onChange={(key) => setActiveAuthType(key as 'login' | 'manual')}
        type="card"
        size="large"
        centered
        style={{ marginBottom: 16 }}
      >
        <TabPane
          tab={
            <Space>
              <LoginOutlined />
              登录授权
            </Space>
          }
          key="login"
        >
          <Card bodyStyle={{ padding: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)}>自动登录（下次打开自动恢复Token）</Checkbox>
            </div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12 }}>
              使用账号密码登录获取Token，登录成功后会自动填入Token
            </Text>
            {renderLoginForm()}
          </Card>
        </TabPane>

        <TabPane
          tab={
            <Space>
              <KeyOutlined />
              手动输入
            </Space>
          }
          key="manual"
        >
          <Card bodyStyle={{ padding: 16 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12 }}>
              如果您已有Token，可直接输入
            </Text>
            {renderManualTokenForm()}
          </Card>
        </TabPane>
      </Tabs>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Space split="|" size="small">
          <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }}>
            忘记密码
          </Button>
          <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }}>
            注册账号
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default AuthModal;
