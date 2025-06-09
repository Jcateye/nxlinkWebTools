import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Alert } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const TokenManager: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('plat_token');
    setHasToken(!!token);
    if (token) {
      form.setFieldsValue({ token });
    }
  }, [form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      localStorage.setItem('plat_token', values.token);
      setHasToken(true);
      setIsModalVisible(false);
      message.success('Token 已保存');
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('plat_token');
    form.resetFields();
    setHasToken(false);
    setIsModalVisible(false);
    message.success('Token 已清除');
  };

  return (
    <>
      <Button 
        icon={<SettingOutlined />} 
        onClick={() => setIsModalVisible(true)}
        type={hasToken ? "default" : "primary"}
        danger={!hasToken}
      >
        {hasToken ? 'Token已设置' : '设置Token'}
      </Button>
      
      <Modal
        title="API Token 管理"
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="clear" onClick={handleClear} danger>
            清除Token
          </Button>,
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={handleSave}>
            保存
          </Button>,
        ]}
        width={600}
      >
        <Alert
          message="说明"
          description="此Token用于访问成员管理API，请从浏览器开发者工具中复制完整的authorization token。"
          type="info"
          style={{ marginBottom: 16 }}
        />
        
        <Form form={form} layout="vertical">
          <Form.Item 
            label="Authorization Token" 
            name="token"
            rules={[{ required: true, message: '请输入Token' }]}
          >
            <Input.TextArea 
              rows={6}
              placeholder="eyJhbGciOiJIUzI1NiJ9.eyJ1SWQiOjg0MjgsImRldmljZVVuaXF1ZUlkZW50..."
            />
          </Form.Item>
        </Form>
        
        <Alert
          message="如何获取Token?"
          description={
            <div>
              <p>1. 打开浏览器开发者工具 (F12)</p>
              <p>2. 切换到 Network 标签</p>
              <p>3. 在NxLink管理后台进行任意操作</p>
              <p>4. 找到任意API请求，复制 Request Headers 中的 authorization 值</p>
            </div>
          }
          type="warning"
          style={{ marginTop: 16 }}
        />
      </Modal>
    </>
  );
};

export default TokenManager; 