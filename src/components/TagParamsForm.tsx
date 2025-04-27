import React, { useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { useUserContext } from '../context/UserContext';
import { TagUserParams } from '../types';
import axios from 'axios';

const { Text } = Typography;

const TagParamsForm: React.FC = () => {
  const { tagUserParams, setTagUserParams, sessionId } = useUserContext();
  const [form] = Form.useForm();

  // 从本地存储加载已保存的参数（只执行一次）
  useEffect(() => {
    if (sessionId) {
      try {
        const savedParams = localStorage.getItem(`tagUserParams_${sessionId}`);
        if (savedParams) {
          const params = JSON.parse(savedParams) as TagUserParams;
          form.setFieldsValue(params);
          console.log('📝 已从本地存储加载标签参数：', params);
        }
      } catch (error) {
        console.error('加载标签参数失败：', error);
      }
    }
  }, [sessionId]);

  const handleSubmit = (values: TagUserParams) => {
    try {
      setTagUserParams(values);
      console.log('💾 用户保存了标签参数：', values);
      // 保存到本地存储
      if (sessionId) {
        localStorage.setItem(`tagUserParams_${sessionId}`, JSON.stringify(values));
      }
      
      // 保存身份信息后调用 is_login 获取公司和团队信息
      axios.put('/api/admin/saas_plat/user/is_login', null, {
        headers: {
          authorization: values.authorization,
          system_id: '5',
          time_zone: 'UTC+08:00'
        }
      })
      .then(res => {
        const info = res.data?.data?.userInfo;
        if (info) {
          const { company, tenantName } = info;
          message.info(`公司: ${company || '-'}，团队: ${tenantName || '-'}`);
        }
      })
      .catch(err => {
        console.error('获取用户信息失败', err);
        message.error('获取用户信息失败，请检查Token');
      });
      
      message.success('身份信息保存成功');
    } catch (error) {
      console.error('保存参数失败:', error);
      message.error('保存身份信息失败');
    }
  };

  return (
    <Card title="标签迁移参数设置" style={{ marginBottom: 20 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={tagUserParams || undefined}
      >
        <Form.Item
          name="nxCloudUserID"
          label={
            <>
              NxCloud 用户ID <Text type="secondary" style={{ fontSize: 12 }}>获取路径：运营平台-用户管理-用户列表-搜索账号</Text>
            </>
          }
          rules={[{ required: true, message: '请输入NxCloud用户ID' }]}
        >
          <Input placeholder="请输入NxCloud用户ID" />
        </Form.Item>

        <Form.Item
          name="sourceTenantID"
          label={
            <>
              源租户ID <Text type="secondary" style={{ fontSize: 12 }}>获取路径：运营平台-团队管理-团队列表</Text>
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
              目标租户ID <Text type="secondary" style={{ fontSize: 12 }}>获取路径：运营平台-团队管理-团队列表</Text>
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
              API令牌 <Text type="secondary" style={{ fontSize: 12 }}>获取路径: 运营平台-开发者工具(F12)-应用（Application）-左边目录的Cookies-nxlink域名下Name是"plat_token"的Value</Text>
            </>
          }
          rules={[{ required: true, message: '请输入API令牌' }]}
        >
          <Input.Password placeholder="请输入API令牌" />
        </Form.Item>

        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          注意：所有参数在NxLink控制台可以找到。如有疑问，请联系技术支持。
        </Text>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            保存身份信息
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TagParamsForm; 