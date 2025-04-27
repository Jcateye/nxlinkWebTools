import React from 'react';
import { Empty, Typography, Table, Badge, Spin } from 'antd';

const { Title, Text } = Typography;

interface MigrationResultProps {
  successItems: string[];
  itemType?: string;
  loading?: boolean;
}

const MigrationResult: React.FC<MigrationResultProps> = ({ 
  successItems, 
  itemType = '标签分组',
  loading = false
}) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>正在迁移{itemType}，请稍候...</div>
      </div>
    );
  }

  if (successItems.length === 0) {
    return (
      <Empty 
        description={`没有成功迁移的${itemType}`} 
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // 判断是否有分组-名称对象，用于标签/FAQ明细迁移
  const isNested = typeof successItems[0] === 'object';
  const columns = isNested
    ? [
        { title: '序号', dataIndex: 'index', key: 'index', width: 80 },
        { title: '分组名称', dataIndex: 'groupName', key: 'groupName' },
        { title: itemType, dataIndex: 'name', key: 'name' },
        { title: '状态', key: 'status', width: 120, render: () => <Badge status="success" text="迁移成功" /> }
      ]
    : [
        { title: '序号', dataIndex: 'index', key: 'index', width: 80 },
        { title: `${itemType}名称`, dataIndex: 'name', key: 'name' },
        { title: '状态', key: 'status', width: 120, render: () => <Badge status="success" text="迁移成功" /> }
      ];

  const dataSource = successItems.map((item, index) => {
    if (isNested) {
      const nested = item as any;
      return { key: index, index: index + 1, groupName: nested.groupName, name: nested.name };
    }
    return { key: index, index: index + 1, name: item as string };
  });

  return (
    <div>
      <Title level={5}>成功迁移的{itemType}:</Title>
      <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
        共成功迁移 {successItems.length} 个{itemType}
      </Text>
      <Table 
        columns={columns} 
        dataSource={dataSource} 
        pagination={false}
        size="small"
        bordered
      />
    </div>
  );
};

export default MigrationResult; 