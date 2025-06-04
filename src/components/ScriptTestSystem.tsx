import React, { useState, useEffect } from 'react';
import { Typography, Button, Empty, Modal, Form, Input, Tabs, message } from 'antd';
import { PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { TestTask } from '../types/scriptTest';
import ScriptTestTask from './ScriptTestTask';
import { setTTSConfig } from '../services/ttsService';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const ScriptTestSystem: React.FC = () => {
  // 状态
  const [tasks, setTasks] = useState<TestTask[]>([]);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [form] = Form.useForm();
  const [settingsForm] = Form.useForm();

  // 从本地存储加载任务
  useEffect(() => {
    const savedTasks = localStorage.getItem('scriptTestTasks');
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (error) {
        console.error('解析保存的任务失败:', error);
      }
    }
  }, []);

  // 保存任务到本地存储
  useEffect(() => {
    localStorage.setItem('scriptTestTasks', JSON.stringify(tasks));
  }, [tasks]);

  // 从本地存储加载TTS设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('scriptTestSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setTTSConfig(settings);
        
        // 设置表单初始值
        settingsForm.setFieldsValue(settings);
      } catch (error) {
        console.error('解析保存的设置失败:', error);
      }
    }
  }, [settingsForm]);

  // 显示添加任务模态框
  const handleShowAddTask = () => {
    form.resetFields();
    setShowAddTaskModal(true);
  };

  // 添加任务
  const handleAddTask = () => {
    form.validateFields().then(values => {
      const now = new Date().toISOString();
      const newTask: TestTask = {
        id: uuidv4(),
        name: values.name,
        description: values.description,
        createdAt: now,
        updatedAt: now,
        cases: []
      };
      
      setTasks([...tasks, newTask]);
      setShowAddTaskModal(false);
      message.success('成功创建任务');
    });
  };

  // 更新任务
  const handleUpdateTask = (updatedTask: TestTask) => {
    const updatedTasks = tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    );
    setTasks(updatedTasks);
  };

  // 删除任务
  const handleDeleteTask = (taskId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个测试任务吗？此操作不可恢复。',
      onOk() {
        const updatedTasks = tasks.filter(task => task.id !== taskId);
        setTasks(updatedTasks);
        message.success('成功删除任务');
      }
    });
  };

  // 显示设置模态框
  const handleShowSettings = () => {
    setShowSettingsModal(true);
  };

  // 保存设置
  const handleSaveSettings = () => {
    settingsForm.validateFields().then(values => {
      // 保存到本地存储
      localStorage.setItem('scriptTestSettings', JSON.stringify(values));
      
      // 更新TTS服务配置
      setTTSConfig(values);
      
      setShowSettingsModal(false);
      message.success('成功保存设置');
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2}>话术测试系统</Title>
        <div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleShowAddTask}
            style={{ marginRight: '8px' }}
          >
            新增测试任务
          </Button>
          <Button 
            icon={<SettingOutlined />} 
            onClick={handleShowSettings}
          >
            设置
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Empty 
          description="暂无测试任务" 
          style={{ margin: '100px 0' }}
        >
          <Button type="primary" onClick={handleShowAddTask}>
            创建第一个任务
          </Button>
        </Empty>
      ) : (
        <Tabs type="card">
          {tasks.map(task => (
            <TabPane tab={task.name} key={task.id}>
              <ScriptTestTask 
                task={task} 
                onUpdate={handleUpdateTask} 
                onDelete={handleDeleteTask}
              />
            </TabPane>
          ))}
        </Tabs>
      )}

      {/* 添加任务模态框 */}
      <Modal
        title="新增测试任务"
        open={showAddTaskModal}
        onOk={handleAddTask}
        onCancel={() => setShowAddTaskModal(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="name" 
            label="任务名称" 
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          <Form.Item name="description" label="任务描述">
            <TextArea 
              placeholder="请输入任务描述（可选）" 
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 设置模态框 */}
      <Modal
        title="TTS设置"
        open={showSettingsModal}
        onOk={handleSaveSettings}
        onCancel={() => setShowSettingsModal(false)}
        width={600}
      >
        <Form form={settingsForm} layout="vertical">
          <Title level={5}>火山引擎设置</Title>
          <Form.Item 
            name="volcanoApiKey" 
            label="API Key"
          >
            <Input placeholder="请输入火山引擎API Key" />
          </Form.Item>
          <Form.Item 
            name="volcanoApiSecret" 
            label="API Secret"
          >
            <Input placeholder="请输入火山引擎API Secret" />
          </Form.Item>

          <Title level={5} style={{ marginTop: '16px' }}>11Labs设置</Title>
          <Form.Item 
            name="elevenLabsApiKey" 
            label="API Key"
          >
            <Input placeholder="请输入11Labs API Key" />
          </Form.Item>

          <Text type="secondary">
            注意：TTS服务需要对应的API密钥才能正常使用。如果没有，请先在对应服务商官网申请。
          </Text>
        </Form>
      </Modal>
    </div>
  );
};

export default ScriptTestSystem; 