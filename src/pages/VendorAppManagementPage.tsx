import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Typography, 
  Tabs, 
  Card, 
  Table, 
  Button, 
  Space, 
  Input, 
  Select, 
  Switch, 
  Popconfirm, 
  message, 
  Modal, 
  Form, 
  Row, 
  Col, 
  Spin,
  Tag,
  Tooltip,
  DatePicker,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { 
  VendorApp, 
  SceneVendorApp, 
  VendorAppQueryParams, 
  SceneVendorAppQueryParams,
  VendorAppFormData,
  SceneVendorAppFormData
} from '../types/vendorApp';
import { 
  getVendorAppList, 
  getSceneVendorAppList, 
  createVendorApp, 
  updateVendorApp, 
  deleteVendorApp,
  createSceneVendorApp,
  updateSceneVendorApp,
  deleteSceneVendorApp,
  updateSceneVendorAppStatus,
  getVendorAppListForMapping
} from '../services/vendorAppApi';

const { Content } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { Search } = Input;

import { 
  getCurrentVendorConfig,
  vendorNameMap,
  vendorCodeMap,
  valueToNameMap,
  codeNameToValueMap,
  getVendorName,
  SERVICE_TYPE_MAP
} from '../config/vendorConfig';
import { getUniqueLanguages, ttsConfig, getLanguageDescByLocale } from '../config/ttsConfig';

// 供应商应用类型常量
const VENDOR_APP_TYPES = {
  TTS: 'TTS',
  ASR: 'ASR', 
  LLM: 'LLM'
};

// 评级选项
const RATING_OPTIONS = ['Basic', 'Standard', 'Pro'];

// 状态映射
const STATUS_MAP = {
  0: { text: '禁用', color: 'red' },
  1: { text: '启用', color: 'green' }
};

const VendorAppManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('TTS');
  const [loading, setLoading] = useState(false);
  const [vendorApps, setVendorApps] = useState<VendorApp[]>([]);
  const [sceneVendorApps, setSceneVendorApps] = useState<SceneVendorApp[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useState<any>({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [vendorAppMapping, setVendorAppMapping] = useState<Record<number, any>>({});
  const [languageOptions, setLanguageOptions] = useState<Array<{locale: string, language_desc: string}>>([]);
  const [form] = Form.useForm();

  // 批量编辑相关状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<SceneVendorApp[]>([]);
  const [batchEditModalVisible, setBatchEditModalVisible] = useState(false);
  const [batchForm] = Form.useForm();
  const [batchEditLoading, setBatchEditLoading] = useState(false);

  // 获取供应商应用列表
  const fetchVendorApps = async (params?: VendorAppQueryParams) => {
    try {
      setLoading(true);
      const queryParams: VendorAppQueryParams = {
        type: activeTab,
        page_num: currentPage,
        page_size: pageSize,
        tenantId: 255, // 默认租户ID，实际使用时应该从用户上下文获取
        ...params
      };

      const response = await getVendorAppList(queryParams);
      setVendorApps(response.list);
      setTotal(response.total);
    } catch (error: any) {
      console.error('获取供应商应用列表失败:', error);
      message.error('获取供应商应用列表失败');
      setVendorApps([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 获取场景供应商应用列表
  const fetchSceneVendorApps = async (params?: SceneVendorAppQueryParams) => {
    try {
      setLoading(true);
              const typeMap = SERVICE_TYPE_MAP;
      const queryParams: SceneVendorAppQueryParams = {
        type: typeMap[activeTab as keyof typeof typeMap],
        page_number: currentPage,
        page_size: pageSize,
        tenantId: 255, // 默认租户ID
        ...params
      };

      // 移除rating默认值设置，只有用户明确选择时才传递rating参数

      console.log('[fetchSceneVendorApps] 查询参数:', queryParams);

      const response = await getSceneVendorAppList(queryParams);
      
      // TTS音色前端过滤
      let filteredList = response.list;
      if (activeTab === 'TTS' && params?.timbre) {
        const timbreKeyword = params.timbre.toLowerCase();
        filteredList = response.list.filter(item => {
          // 通过 timbre 字段直接匹配
          if (item.timbre && item.timbre.toLowerCase().includes(timbreKeyword)) {
            return true;
          }
          
          // 通过 ttsConfig 查找匹配的音色信息
          const matchingConfigs = ttsConfig.filter(config => {
            const speaker = config.speaker.toLowerCase();
            const language_desc = config.language_desc.toLowerCase();
            const sex = config.sex.toLowerCase();
            
            return speaker.includes(timbreKeyword) ||
                   language_desc.includes(timbreKeyword) ||
                   sex.includes(timbreKeyword);
          });
          
          // 如果找到匹配的配置，检查是否与当前项目的语言或音色相关
          if (matchingConfigs.length > 0) {
            return matchingConfigs.some(config => {
              return (item.language && item.language === config.locale) ||
                     (item.timbre && item.timbre.includes(config.speaker.split('-').pop() || ''));
            });
          }
          
          return false;
        });
        
        console.log(`[fetchSceneVendorApps] TTS音色过滤: "${params.timbre}" - 原始${response.list.length}条，过滤后${filteredList.length}条`);
      }
      
      setSceneVendorApps(filteredList);
      setTotal(response.total); // 保持原始分页总数，不受前端过滤影响
    } catch (error: any) {
      console.error('获取场景供应商应用列表失败:', error);
      message.error('获取场景供应商应用列表失败');
      setSceneVendorApps([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 获取供应商应用映射数据
  const fetchVendorAppMapping = async (type: string) => {
    try {
      console.log('[fetchVendorAppMapping] 获取供应商应用映射 - 当前Tab:', type);
      
      const vendorApps = await getVendorAppListForMapping(type);
      
      console.log(`[fetchVendorAppMapping] 获取到 ${vendorApps.length} 个 ${type} 类型的应用:`, vendorApps);
      
      // 验证返回的应用类型是否匹配
      const typeMatches = vendorApps.filter(app => app.type === type);
      const typeMismatches = vendorApps.filter(app => app.type !== type);
      
      console.log(`[fetchVendorAppMapping] 类型匹配的应用: ${typeMatches.length} 个`);
      if (typeMismatches.length > 0) {
        console.warn(`[fetchVendorAppMapping] 类型不匹配的应用: ${typeMismatches.length} 个`, typeMismatches);
      }
      
      // 创建ID到应用信息的映射
      const mapping: Record<number, any> = {};
      vendorApps.forEach(app => {
        mapping[app.id] = app;
      });
      
      setVendorAppMapping(mapping);
      console.log('[fetchVendorAppMapping] 映射数据:', mapping);
    } catch (error: any) {
      console.error('获取供应商应用映射失败:', error);
    }
  };

  // 根据vendorAppId获取应用名称
  const getVendorAppName = (vendorAppId: string | number): string => {
    const id = typeof vendorAppId === 'string' ? parseInt(vendorAppId) : vendorAppId;
    const app = vendorAppMapping[id];
    return app ? app.name : `应用ID: ${vendorAppId}`;
  };

  // 初始化语言选项
  useEffect(() => {
    const languages = getUniqueLanguages();
    setLanguageOptions(languages);
  }, []);

  // 初始化数据
  useEffect(() => {
    fetchSceneVendorApps(searchParams);
  }, [activeTab, currentPage, pageSize, searchParams]);

  // 获取vendorApp映射数据（只在activeTab变化时）
  useEffect(() => {
    fetchVendorAppMapping(activeTab);
  }, [activeTab]);

  // 处理标签页切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setCurrentPage(1);
    setSearchParams({});
    // 清空批量选择状态
    setSelectedRowKeys([]);
    setSelectedRows([]);
    // useEffect会自动触发数据加载，不需要手动调用
  };

  // 处理搜索
  const handleSearch = (params: any) => {
    setSearchParams(params);
    setCurrentPage(1);
    if (activeTab === 'TTS' || activeTab === 'ASR' || activeTab === 'LLM') {
      fetchSceneVendorApps(params);
    }
  };

  // 处理新建
  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    setEditModalVisible(true);
  };

  // 处理编辑
  const handleEdit = (record: any) => {
    setEditingRecord(record);
    
    // 设置表单值，需要将vendor的value转换为显示用的codeName
    const currentConfig = getCurrentVendorConfig(activeTab);
    const vendor = currentConfig.find(v => v.value === record.vendor);
    
    form.setFieldsValue({
      ...record,
      vendorDisplay: vendor ? vendor.codeName : record.vendor // 用于显示的字段
    });
    setEditModalVisible(true);
  };

  // 处理删除
  const handleDelete = async (record: any) => {
    try {
      await deleteSceneVendorApp(record.id);
      message.success('删除成功');
      fetchSceneVendorApps(searchParams);
    } catch (error: any) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // 处理状态切换
  const handleStatusChange = async (record: SceneVendorApp, checked: boolean) => {
    try {
      await updateSceneVendorAppStatus(record.id, checked ? 1 : 0, record);
      message.success('状态更新成功');
      fetchSceneVendorApps(searchParams);
    } catch (error: any) {
      console.error('状态更新失败:', error);
      message.error('状态更新失败');
    }
  };

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      // 提交时确保使用正确的vendor值，移除显示用的字段
      const submitData = { ...values };
      delete submitData.vendorDisplay; // 删除显示用的字段
      
      if (editingRecord) {
        await updateSceneVendorApp(editingRecord.id, submitData, editingRecord);
        message.success('更新成功');
      } else {
        await createSceneVendorApp(submitData);
        message.success('创建成功');
      }
      setEditModalVisible(false);
      fetchSceneVendorApps(searchParams);
    } catch (error: any) {
      console.error('操作失败:', error);
      message.error('操作失败');
    }
  };

  // 解析vendor_params
  const parseVendorParams = (vendor_params: string) => {
    try {
      return JSON.parse(vendor_params);
    } catch {
      return {};
    }
  };

  // 批量编辑相关函数
  const handleBatchEdit = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要编辑的记录');
      return;
    }
    setBatchEditModalVisible(true);
    batchForm.resetFields();
  };

  const handleBatchSubmit = async (values: any) => {
    setBatchEditLoading(true);
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      for (const record of selectedRows) {
        try {
          const updateData = { 
            ...record,
            remark: record.remark || undefined // 转换null为undefined
          };
          
          // 只更新用户选择的字段
          if (values.rating !== undefined) {
            updateData.rating = values.rating;
          }
          if (values.language !== undefined) {
            updateData.language = values.language;
          }
          if (values.timbre !== undefined && activeTab === 'TTS') {
            updateData.timbre = values.timbre;
          }
          if (values.model !== undefined) {
            updateData.model = values.model;
          }
          if (values.vendor_app_id !== undefined) {
            updateData.vendor_app_id = values.vendor_app_id;
          }

          await updateSceneVendorApp(record.id, updateData, record);
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`记录ID ${record.id}: ${error.message || '更新失败'}`);
        }
      }

      // 显示结果
      if (results.failed === 0) {
        message.success(`批量编辑成功！共更新 ${results.success} 条记录`);
      } else if (results.success === 0) {
        message.error(`批量编辑失败！${results.failed} 条记录更新失败`);
      } else {
        message.warning(`批量编辑部分成功：${results.success} 条成功，${results.failed} 条失败`);
      }

      // 输出详细错误信息
      if (results.errors.length > 0) {
        console.error('批量编辑错误详情:', results.errors);
      }

      setBatchEditModalVisible(false);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      fetchSceneVendorApps(searchParams);
    } catch (error: any) {
      message.error('批量编辑过程中发生错误');
    } finally {
      setBatchEditLoading(false);
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys: React.Key[], selectedRows: SceneVendorApp[]) => {
      setSelectedRowKeys(selectedRowKeys);
      setSelectedRows(selectedRows);
    },
    getCheckboxProps: (record: SceneVendorApp) => ({
      disabled: false,
      name: record.id.toString(),
    }),
  };

  // 场景供应商应用表格列定义
  const getSceneVendorAppColumns = () => {
    const baseColumns = [
    {
      title: '厂商名称',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string, record: any) => {
        // 先尝试通过code字段映射
        let vendorName = getVendorName(code);
        
        // 如果code映射失败，尝试通过vendor字段反推
        if (!vendorName || vendorName === code || vendorName.includes('应用ID')) {
          // 通过vendor字段(value)来获取厂商名称
          const vendorNameFromValue = valueToNameMap[record.vendor];
          if (vendorNameFromValue) {
            return vendorNameFromValue;
          }
        }
        
        // 记录调试信息但不影响显示
        if (!vendorName || vendorName === code) {
          console.warn(`[厂商名称] code "${code}", vendor "${record.vendor}" 都无法映射到厂商名称`);
        }
        
        return vendorName || '-';
      }
    },
    {
      title: '代号', 
      dataIndex: 'vendor',
      key: 'vendor',
      width: 80,
      render: (vendor: string) => {
        return vendorCodeMap[vendor] || vendor;
      }
    },
    {
      title: '评级', 
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      render: (rating: string) => (
        <Tag color={rating === 'Standard' ? 'blue' : rating === 'Pro' ? 'gold' : 'default'}>
          {rating}
        </Tag>
      )
    },
    {
      title: '国家/地区',
      dataIndex: 'language',
      key: 'language',
      width: 120,
      render: (language: string) => {
        // 使用ttsConfig动态获取语言描述
        return getLanguageDescByLocale(language);
      }
    },
    {
      title: '音色',
      dataIndex: 'timbre',
      key: 'timbre',
      width: 180,
      render: (timbre: string) => (
        <Tooltip title={timbre}>
          <div style={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            maxWidth: '160px' 
          }}>
            {timbre}
          </div>
        </Tooltip>
      )
    },
    {
      title: '模型',
      dataIndex: 'model',
      key: 'model',
      width: 120,
      render: (model: string) => model || '-'
    },
    {
      title: '启用',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number, record: SceneVendorApp) => (
        <Switch 
          checked={status === 1} 
          onChange={(checked) => handleStatusChange(record, checked)}
          size="small"
        />
      )
    },
    {
      title: '供应商成本应用',
      dataIndex: 'vendor_app_id',
      key: 'vendor_app_id',
      width: 150,
      render: (vendorAppId: string, record: SceneVendorApp) => {
        const appName = getVendorAppName(vendorAppId);
        const appInfo = vendorAppMapping[parseInt(vendorAppId)];
        
        return (
          <Tooltip title={appInfo ? 
            `ID: ${vendorAppId}\n名称: ${appInfo.name}\n厂商: ${appInfo.vendor_name}` : 
            `应用ID: ${vendorAppId}`
          }>
            <div>
              <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
                {appName}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                ID: {vendorAppId}
              </div>
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: '描述',
      dataIndex: 'remark', 
      key: 'remark',
      width: 200,
      render: (remark: string) => (
        <Tooltip title={remark}>
          <div style={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            maxWidth: '180px' 
          }}>
            {remark || '-'}
          </div>
        </Tooltip>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'update_ts',
      key: 'update_ts',
      width: 160,
      render: (timestamp: number) => 
        timestamp ? dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: SceneVendorApp) => (
        <Space>
          <Tooltip title="详情">
            <Button
              type="link"
              icon={<SettingOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这条记录吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 根据activeTab过滤列 - 音色字段只在TTS显示
  if (activeTab !== 'TTS') {
    return baseColumns.filter(col => col.key !== 'timbre');
  }
  
  return baseColumns;
};

  // 搜索组件
  const renderSearchForm = () => {
    const currentVendorConfig = getCurrentVendorConfig(activeTab);
    
    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={4}>
            <Select
              placeholder="选择厂商"
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) => {
                if (!option) return false;
                const children = Array.isArray(option.children) ? option.children.join('') : String(option.children || '');
                return children.toLowerCase().includes(input.toLowerCase());
              }}
              style={{ width: '100%' }}
              value={searchParams.vendor}
              onChange={(value) => {
                const newParams = { ...searchParams, vendor: value };
                setSearchParams(newParams);
              }}
            >
              {currentVendorConfig.map(vendor => (
                <Option key={vendor.value} value={vendor.value}>
                  {vendor.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择语言"
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) => {
                if (!option) return false;
                const children = Array.isArray(option.children) ? option.children.join('') : String(option.children || '');
                const value = String(option.value || '');
                return children.toLowerCase().includes(input.toLowerCase()) ||
                       value.toLowerCase().includes(input.toLowerCase());
              }}
              style={{ width: '100%' }}
              value={searchParams.language}
              onChange={(value) => {
                const newParams = { ...searchParams, language: value };
                setSearchParams(newParams);
              }}
            >
              {languageOptions.map(option => (
                <Option key={option.locale} value={option.locale}>
                  {option.language_desc}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: '100%' }}
              value={searchParams.status}
              onChange={(value) => {
                const newParams = { ...searchParams, status: value };
                setSearchParams(newParams);
              }}
            >
              <Option value={1}>启用</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择评级"
              allowClear
              style={{ width: '100%' }}
              value={searchParams.rating}
              onChange={(value) => {
                const newParams = { ...searchParams, rating: value };
                setSearchParams(newParams);
              }}
            >
              {RATING_OPTIONS.map(option => (
                <Option key={option} value={option}>{option}</Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <Space>
              <Button 
                type="primary" 
                icon={<SearchOutlined />}
                onClick={() => fetchSceneVendorApps(searchParams)}
              >
                查询
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSearchParams({});
                  fetchSceneVendorApps({});
                }}
              >
                重置
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                新建
              </Button>
              <Button 
                type="default" 
                icon={<EditOutlined />}
                onClick={handleBatchEdit}
                disabled={selectedRowKeys.length === 0}
              >
                批量编辑 ({selectedRowKeys.length})
              </Button>
            </Space>
          </Col>
        </Row>
        {/* TTS专用音色搜索行 */}
        {activeTab === 'TTS' && (
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={6}>
              <Input
                placeholder="搜索音色 (如：AmberNeural、小晓、Aria等)"
                allowClear
                prefix={<SearchOutlined />}
                value={searchParams.timbre}
                onChange={(e) => {
                  const newParams = { ...searchParams, timbre: e.target.value };
                  setSearchParams(newParams);
                }}
              />
            </Col>
            <Col span={18}>
              <div style={{ color: '#666', fontSize: '12px', lineHeight: '32px' }}>
                💡 音色搜索支持：英文名称（如 AmberNeural）、中文名称（如 小晓）、性别（男/女）等关键词（前端过滤，每页独立显示结果）。请手动逐页确认，以免遗漏数据
              </div>
            </Col>
          </Row>
        )}
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={4} style={{ margin: 0, marginBottom: 16 }}>供应商应用管理</Title>
          <Alert
            message="批量编辑功能已添加"
            description="✅ 新增批量编辑功能：支持批量修改评级、国家/地区、音色、模型、供应商应用等字段 ✅ 前端逐一提交更新 ✅ 完整的结果统计和错误提醒 ✅ 分页和音色搜索功能完善"
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
            closable
          />
        </div>
        
        <Tabs 
          activeKey={activeTab} 
          onChange={handleTabChange}
          type="card"
        >
          <TabPane tab="TTS" key="TTS">
            {renderSearchForm()}
            <Table
              columns={getSceneVendorAppColumns()}
              dataSource={sceneVendorApps}
              rowKey="id"
              loading={loading}
              rowSelection={rowSelection}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size || 10);
                }
              }}
              scroll={{ x: 1400 }}
              size="small"
            />
          </TabPane>
          
          <TabPane tab="ASR" key="ASR">
            {renderSearchForm()}
            <Table
              columns={getSceneVendorAppColumns()}
              dataSource={sceneVendorApps}
              rowKey="id"
              loading={loading}
              rowSelection={rowSelection}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size || 10);
                }
              }}
              scroll={{ x: 1400 }}
              size="small"
            />
          </TabPane>
          
          <TabPane tab="LLM" key="LLM">
            {renderSearchForm()}
            <Table
              columns={getSceneVendorAppColumns()}
              dataSource={sceneVendorApps}
              rowKey="id"
              loading={loading}
              rowSelection={rowSelection}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size || 10);
                }
              }}
              scroll={{ x: 1400 }}
              size="small"
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 编辑/新建模态框 */}
      <Modal
        title={editingRecord ? '编辑供应商应用' : '新建供应商应用'}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            status: 1,
            rating: 'Standard',
            type: SERVICE_TYPE_MAP[activeTab as keyof typeof SERVICE_TYPE_MAP] || 2
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="厂商名称"
                name="code"
                rules={[{ required: true, message: '请选择厂商名称' }]}
              >
                <Select 
                  placeholder="请选择厂商名称"
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) => {
                    if (!option) return false;
                    const children = Array.isArray(option.children) ? option.children.join('') : String(option.children || '');
                    return children.toLowerCase().includes(input.toLowerCase());
                  }}
                  onChange={(value) => {
                    // 根据选择的厂商名称(codeName)自动填入对应的代号
                    const currentConfig = getCurrentVendorConfig(activeTab);
                    const selectedVendor = currentConfig.find(v => v.codeName === value);
                    if (selectedVendor) {
                      form.setFieldValue('vendor', selectedVendor.value); // 存储value用于提交
                      form.setFieldValue('vendorDisplay', selectedVendor.codeName); // 显示codeName
                    }
                  }}
                >
                  {getCurrentVendorConfig(activeTab).map(vendor => (
                    <Option key={vendor.codeName} value={vendor.codeName}>
                      {vendor.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="代号"
                name="vendorDisplay"
                rules={[{ required: true, message: '代号不能为空' }]}
              >
                <Input 
                  placeholder="选择厂商后自动填入代号"
                  disabled
                  style={{ backgroundColor: '#f5f5f5', color: '#000' }}
                />
              </Form.Item>
              {/* 隐藏的实际值字段，用于提交 */}
              <Form.Item name="vendor" hidden>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="评级"
                name="rating"
                rules={[{ required: true, message: '请选择评级' }]}
              >
                <Select placeholder="请选择评级">
                  {RATING_OPTIONS.map(option => (
                    <Option key={option} value={option}>{option}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="国家/地区"
                name="language"
                rules={[{ required: true, message: '请选择国家/地区' }]}
              >
                <Select 
                  placeholder="请选择国家/地区" 
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) => {
                    if (!option) return false;
                    const children = Array.isArray(option.children) ? option.children.join('') : String(option.children || '');
                    const value = String(option.value || '');
                    return children.toLowerCase().includes(input.toLowerCase()) ||
                           value.toLowerCase().includes(input.toLowerCase());
                  }}
                >
                  {languageOptions.map(option => (
                    <Option key={option.locale} value={option.locale}>
                      {option.language_desc}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            {activeTab === 'TTS' && (
              <Col span={12}>
                <Form.Item
                  label="音色"
                  name="timbre"
                  rules={[{ required: true, message: '请输入音色' }]}
                >
                  <Input placeholder="请输入音色" />
                </Form.Item>
              </Col>
            )}
            <Col span={12}>
              <Form.Item
                label="模型"
                name="model"
              >
                <Input placeholder="请输入模型" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="供应商应用"
                name="vendor_app_id"
                rules={[{ required: true, message: '请选择供应商应用' }]}
              >
                <Select placeholder="请选择供应商应用" showSearch optionFilterProp="children">
                  {Object.values(vendorAppMapping).map(app => (
                    <Option key={app.id} value={app.id}>
                      {app.name} (ID: {app.id})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                valuePropName="checked"
                getValueFromEvent={(checked) => checked ? 1 : 0}
                getValueProps={(value) => ({ checked: value === 1 })}
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="厂商参数"
            name="vendor_params"
          >
            <Input.TextArea 
              placeholder="请输入厂商参数（JSON格式）"
              rows={4}
            />
          </Form.Item>

          <Form.Item
            label="描述"
            name="remark"
          >
            <Input.TextArea 
              placeholder="请输入描述"
              rows={3}
            />
          </Form.Item>

          {/* 隐藏字段 */}
          <Form.Item name="type" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量编辑模态框 */}
      <Modal
        title={`批量编辑 (${selectedRowKeys.length} 条记录)`}
        open={batchEditModalVisible}
        onCancel={() => setBatchEditModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setBatchEditModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={batchEditLoading}
            onClick={() => batchForm.submit()}
          >
            批量更新
          </Button>,
        ]}
        width={600}
        destroyOnClose
      >
        <Form
          form={batchForm}
          layout="vertical"
          onFinish={handleBatchSubmit}
        >
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
            <strong>提示：</strong>只有填写的字段会被批量更新，未填写的字段保持原值不变
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="评级"
                name="rating"
              >
                <Select placeholder="选择评级（不选择则不修改）" allowClear>
                  {RATING_OPTIONS.map(option => (
                    <Option key={option} value={option}>{option}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="国家/地区"
                name="language"
              >
                <Select 
                  placeholder="选择国家/地区（不选择则不修改）" 
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) => {
                    if (!option) return false;
                    const children = Array.isArray(option.children) ? option.children.join('') : String(option.children || '');
                    const value = String(option.value || '');
                    return children.toLowerCase().includes(input.toLowerCase()) ||
                           value.toLowerCase().includes(input.toLowerCase());
                  }}
                >
                  {languageOptions.map(option => (
                    <Option key={option.locale} value={option.locale}>
                      {option.language_desc}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            {activeTab === 'TTS' && (
              <Col span={12}>
                <Form.Item
                  label="音色"
                  name="timbre"
                >
                  <Input placeholder="输入音色（不填写则不修改）" />
                </Form.Item>
              </Col>
            )}
            <Col span={12}>
              <Form.Item
                label="模型"
                name="model"
              >
                <Input placeholder="输入模型（不填写则不修改）" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="供应商应用"
                name="vendor_app_id"
              >
                <Select placeholder="选择供应商应用（不选择则不修改）" allowClear showSearch optionFilterProp="children">
                  {Object.values(vendorAppMapping).map(app => (
                    <Option key={app.id} value={app.id}>
                      {app.name} (ID: {app.id})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default VendorAppManagementPage; 