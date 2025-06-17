import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  message, 
  Modal, 
  Spin, 
  Typography, 
  Space, 
  Empty,
  Tag,
  Tooltip,
  Input,
  Alert
} from 'antd';
import { EyeOutlined, SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { TagGroup } from '../types';
import { getTagGroupList, migrateTagGroups, exportTagsFromGroups } from '../services/api';
import { useUserContext } from '../context/UserContext';
import Loading from './Loading';
import MigrationResult from './MigrationResult';
import TagList from './TagList';

const { Text } = Typography;
const { Search } = Input;

// 定义组件类型
interface TagGroupMigrationProps {}

// 定义暴露给父组件的方法
export interface TagGroupMigrationHandle {
  refreshGroups: () => Promise<void>;
}

const TagGroupMigration = forwardRef<TagGroupMigrationHandle, TagGroupMigrationProps>((props, ref) => {
  const { tagUserParams } = useUserContext();
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<TagGroup[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [successGroups, setSuccessGroups] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [tagListModalVisible, setTagListModalVisible] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<number>(0);
  const [currentGroupName, setCurrentGroupName] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefix, setPrefix] = useState<string>('');
  const [isPrefixModalVisible, setIsPrefixModalVisible] = useState<boolean>(false);
  
  // 当用户参数变化时，加载标签分组
  useEffect(() => {
    if (tagUserParams?.nxCloudUserID && tagUserParams?.sourceTenantID) {
      fetchTagGroups();
    }
  }, [tagUserParams]);

  // 过滤标签分组
  useEffect(() => {
    if (searchText) {
      const filtered = tagGroups.filter(group => 
        group.group_name.toLowerCase().includes(searchText.toLowerCase()) || 
        group.id.toString().includes(searchText)
      );
      setFilteredGroups(filtered);
    } else {
      setFilteredGroups(tagGroups);
    }
  }, [searchText, tagGroups]);

  // 获取标签分组列表
  const fetchTagGroups = async () => {
    if (!tagUserParams) return;
    
    setLoading(true);
    setError(null);
    try {
      // 检查必要参数
      if (!tagUserParams.nxCloudUserID || !tagUserParams.sourceTenantID || !tagUserParams.authorization) {
        throw new Error('必要参数不完整，请检查您的标签参数设置');
      }
      
      console.log(`📑 [TagGroupMigration] 获取标签分组列表 -> userID: ${tagUserParams.nxCloudUserID}, sourceTenantID: ${tagUserParams.sourceTenantID}`);
      
      const groups = await getTagGroupList(
        tagUserParams.nxCloudUserID,
        tagUserParams.sourceTenantID
      );
      setTagGroups(groups);
      setFilteredGroups(groups);
      console.log(`✅ [TagGroupMigration] 已获取标签分组，共 ${groups.length} 条`);
    } catch (error: any) {
      let errorMsg = '获取标签分组失败';
      
      if (error.response) {
        const { status, data } = error.response;
        errorMsg = `获取标签分组失败 (状态码: ${status})`;
        
        if (data) {
          if (data.message) {
            errorMsg += `: ${data.message}`;
          } else if (typeof data === 'string') {
            errorMsg += `: ${data}`;
          }
        }
        
        // 针对特定错误码提供更具体的提示
        if (status === 401) {
          errorMsg = 'API令牌无效或已过期，请重新设置API令牌';
        } else if (status === 403) {
          errorMsg = '没有权限访问标签分组，请检查您的账号权限';
        } else if (status === 404) {
          errorMsg = 'API接口不存在，请确认服务是否正确部署';
        }
      } else if (error.request) {
        errorMsg = '服务器未响应，请检查您的网络连接和API服务状态';
      } else {
        errorMsg = `请求错误: ${error.message}`;
      }
      
      message.error(errorMsg);
      setError(errorMsg);
      console.error('❌ [TagGroupMigration] 获取标签分组失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 暴露刷新方法给父组件
  useImperativeHandle(ref, () => ({
    refreshGroups: fetchTagGroups
  }));

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  // 处理行选择
  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  // 表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const showPrefixModal = () => {
    if (selectedRowKeys.length === 0) {
      message.error('请选择要迁移的标签分组');
      return;
    }
    if (!tagUserParams?.targetTenantID) {
      message.error('请设置目标租户ID');
      return;
    }
    setIsPrefixModalVisible(true);
  };

  const handlePrefixModalOk = () => {
    setIsPrefixModalVisible(false);
    handleMigrate();
  };

  const handlePrefixModalCancel = () => {
    setIsPrefixModalVisible(false);
    setPrefix(''); // Reset prefix if cancelled
  };

  // 开始迁移
  const handleMigrate = async () => {
    if (!tagUserParams) {
      message.error('请先设置Tag参数');
      return;
    }

    if (selectedRowKeys.length === 0) {
      message.error('请选择要迁移的标签分组');
      return;
    }
    
    // 检查必要参数
    if (!tagUserParams.targetTenantID) {
      message.error('请设置目标租户ID');
      return;
    }

    setMigrating(true);
    setModalVisible(true);
    setError(null);
    
    try {
      // 转换selectedRowKeys为数字数组
      const selectedIds = selectedRowKeys.map((key: React.Key) => Number(key));
      
      const migrationOptions = prefix ? {
        prefixProcessing: true,
        prefixAdd: prefix,
        prefixRemove: '',
      } : undefined;

      console.log('开始迁移标签分组:', {
        selectedIds,
        nxCloudUserID: tagUserParams.nxCloudUserID,
        sourceTenantID: tagUserParams.sourceTenantID,
        targetTenantID: tagUserParams.targetTenantID,
        options: migrationOptions,
      });
      
      message.info('正在迁移标签分组，已优化API调用减少服务器压力...');
      
      // 执行迁移
      const migratedGroups = await migrateTagGroups(tagUserParams, selectedIds, migrationOptions);
      
      // 更新成功迁移的分组
      setSuccessGroups(migratedGroups);
      
      if (migratedGroups.length > 0) {
        message.success(`成功迁移 ${migratedGroups.length} 个标签分组`);
      } else {
        message.warning('没有成功迁移的标签分组');
      }
    } catch (error: any) {
      let errorMsg = '迁移过程中发生错误';
      
      if (error.response) {
        const { status, data } = error.response;
        errorMsg = `迁移失败 (状态码: ${status})`;
        
        if (data && data.message) {
          errorMsg += `: ${data.message}`;
        }
        
        if (status === 401) {
          errorMsg = 'API令牌无效或已过期，请重新设置API令牌';
        }
      } else if (error.request) {
        errorMsg = '服务器未响应，请检查您的网络连接';
      } else {
        errorMsg = `迁移错误: ${error.message}`;
      }
      
      message.error(errorMsg);
      setError(errorMsg);
      console.error('迁移标签分组详细错误:', error);
    } finally {
      setMigrating(false);
    }
  };

  // 关闭结果模态框
  const handleCloseModal = () => {
    setModalVisible(false);
    setSuccessGroups([]);
    setError(null);
    setTagListModalVisible(false);
  };

  // 打开标签列表模态框
  const handleShowTagList = (groupId: number, groupName: string) => {
    setCurrentGroupId(groupId);
    setCurrentGroupName(groupName);
    setTagListModalVisible(true);
  };

  // 关闭标签列表模态框
  const handleCloseTagListModal = () => {
    // 关闭模态框即可，不需要每次关闭都刷新分组列表
    // 只有在标签有变化时，TagList组件会通过onTagsChange回调通知父组件
    setTagListModalVisible(false);
  };

  // 处理标签变化通知，只在真正需要时才刷新分组列表
  const handleTagsChange = () => {
    // 获取当前显示的分组
    const currentGroup = tagGroups.find(g => g.id === currentGroupId);
    if (currentGroup) {
      // 更新这个分组的标签计数，而不是刷新整个列表
      fetchTagGroups();
    }
  };

  // 导出标签
  const handleExportTags = async () => {
    if (!tagUserParams) {
      message.error('请先设置Tag参数');
      return;
    }

    if (selectedRowKeys.length === 0) {
      message.error('请选择要导出的标签分组');
      return;
    }

    setExporting(true);
    message.loading('正在导出标签数据，请稍候...', 0);

    try {
      // 转换selectedRowKeys为数字数组
      const selectedIds = selectedRowKeys.map((key: React.Key) => Number(key));
      
      // 获取标签数据
      const tagsData = await exportTagsFromGroups(
        selectedIds,
        tagUserParams.nxCloudUserID,
        tagUserParams.sourceTenantID
      );
      
      if (tagsData.length === 0) {
        message.destroy();
        message.warning('所选分组中没有标签数据可导出');
        setExporting(false);
        return;
      }
      
      // 将数据转换为Excel格式
      const excelData = tagsData.map(tag => ({
        '标签名称': tag.name,
        '描述': tag.describes || '',
        '分组名称': tag.groupName
      }));

      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '标签导出');
      
      // 生成Excel文件
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      
      // 生成文件名: 标签导出_日期时间.xlsx
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const fileName = `标签导出_${dateStr}_${timeStr}.xlsx`;
      
      // 保存文件
      saveAs(blob, fileName);
      
      message.destroy();
      message.success(`成功导出 ${tagsData.length} 个标签数据`);
    } catch (error) {
      message.destroy();
      message.error('导出过程中发生错误');
      console.error('导出标签失败', error);
    } finally {
      setExporting(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '分组名称',
      dataIndex: 'group_name',
      key: 'group_name',
    },
    {
      title: (
        <Tooltip title="点击数字查看标签列表">
          <span>标签数量 <EyeOutlined style={{ fontSize: '12px' }} /></span>
        </Tooltip>
      ),
      dataIndex: 'count',
      key: 'count',
      render: (count: number, record: TagGroup) => (
        <Tooltip title={count > 0 ? "点击查看标签列表" : "没有标签可查看"}>
          <Button 
            type="link" 
            onClick={() => handleShowTagList(record.id, record.group_name)}
            disabled={count === 0}
            icon={count > 0 ? <EyeOutlined /> : null}
          >
            {count}
          </Button>
        </Tooltip>
      ),
    },
  ];

  // 如果用户参数未设置，显示提示
  if (!tagUserParams?.nxCloudUserID || !tagUserParams?.sourceTenantID) {
    return (
      <Card title="标签分组迁移">
        <Empty
          description="请先设置Tag参数"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <>
      <Card 
        title="标签分组迁移" 
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchTagGroups}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportTags}
              disabled={selectedRowKeys.length === 0 || exporting}
              loading={exporting}
            >
              导出标签
            </Button>
            <Button 
              type="primary" 
              onClick={showPrefixModal} 
              disabled={selectedRowKeys.length === 0}
              style={{ marginRight: 8 }}
            >
              开始迁移
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text>
              源租户: <Tag color="blue">{tagUserParams.sourceTenantID}</Tag> 
              目标租户: <Tag color="green">{tagUserParams.targetTenantID}</Tag>
            </Text>
            <Search
              placeholder="搜索分组名称或ID"
              allowClear
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: 250 }}
              suffix={<SearchOutlined />}
            />
          </div>
          
          {error && (
            <Alert
              message="错误信息"
              description={error}
              type="error"
              showIcon
              closable
              style={{ marginBottom: 16 }}
              onClose={() => setError(null)}
            />
          )}
          
          <Spin spinning={loading}>
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={filteredGroups}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              locale={{ 
                emptyText: loading ? (
                  <Spin size="small" />
                ) : error ? (
                  <Empty description="加载数据出错，请点击刷新按钮重试" />
                ) : searchText ? (
                  <Empty description="没有找到匹配的分组" />
                ) : (
                  <Empty description="没有标签分组" />
                )
              }}
            />
          </Spin>
        </Space>
      </Card>

      {/* 迁移结果模态框 */}
      <Modal
        title="迁移结果"
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={[
          <Button key="close" onClick={handleCloseModal}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {error && (
          <Alert
            message="迁移过程中发生错误"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <MigrationResult 
          loading={migrating}
          successItems={successGroups}
          itemType="标签分组"
        />
      </Modal>

      {/* 标签列表模态框 */}
      <Modal
        title={`标签列表 - ${currentGroupName}`}
        open={tagListModalVisible}
        onCancel={handleCloseTagListModal}
        footer={[
          <Button key="close" onClick={handleCloseTagListModal}>
            关闭
          </Button>
        ]}
        width={900}
        destroyOnClose={true}
      >
        <TagList 
          groupId={currentGroupId}
          groupName={currentGroupName}
          onTagsChange={handleTagsChange}
        />
      </Modal>

      <Modal
        title="设置迁移前缀"
        open={isPrefixModalVisible}
        onOk={handlePrefixModalOk}
        onCancel={handlePrefixModalCancel}
        okText="确认并开始迁移"
        cancelText="取消"
      >
        <Input
          placeholder="请输入要添加的前缀（可选）"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
        />
        <p style={{ marginTop: 10 }}>前缀将添加到每个迁移的标签分组名称的开头。</p>
      </Modal>
    </>
  );
});

// 导出组件
export default TagGroupMigration; 