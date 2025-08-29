import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Space, 
  message, 
  Tag, 
  Descriptions,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  UnlockOutlined
} from '@ant-design/icons';

interface ApiKeyConfig {
  apiKey: string;
  alias: string;
  description?: string;
  openapi: {
    accessKey: string;
    accessSecret: string;
    bizType: string;
    baseUrl: string;
  };
}

interface ApiKeyItem {
  apiKey: string;
  alias: string;
  description: string;
  hasOpenApiConfig: boolean;
  openApiBaseUrl: string;
  bizType: string;
}

interface ApiKeyStats {
  totalKeys: number;
  keys: ApiKeyItem[];
  stats?: {
    fileKeys: number;
    envKeys: number;
    lastUpdated: string;
    version: string;
    configFilePath: string;
  };
}

export default function ApiKeyManagementPage() {
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyStats | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyConfig | null>(null);
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');
  const [fullApiKeyInfo, setFullApiKeyInfo] = useState<any>(null);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // 生成随机API Key（Base62），并确保不与已有冲突
  const generateRandomApiKey = (length: number = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint32Array(length);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 4294967296);
    }
    let out = '';
    for (let i = 0; i < length; i++) {
      out += chars[array[i] % chars.length];
    }
    return out;
  };

  // 脱敏显示API Key（超过8位显示前8位+***）
  const maskApiKey = (apiKey: string): string => {
    if (!apiKey || apiKey.length <= 8) {
      return apiKey;
    }
    return apiKey.substring(0, 8) + '***';
  };

  const handleGenerateApiKey = () => {
    const existing = new Set((apiKeys?.keys || []).map(k => k.apiKey));
    let candidate = '';
    let attempts = 0;
    do {
      candidate = generateRandomApiKey(32);
      attempts += 1;
    } while (existing.has(candidate) && attempts < 5);
    if (existing.has(candidate)) {
      // 极低概率连续碰撞，再拉长长度
      candidate = generateRandomApiKey(40);
    }
    form.setFieldsValue({ apiKey: candidate });
    message.success('已生成新的 API Key');
  };

  // 加载API Keys信息
  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch('/internal-api/keys/list');
      const result = await response.json();
      
      if (result.code === 200) {
        setApiKeys(result.data);
      } else {
        message.error(`加载失败: ${result.message}`);
      }
    } catch (error: any) {
      message.error(`网络错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  // 测试API Key
  const testApiKey = async (apiKey: string) => {
    try {
      const response = await fetch('/internal-api/keys/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey })
      });
      const result = await response.json();
      
      if (result.code === 200) {
        const data = result.data;
        message.success(`API Key "${data.alias}" 测试成功`);
        Modal.info({
          title: 'API Key 测试结果',
          zIndex: 1000,
          content: (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="API Key">
                <Space>
                  <span style={{ fontFamily: 'monospace' }}>{maskApiKey(data.apiKey)}</span>
                  <Tooltip title="查看完整API Key（需要超级管理员密码）">
                    <Button
                      size="small"
                      icon={<UnlockOutlined />}
                      onClick={() => handleViewFullApiKey(data.apiKey)}
                    />
                  </Tooltip>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="别名">{data.alias}</Descriptions.Item>
              <Descriptions.Item label="描述">{data.description}</Descriptions.Item>
              <Descriptions.Item label="测试结果">
                <Tag color={data.testResult.isValid ? 'success' : 'error'}>
                  {data.testResult.message}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="OpenAPI配置">
                {data.config.hasOpenApiConfig ? 
                  <Tag color="success">已配置</Tag> : 
                  <Tag color="error">未配置</Tag>
                }
              </Descriptions.Item>
              <Descriptions.Item label="服务地址">{data.config.openApiBaseUrl}</Descriptions.Item>
              <Descriptions.Item label="业务类型">{data.config.bizType}</Descriptions.Item>
              <Descriptions.Item label="测试时间">{new Date(data.testResult.timestamp).toLocaleString()}</Descriptions.Item>
            </Descriptions>
          )
        });
      } else {
        message.error(`测试失败: ${result.message}`);
      }
    } catch (error: any) {
      message.error(`测试失败: ${error.message}`);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '别名',
      dataIndex: 'alias',
      key: 'alias',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'API Key',
      dataIndex: 'apiKey',
      key: 'apiKey',
      render: (apiKey: string) => (
        <Space>
          <span>{maskApiKey(apiKey)}</span>
          <Tooltip title="查看完整API Key（需要超级管理员密码）">
            <Button
              size="small"
              icon={<UnlockOutlined />}
              onClick={() => handleViewFullApiKey(apiKey)}
            />
          </Tooltip>
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'OpenAPI配置',
      dataIndex: 'hasOpenApiConfig',
      key: 'hasOpenApiConfig',
      render: (hasConfig: boolean) => (
        hasConfig ? 
          <Tag color="success" icon={<CheckCircleOutlined />}>已配置</Tag> :
          <Tag color="error" icon={<ExclamationCircleOutlined />}>未配置</Tag>
      )
    },
    {
      title: '服务地址',
      dataIndex: 'openApiBaseUrl',
      key: 'openApiBaseUrl',
      ellipsis: true
    },
    {
      title: '业务类型',
      dataIndex: 'bizType',
      key: 'bizType'
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: ApiKeyItem) => (
        <Space>
          <Tooltip title="测试API Key">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => testApiKey(record.apiKey)}
            />
          </Tooltip>
          <Tooltip title="编辑配置">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="删除配置">
            <Popconfirm
              title="确定要删除这个API Key配置吗？"
              onConfirm={() => handleDelete(record.apiKey)}
              okText="确定"
              cancelText="取消"
            >
              <Button 
                size="small" 
                danger 
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  // 处理编辑
  const handleEdit = async (record: ApiKeyItem) => {
    try {
      // 从后端获取脱敏后的详细信息
      const response = await fetch(`/internal-api/keys/detail/${record.apiKey}`);
      const result = await response.json();

      if (result.code === 200) {
        const keyDetail = result.data;
        setEditingKey({
          apiKey: keyDetail.apiKey,
          alias: keyDetail.alias,
          description: keyDetail.description,
          openapi: {
            accessKey: keyDetail.openapi.accessKey, // 脱敏后的值，如 "AK-1234***" 或空
            accessSecret: keyDetail.openapi.accessSecret, // 脱敏后的值，如 "***" 或空
            bizType: keyDetail.openapi.bizType,
            baseUrl: keyDetail.openapi.baseUrl
          }
        });
        form.setFieldsValue({
          apiKey: keyDetail.apiKey, // 这里设置真实值，但显示时会被脱敏
          alias: keyDetail.alias,
          description: keyDetail.description,
          accessKey: keyDetail.openapi.accessKey,
          accessSecret: keyDetail.openapi.accessSecret,
          bizType: keyDetail.openapi.bizType,
          baseUrl: keyDetail.openapi.baseUrl
        });
        setModalVisible(true);
      } else {
        message.error(`获取详情失败: ${result.message}`);
      }
    } catch (error: any) {
      message.error(`获取详情失败: ${error.message}`);
    }
  };

  // 处理查看完整API Key
  const handleViewFullApiKey = (apiKey: string) => {
    setSelectedApiKey(apiKey);
    setPasswordModalVisible(true);
    passwordForm.resetFields();
  };

  // 处理密码验证
  const handlePasswordVerify = async (values: any) => {
    try {
      const response = await fetch('/internal-api/keys/verify-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: values.password
        })
      });
      const result = await response.json();

      if (result.code === 200 && result.data.isValid) {
        // 密码验证成功，获取完整API Key信息
        const fullDetailResponse = await fetch(`/internal-api/keys/full-detail/${selectedApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            password: values.password
          })
        });
        const fullDetailResult = await fullDetailResponse.json();

        if (fullDetailResult.code === 200) {
          setFullApiKeyInfo(fullDetailResult.data);
          setPasswordModalVisible(false);
          setDetailModalVisible(true);
          message.success('验证成功！');
        } else {
          message.error(`获取完整信息失败: ${fullDetailResult.message}`);
        }
      } else {
        message.error('超级管理员密码验证失败！');
      }
    } catch (error: any) {
      message.error(`验证失败: ${error.message}`);
    }
  };

  // 处理删除
  const handleDelete = async (apiKey: string) => {
    try {
      const response = await fetch(`/internal-api/keys/delete/${apiKey}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.code === 200) {
        message.success('API Key 删除成功');
        loadApiKeys(); // 重新加载列表
      } else {
        message.error(`删除失败: ${result.message}`);
      }
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`);
    }
  };

  // 处理添加
  const handleAdd = () => {
    setEditingKey(null);
    form.resetFields();
    form.setFieldsValue({
      bizType: '8',
      baseUrl: 'https://api-westus.nxlink.ai'
    });
    setModalVisible(true);
  };

  // 保存API Key（新增或编辑）
  const handleSave = async (values: any) => {
    try {
      const isEdit = !!editingKey;
      
      const apiKeyConfig: ApiKeyConfig = {
        apiKey: values.apiKey,
        alias: values.alias,
        description: values.description || '',
        openapi: {
          accessKey: values.accessKey,
          accessSecret: values.accessSecret,
          bizType: values.bizType,
          baseUrl: values.baseUrl
        }
      };

      // 如果是编辑模式，检查密钥字段是否为脱敏值
      if (isEdit && editingKey) {
        // 如果 accessKey 是脱敏值（包含***）且与原始脱敏值相同，则不发送此字段
        if (values.accessKey && 
            values.accessKey.includes('***') && 
            values.accessKey === editingKey.openapi.accessKey) {
          delete apiKeyConfig.openapi.accessKey;
        }
        
        // 如果 accessSecret 是脱敏值（***）且与原始脱敏值相同，则不发送此字段
        if (values.accessSecret && 
            values.accessSecret === '***' && 
            values.accessSecret === editingKey.openapi.accessSecret) {
          delete apiKeyConfig.openapi.accessSecret;
        }
      }

      const url = isEdit ? `/internal-api/keys/update/${editingKey.apiKey}` : '/internal-api/keys/add';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiKeyConfig)
      });

      const result = await response.json();
      
      if (result.code === 200) {
        message.success(isEdit ? 'API Key 更新成功' : 'API Key 添加成功');
        setModalVisible(false);
        loadApiKeys(); // 重新加载列表
      } else {
        message.error(`保存失败: ${result.message}`);
      }
    } catch (error: any) {
      message.error(`保存失败: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title="API Key 多租户管理" style={{ marginBottom: 24 }}>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Statistic 
              title="总API Key数量" 
              value={apiKeys?.totalKeys || 0} 
              prefix={<KeyOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="已配置OpenAPI" 
              value={apiKeys?.keys.filter(k => k.hasOpenApiConfig).length || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="未配置OpenAPI" 
              value={apiKeys?.keys.filter(k => !k.hasOpenApiConfig).length || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
        </Row>

        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加API Key
            </Button>
            <Button onClick={loadApiKeys} loading={loading}>
              刷新
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={apiKeys?.keys || []}
          loading={loading}
          rowKey="apiKey"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>

      <Card title="配置说明">
        <Descriptions column={1} bordered>
          <Descriptions.Item label="多租户架构">
            每个外部平台拥有独立的API Key和OpenAPI配置，实现租户隔离
          </Descriptions.Item>
          <Descriptions.Item label="配置方式">
            通过环境变量配置，支持动态加载和热更新
          </Descriptions.Item>
          <Descriptions.Item label="安全特性">
            敏感信息（accessKey、accessSecret）不在前端显示，仅后端使用
          </Descriptions.Item>
          <Descriptions.Item label="脱敏显示">
            API Key超过8位时显示前8位+***，点击解锁图标可查看完整信息（需要超级管理员密码）
          </Descriptions.Item>
          <Descriptions.Item label="超级管理员密码">
            配置在项目配置文件中，用于查看完整的API Key信息，默认密码：F511522591
          </Descriptions.Item>
          <Descriptions.Item label="测试功能">
            点击"测试"按钮可以验证API Key的有效性和配置完整性
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f6ffed', borderRadius: 6 }}>
          <h4>环境变量配置示例：</h4>
          <pre style={{ fontSize: '12px', margin: 0 }}>
{`# 超级管理员密码（可选，默认：F511522591）
ADMIN_PASSWORD=F511522591

# 租户1配置
EXTERNAL_API_KEY_1=platform-a-key-12345
EXTERNAL_API_KEY_1_ALIAS=客户平台A
EXTERNAL_API_KEY_1_DESC=A公司的外呼系统
EXTERNAL_API_KEY_1_OPENAPI_ACCESS_KEY=AK-xxxxx-A
EXTERNAL_API_KEY_1_OPENAPI_ACCESS_SECRET=secret-A
EXTERNAL_API_KEY_1_OPENAPI_BIZ_TYPE=8
EXTERNAL_API_KEY_1_OPENAPI_BASE_URL=https://api-westus.nxlink.ai`}
          </pre>
        </div>
      </Card>

      {/* 密码验证 Modal */}
      <Modal
        title={
          <Space>
            <LockOutlined />
            超级管理员密码验证
          </Space>
        }
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        footer={null}
        width={400}
        destroyOnClose
        zIndex={2000}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordVerify}
        >
          <Form.Item
            label="超级管理员密码"
            name="password"
            rules={[
              { required: true, message: '请输入超级管理员密码' }
            ]}
          >
            <Input.Password
              placeholder="请输入超级管理员密码"
              autoFocus
            />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setPasswordModalVisible(false);
                passwordForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                验证密码
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 完整API Key信息 Modal */}
      <Modal
        title={
          <Space>
            <KeyOutlined />
            完整API Key信息
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setFullApiKeyInfo(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false);
            setFullApiKeyInfo(null);
          }}>
            关闭
          </Button>
        ]}
        width={700}
        destroyOnClose
        zIndex={1500}
      >
        {fullApiKeyInfo && (
          <Descriptions
            title="API Key 详细信息"
            bordered
            column={1}
            size="small"
          >
            <Descriptions.Item label="API Key">
              <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                {fullApiKeyInfo.apiKey}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="别名">
              <strong>{fullApiKeyInfo.alias}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {fullApiKeyInfo.description || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="Access Key">
              <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {fullApiKeyInfo.openapi.accessKey}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Access Secret">
              <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {fullApiKeyInfo.openapi.accessSecret}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="业务类型">
              {fullApiKeyInfo.openapi.bizType}
            </Descriptions.Item>
            <Descriptions.Item label="服务地址">
              {fullApiKeyInfo.openapi.baseUrl}
            </Descriptions.Item>
            <Descriptions.Item label="验证时间">
              {new Date(fullApiKeyInfo.verifiedAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 添加/编辑API Key Modal */}
      <Modal
        title={editingKey ? '编辑 API Key' : '添加 API Key'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            bizType: '8',
            baseUrl: 'https://api-westus.nxlink.ai'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              {editingKey ? (
                <Form.Item label="API Key">
                  <Input 
                    value={maskApiKey(editingKey.apiKey)}
                    disabled={true}
                    addonAfter={
                      <Tooltip title="查看完整API Key（需要超级管理员密码）">
                        <Button 
                          size="small" 
                          icon={<UnlockOutlined />}
                          onClick={() => handleViewFullApiKey(editingKey.apiKey)}
                        />
                      </Tooltip>
                    }
                  />
                  {/* 隐藏的真实值用于表单提交 */}
                  <Form.Item name="apiKey" hidden>
                    <Input />
                  </Form.Item>
                </Form.Item>
              ) : (
                <Form.Item
                  label="API Key"
                  name="apiKey"
                  rules={[
                    { required: true, message: '请输入API Key' },
                    { min: 8, message: 'API Key至少8位' }
                  ]}
                >
                  <Input 
                    placeholder="请输入API Key"
                    addonAfter={
                      <Button size="small" onClick={handleGenerateApiKey}>生成</Button>
                    }
                  />
                </Form.Item>
              )}
            </Col>
            <Col span={12}>
              <Form.Item
                label="别名"
                name="alias"
                rules={[
                  { required: true, message: '请输入别名' },
                  { max: 50, message: '别名不能超过50字符' }
                ]}
              >
                <Input placeholder="请输入别名" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="描述"
            name="description"
            rules={[
              { max: 200, message: '描述不能超过200字符' }
            ]}
          >
            <Input.TextArea 
              placeholder="请输入描述信息"
              rows={2}
            />
          </Form.Item>

          <Divider orientation="left">OpenAPI 配置</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Access Key"
                name="accessKey"
                rules={[
                  { required: true, message: '请输入Access Key' }
                ]}
                help={editingKey ? "显示 *** 表示已配置（脱敏显示），修改请输入新值" : undefined}
              >
                <Input 
                  placeholder={editingKey ? "已配置(脱敏)，修改请输入新值" : "请输入OpenAPI Access Key"} 
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Access Secret"
                name="accessSecret"
                rules={[
                  { required: true, message: '请输入Access Secret' }
                ]}
                help={editingKey ? "显示 *** 表示已配置（脱敏显示），修改请输入新值" : undefined}
              >
                <Input.Password 
                  placeholder={editingKey ? "已配置(脱敏)，修改请输入新值" : "请输入OpenAPI Access Secret"} 
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="业务类型"
                name="bizType"
                rules={[
                  { required: true, message: '请输入业务类型' }
                ]}
              >
                <Input placeholder="通常为8" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="服务地址"
                name="baseUrl"
                rules={[
                  { required: true, message: '请输入服务地址' },
                  { type: 'url', message: '请输入有效的URL' }
                ]}
              >
                <Input placeholder="https://api-westus.nxlink.ai" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingKey ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
