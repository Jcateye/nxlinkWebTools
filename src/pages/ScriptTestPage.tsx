import React, { useState, useEffect } from 'react';
import { Typography, Button, Space, Modal, Form, Input, message } from 'antd';
import { PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import ScriptTestTask from '../components/ScriptTestTask';
import TTSSettings from '../components/TTSSettings';
import { TestTask } from '../types/scriptTest';

// 模拟数据存储
const LOCAL_STORAGE_KEY = 'script_test_tasks';

const { Title } = Typography;
const { TextArea } = Input;

const ScriptTestPage: React.FC = () => {
  const [tasks, setTasks] = useState<TestTask[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [form] = Form.useForm();

  // 加载任务
  useEffect(() => {
    const savedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (error) {
        console.error('加载任务失败:', error);
        message.error('加载任务失败');
      }
    }
  }, []);

  // 保存任务到本地存储
  const saveTasks = (tasksToSave: TestTask[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasksToSave));
  };

  // 创建新任务
  const handleCreateTask = () => {
    form.validateFields().then(values => {
      const newTask: TestTask = {
        id: uuidv4(),
        name: values.name,
        description: values.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cases: []
      };
      
      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      
      setShowCreateModal(false);
      form.resetFields();
      
      message.success('创建任务成功');
    });
  };

  // 更新任务
  const handleUpdateTask = (updatedTask: TestTask) => {
    const updatedTasks = tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    );
    
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  // 删除任务
  const handleDeleteTask = (taskId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个测试任务吗？',
      onOk() {
        const updatedTasks = tasks.filter(task => task.id !== taskId);
        setTasks(updatedTasks);
        saveTasks(updatedTasks);
        message.success('删除任务成功');
      }
    });
  };

  // 显示创建任务模态框
  const showCreateTaskModal = () => {
    form.resetFields();
    setShowCreateModal(true);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2}>话术测试</Title>
        <Space>
          <Button 
            icon={<SettingOutlined />}
            onClick={() => setShowTTSSettings(true)}
          >
            TTS设置
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={showCreateTaskModal}
          >
            创建任务
          </Button>
        </Space>
      </div>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <Title level={4} style={{ color: '#888' }}>暂无测试任务</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={showCreateTaskModal}
            style={{ marginTop: '16px' }}
          >
            创建第一个任务
          </Button>
        </div>
      ) : (
        <div>
          {tasks.map(task => (
            <ScriptTestTask 
              key={task.id} 
              task={task} 
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      )}

      <Modal
        title="创建测试任务"
        open={showCreateModal}
        onOk={handleCreateTask}
        onCancel={() => setShowCreateModal(false)}
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
            <TextArea rows={4} placeholder="请输入任务描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      <TTSSettings
        visible={showTTSSettings}
        onClose={() => setShowTTSSettings(false)}
      />
    </div>
  );
};

export default ScriptTestPage; 