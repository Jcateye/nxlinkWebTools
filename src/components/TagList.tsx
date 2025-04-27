import React, { useEffect, useState, useCallback } from 'react';
import { Table, Typography, Spin, Empty, Tag, Descriptions, Card, Button, message, Input, Space, Tooltip, Popconfirm, Modal } from 'antd';
import { CopyOutlined, SearchOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { getTagList, deleteTag } from '../services/api';
import { Tag as TagType, TagAddRequest } from '../types';
import { useUserContext } from '../context/UserContext';
import Loading from './Loading';

const { Title } = Typography;
const { Search } = Input;

interface TagListProps {
  groupId: number;
  groupName: string;
  onTagsChange?: () => void;
}

const TagList: React.FC<TagListProps> = ({ groupId, groupName, onTagsChange }) => {
  const { tagUserParams } = useUserContext();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<Record<number, boolean>>({});
  const [tags, setTags] = useState<TagType[]>([]);
  const [filteredTags, setFilteredTags] = useState<TagType[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [currentDesc, setCurrentDesc] = useState('');
  const [isDescriptionModalVisible, setIsDescriptionModalVisible] = useState(false);
  const pageSize = 10;

  // 使用useCallback包装fetchTags函数
  const fetchTags = useCallback(async () => {
    if (!tagUserParams || groupId === undefined) return;

    setLoading(true);
    try {
      const response = await getTagList(
        tagUserParams.nxCloudUserID,
        tagUserParams.sourceTenantID,
        groupId,
        currentPage,
        pageSize
      );
      
      setTags(response.list);
      setFilteredTags(response.list);
      setTotal(response.total);
    } catch (error) {
      console.error('获取标签列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [groupId, currentPage, pageSize, tagUserParams]);

  // 优化useEffect依赖项，避免不必要的重新渲染
  useEffect(() => {
    fetchTags();
    // 注意：我们直接依赖fetchTags这个回调函数,它已经依赖了必要的变量
  }, [fetchTags]);

  // 当搜索文本变化时，过滤标签
  useEffect(() => {
    if (searchText) {
      const filtered = tags.filter(tag => 
        tag.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (tag.describes && tag.describes.toLowerCase().includes(searchText.toLowerCase()))
      );
      setFilteredTags(filtered);
    } else {
      setFilteredTags(tags);
    }
  }, [searchText, tags]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  // 复制标签名称
  const copyTagName = (name: string) => {
    navigator.clipboard.writeText(name)
      .then(() => {
        message.success(`已复制: ${name}`);
      })
      .catch(() => {
        message.error('复制失败，请手动复制');
      });
  };

  // 删除标签
  const handleDeleteTag = async (tagId: number) => {
    if (!tagUserParams) return;
    
    setDeleteLoading(prev => ({ ...prev, [tagId]: true }));
    
    try {
      const success = await deleteTag(
        tagId, 
        tagUserParams.nxCloudUserID, 
        tagUserParams.sourceTenantID
      );
      
      if (success) {
        message.success('标签删除成功');
        // 更新本地数据
        const updatedTags = tags.filter(tag => tag.id !== tagId);
        setTags(updatedTags);
        setFilteredTags(filteredTags.filter(tag => tag.id !== tagId));
        setTotal(prev => prev - 1);
        
        // 删除成功后通知父组件
        if (onTagsChange) {
          onTagsChange();
        }
      } else {
        message.error('标签删除失败');
      }
    } catch (error) {
      message.error('删除标签时发生错误');
      console.error('删除标签失败', error);
    } finally {
      setDeleteLoading(prev => ({ ...prev, [tagId]: false }));
    }
  };

  // 查看完整描述
  const showFullDescription = (description: string) => {
    setCurrentDesc(description);
    setIsDescriptionModalVisible(true);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '标签名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Tag color="blue">{text}</Tag>
          <Button 
            type="text" 
            icon={<CopyOutlined />} 
            size="small" 
            onClick={() => copyTagName(text)}
            style={{ marginLeft: 8 }}
          />
        </div>
      ),
    },
    {
      title: '描述',
      dataIndex: 'describes',
      key: 'describes',
      ellipsis: true,
      render: (text: string) => (
        <span className="tag-description-text">
          {text || '无描述'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: TagType) => (
        <>
          <Tooltip title="查看完整描述">
            <Button type="link" onClick={() => showFullDescription(record.describes || '')} className="tag-action-button">
              <EyeOutlined />
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定要删除这个标签吗？"
            onConfirm={() => handleDeleteTag(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger className="tag-action-button">
              <DeleteOutlined />
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  if (loading && tags.length === 0) {
    return <Loading tip="正在加载标签数据..." />;
  }

  return (
    <>
      <Card className="tag-list-card">
        <Descriptions title={`标签分组: ${groupName}`} bordered size="small" column={1}>
          <Descriptions.Item label="分组ID">{groupId}</Descriptions.Item>
          <Descriptions.Item label="标签总数">{total}</Descriptions.Item>
        </Descriptions>
        
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Search
              placeholder="搜索标签名称或描述"
              allowClear
              enterButton={<><SearchOutlined /> 搜索</>}
              size="middle"
              onSearch={handleSearch}
              style={{ maxWidth: 300 }}
            />
            
            <Spin spinning={loading}>
              {filteredTags.length > 0 ? (
                <Table
                  columns={columns}
                  dataSource={filteredTags}
                  rowKey="id"
                  pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: searchText ? filteredTags.length : total,
                    onChange: handlePageChange,
                    showSizeChanger: false,
                  }}
                />
              ) : (
                <Empty description={searchText ? "没有找到匹配的标签" : "该分组下没有标签"} />
              )}
            </Spin>
          </Space>
        </div>
      </Card>

      <Modal
        title="标签描述"
        open={isDescriptionModalVisible}
        onCancel={() => setIsDescriptionModalVisible(false)}
        footer={null}
        className="tag-description-modal"
      >
        <p>{currentDesc || '无描述'}</p>
      </Modal>
    </>
  );
};

export default TagList; 