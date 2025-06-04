import React, { useState } from 'react';
import { Card, Typography, Button, Input, Space, Modal, Form, Upload, message, Dropdown, Menu } from 'antd';
import { EditOutlined, UploadOutlined, DownloadOutlined, PlusOutlined, InboxOutlined, DownOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { TestTask, TestCase } from '../types/scriptTest';
import TestCaseComponent from './TestCase';
import { exportTaskToExcel, exportTaskToCSV, importTaskFromExcel } from '../services/scriptImportExport';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

interface ScriptTestTaskProps {
  task: TestTask;
  onUpdate: (updatedTask: TestTask) => void;
  onDelete: (taskId: string) => void;
}

const ScriptTestTask: React.FC<ScriptTestTaskProps> = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const [isImporting, setIsImporting] = useState(false);

  // 编辑任务基本信息
  const handleEditInfo = () => {
    setIsEditing(true);
    form.setFieldsValue({
      name: task.name,
      description: task.description || ''
    });
  };

  // 保存任务基本信息
  const handleSaveInfo = () => {
    form.validateFields().then(values => {
      const updatedTask = {
        ...task,
        name: values.name,
        description: values.description,
        updatedAt: new Date().toISOString()
      };
      onUpdate(updatedTask);
      setIsEditing(false);
    });
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // 添加测试案例
  const handleAddTestCase = () => {
    const newCase: TestCase = {
      id: uuidv4(),
      name: `测试案例 ${task.cases.length + 1}`,
      dialogues: []
    };
    
    const updatedCases = [...task.cases, newCase];
    const updatedTask = { 
      ...task, 
      cases: updatedCases,
      updatedAt: new Date().toISOString()
    };
    
    onUpdate(updatedTask);
  };

  // 更新测试案例
  const handleUpdateTestCase = (updatedCase: TestCase) => {
    const updatedCases = task.cases.map(c => 
      c.id === updatedCase.id ? updatedCase : c
    );
    
    const updatedTask = { 
      ...task, 
      cases: updatedCases,
      updatedAt: new Date().toISOString()
    };
    
    onUpdate(updatedTask);
  };

  // 删除测试案例
  const handleDeleteTestCase = (caseId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个测试案例吗？',
      onOk() {
        const updatedCases = task.cases.filter(c => c.id !== caseId);
        const updatedTask = { 
          ...task, 
          cases: updatedCases,
          updatedAt: new Date().toISOString()
        };
        onUpdate(updatedTask);
      }
    });
  };

  // 导出Excel
  const handleExportExcel = () => {
    exportTaskToExcel(task);
  };

  // 导出CSV
  const handleExportCSV = () => {
    exportTaskToCSV(task);
  };

  // 导出菜单
  const exportMenu = (
    <Menu>
      <Menu.Item key="1" onClick={handleExportExcel}>
        导出为Excel(.xlsx)
      </Menu.Item>
      <Menu.Item key="2" onClick={handleExportCSV}>
        导出为CSV(.csv)
      </Menu.Item>
    </Menu>
  );

  // 显示导入模态框
  const handleShowImport = () => {
    setIsImporting(true);
  };

  // 处理文件上传
  const handleFileUpload = (file: File) => {
    // 验证文件类型
    const isExcelOrCSV = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                          file.type === 'text/csv' ||
                          file.name.endsWith('.xlsx') ||
                          file.name.endsWith('.csv');
    
    if (!isExcelOrCSV) {
      message.error('只支持Excel(.xlsx)或CSV(.csv)格式的文件');
      return false;
    }

    importTaskFromExcel(file)
      .then(importedTask => {
        // 合并导入的测试案例到当前任务
        const updatedTask = {
          ...task,
          cases: [...task.cases, ...importedTask.cases],
          updatedAt: new Date().toISOString()
        };
        
        onUpdate(updatedTask);
        setIsImporting(false);
        message.success('成功导入测试案例');
      })
      .catch(error => {
        message.error(`导入失败: ${error.message}`);
      });
    
    return false; // 阻止默认上传行为
  };

  // 上传组件属性
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.csv',
    beforeUpload: handleFileUpload,
    showUploadList: false
  };

  return (
    <Card
      title={
        !isEditing ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={3}>{task.name}</Title>
            <Space>
              <Button icon={<EditOutlined />} onClick={handleEditInfo}>编辑</Button>
              <Button icon={<UploadOutlined />} onClick={handleShowImport}>导入</Button>
              <Dropdown overlay={exportMenu}>
                <Button>
                  <Space>
                    <DownloadOutlined />
                    导出
                    <DownOutlined />
                  </Space>
                </Button>
              </Dropdown>
              <Button type="primary" danger onClick={() => onDelete(task.id)}>删除任务</Button>
            </Space>
          </div>
        ) : (
          <Form form={form} layout="vertical" style={{ marginBottom: 0 }}>
            <Form.Item 
              name="name" 
              rules={[{ required: true, message: '请输入任务名称' }]}
              style={{ marginBottom: 8 }}
            >
              <Input placeholder="任务名称" />
            </Form.Item>
            <Form.Item name="description" style={{ marginBottom: 8 }}>
              <TextArea placeholder="任务描述（可选）" autoSize={{ minRows: 1, maxRows: 3 }} />
            </Form.Item>
            <Space>
              <Button type="primary" onClick={handleSaveInfo}>保存</Button>
              <Button onClick={handleCancelEdit}>取消</Button>
            </Space>
          </Form>
        )
      }
      style={{ marginBottom: 24 }}
    >
      {!isEditing && (
        <>
          {task.description && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              {task.description}
            </Text>
          )}
          
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary">创建时间: {new Date(task.createdAt).toLocaleString()}</Text>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">更新时间: {new Date(task.updatedAt).toLocaleString()}</Text>
          </div>
        </>
      )}

      <div style={{ marginBottom: 16 }}>
        {task.cases.map(testCase => (
          <TestCaseComponent 
            key={testCase.id} 
            testCase={testCase} 
            onUpdate={handleUpdateTestCase}
            onDelete={handleDeleteTestCase}
          />
        ))}
      </div>

      <Button 
        type="dashed" 
        icon={<PlusOutlined />} 
        onClick={handleAddTestCase}
        style={{ width: '100%' }}
      >
        添加测试案例
      </Button>

      <Modal
        title="导入文件"
        open={isImporting}
        onCancel={() => setIsImporting(false)}
        footer={null}
      >
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持导入Excel文件(.xlsx)和CSV文件(.csv)
          </p>
          <p className="ant-upload-hint">
            Excel格式: 每个工作表会被导入为一个测试案例
          </p>
          <p className="ant-upload-hint">
            CSV格式: 第一列为客户对话，第二列为客服对话
          </p>
        </Dragger>
      </Modal>
    </Card>
  );
};

export default ScriptTestTask; 