import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, Space, Modal, message, Card, Row, Col, Tag, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Prompt } from '../../types/promptValidation';
import PromptValidationApiService from '../../services/promptValidationApi';

const { TextArea } = Input;

const PromptManagement: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const apiService = PromptValidationApiService.getInstance();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const response = await apiService.getPrompts();
      if (response.success && response.data) {
        setPrompts(response.data);
      } else {
        message.error(response.error || '加载提示词失败');
        // 降级到localStorage
        const savedPrompts = localStorage.getItem('prompts');
        if (savedPrompts) {
          setPrompts(JSON.parse(savedPrompts));
        }
      }
    } catch (error) {
      console.error('加载提示词失败:', error);
      message.error('加载提示词失败，请检查网络连接');
      // 降级到localStorage
      const savedPrompts = localStorage.getItem('prompts');
      if (savedPrompts) {
        setPrompts(JSON.parse(savedPrompts));
      }
    } finally {
      setLoading(false);
    }
  };

  const showModal = (prompt?: Prompt) => {
    if (prompt) {
      setEditingPrompt(prompt);
      form.setFieldsValue({
        name: prompt.name,
        systemPrompt: prompt.systemPrompt || '',
        userPrompt: prompt.userPrompt || prompt.content || '', // 向后兼容
        description: prompt.description,
        category: prompt.category || '',
        tags: prompt.tags || [],
      });
    } else {
      setEditingPrompt(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // 从系统提示词和用户提示词中提取变量
      const combinedContent = `${values.systemPrompt || ''} ${values.userPrompt || ''}`;
      const variableMatches = combinedContent.match(/\{\{([^}]+)\}\}/g);
      const variables: string[] = variableMatches 
        ? Array.from(new Set(variableMatches.map((match: string) => match.slice(2, -2).trim())))
        : [];

      const promptData = {
        name: values.name,
        systemPrompt: values.systemPrompt || '',
        userPrompt: values.userPrompt || '',
        content: values.userPrompt || '', // 向后兼容
        description: values.description,
        category: values.category || '',
        tags: Array.isArray(values.tags) ? values.tags.filter((tag: any) => typeof tag === 'string') : [],
        variables,
      };

      setLoading(true);
      try {
        let response;
        if (editingPrompt) {
          response = await apiService.updatePrompt(editingPrompt.id, promptData);
          if (response.success) {
            message.success('更新成功');
          } else {
            message.error(response.error || '更新失败');
          }
        } else {
          response = await apiService.createPrompt(promptData);
          if (response.success) {
            message.success('添加成功');
          } else {
            message.error(response.error || '添加失败');
          }
        }

        if (response.success) {
          await loadPrompts(); // 重新加载数据
          setIsModalVisible(false);
          form.resetFields();
        }
      } catch (error) {
        console.error('API调用失败:', error);
        message.error('操作失败，请检查网络连接');
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个提示词吗？',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await apiService.deletePrompt(id);
          if (response.success) {
            message.success('删除成功');
            await loadPrompts(); // 重新加载数据
          } else {
            message.error(response.error || '删除失败');
          }
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败，请检查网络连接');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleCopy = async (prompt: Prompt) => {
    const newPromptData = {
      name: `${prompt.name} (复制)`,
      systemPrompt: prompt.systemPrompt || '',
      userPrompt: prompt.userPrompt || '',
      content: prompt.userPrompt || prompt.content || '',
      description: prompt.description,
      category: prompt.category || '',
      tags: prompt.tags || [],
      variables: prompt.variables || [],
    };
    
    setLoading(true);
    try {
      const response = await apiService.createPrompt(newPromptData);
      if (response.success) {
        message.success('复制成功');
        await loadPrompts(); // 重新加载数据
      } else {
        message.error(response.error || '复制失败');
      }
    } catch (error) {
      console.error('复制失败:', error);
      message.error('复制失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '变量',
      dataIndex: 'variables',
      key: 'variables',
      width: 150,
      render: (variables: string[]) => (
        <>
          {variables?.map(variable => (
            <Tag key={variable} color="blue">
              {variable}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: '内容预览',
      key: 'promptPreview',
      ellipsis: true,
      render: (record: Prompt) => {
        const systemPrompt = record.systemPrompt || '';
        const userPrompt = record.userPrompt || record.content || '';
        const combinedContent = systemPrompt + ' ' + userPrompt;
        
        return (
          <div>
            {systemPrompt && (
              <div style={{ marginBottom: 4 }}>
                <Tag color="blue">System</Tag>
                <span style={{ fontSize: '12px', color: '#666', marginLeft: 4 }}>
                  {systemPrompt.length > 50 ? systemPrompt.substring(0, 50) + '...' : systemPrompt}
                </span>
              </div>
            )}
            <div>
              <Tag color="green">User</Tag>
              <span style={{ fontSize: '12px', marginLeft: 4 }}>
                {userPrompt.length > 50 ? userPrompt.substring(0, 50) + '...' : userPrompt}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Prompt) => (
        <Space size="middle">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(record)}
          >
            复制
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <h3>提示词管理</h3>
        </Col>
        <Col>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadPrompts}
              loading={loading}
            >
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
              添加提示词
            </Button>
          </Space>
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={prompts}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `共 ${total} 条`,
          }}
        />
      </Spin>

      <Modal
        title={editingPrompt ? '编辑提示词' : '添加提示词'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={900}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="提示词名称"
                rules={[{ required: true, message: '请输入提示词名称' }]}
              >
                <Input placeholder="输入提示词名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
              >
                <Input placeholder="输入分类（可选）" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input placeholder="输入提示词描述（可选）" />
          </Form.Item>

          <Form.Item
            name="systemPrompt"
            label={
              <span>
                系统提示词 (System Prompt)
                <span style={{ color: '#999', marginLeft: 8 }}>
                  定义AI的角色、行为和规则
                </span>
              </span>
            }
          >
            <TextArea 
              rows={6} 
              placeholder={`输入系统提示词，例如：
你是一个专业的{{角色}}助手。你的任务是帮助用户{{任务描述}}。

请遵循以下规则：
1. 保持专业和友好的语调
2. 提供准确和有用的信息
3. 如果不确定，请明确说明
4. 使用清晰简洁的语言`}
            />
          </Form.Item>

          <Form.Item
            name="userPrompt"
            label={
              <span>
                用户提示词 (User Prompt)
                <span style={{ color: '#999', marginLeft: 8 }}>
                  (使用 {`{{变量名}}`} 来定义变量)
                </span>
              </span>
            }
            rules={[{ required: true, message: '请输入用户提示词内容' }]}
          >
            <TextArea 
              rows={8} 
              placeholder={`输入用户提示词内容，例如：
请帮我分析以下{{内容类型}}：

{{内容}}

请从以下几个方面进行分析：
1. {{分析维度1}}
2. {{分析维度2}}
3. {{分析维度3}}

请提供详细的分析结果和建议。`}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const systemPrompt = getFieldValue('systemPrompt') || '';
              const userPrompt = getFieldValue('userPrompt') || '';
              const combinedContent = `${systemPrompt} ${userPrompt}`;
              const variableMatches = combinedContent.match(/\{\{([^}]+)\}\}/g);
              const variables: string[] = variableMatches 
                ? [...new Set(variableMatches.map((match: string) => match.slice(2, -2).trim()))]
                : [];
              
              return variables.length > 0 ? (
                <Form.Item label="检测到的变量">
                  <div style={{ marginBottom: 8 }}>
                    {variables.map((variable: string) => (
                      <Tag key={variable} color="blue" style={{ marginRight: 8, marginBottom: 4 }}>
                        {variable}
                      </Tag>
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    这些变量可以在批量测试时动态替换
                  </div>
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          <Card 
            size="small" 
            title="提示词预览" 
            style={{ backgroundColor: '#fafafa', marginTop: 16 }}
          >
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => {
                const systemPrompt = getFieldValue('systemPrompt') || '';
                const userPrompt = getFieldValue('userPrompt') || '';
                
                return (
                  <div>
                    {systemPrompt && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 'bold', color: '#1890ff', marginBottom: 4 }}>
                          System:
                        </div>
                        <div style={{ 
                          padding: 8, 
                          backgroundColor: '#e6f7ff', 
                          border: '1px solid #91d5ff',
                          borderRadius: 4,
                          whiteSpace: 'pre-wrap',
                          fontSize: '12px'
                        }}>
                          {systemPrompt || '(空)'}
                        </div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#52c41a', marginBottom: 4 }}>
                        User:
                      </div>
                      <div style={{ 
                        padding: 8, 
                        backgroundColor: '#f6ffed', 
                        border: '1px solid #b7eb8f',
                        borderRadius: 4,
                        whiteSpace: 'pre-wrap',
                        fontSize: '12px'
                      }}>
                        {userPrompt || '(空)'}
                      </div>
                    </div>
                  </div>
                );
              }}
            </Form.Item>
          </Card>
        </Form>
      </Modal>
    </div>
  );
};

export default PromptManagement; 