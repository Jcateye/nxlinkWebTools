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
    Alert,
    Progress,
    Radio
  } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined, 
      ReloadOutlined,
    SettingOutlined,
    CheckOutlined,
    StopOutlined,
    CloudSyncOutlined,
    ToolOutlined,
    GlobalOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import VendorSyncModal from '../components/vendor/VendorSyncModal';
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
import TokenManager from '../components/bill/TokenManager';
import DataCenterSelector from '../components/DataCenterSelector';
import ElevenLabsParamsConverter from '../components/ElevenLabsParamsConverter';
import { updateJsonByKeys, safeJsonParse, extractJsonKeys, compactifyJsonString } from '../utils/jsonHelper';

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

// 并行批处理工具函数 - 提升批量操作性能
const BATCH_CONCURRENCY = 5; // 每批并行执行的数量

interface BatchResult<T> {
  success: number;
  failed: number;
  errors: string[];
  results: T[];
}

async function processBatchInParallel<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  onProgress?: (completed: number, total: number, success: number, failed: number) => void,
  concurrency: number = BATCH_CONCURRENCY
): Promise<BatchResult<R>> {
  const results: R[] = [];
  const errors: string[] = [];
  let success = 0;
  let failed = 0;
  let completed = 0;
  const total = items.length;

  // 分批处理
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = i + batchIndex;
      try {
        const result = await processor(item, globalIndex);
        success++;
        results.push(result);
        return { success: true, result };
      } catch (error: any) {
        failed++;
        errors.push(error.message || '操作失败');
        return { success: false, error };
      } finally {
        completed++;
        onProgress?.(completed, total, success, failed);
      }
    });

    // 等待当前批次完成
    await Promise.all(batchPromises);
  }

  return { success, failed, errors, results };
}

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

  // 厂商参数编辑模式相关状态
  const [vendorParamsEditMode, setVendorParamsEditMode] = useState<'full' | 'partial'>('full');
  const [vendorParamsPartialUpdates, setVendorParamsPartialUpdates] = useState<Record<string, any>>({});
  const [availableJsonKeys, setAvailableJsonKeys] = useState<string[]>([]);

  // 批量编辑相关状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [selectedRows, setSelectedRows] = useState<SceneVendorApp[]>([]);
  const [batchEditModalVisible, setBatchEditModalVisible] = useState(false);
      const [batchForm] = Form.useForm();
    const [batchEditLoading, setBatchEditLoading] = useState(false);
    const [batchEnableLoading, setBatchEnableLoading] = useState(false);
    const [batchDisableLoading, setBatchDisableLoading] = useState(false);
    const [batchFixJsonLoading, setBatchFixJsonLoading] = useState(false);
    const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);

    // 批量编辑厂商参数相关状态
    const [batchVendorParamsEditMode, setBatchVendorParamsEditMode] = useState<'full' | 'partial'>('full');
    const [batchVendorParamsPartialUpdates, setBatchVendorParamsPartialUpdates] = useState<Record<string, any>>({});

    // 批量操作进度
    const [progressVisible, setProgressVisible] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState({
      success: 0,
      failed: 0,
      total: 0
    });

    // 批量同步相关状态
    const [syncModalVisible, setSyncModalVisible] = useState(false);

    // 按国家批量新增相关状态
    const [batchCreateByCountryModalVisible, setBatchCreateByCountryModalVisible] = useState(false);
    const [batchCreateByCountryForm] = Form.useForm();
    const [batchCreateByCountryLoading, setBatchCreateByCountryLoading] = useState(false);

    const [idInput, setIdInput] = useState('');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportData, setExportData] = useState('');
  const [hasValidToken, setHasValidToken] = useState(false);
  const [highlightDuplicates, setHighlightDuplicates] = useState(false);
  const [localSearchText, setLocalSearchText] = useState<string>('');
  const [updateTimeRange, setUpdateTimeRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const handleSelectByIds = () => {
    const idsToSelect = idInput
      .split(/[\s,;\n]+/)
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id) && id > 0);

    if (idsToSelect.length === 0) {
      message.warning('请输入有效的数据ID');
      return;
    }
    
    const newSelectedRows = sceneVendorApps.filter(item => idsToSelect.includes(item.id));
    const newSelectedRowKeys = newSelectedRows.map(item => item.id);
    
    const foundCount = newSelectedRowKeys.length;
    const notFoundCount = idsToSelect.length - foundCount;
    
    setSelectedRowKeys(newSelectedRowKeys);
    setSelectedRows(newSelectedRows);

    message.success(`操作完成：当前页找到并勾选了 ${foundCount} 条记录。`);
    
    if (notFoundCount > 0) {
        const allIdsOnPage = new Set(sceneVendorApps.map(app => app.id));
        const notFoundIds = idsToSelect.filter(id => !allIdsOnPage.has(id));
        message.info(`${notFoundCount} 个ID在当前页面未找到: ${notFoundIds.slice(0, 5).join(', ')}${notFoundIds.length > 5 ? '...' : ''}`);
    }
  };

  const handleExportIds = () => {
    if (sceneVendorApps.length === 0) {
      message.warning('当前页没有数据可导出');
      return;
    }

    const header = `# 供应商应用ID导出
# 页码: ${currentPage}
# 每页数量: ${pageSize}
# 导出时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}
# -----------------------------------\n\n`;
    
    const ids = sceneVendorApps.map(app => app.id).join(',\n');
    setExportData(header + ids);
    setExportModalVisible(true);
  };

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
      
      // 前端过滤逻辑
      let filteredList = response.list;
      
      // TTS音色前端过滤
      if (activeTab === 'TTS' && params?.timbre) {
        const timbreKeyword = params.timbre.toLowerCase();
        filteredList = filteredList.filter(item => {
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

      // 模型前端过滤 (适用于 ASR 和 TTS)
      if ((activeTab === 'ASR' || activeTab === 'TTS') && params?.model) {
        const modelKeyword = params.model.toLowerCase();
        const originalLength = filteredList.length;
        filteredList = filteredList.filter(item => {
          return item.model && item.model.toLowerCase().includes(modelKeyword);
        });
        
        console.log(`[fetchSceneVendorApps] ${activeTab}模型过滤: "${params.model}" - 原始${originalLength}条，过滤后${filteredList.length}条`);
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

  // 处理数据中心切换
  const handleDataCenterChange = (dataCenter: any) => {
    console.log('[VendorAppManagementPage] 数据中心切换:', dataCenter);
    // 数据中心切换后重新加载数据
    fetchSceneVendorApps(searchParams);
    fetchVendorAppMapping(activeTab);
  };

  // 初始化语言选项
  useEffect(() => {
    const languages = getUniqueLanguages();
    setLanguageOptions(languages);
  }, []);

  // 初始化数据
  useEffect(() => {
    // 防止初始化时的多次调用
    const timeoutId = setTimeout(() => {
      fetchSceneVendorApps(searchParams);
    }, 100); // 添加防抖
    
    return () => clearTimeout(timeoutId);
  }, [activeTab, currentPage, pageSize, JSON.stringify(searchParams)]); // 使用JSON.stringify避免对象引用变化导致的重复渲染

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

  // 处理搜索 - 只更新状态，让useEffect处理请求
  const handleSearch = (params: any) => {
    setSearchParams(params);
    setCurrentPage(1);
    // 不直接调用fetchSceneVendorApps，让useEffect处理
  };

  // 处理新建
  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    // 重置厂商参数编辑状态
    setVendorParamsEditMode('full');
    setVendorParamsPartialUpdates({});
    setAvailableJsonKeys([]);
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
      vendorDisplay: vendor ? vendor.codeName : record.vendor, // 用于显示的字段
      is_clone: !!record.clone_url // 根据 clone_url 判断是否克隆
    });

    // 初始化厂商参数编辑状态
    setVendorParamsEditMode('full');
    setVendorParamsPartialUpdates({});
    if (record.vendor_params) {
      const keys = extractJsonKeys(record.vendor_params);
      setAvailableJsonKeys(keys);
    } else {
      setAvailableJsonKeys([]);
    }

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

      // 处理厂商参数的部分更新
      if (vendorParamsEditMode === 'partial' && editingRecord && Object.keys(vendorParamsPartialUpdates).length > 0) {
        const originalVendorParams = editingRecord.vendor_params || '{}';
        
        // 将用户输入的字符串值解析为实际的 JSON 类型（数组、对象等）
        const parsedUpdates: Record<string, any> = {};
        for (const [key, value] of Object.entries(vendorParamsPartialUpdates)) {
          // 如果值是字符串，尝试解析为 JSON
          if (typeof value === 'string' && value.trim()) {
            try {
              // 检查是否是 JSON 格式（以 [ 或 { 开头）
              const trimmedValue = value.trim();
              if (trimmedValue.startsWith('[') || trimmedValue.startsWith('{')) {
                parsedUpdates[key] = JSON.parse(trimmedValue);
              } else {
                parsedUpdates[key] = value;
              }
            } catch (e) {
              // 解析失败，当做普通字符串
              parsedUpdates[key] = value;
            }
          } else {
            parsedUpdates[key] = value;
          }
        }
        
        const updatedVendorParams = updateJsonByKeys(originalVendorParams, parsedUpdates);
        submitData.vendor_params = updatedVendorParams;
      } else if (vendorParamsEditMode === 'full' && submitData.vendor_params) {
        // 完整编辑模式下，压缩 JSON 字符串（移除换行和多余空格）
        submitData.vendor_params = compactifyJsonString(submitData.vendor_params);
      }

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

  // 检测重复组合并计算（带缓存和控制台输出）
  const duplicateAnalysis = React.useMemo(() => {
    const emptyResult = { ids: new Set<number>(), groups: [], idsToSelect: [] as number[] };
    // 只有在开启高亮且有数据时才计算
    if (!highlightDuplicates || !sceneVendorApps.length) return emptyResult;

    const combinationCount: Record<string, number[]> = {};
    const duplicateIds = new Set<number>();
    
    sceneVendorApps.forEach(item => {
      // 统一使用四个字段的组合键：代号 + 国家 + 音色 + 模型
      const combinationKey = `${item.vendor || ''}|${item.language || ''}|${item.timbre || ''}|${item.model || ''}`;

      if (!combinationCount[combinationKey]) {
        combinationCount[combinationKey] = [];
      }
      combinationCount[combinationKey].push(item.id);
    });

    const groups: any[] = [];
    const idsToSelect: number[] = []; // 每组重复项中除了第一个（ID最小）以外的其他项
    
    Object.entries(combinationCount).forEach(([key, ids]) => {
      if (ids.length > 1) {
        ids.forEach(id => duplicateIds.add(id));
        
        // 对 ID 进行排序，保留最小的，选中其他的
        const sortedIds = [...ids].sort((a, b) => a - b);
        const keepId = sortedIds[0]; // 保留最小 ID
        const selectIds = sortedIds.slice(1); // 选中其他 ID（待删除）
        idsToSelect.push(...selectIds);
        
        const [vendor, language, timbre, model] = key.split('|');
        groups.push({
            '数量': ids.length,
            'ID列表': ids.join(', '),
            '保留ID': keepId,
            '选中删除': selectIds.join(', '),
            '厂商': vendor,
            '语言': language,
            '音色': timbre || '-',
            '模型': model || '-',
            // 辅助字段
            _ids: ids,
            _keepId: keepId,
            _selectIds: selectIds
        });
      }
    });

    // 输出到控制台
    if (groups.length > 0) {
        console.group(`Found ${groups.length} duplicate groups (共 ${idsToSelect.length} 条待删除)`);
        console.table(groups);
        console.groupEnd();
        // 保存到全局变量方便调试
        (window as any).duplicateGroups = groups;
        console.log('%c[提示] 重复项详情已保存至 window.duplicateGroups', 'color: #1890ff; font-weight: bold;');
        console.log(`%c[提示] 每组保留ID最小的记录，已自动选中 ${idsToSelect.length} 条待删除记录`, 'color: #fa8c16; font-weight: bold;');
    } else {
        (window as any).duplicateGroups = [];
    }

    return { ids: duplicateIds, groups, idsToSelect };
  }, [sceneVendorApps, highlightDuplicates]); // 仅在数据或开关变化时重新计算

  // 处理高亮重复项开关变化
  const handleHighlightDuplicatesChange = (checked: boolean) => {
    setHighlightDuplicates(checked);
    
    if (checked) {
      // 开启时，自动选中每组重复项中需要删除的记录
      // 由于 duplicateAnalysis 依赖 highlightDuplicates，需要手动计算一次
      const combinationCount: Record<string, number[]> = {};
      
      sceneVendorApps.forEach(item => {
        const combinationKey = `${item.vendor || ''}|${item.language || ''}|${item.timbre || ''}|${item.model || ''}`;
        if (!combinationCount[combinationKey]) {
          combinationCount[combinationKey] = [];
        }
        combinationCount[combinationKey].push(item.id);
      });

      const idsToSelect: number[] = [];
      Object.values(combinationCount).forEach(ids => {
        if (ids.length > 1) {
          const sortedIds = [...ids].sort((a, b) => a - b);
          idsToSelect.push(...sortedIds.slice(1)); // 除了最小 ID 以外的都选中
        }
      });

      if (idsToSelect.length > 0) {
        setSelectedRowKeys(idsToSelect);
        // 同时更新 selectedRows
        const rowsToSelect = sceneVendorApps.filter(item => idsToSelect.includes(item.id));
        setSelectedRows(rowsToSelect);
        message.success(`已自动选中 ${idsToSelect.length} 条重复记录（每组保留ID最小的一条）`);
      } else {
        message.info('未发现重复项');
      }
    } else {
      // 关闭时，清空选中
      setSelectedRowKeys([]);
      setSelectedRows([]);
    }
  };

  // 批量同步
  const handleBatchSync = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要同步的记录');
      return;
    }
    setSyncModalVisible(true);
  };

  // 批量编辑相关函数
  const handleBatchEdit = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要编辑的记录');
      return;
    }
    setBatchEditModalVisible(true);
    batchForm.resetFields();
    // 重置批量编辑厂商参数状态
    setBatchVendorParamsEditMode('full');
    setBatchVendorParamsPartialUpdates({});
  };

    // 批量编辑提交（并行优化）
    const handleBatchSubmit = async (values: any) => {
    setBatchEditLoading(true);
    setProgressVisible(true);
    setProgress(0);
    setProgressStatus({ success: 0, failed: 0, total: selectedRows.length });

    // 预处理：如果是完整编辑模式，先压缩一次 vendor_params
    const compactedVendorParams = (batchVendorParamsEditMode === 'full' && values.vendor_params !== undefined)
      ? compactifyJsonString(values.vendor_params)
      : undefined;

    // 预处理：解析部分更新的值
    let parsedUpdates: Record<string, any> = {};
    if (batchVendorParamsEditMode === 'partial' && Object.keys(batchVendorParamsPartialUpdates).length > 0) {
      for (const [key, value] of Object.entries(batchVendorParamsPartialUpdates)) {
        if (typeof value === 'string' && value.trim()) {
          try {
            const trimmedValue = value.trim();
            if (trimmedValue.startsWith('[') || trimmedValue.startsWith('{')) {
              parsedUpdates[key] = JSON.parse(trimmedValue);
            } else {
              parsedUpdates[key] = value;
            }
          } catch (e) {
            parsedUpdates[key] = value;
          }
        } else {
          parsedUpdates[key] = value;
        }
      }
    }

    const results = await processBatchInParallel(
      selectedRows,
      async (record) => {
        const updateData = { ...record, remark: record.remark || undefined };
        if (values.rating !== undefined) updateData.rating = values.rating;
        if (values.language !== undefined) updateData.language = values.language;
        if (values.timbre !== undefined && activeTab === 'TTS') updateData.timbre = values.timbre;
        if (values.model !== undefined) updateData.model = values.model;
        if (values.vendor_app_id !== undefined) updateData.vendor_app_id = values.vendor_app_id;

        // 处理厂商参数更新
        if (activeTab === 'ASR' || activeTab === 'LLM' || activeTab === 'TTS') {
          if (compactedVendorParams !== undefined) {
            updateData.vendor_params = compactedVendorParams;
          } else if (Object.keys(parsedUpdates).length > 0) {
            const originalVendorParams = record.vendor_params || '{}';
            updateData.vendor_params = updateJsonByKeys(originalVendorParams, parsedUpdates);
          }
        }
        
        await updateSceneVendorApp(record.id, updateData, record);
        return record.id;
      },
      (completed, total, success, failed) => {
        setProgress((completed / total) * 100);
        setProgressStatus({ success, failed, total });
      }
    );

    setBatchEditLoading(false);
    setBatchEditModalVisible(false);
    
    setTimeout(() => {
      setProgressVisible(false);
      if (results.failed === 0) {
        message.success(`批量编辑成功！共更新 ${results.success} 条记录`);
      } else {
        message.warning(`批量编辑部分成功：${results.success} 条成功，${results.failed} 条失败`);
      }
      if (results.errors.length > 0) console.error('批量编辑错误详情:', results.errors);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      fetchSceneVendorApps(searchParams);
    }, 1000);
  };

    // 批量启用（并行优化）
    const handleBatchEnable = () => {
      if (selectedRowKeys.length === 0) {
        message.warning('请先选择要启用的记录');
        return;
      }

      Modal.confirm({
        title: `确定要批量启用 ${selectedRowKeys.length} 条记录吗？`,
        content: '此操作将启用所有选中的供应商应用。',
        okText: '确定启用',
        cancelText: '取消',
        onOk: async () => {
          setBatchEnableLoading(true);
          setProgressVisible(true);
          setProgress(0);
          setProgressStatus({ success: 0, failed: 0, total: selectedRows.length });

          const results = await processBatchInParallel(
            selectedRows,
            async (record) => {
              await updateSceneVendorAppStatus(record.id, 1, record);
              return record.id;
            },
            (completed, total, success, failed) => {
              setProgress((completed / total) * 100);
              setProgressStatus({ success, failed, total });
            }
          );

          setBatchEnableLoading(false);
          setTimeout(() => {
            setProgressVisible(false);
            if (results.failed === 0) {
              message.success(`批量启用成功！共启用 ${results.success} 条记录`);
            } else {
              message.warning(`批量启用部分成功：${results.success} 条成功，${results.failed} 条失败`);
            }
            if (results.errors.length > 0) console.error('批量启用错误详情:', results.errors);
            setSelectedRowKeys([]);
            setSelectedRows([]);
            fetchSceneVendorApps(searchParams);
          }, 500);
        }
      });
    };

    // 批量禁用（并行优化）
    const handleBatchDisable = () => {
      if (selectedRowKeys.length === 0) {
        message.warning('请先选择要禁用的记录');
        return;
      }

      Modal.confirm({
        title: `确定要批量禁用 ${selectedRowKeys.length} 条记录吗？`,
        content: '此操作将禁用所有选中的供应商应用。',
        okText: '确定禁用',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          setBatchDisableLoading(true);
          setProgressVisible(true);
          setProgress(0);
          setProgressStatus({ success: 0, failed: 0, total: selectedRows.length });

          const results = await processBatchInParallel(
            selectedRows,
            async (record) => {
              await updateSceneVendorAppStatus(record.id, 0, record);
              return record.id;
            },
            (completed, total, success, failed) => {
              setProgress((completed / total) * 100);
              setProgressStatus({ success, failed, total });
            }
          );

          setBatchDisableLoading(false);
          setTimeout(() => {
            setProgressVisible(false);
            if (results.failed === 0) {
              message.success(`批量禁用成功！共禁用 ${results.success} 条记录`);
            } else {
              message.warning(`批量禁用部分成功：${results.success} 条成功，${results.failed} 条失败`);
            }
            if (results.errors.length > 0) console.error('批量禁用错误详情:', results.errors);
            setSelectedRowKeys([]);
            setSelectedRows([]);
            fetchSceneVendorApps(searchParams);
          }, 500);
        }
      });
    };

    // 批量修复 JSON 格式（并行优化）
    const handleBatchFixJson = () => {
      if (selectedRowKeys.length === 0) {
        message.warning('请先选择要修复的记录');
        return;
      }

      Modal.confirm({
        title: `确定要修复 ${selectedRowKeys.length} 条记录的 JSON 格式吗？`,
        content: '此操作将压缩厂商参数中的 JSON 格式（移除换行和多余空格），不会改变任何具体值。',
        okText: '确定修复',
        cancelText: '取消',
        onOk: async () => {
          setBatchFixJsonLoading(true);
          setProgressVisible(true);
          setProgress(0);
          setProgressStatus({ success: 0, failed: 0, total: selectedRows.length });

          let skipped = 0;
          const results = await processBatchInParallel(
            selectedRows,
            async (record) => {
              // 检查是否有 vendor_params
              if (!record.vendor_params) {
                skipped++;
                return { skipped: true };
              }
              // 压缩 JSON 格式
              const compactedParams = compactifyJsonString(record.vendor_params);
              // 检查是否有变化（避免不必要的更新）
              if (compactedParams === record.vendor_params) {
                skipped++;
                return { skipped: true };
              }
              // 更新记录
              const updateData = { ...record, vendor_params: compactedParams };
              await updateSceneVendorApp(record.id, updateData, record);
              return { skipped: false, id: record.id };
            },
            (completed, total, success, failed) => {
              setProgress((completed / total) * 100);
              setProgressStatus({ success: success - skipped, failed, total });
            }
          );

          // 实际成功数 = 总成功数 - 跳过数
          const actualSuccess = results.success - skipped;

          setBatchFixJsonLoading(false);
          setTimeout(() => {
            setProgressVisible(false);
            if (results.failed === 0) {
              message.success(`JSON 格式修复完成！修复 ${actualSuccess} 条，跳过 ${skipped} 条（无需修复）`);
            } else {
              message.warning(`JSON 格式修复部分完成：${actualSuccess} 条成功，${results.failed} 条失败，${skipped} 条跳过`);
            }
            if (results.errors.length > 0) console.error('批量修复错误详情:', results.errors);
            setSelectedRowKeys([]);
            setSelectedRows([]);
            fetchSceneVendorApps(searchParams);
          }, 500);
        }
      });
    };

    // 批量删除（并行优化）
    const handleBatchDelete = () => {
      if (selectedRowKeys.length === 0) {
        message.warning('请先选择要删除的记录');
        return;
      }

      Modal.confirm({
        title: `确定要批量删除 ${selectedRowKeys.length} 条记录吗？`,
        content: (
          <div>
            <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>⚠️ 此操作不可恢复！</p>
            <p>将永久删除所有选中的供应商应用记录。</p>
          </div>
        ),
        okText: '确定删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          setBatchDeleteLoading(true);
          setProgressVisible(true);
          setProgress(0);
          setProgressStatus({ success: 0, failed: 0, total: selectedRows.length });

          const results = await processBatchInParallel(
            selectedRows,
            async (record) => {
              await deleteSceneVendorApp(record.id);
              return record.id;
            },
            (completed, total, success, failed) => {
              setProgress((completed / total) * 100);
              setProgressStatus({ success, failed, total });
            }
          );

          setBatchDeleteLoading(false);
          setTimeout(() => {
            setProgressVisible(false);
            if (results.failed === 0) {
              message.success(`批量删除成功！共删除 ${results.success} 条记录`);
            } else {
              message.warning(`批量删除部分成功：${results.success} 条成功，${results.failed} 条失败`);
            }
            if (results.errors.length > 0) console.error('批量删除错误详情:', results.errors);
            setSelectedRowKeys([]);
            setSelectedRows([]);
            fetchSceneVendorApps(searchParams);
          }, 500);
        }
      });
    };

    // 按国家批量新增
    const handleBatchCreateByCountry = () => {
      if (activeTab !== 'TTS' && activeTab !== 'ASR') {
        message.warning('按国家批量新增仅支持 TTS 和 ASR 类型');
        return;
      }
      batchCreateByCountryForm.resetFields();
      setBatchCreateByCountryModalVisible(true);
    };

    // 按国家批量新增提交（并行优化）
    const handleBatchCreateByCountrySubmit = async (values: any) => {
      const { languages, ...otherValues } = values;
      
      if (!languages || languages.length === 0) {
        message.error('请至少选择一个国家/地区');
        return;
      }

      setBatchCreateByCountryLoading(true);
      setProgressVisible(true);
      setProgress(0);
      setProgressStatus({ success: 0, failed: 0, total: languages.length });

      // 压缩 JSON 格式（只做一次）
      const compactedVendorParams = otherValues.vendor_params ? compactifyJsonString(otherValues.vendor_params) : undefined;

      const results = await processBatchInParallel(
        languages,
        async (language: string) => {
          // 构建创建数据
          const createData = {
            ...otherValues,
            language,
            vendor_params: compactedVendorParams,
          };
          // 删除显示用的字段
          delete createData.vendorDisplay;
          await createSceneVendorApp(createData);
          return language;
        },
        (completed, total, success, failed) => {
          setProgress((completed / total) * 100);
          setProgressStatus({ success, failed, total });
        }
      );

      setBatchCreateByCountryLoading(false);
      
      setTimeout(() => {
        setProgressVisible(false);
        if (results.failed === 0) {
          message.success(`按国家批量新增成功！共创建 ${results.success} 条记录`);
          setBatchCreateByCountryModalVisible(false);
        } else {
          message.warning(`按国家批量新增部分成功：${results.success} 条成功，${results.failed} 条失败`);
        }
        if (results.errors.length > 0) {
          console.error('批量新增错误详情:', results.errors);
          Modal.error({
            title: '部分创建失败',
            content: (
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {results.errors.map((err, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>{err}</div>
                ))}
              </div>
            ),
          });
        }
        fetchSceneVendorApps(searchParams);
      }, 1000);
    };

    const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys: React.Key[], selectedRows: SceneVendorApp[]) => {
      setSelectedRowKeys(selectedRowKeys.map(id => parseInt(id.toString(), 10)));
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
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => (
        <span style={{ fontFamily: 'monospace', color: '#1890ff' }}>
          {id}
        </span>
      )
    },
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
      title: '公开',
      dataIndex: 'shared',
      key: 'shared',
      width: 80,
      render: (shared: boolean) => (
        <Tag color={shared ? 'cyan' : 'default'}>
          {shared ? '是' : '否'}
        </Tag>
      )
    },
    {
      title: '克隆',
      key: 'is_clone',
      width: 80,
      render: (_: any, record: SceneVendorApp) => {
        const isClone = !!record.clone_url;
        return (
          <Tag color={isClone ? 'purple' : 'default'}>
            {isClone ? '是' : '否'}
          </Tag>
        );
      }
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
    return baseColumns.filter(col => !['timbre', 'shared', 'is_clone'].includes(col.key || ''));
  }
  
  return baseColumns;
};

  // 本地模糊搜索过滤
  const filteredSceneVendorApps = sceneVendorApps.filter(item => {
    // 厂商参数搜索过滤
    if (localSearchText.trim() !== '') {
      const searchLower = localSearchText.toLowerCase();
      const vendorParams = item.vendor_params ? item.vendor_params.toLowerCase() : '';
      if (!vendorParams.includes(searchLower)) {
        return false;
      }
    }
    
    // 时间范围过滤
    if (updateTimeRange && (updateTimeRange[0] || updateTimeRange[1])) {
      const updateTime = item.update_ts ? parseInt(String(item.update_ts)) * 1000 : 0; // 转换为毫秒
      
      // 如果有开始时间，检查是否在开始时间之后
      if (updateTimeRange[0]) {
        const startTime = updateTimeRange[0].valueOf();
        if (updateTime < startTime) {
          return false;
        }
      }
      
      // 如果有结束时间，检查是否在结束时间之前（包括当天的23:59:59）
      if (updateTimeRange[1]) {
        const endOfDay = updateTimeRange[1].endOf('day').valueOf();
        if (updateTime > endOfDay) {
          return false;
        }
      }
    }
    
    return true;
  });

  // 搜索组件
  const renderSearchForm = () => {
    const currentVendorConfig = getCurrentVendorConfig(activeTab);
    
    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
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
          <Col span={6}>
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
              <Option key="*" value="*">
                * (支持所有国家/地区)
              </Option>
              {languageOptions.map(option => (
                <Option key={option.locale} value={option.locale}>
                  {option.language_desc}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
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
          <Col span={6}>
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
        </Row>
        
        {/* 模糊搜索行 */}
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Input
              placeholder="模糊过滤表格 (搜索厂商参数)"
              prefix={<SearchOutlined />}
              value={localSearchText}
              onChange={(e) => setLocalSearchText(e.target.value)}
              allowClear
              style={{ width: '100%' }}
            />
            {localSearchText && (
              <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
                搜索结果: <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{filteredSceneVendorApps.length}</span> 条 
                {filteredSceneVendorApps.length > 0 && sceneVendorApps.length > 0 && (
                  <span>（共 {sceneVendorApps.length} 条，匹配率 {Math.round((filteredSceneVendorApps.length / sceneVendorApps.length) * 100)}%）</span>
                )}
              </div>
            )}
          </Col>
        </Row>
        
        {/* 时间范围筛选行 */}
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={12}>
            <DatePicker.RangePicker
              value={updateTimeRange}
              onChange={(dates) => setUpdateTimeRange(dates as any)}
              placeholder={['更新时间开始', '更新时间结束']}
              showTime={{ format: 'HH:mm:ss' }}
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={12}>
            {updateTimeRange && (updateTimeRange[0] || updateTimeRange[1]) && (
              <div style={{ color: '#666', fontSize: '12px', lineHeight: '32px' }}>
                按更新时间筛选: <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                  {updateTimeRange[0]?.format('YYYY-MM-DD HH:mm:ss') || '开始'} ~ {updateTimeRange[1]?.format('YYYY-MM-DD HH:mm:ss') || '结束'}
                </span> （{filteredSceneVendorApps.length}条记录）
              </div>
            )}
          </Col>
        </Row>
        
        {/* TTS和ASR专用搜索行 */}
        {(activeTab === 'TTS' || activeTab === 'ASR') && (
          <Row gutter={16} style={{ marginTop: 16 }}>
            {/* TTS音色搜索 */}
            {activeTab === 'TTS' && (
              <>
                <Col span={5}>
                  <Input
                    placeholder="搜索音色"
                    allowClear
                    prefix={<SearchOutlined />}
                    value={searchParams.timbre}
                    onChange={(e) => {
                      const newParams = { ...searchParams, timbre: e.target.value };
                      setSearchParams(newParams);
                    }}
                  />
                </Col>
                <Col span={3}>
                  <Select
                    placeholder="是否公开"
                    allowClear
                    style={{ width: '100%' }}
                    value={searchParams.shared}
                    onChange={(value) => {
                      const newParams = { ...searchParams, shared: value };
                      setSearchParams(newParams);
                    }}
                  >
                    <Option value={true}>公开(是)</Option>
                    <Option value={false}>公开(否)</Option>
                  </Select>
                </Col>
                <Col span={3}>
                  <Select
                    placeholder="是否克隆"
                    allowClear
                    style={{ width: '100%' }}
                    value={searchParams.is_clone}
                    onChange={(value) => {
                      const newParams = { ...searchParams, is_clone: value };
                      setSearchParams(newParams);
                    }}
                  >
                    <Option value={true}>克隆(是)</Option>
                    <Option value={false}>克隆(否)</Option>
                  </Select>
                </Col>
              </>
            )}
            
            {/* 模型搜索 (ASR和TTS都支持) */}
            <Col span={activeTab === 'TTS' ? 5 : 6}>
              <Input
                placeholder={`搜索${activeTab}模型`}
                allowClear
                prefix={<SearchOutlined />}
                value={searchParams.model}
                onChange={(e) => {
                  const newParams = { ...searchParams, model: e.target.value };
                  setSearchParams(newParams);
                }}
              />
            </Col>
            
            <Col span={activeTab === 'TTS' ? 8 : 18}>
              <div style={{ color: '#666', fontSize: '12px', lineHeight: '32px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                💡 {activeTab === 'TTS' 
                  ? '支持音色、公开、克隆及模型搜索。' 
                  : '模型搜索支持模型名称关键词。'
                }
              </div>
            </Col>
          </Row>
        )}

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Space>
              <Input.TextArea
                rows={1}
                placeholder="在此粘贴多个数据ID，用逗号、空格或换行分隔"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                style={{ width: 400, verticalAlign: 'middle' }}
              />
              <Button onClick={handleSelectByIds}>
                按ID勾选
              </Button>
              <Button onClick={handleExportIds}>
                导出当前页ID
              </Button>
              {(activeTab === 'TTS' || activeTab === 'ASR') && (
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 16 }}>
                  <span style={{ marginRight: 8, fontWeight: '500' }}>重复项高亮：</span>
                  <Switch
                    checked={highlightDuplicates}
                    onChange={handleHighlightDuplicatesChange}
                    checkedChildren="开"
                    unCheckedChildren="关"
                    size="small"
                  />
                </div>
              )}
            </Space>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Space>
              <Button 
                type="primary" 
                icon={<SearchOutlined />}
                onClick={() => {
                  // 触发搜索，通过更新时间戳强制刷新
                  setSearchParams({ ...searchParams, _t: Date.now() });
                }}
              >
                查询
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSearchParams({ _t: Date.now() }); // 重置搜索参数并刷新
                  setLocalSearchText(''); // 清空本地搜索文本
                  setUpdateTimeRange(null); // 清空时间范围
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
              {(activeTab === 'TTS' || activeTab === 'ASR') && (
                <Button 
                  type="primary" 
                  icon={<GlobalOutlined />}
                  onClick={handleBatchCreateByCountry}
                  style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}
                >
                  按国家批量新增
                </Button>
              )}
            </Space>
            <Space style={{ marginLeft: 24 }}>
              <Button 
                type="default" 
                icon={<EditOutlined />}
                onClick={handleBatchEdit}
                disabled={selectedRowKeys.length === 0}
              >
                批量编辑 ({selectedRowKeys.length})
              </Button>
              <Button 
                type="default" 
                icon={<CloudSyncOutlined />}
                onClick={handleBatchSync}
                disabled={selectedRowKeys.length === 0}
                style={{ color: '#722ed1', borderColor: '#722ed1' }}
              >
                批量同步 ({selectedRowKeys.length})
              </Button>
              <Button 
                type="default"  
                icon={<CheckOutlined />}
                onClick={handleBatchEnable}
                disabled={selectedRowKeys.length === 0}
                loading={batchEnableLoading}
                style={{ color: '#52c41a', borderColor: '#52c41a' }}
              >
                批量启用 ({selectedRowKeys.length})
              </Button>
              <Button 
                type="default" 
                icon={<StopOutlined />}
                onClick={handleBatchDisable}
                disabled={selectedRowKeys.length === 0}
                loading={batchDisableLoading}
                style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
              >
                批量禁用 ({selectedRowKeys.length})
              </Button>
              <Button 
                type="default" 
                icon={<ToolOutlined />}
                onClick={handleBatchFixJson}
                disabled={selectedRowKeys.length === 0}
                loading={batchFixJsonLoading}
                style={{ color: '#fa8c16', borderColor: '#fa8c16' }}
              >
                修复JSON格式 ({selectedRowKeys.length})
              </Button>
              <Button 
                type="default" 
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
                disabled={selectedRowKeys.length === 0}
                loading={batchDeleteLoading}
                danger
              >
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>供应商应用管理</Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <DataCenterSelector 
                onChange={handleDataCenterChange} 
                size="small"
              />
              <TokenManager onTokenChange={setHasValidToken} />
            </div>
          </div>
          <Alert
            message="功能已优化"
            description="✅ 数据中心切换：支持在香港和CHL环境之间快速切换，自动更新API请求地址 ✅ 统一令牌管理：所有页面现在都可以方便地编辑API令牌 ✅ 批量操作功能：支持批量编辑、批量启用、批量禁用、批量同步等操作 ✅ 批量同步：支持跨环境同步数据，可自定义唯一标识组合"
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
              dataSource={filteredSceneVendorApps}
              rowKey="id"
              loading={loading}
              rowSelection={rowSelection}
              rowClassName={(record) => {
                if (highlightDuplicates) {
                  return duplicateAnalysis.ids.has(record.id) ? 'duplicate-row-highlight' : '';
                }
                return '';
              }}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '50', '100', '200', '500', '1000'],
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size || 10);
                }
              }}
              scroll={{ x: 1480 }}
              size="small"
            />
          </TabPane>
          
          <TabPane tab="ASR" key="ASR">
            {renderSearchForm()}
            <Table
              columns={getSceneVendorAppColumns()}
              dataSource={filteredSceneVendorApps}
              rowKey="id"
              loading={loading}
              rowSelection={rowSelection}
              rowClassName={(record) => {
                if (highlightDuplicates) {
                  return duplicateAnalysis.ids.has(record.id) ? 'duplicate-row-highlight' : '';
                }
                return '';
              }}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '50', '100', '200', '500', '1000'],
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size || 10);
                }
              }}
              scroll={{ x: 1480 }}
              size="small"
            />
          </TabPane>
          
          <TabPane tab="LLM" key="LLM">
            {renderSearchForm()}
            <Table
              columns={getSceneVendorAppColumns()}
              dataSource={filteredSceneVendorApps}
              rowKey="id"
              loading={loading}
              rowSelection={rowSelection}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '50', '100', '200', '500', '1000'],
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size || 10);
                }
              }}
              scroll={{ x: 1480 }}
              size="small"
            />
          </TabPane>

          <TabPane tab="11Labs参数转换" key="11labs-converter">
            <ElevenLabsParamsConverter />
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
                  <Option key="*" value="*">
                    * (支持所有国家/地区)
                  </Option>
                  {languageOptions.map(option => (
                    <Option key={option.locale} value={option.locale}>
                      {option.language_desc}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {activeTab === 'TTS' && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="是否克隆"
                  name="is_clone"
                  rules={[{ required: true, message: '请选择是否克隆' }]}
                  initialValue={false}
                >
                  <Select placeholder="请选择">
                    <Option value={false}>否</Option>
                    <Option value={true}>是</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="是否公开"
                  name="shared"
                  rules={[{ required: true, message: '请选择是否公开' }]}
                  initialValue={true}
                >
                  <Select placeholder="请选择">
                    <Option value={true}>是</Option>
                    <Option value={false}>否</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

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

          <Form.Item label="厂商参数编辑模式">
            <Radio.Group
              value={vendorParamsEditMode}
              onChange={(e) => setVendorParamsEditMode(e.target.value)}
            >
              <Radio value="full">完整替换</Radio>
              <Radio value="partial">部分更新</Radio>
            </Radio.Group>
          </Form.Item>

          {vendorParamsEditMode === 'full' ? (
            <Form.Item
              label="厂商参数"
              name="vendor_params"
            >
              <Input.TextArea
                placeholder="请输入厂商参数（JSON格式）"
                rows={4}
              />
            </Form.Item>
          ) : (
            <div>
              <Form.Item label="要更新的JSON字段">
                <div style={{ marginBottom: 8 }}>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setVendorParamsPartialUpdates({})}
                  >
                    清空所有
                  </Button>
                  {availableJsonKeys.length > 0 && (
                    <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
                      可用的字段: {availableJsonKeys.join(', ')}
                    </span>
                  )}
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 6, padding: 8 }}>
                  {Object.entries(vendorParamsPartialUpdates).map(([key, value]) => (
                    <Row key={key} gutter={8} style={{ marginBottom: 8, alignItems: 'center' }}>
                      <Col span={8}>
                        <Input
                          placeholder="字段名"
                          value={key}
                          onChange={(e) => {
                            const newKey = e.target.value;
                            const newUpdates = { ...vendorParamsPartialUpdates };
                            delete newUpdates[key];
                            if (newKey) {
                              newUpdates[newKey] = value;
                            }
                            setVendorParamsPartialUpdates(newUpdates);
                          }}
                        />
                      </Col>
                      <Col span={13}>
                        <Input
                          placeholder="新值"
                          value={value}
                          onChange={(e) => {
                            const newUpdates = { ...vendorParamsPartialUpdates };
                            newUpdates[key] = e.target.value;
                            setVendorParamsPartialUpdates(newUpdates);
                          }}
                        />
                      </Col>
                      <Col span={3}>
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            const newUpdates = { ...vendorParamsPartialUpdates };
                            delete newUpdates[key];
                            setVendorParamsPartialUpdates(newUpdates);
                          }}
                        />
                      </Col>
                    </Row>
                  ))}
                  <Button
                    type="dashed"
                    size="small"
                    block
                    onClick={() => {
                      const newUpdates = { ...vendorParamsPartialUpdates };
                      const newKey = `key${Object.keys(newUpdates).length + 1}`;
                      newUpdates[newKey] = '';
                      setVendorParamsPartialUpdates(newUpdates);
                    }}
                  >
                    + 添加字段
                  </Button>
                </div>
                {Object.keys(vendorParamsPartialUpdates).length > 0 && (
                  <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
                    <div style={{ fontSize: '12px', color: '#52c41a', marginBottom: 4 }}>
                      将要更新的字段:
                    </div>
                    {Object.entries(vendorParamsPartialUpdates).map(([key, value]) => (
                      <div key={key} style={{ fontSize: '12px', color: '#666' }}>
                        <strong>{key}</strong>: {value}
                      </div>
                    ))}
                  </div>
                )}
              </Form.Item>
            </div>
          )}

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
                  <Option key="*" value="*">
                    * (支持所有国家/地区)
                  </Option>
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

          {/* 厂商参数在所有服务类型中都支持编辑（ASR、LLM、TTS） */}
          {(activeTab === 'ASR' || activeTab === 'LLM' || activeTab === 'TTS') && (
            <>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item label="厂商参数编辑模式">
                    <Radio.Group
                      value={batchVendorParamsEditMode}
                      onChange={(e) => setBatchVendorParamsEditMode(e.target.value)}
                    >
                      <Radio value="full">完整替换</Radio>
                      <Radio value="partial">部分更新</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  {batchVendorParamsEditMode === 'full' ? (
                    <Form.Item
                      label="厂商参数"
                      name="vendor_params"
                    >
                      <Input.TextArea
                        placeholder="输入厂商参数（JSON格式，不填写则不修改）"
                        rows={4}
                      />
                    </Form.Item>
                  ) : (
                    <Form.Item label="要更新的JSON字段">
                      <div style={{ marginBottom: 8 }}>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => setBatchVendorParamsPartialUpdates({})}
                        >
                          清空所有
                        </Button>
                      </div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 6, padding: 8 }}>
                        {Object.entries(batchVendorParamsPartialUpdates).map(([key, value]) => (
                          <Row key={key} gutter={8} style={{ marginBottom: 8, alignItems: 'center' }}>
                            <Col span={8}>
                              <Input
                                placeholder="字段名"
                                value={key}
                                onChange={(e) => {
                                  const newKey = e.target.value;
                                  const newUpdates = { ...batchVendorParamsPartialUpdates };
                                  delete newUpdates[key];
                                  if (newKey) {
                                    newUpdates[newKey] = value;
                                  }
                                  setBatchVendorParamsPartialUpdates(newUpdates);
                                }}
                              />
                            </Col>
                            <Col span={13}>
                              <Input
                                placeholder="新值"
                                value={value}
                                onChange={(e) => {
                                  const newUpdates = { ...batchVendorParamsPartialUpdates };
                                  newUpdates[key] = e.target.value;
                                  setBatchVendorParamsPartialUpdates(newUpdates);
                                }}
                              />
                            </Col>
                            <Col span={3}>
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  const newUpdates = { ...batchVendorParamsPartialUpdates };
                                  delete newUpdates[key];
                                  setBatchVendorParamsPartialUpdates(newUpdates);
                                }}
                              />
                            </Col>
                          </Row>
                        ))}
                        <Button
                          type="dashed"
                          size="small"
                          block
                          onClick={() => {
                            const newUpdates = { ...batchVendorParamsPartialUpdates };
                            const newKey = `key${Object.keys(newUpdates).length + 1}`;
                            newUpdates[newKey] = '';
                            setBatchVendorParamsPartialUpdates(newUpdates);
                          }}
                        >
                          + 添加字段
                        </Button>
                      </div>
                      {Object.keys(batchVendorParamsPartialUpdates).length > 0 && (
                        <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
                          <div style={{ fontSize: '12px', color: '#52c41a', marginBottom: 4 }}>
                            将要更新的字段:
                          </div>
                          {Object.entries(batchVendorParamsPartialUpdates).map(([key, value]) => (
                            <div key={key} style={{ fontSize: '12px', color: '#666' }}>
                              <strong>{key}</strong>: {value}
                            </div>
                          ))}
                        </div>
                      )}
                    </Form.Item>
                  )}
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Modal>

      {/* 批量操作进度条 */}
      <Modal
        title="批量操作进行中..."
        open={progressVisible}
        footer={null}
        closable={false}
        maskClosable={false}
      >
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Progress type="circle" percent={Math.round(progress)} />
          <p style={{ marginTop: 16 }}>
            总数: {progressStatus.total} | 
            <span style={{ color: 'green' }}> 成功: {progressStatus.success} </span>| 
            <span style={{ color: 'red' }}> 失败: {progressStatus.failed} </span>
          </p>
          <p>请稍候，正在处理数据...</p>
        </div>
      </Modal>

      {/* 批量同步模态框 */}
      <VendorSyncModal
        visible={syncModalVisible}
        onCancel={() => setSyncModalVisible(false)}
        selectedRows={selectedRows}
        activeTab={activeTab}
        serviceType={SERVICE_TYPE_MAP[activeTab as keyof typeof SERVICE_TYPE_MAP]}
      />

      {/* 按国家批量新增模态框 */}
      <Modal
        title={`按国家批量新增 (${activeTab})`}
        open={batchCreateByCountryModalVisible}
        onCancel={() => setBatchCreateByCountryModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setBatchCreateByCountryModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={batchCreateByCountryLoading}
            onClick={() => batchCreateByCountryForm.submit()}
          >
            批量创建
          </Button>
        ]}
        width={800}
        destroyOnClose
      >
        <Alert
          message="功能说明"
          description="选择多个国家/地区，将为每个选中的国家/地区创建一条记录，其他字段值保持一致。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form
          form={batchCreateByCountryForm}
          layout="vertical"
          onFinish={handleBatchCreateByCountrySubmit}
          initialValues={{
            type: activeTab === 'TTS' ? 2 : (activeTab === 'ASR' ? 1 : 3),
            status: 1,
            is_clone: false,
            shared: true,
          }}
        >
          <Form.Item
            label="选择国家/地区（可多选）"
            name="languages"
            rules={[{ required: true, message: '请至少选择一个国家/地区' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择国家/地区（支持搜索）"
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
              maxTagCount="responsive"
            >
              {languageOptions.map(option => (
                <Option key={option.locale} value={option.locale}>
                  {option.language_desc} ({option.locale})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="类型"
                name="type"
                rules={[{ required: true, message: '请选择类型' }]}
              >
                <Select disabled>
                  <Option value={1}>ASR</Option>
                  <Option value={2}>TTS</Option>
                  <Option value={3}>LLM</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="供应商"
                name="vendor"
                rules={[{ required: true, message: '请选择供应商' }]}
              >
                <Select 
                  placeholder="请选择供应商"
                  showSearch
                  optionFilterProp="children"
                >
                  {getCurrentVendorConfig(activeTab).map(vendor => (
                    <Option key={vendor.value} value={vendor.value}>
                      {vendor.codeName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {activeTab === 'TTS' && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="是否克隆"
                  name="is_clone"
                  rules={[{ required: true, message: '请选择是否克隆' }]}
                >
                  <Select placeholder="请选择">
                    <Option value={false}>否</Option>
                    <Option value={true}>是</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="是否公开"
                  name="shared"
                  rules={[{ required: true, message: '请选择是否公开' }]}
                >
                  <Select placeholder="请选择">
                    <Option value={true}>是</Option>
                    <Option value={false}>否</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

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
            <Col span={activeTab === 'TTS' ? 12 : 24}>
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
                label="评级"
                name="rating"
              >
                <Select placeholder="请选择评级" allowClear>
                  <Option value="Pro">Pro</Option>
                  <Option value="Standard">Standard</Option>
                  <Option value="Basic">Basic</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
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
            <Col span={12}>
              <Form.Item
                label="代码"
                name="code"
              >
                <Input placeholder="请输入代码" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="厂商参数 (JSON格式)"
            name="vendor_params"
          >
            <Input.TextArea
              placeholder="请输入厂商参数（JSON格式）"
              rows={4}
            />
          </Form.Item>

          <Form.Item
            label="备注"
            name="remark"
          >
            <Input.TextArea placeholder="请输入备注" rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导出ID模态框 */}
      <Modal
        title="导出当前页数据ID"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={[
          <Button key="copy" type="primary" onClick={() => {
            navigator.clipboard.writeText(exportData);
            message.success('已复制到剪贴板');
          }}>
            复制到剪贴板
          </Button>,
          <Button key="close" onClick={() => setExportModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <Input.TextArea
          value={exportData}
          autoSize={{ minRows: 10, maxRows: 20 }}
          readOnly
        />
      </Modal>
    </div>
  );
};

export default VendorAppManagementPage; 