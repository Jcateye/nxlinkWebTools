import React, { useState } from 'react';
import { Card, Button, Input, Space, Dropdown, Menu, Modal, Form, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DownOutlined, ImportOutlined, ExportOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { TestCase, DialogueLine, DialogueRole } from '../types/scriptTest';
import DialogueLineComponent from './DialogueLine';
import { exportTaskToCSV } from '../services/scriptImportExport';

const { TextArea } = Input;

interface TestCaseProps {
  testCase: TestCase;
  onUpdate: (updatedCase: TestCase) => void;
  onDelete: (caseId: string) => void;
}

const TestCaseComponent: React.FC<TestCaseProps> = ({ testCase, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const [newDialogueRole, setNewDialogueRole] = useState<DialogueRole>(DialogueRole.CUSTOMER);
  const [newDialogueContent, setNewDialogueContent] = useState('');

  // 编辑案例基本信息
  const handleEditInfo = () => {
    setIsEditing(true);
    form.setFieldsValue({
      name: testCase.name
    });
  };

  // 保存案例基本信息
  const handleSaveInfo = () => {
    form.validateFields().then(values => {
      const updatedCase = {
        ...testCase,
        name: values.name
      };
      onUpdate(updatedCase);
      setIsEditing(false);
    });
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // 添加对话行
  const handleAddDialogue = () => {
    if (!newDialogueContent.trim()) {
      message.warning('对话内容不能为空');
      return;
    }

    const newLine: DialogueLine = {
      id: uuidv4(),
      role: newDialogueRole,
      content: newDialogueContent.trim()
    };

    const updatedDialogues = [...testCase.dialogues, newLine];
    const updatedCase = { ...testCase, dialogues: updatedDialogues };
    
    onUpdate(updatedCase);
    setNewDialogueContent('');
  };

  // 更新对话行
  const handleUpdateDialogue = (updatedLine: DialogueLine) => {
    const updatedDialogues = testCase.dialogues.map(line => 
      line.id === updatedLine.id ? updatedLine : line
    );
    
    const updatedCase = { ...testCase, dialogues: updatedDialogues };
    onUpdate(updatedCase);
  };

  // 删除对话行
  const handleDeleteDialogue = (lineId: string) => {
    const updatedDialogues = testCase.dialogues.filter(line => line.id !== lineId);
    const updatedCase = { ...testCase, dialogues: updatedDialogues };
    onUpdate(updatedCase);
  };

  // 角色切换菜单
  const roleMenu = (
    <Menu 
      onClick={e => setNewDialogueRole(e.key as DialogueRole)}
      selectedKeys={[newDialogueRole]}
    >
      <Menu.Item key={DialogueRole.CUSTOMER}>客户</Menu.Item>
      <Menu.Item key={DialogueRole.AGENT}>客服</Menu.Item>
    </Menu>
  );

  // 导出案例为CSV
  const handleExportCSV = () => {
    // 创建包含单个案例的临时任务对象
    const tempTask = {
      id: uuidv4(),
      name: testCase.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cases: [testCase]
    };
    
    // 导出CSV
    exportTaskToCSV(tempTask, 0);
  };

  return (
    <Card 
      title={
        !isEditing ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>{testCase.name}</span>
            <Space>
              <Button icon={<EditOutlined />} size="small" onClick={handleEditInfo}>编辑</Button>
              <Button icon={<ExportOutlined />} size="small" onClick={handleExportCSV}>导出CSV</Button>
              <Button icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(testCase.id)}>删除</Button>
            </Space>
          </div>
        ) : (
          <Form form={form} layout="inline" style={{ marginBottom: 0 }}>
            <Form.Item 
              name="name" 
              rules={[{ required: true, message: '请输入案例名称' }]}
            >
              <Input placeholder="案例名称" />
            </Form.Item>
            <Space>
              <Button type="primary" size="small" onClick={handleSaveInfo}>保存</Button>
              <Button size="small" onClick={handleCancelEdit}>取消</Button>
            </Space>
          </Form>
        )
      }
      style={{ marginBottom: 16 }}
    >
      <div style={{ marginBottom: 16 }}>
        {testCase.dialogues.map(line => (
          <DialogueLineComponent
            key={line.id}
            line={line}
            onUpdate={handleUpdateDialogue}
            onDelete={handleDeleteDialogue}
          />
        ))}
      </div>

      <div style={{ display: 'flex', marginBottom: 8 }}>
        <Dropdown overlay={roleMenu} trigger={['click']}>
          <Button style={{ marginRight: 8, width: '100px' }}>
            {newDialogueRole === DialogueRole.CUSTOMER ? '客户' : '客服'} <DownOutlined />
          </Button>
        </Dropdown>
        
        <TextArea 
          value={newDialogueContent}
          onChange={e => setNewDialogueContent(e.target.value)}
          placeholder="输入对话内容"
          autoSize={{ minRows: 1, maxRows: 3 }}
          style={{ flex: 1, marginRight: 8 }}
          onPressEnter={e => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleAddDialogue();
            }
          }}
        />
        
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddDialogue}
        >
          添加
        </Button>
      </div>
      
      <div style={{ fontSize: '12px', color: '#888' }}>
        提示：按Enter直接添加，Shift+Enter换行
      </div>
    </Card>
  );
};

export default TestCaseComponent; 