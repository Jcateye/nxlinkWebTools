import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';

interface TableRow {
  key: string;
  phoneNumber: string;
  [key: string]: any;
}

interface DynamicTableEditorProps {
  value?: TableRow[];
  onChange?: (value: TableRow[]) => void;
  disabled?: boolean;
}

export default function DynamicTableEditor({ value = [], onChange, disabled = false }: DynamicTableEditorProps) {
  const [data, setData] = useState<TableRow[]>([]);
  const [columns, setColumns] = useState<string[]>(['phoneNumber']); // 默认包含手机号列
  const [newColumnName, setNewColumnName] = useState('');

  useEffect(() => {
    if (value.length > 0) {
      setData(value);
      // 从数据中提取所有列名
      const allColumns = new Set<string>();
      value.forEach(row => {
        Object.keys(row).forEach(key => {
          if (key !== 'key') {
            allColumns.add(key);
          }
        });
      });
      setColumns(Array.from(allColumns));
    } else {
      // 初始化一行空数据
      const initialRow = { key: '1', phoneNumber: '' };
      setData([initialRow]);
    }
  }, [value]);

  const handleDataChange = (newData: TableRow[]) => {
    setData(newData);
    onChange?.(newData);
  };

  const addRow = () => {
    const newKey = String(Date.now());
    const newRow: TableRow = { key: newKey, phoneNumber: '' };
    // 为新行添加所有现有列的空值
    columns.forEach(col => {
      if (col !== 'phoneNumber') {
        newRow[col] = '';
      }
    });
    handleDataChange([...data, newRow]);
  };

  const deleteRow = (key: string) => {
    handleDataChange(data.filter(item => item.key !== key));
  };

  const addColumn = () => {
    if (!newColumnName.trim()) {
      message.warning('请输入列名');
      return;
    }
    if (columns.includes(newColumnName.trim())) {
      message.warning('列名已存在');
      return;
    }
    const newCol = newColumnName.trim();
    setColumns([...columns, newCol]);
    // 为所有现有行添加新列的空值
    const newData = data.map(row => ({ ...row, [newCol]: '' }));
    handleDataChange(newData);
    setNewColumnName('');
  };

  const deleteColumn = (columnName: string) => {
    if (columnName === 'phoneNumber') {
      message.warning('手机号列不能删除');
      return;
    }
    setColumns(columns.filter(col => col !== columnName));
    // 从所有行中删除该列
    const newData = data.map(row => {
      const { [columnName]: deleted, ...rest } = row;
      return rest;
    });
    handleDataChange(newData);
  };

  const updateCell = (key: string, columnName: string, value: string) => {
    const newData = data.map(row => {
      if (row.key === key) {
        return { ...row, [columnName]: value };
      }
      return row;
    });
    handleDataChange(newData);
  };

  const tableColumns = columns.map(col => ({
    title: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{col === 'phoneNumber' ? 'Phone Number' : col}</span>
        {col !== 'phoneNumber' && !disabled && (
          <Popconfirm
            title="确定删除此列吗？"
            onConfirm={() => deleteColumn(col)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="text" 
              size="small" 
              icon={<MinusCircleOutlined />} 
              style={{ color: '#ff4d4f' }}
            />
          </Popconfirm>
        )}
      </div>
    ),
    dataIndex: col,
    key: col,
    render: (text: string, record: TableRow) => (
      <Input
        value={text || ''}
        onChange={(e) => updateCell(record.key, col, e.target.value)}
        placeholder={col === 'phoneNumber' ? '请输入手机号' : `请输入${col}`}
        disabled={disabled}
      />
    ),
  }));

  // 添加操作列
  if (!disabled) {
    tableColumns.push({
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record: TableRow) => (
        <Popconfirm
          title="确定删除此行吗？"
          onConfirm={() => deleteRow(record.key)}
          okText="确定"
          cancelText="取消"
          disabled={data.length <= 1}
        >
          <Button 
            type="text" 
            size="small" 
            icon={<DeleteOutlined />} 
            danger
            disabled={data.length <= 1}
          />
        </Popconfirm>
      ),
    });
  }

  return (
    <div>
      {!disabled && (
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Input
              placeholder="输入新列名"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onPressEnter={addColumn}
              style={{ width: 150 }}
            />
            <Button type="dashed" onClick={addColumn} icon={<PlusOutlined />}>
              添加列
            </Button>
            <Button type="dashed" onClick={addRow} icon={<PlusOutlined />}>
              添加行
            </Button>
          </Space>
        </div>
      )}
      
      <Table
        columns={tableColumns}
        dataSource={data}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 'max-content' }}
      />
      
      <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
        共 {data.length} 行数据，每行将单独调用追加号码接口
      </div>
    </div>
  );
}
