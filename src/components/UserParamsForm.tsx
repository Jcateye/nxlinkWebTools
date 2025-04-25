import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserParams } from '../types';
import { saveUserParams, getUserParams } from '../services/api';
import { useUserContext } from '../context/UserContext';

const { Text, Link } = Typography;

const UserParamsForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { setUserParams, sessionId } = useUserContext();

  // 组件加载时从本地存储加载参数
  useEffect(() => {
    const savedParams = getUserParams(sessionId);
    if (savedParams.nxCloudUserID) {
      form.setFieldsValue(savedParams);
    }
  }, [form, sessionId]);

  const handleSubmit = (values: UserParams) => {
    setLoading(true);
    try {
      // 使用setUserParams，它已经集成了会话ID
      setUserParams(values);
      message.success('参数保存成功');
    } catch (error) {
      message.error('保存参数失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>通用参数设置</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            会话ID: {sessionId.slice(0, 8)}...
          </Text>
        </div>
      } 
      style={{ marginBottom: 16 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={getUserParams(sessionId)}
      >
        <Form.Item
          name="nxCloudUserID"
          label={
            <>
              nxCloudUserID
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                获取路径：运营平台-用户管理-
                <Link href="https://nxlink.nxcloud.com/admin/manager/#/user/list" target="_blank">
                  用户列表
                </Link>
                -搜索账号
              </Text>
            </>
          }
          rules={[{ required: true, message: '请输入nxCloudUserID' }]}
        >
          <Input placeholder="请输入nxCloudUserID" />
        </Form.Item>

        <Form.Item
          name="sourceTenantID"
          label={
            <>
              源租户ID (Source Tenant ID)
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                获取路径：运营平台-团队管理-
                <Link href="https://nxlink.nxcloud.com/admin/manager/#/team/list" target="_blank">
                  团队列表
                </Link>
              </Text>
            </>
          }
          rules={[{ required: true, message: '请输入源租户ID' }]}
        >
          <Input placeholder="请输入源租户ID" />
        </Form.Item>

        <Form.Item
          name="targetTenantID"
          label={
            <>
              目标租户ID (Target Tenant ID)
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                获取路径：运营平台-团队管理-
                <Link href="https://nxlink.nxcloud.com/admin/manager/#/team/list" target="_blank">
                  团队列表
                </Link>
              </Text>
            </>
          }
          rules={[{ required: true, message: '请输入目标租户ID' }]}
        >
          <Input placeholder="请输入目标租户ID" />
        </Form.Item>

        <Form.Item
          name="authorization"
          label={
            <>
              Authorization
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                获取路径: 运营平台-开发者工具(F12)-应用（Application）-左边目录的Cookies-nxlink域名下Name是"plat_token"的Value
              </Text>
            </>
          }
          rules={[{ required: true, message: '请输入Authorization令牌' }]}
        >
          <Input.TextArea 
            rows={3} 
            placeholder="请输入Authorization令牌" 
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存参数
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default UserParamsForm; 