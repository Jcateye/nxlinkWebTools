import React from 'react';
import { Empty, Typography, Table, Badge } from 'antd';

const { Title, Text } = Typography;

interface MigrationResultProps {
  successGroups: string[];
}

const MigrationResult: React.FC<MigrationResultProps> = ({ successGroups }) => {
  if (successGroups.length === 0) {
    return (
      <Empty 
        description="没有成功迁移的标签分组" 
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const columns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 80,
    },
    {
      title: '分组名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      key: 'status',
      render: () => (
        <Badge status="success" text="迁移成功" />
      ),
      width: 120,
    },
  ];

  const dataSource = successGroups.map((name, index) => ({
    key: index,
    index: index + 1,
    name,
  }));

  return (
    <div>
      <Title level={5}>成功迁移的标签分组:</Title>
      <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
        共成功迁移 {successGroups.length} 个标签分组
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