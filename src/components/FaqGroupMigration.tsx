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
  Select,
  Pagination,
  Alert,
  Divider,
  Descriptions,
  Checkbox
} from 'antd';
import { EyeOutlined, SearchOutlined, ReloadOutlined, DownloadOutlined, UploadOutlined, PlusOutlined, ExportOutlined, ImportOutlined, SwapOutlined, CaretRightOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useUserContext } from '../context/UserContext';
import Loading from './Loading';
import MigrationResult from './MigrationResult';
import { 
  getFaqLanguageList, 
  getTenantFaqLanguageList, 
  getFaqGroupList, 
  migrateFaqs, 
  exportFaqs,
  addFaqLanguage,
  addFaq,
  getFaqsByGroupId
} from '../services/api';
import axios from 'axios';
import { FaqUserParams, FaqItemDetailed, FaqListData } from '../types';
import { groupBy, sortBy, uniqBy } from 'lodash';
import { ExcelExport } from '@nxlink/toolkit';
import { createTagGroup } from '../services/api';
import { ExcelExport as OldExcelExport } from '../utils/ExcelExport';
import dayjs from 'dayjs';
import {
  getSourceTenantInfo,
  getTargetTenantInfo,
  getFaqGroupById,
  createFaqGroup,
  getLanguageList,
  getMigrateToken,
  checkGroupId,
  checkFaqMigrate
} from '../services/api';

const { Text } = Typography;
const { Search } = Input;
const { Option } = Select;

// 定义组件类型
interface FaqGroupMigrationProps {}

// 定义暴露给父组件的方法
export interface FaqGroupMigrationHandle {
  refreshFaqs: () => Promise<void>;
  migrateToTarget: () => Promise<void>;
  handleMigrateOptions: () => void;
}

interface FaqListData {
  list: FaqItemDetailed[];
  total: number;
  page_number: number;
  page_size: number;
  code: number;
  message: string | null;
  traceId?: string;
}

const FaqGroupMigration = forwardRef<FaqGroupMigrationHandle, FaqGroupMigrationProps>((props, ref) => {
  const { faqUserParams } = useUserContext();
  const [faqList, setFaqList] = useState<any[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [successFaqs, setSuccessFaqs] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [languageList, setLanguageList] = useState<{ id: number; name: string }[]>([]);
  const [tenantLanguageList, setTenantLanguageList] = useState<{ id: number; language_id: number; language_name: string }[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<number>(0);
  const [targetLanguageId, setTargetLanguageId] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addLanguageModalVisible, setAddLanguageModalVisible] = useState(false);
  const [selectedNewLanguageId, setSelectedNewLanguageId] = useState<number | undefined>(undefined);
  const [addingLanguage, setAddingLanguage] = useState(false);
  
  // 新增状态 - 分组详情
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{ id: number | null; group_name: string; group_size: number } | null>(null);
  const [groupFaqList, setGroupFaqList] = useState<any[]>([]);
  const [loadingGroupFaqs, setLoadingGroupFaqs] = useState(false);
  const [groupFaqPagination, setGroupFaqPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // 状态变量定义
  const [migrationResults, setMigrationResults] = useState<Array<{groupName: string; count: number}>>([]);
  const [failedFaqs, setFailedFaqs] = useState<Array<{groupName: string; question: string; reason: string}>>([]);

  // 前缀处理相关状态
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [prefixProcessing, setPrefixProcessing] = useState(false);
  const [prefixAdd, setPrefixAdd] = useState<string>('');
  const [prefixRemove, setPrefixRemove] = useState<string>('');

  // 当用户参数变化时，加载语言列表
  useEffect(() => {
    if (faqUserParams?.sourceAuthorization) {
      fetchLanguageList();
      fetchTenantLanguageList();
      // 设置默认前缀值
      // 由于FaqUserParams没有sourceTenantID，这里暂时使用空字符串
      setPrefixAdd('');
    }
  }, [faqUserParams]);

  // 当选择语言变化时，加载FAQ列表
  useEffect(() => {
    if (selectedLanguageId > 0) {
      fetchFaqList();
    }
  }, [selectedLanguageId]);

  // 过滤FAQ
  useEffect(() => {
    if (searchText) {
      const filtered = faqList.filter(faq => 
        faq.group_name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredFaqs(filtered);
    } else {
      setFilteredFaqs(faqList);
    }
  }, [searchText, faqList]);

  // 获取语言列表
  const fetchLanguageList = async () => {
    try {
      const languages = await getFaqLanguageList();
      if (!Array.isArray(languages)) {
        throw new Error('获取FAQ语言列表返回数据非预期类型');
      }
      setLanguageList(languages);
    } catch (error) {
      message.error('获取FAQ语言列表失败，请重新登录', 3);
      console.error('❌ [FaqGroupMigration] 获取FAQ语言列表失败:', error);
      setLanguageList([]);
    }
  };

  // 获取租户语言列表
  const fetchTenantLanguageList = async () => {
    try {
      const languages = await getTenantFaqLanguageList();
      if (!Array.isArray(languages)) {
        throw new Error('获取租户FAQ语言列表返回数据非预期类型');
      }
      setTenantLanguageList(languages);
      if (languages.length > 0) {
        setSelectedLanguageId(languages[0].language_id);
      } else {
        setSelectedLanguageId(0);
      }
    } catch (error) {
      message.error('获取租户FAQ语言列表失败，请重新登录', 3);
      console.error('❌ [FaqGroupMigration] 获取租户FAQ语言列表失败:', error);
      setTenantLanguageList([]);
      setSelectedLanguageId(0);
    }
  };

  // 打开添加语言模态框
  const showAddLanguageModal = () => {
    setSelectedNewLanguageId(undefined);
    setAddLanguageModalVisible(true);
  };

  // 关闭添加语言模态框
  const closeAddLanguageModal = () => {
    setAddLanguageModalVisible(false);
  };

  // 处理添加语言选择变化
  const handleAddLanguageSelect = (value: number) => {
    setSelectedNewLanguageId(value);
  };

  // 添加语言确认
  const confirmAddLanguage = async () => {
    if (!selectedNewLanguageId) {
      message.error('请选择要添加的语言', 3);
      return;
    }
    
    setAddingLanguage(true);
    try {
      await addFaqLanguage(selectedNewLanguageId);
      message.success('语言添加成功', 3);
      // 同时刷新两个语言列表
      await Promise.all([
        fetchTenantLanguageList(), // 刷新租户已有语言列表
        fetchLanguageList() // 刷新所有可选语言列表
      ]);
      closeAddLanguageModal();
    } catch (error) {
      message.error('添加语言失败', 3);
      console.error('❌ [FaqGroupMigration] 添加语言失败:', error);
    } finally {
      setAddingLanguage(false);
    }
  };

  // 获取FAQ列表
  const fetchFaqList = async () => {
    if (!faqUserParams || !selectedLanguageId) return;
    
    setLoading(true);
    try {
      console.log(`🔍 [FaqGroupMigration] 开始请求FAQ分组列表，语言ID: ${selectedLanguageId}`);
      const response = await getFaqGroupList(selectedLanguageId);
      console.log(`📋 [FaqGroupMigration] 获取到原始响应:`, response);
      
      // 检查返回状态
      if (!response || typeof response !== 'object' || response.code !== 0) {
        const msg = response?.message || '未知错误';
        message.error(`获取FAQ分组列表失败: ${msg}`, 3);
        setFaqList([]);
        setFilteredFaqs([]);
        console.error('❌ [FaqGroupMigration] FAQ接口返回数据异常:', response);
        return;
      }
      
      console.log(`📋 [FaqGroupMigration] response类型: ${typeof response}, 包含字段:`, Object.keys(response));
      
      // 根据新的响应结构，数据在response.data中，过滤掉所有分类(id=null)
      const rawData = Array.isArray(response.data) ? response.data : [];
      const faqListData = rawData.filter((group: any) => group.id !== null);
      
      console.log(`✅ [FaqGroupMigration] 已获取FAQ分组列表(排除所有分类)，共 ${faqListData.length} 条, 第一条数据:`, faqListData.length > 0 ? faqListData[0] : '无数据');
      setFaqList(faqListData);
      setFilteredFaqs(faqListData);
    } catch (error) {
      message.error('获取FAQ分组列表失败', 3);
      console.error('❌ [FaqGroupMigration] 获取FAQ分组列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 暴露刷新方法给父组件
  useImperativeHandle(ref, () => ({
    refreshFaqs: fetchFaqList,
    migrateToTarget: handleMigrate,
    handleMigrateOptions: handleMigrateOptions
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
    getCheckboxProps: (record: any) => ({
      // 为null的ID使用-1作为key
      name: record.id === null ? '-1' : record.id.toString(),
    }),
  };

  // 处理语言变更
  const handleLanguageChange = (value: number) => {
    setSelectedLanguageId(value);
  };

  // 处理目标语言变更（更新枚举ID和租户级ID）
  const handleTargetLanguageChange = (enumId: number) => {
    setTargetLanguageId(enumId);
  };

  // 处理迁移
  const handleMigrate = async () => {
    if (!faqUserParams) {
      message.error('请先设置FAQ参数');
      return;
    }

    if (selectedRowKeys.length === 0) {
      message.error('请选择要迁移的FAQ分组');
      return;
    }

    if (!targetLanguageId) {
      message.error('请选择目标语言');
      return;
    }

    // 检查授权Token
    if (!faqUserParams.sourceAuthorization) {
      message.error('源租户授权Token缺失，请重新设置身份认证', 3);
      return;
    }
    if (!faqUserParams.targetAuthorization) {
      message.error('目标租户授权Token缺失，请重新设置身份认证', 3);
      return;
    }

    // 检查源租户和目标租户信息是否可以从 faqUserParams 中获取
    const sourceInfo = getSourceTenantInfo();
    const targetInfo = getTargetTenantInfo();
    
    if (!sourceInfo || !targetInfo) {
      message.error('无法获取源租户或目标租户信息，请重新设置身份认证', 3);
      return;
    }

    // 记录迁移方向和授权信息
    console.log('🔄 [FaqGroupMigration] 开始从【源租户】迁移FAQ到【目标租户】');
    console.log(`🔑 源租户Token(迁移源)前20位: ${faqUserParams.sourceAuthorization.substring(0, 20)}...`);
    console.log(`🔑 目标租户Token(迁移目标)前20位: ${faqUserParams.targetAuthorization.substring(0, 20)}...`);

    setMigrating(true);
    setModalVisible(true);
    
    try {
      // 过滤出选中的FAQ分组
      const selectedGroups = faqList.filter(group => {
        // 修改：允许包含id为null的分组（未分类）
        return selectedRowKeys.includes(group.id === null ? -1 : group.id);
      });
      
      if (selectedGroups.length === 0) {
        message.warning('未选择有效的分组', 3);
        setMigrating(false);
        return;
      }
      
      // 存储成功迁移的FAQ信息，包括分组名称和FAQ问题
      const successFaqDetails: { 
        groupName: string; 
        question: string;
        sourceId: number | null;
        targetId: number | null;
      }[] = [];
      
      // 存储失败的FAQ信息
      const failedFaqDetails: {
        groupName: string;
        question: string;
        reason: string;
      }[] = [];
      
      // 分组名称与目标系统中对应的分组ID映射
      const groupMappings: Record<string, number> = {};
      
      // 先在目标系统中创建分组
      for (const group of selectedGroups) {
        try {
          console.log(`🔍 [FaqGroupMigration] 确保目标系统中存在分组 "${group.group_name}"`);
          const targetGroupId = await ensureGroupExistsInTarget(group.group_name, targetLanguageId);
          if (targetGroupId) {
            console.log(`✅ [FaqGroupMigration] 目标系统中存在或已创建分组 "${group.group_name}", ID: ${targetGroupId}`);
            groupMappings[group.group_name] = targetGroupId;
          } else {
            console.error(`❌ [FaqGroupMigration] 无法在目标系统中创建分组 "${group.group_name}"`);
          }
        } catch (error: any) {
          console.error(`❌ [FaqGroupMigration] 处理目标系统分组失败:`, error);
        }
      }
      
      // 遍历每个选中的分组，获取分组内的FAQ并进行迁移
      for (const group of selectedGroups) {
        try {
          console.log(`🔍 [FaqGroupMigration] 开始获取分组 "${group.group_name}" 下的FAQ数据，分组ID: ${group.id}`);
          
          // 创建临时headers以便用于getFaqsByGroupId调用
          const headers = {
            authorization: faqUserParams.sourceAuthorization,
            system_id: '5'
          };
          console.log(`🔑 [FaqGroupMigration] 使用源租户Token获取分组FAQ数据前20位: ${faqUserParams.sourceAuthorization.substring(0, 20)}...`);
          
          const faqData = await getFaqsByGroupId(group.id, selectedLanguageId, 1000, 1, headers);
          if (!faqData.list || faqData.list.length === 0) {
            console.log(`ℹ️ [FaqGroupMigration] 分组 "${group.group_name}" 内没有FAQ数据`);
            continue;
          }
          console.log(`✅ [FaqGroupMigration] 获取到分组 "${group.group_name}" 的FAQ数据, 共 ${faqData.list.length} 条`);
          // 获取目标系统中的分组ID
          const targetGroupId = groupMappings[group.group_name];
          if (!targetGroupId) {
            console.error(`❌ [FaqGroupMigration] 目标系统中没有找到分组 "${group.group_name}" 的映射ID，跳过此分组的迁移`);
            continue;
          }
          
          // 修改FAQ数据，使用目标系统的分组ID
          const faqsToMigrate = faqData.list.map((faq: FaqItemDetailed) => ({
            ...faq,
            group_id: targetGroupId // 使用目标系统中的分组ID
          }));
          
          // 调用迁移API进行实际迁移
          console.log(`🔄 [FaqGroupMigration] 开始迁移分组 "${group.group_name}" 下的FAQ数据到目标语言ID: ${targetLanguageId}, 目标分组ID: ${targetGroupId}`);
          
          // 使用migrateFaqs函数迁移
          const migratedResults = await migrateFaqs(
            faqUserParams, 
            faqsToMigrate, 
            targetLanguageId, 
            prefixProcessing ? { prefixProcessing, prefixAdd, prefixRemove } : undefined
          );
          
          // 检查迁移结果
          if (migratedResults.length < faqsToMigrate.length) {
            // 部分FAQ迁移失败，记录失败的FAQ
            const successQuestions = new Set(migratedResults);
            
            // 找出失败的FAQ（已在上面直接添加了，这里可以省略）
          }
          
          // 添加到成功列表中，包含详细信息
          for (const result of migratedResults) {
            successFaqDetails.push({
              groupName: group.group_name,
              question: result,
              sourceId: group.id,
              targetId: targetGroupId
            });
          }
          
          console.log(`✅ [FaqGroupMigration] 分组 "${group.group_name}" 迁移完成，成功迁移 ${migratedResults.length} 条FAQ`);
        } catch (error: any) {
          console.error(`❌ [FaqGroupMigration] 处理分组 "${group.group_name}" 时出错:`, error);
          failedFaqDetails.push({
            groupName: group.group_name,
            question: '(整个处理过程)',
            reason: error.message || '未知错误'
          });
        }
      }
      
      // 更新成功迁移的FAQ列表
      setSuccessFaqs(successFaqDetails.map(detail => detail.question));
      
      // 更新失败迁移的FAQ列表
      setFailedFaqs(failedFaqDetails);
      
      // 更新迁移结果统计信息
      const groupStats = groupByProperty(successFaqDetails, 'groupName');
      const migrationSummary = Object.keys(groupStats).map(groupName => ({
        groupName,
        count: groupStats[groupName].length
      }));
      
      setMigrationResults(migrationSummary);
      
      if (successFaqDetails.length > 0) {
        message.success(`成功迁移 ${successFaqDetails.length} 条FAQ数据`, 3);
      } else {
        message.warning('没有成功迁移的FAQ数据', 3);
      }
      
      if (failedFaqDetails.length > 0) {
        message.error(`有 ${failedFaqDetails.length} 条FAQ迁移失败`, 3);
      }
    } catch (error) {
      message.error('迁移过程中发生错误', 3);
      console.error('❌ [FaqGroupMigration] 迁移失败:', error);
    } finally {
      setMigrating(false);
    }
  };

  // 获取源租户信息
  const getSourceTenantInfo = () => {
    try {
      if (!faqUserParams || !faqUserParams.sourceAuthorization) return null;
      
      // 从authorization中解析租户信息
      const authParts = faqUserParams.sourceAuthorization.split('.');
      if (authParts.length < 2) return null;
      
      try {
        const payload = JSON.parse(atob(authParts[1]));
        return {
          tenantId: payload.tenantId || '未知',
          tenantName: payload.tenantName || '未知',
          username: payload.username || '未知用户'
        };
      } catch (e) {
        console.error('解析源租户信息失败', e);
        return { tenantId: '未知', tenantName: '未知', username: '未知用户' };
      }
    } catch (error) {
      console.error('获取源租户信息失败', error);
      return null;
    }
  };

  // 获取目标租户信息
  const getTargetTenantInfo = () => {
    try {
      if (!faqUserParams || !faqUserParams.targetAuthorization) return null;
      
      // 从authorization中解析租户信息
      const authParts = faqUserParams.targetAuthorization.split('.');
      if (authParts.length < 2) return null;
      
      try {
        const payload = JSON.parse(atob(authParts[1]));
        return {
          tenantId: payload.tenantId || '未知',
          tenantName: payload.tenantName || '未知',
          username: payload.username || '未知用户'
        };
      } catch (e) {
        console.error('解析目标租户信息失败', e);
        return { tenantId: '未知', tenantName: '未知', username: '未知用户' };
      }
    } catch (error) {
      console.error('获取目标租户信息失败', error);
      return null;
    }
  };

  // 获取目标系统中的FAQ分组列表
  const getFaqGroupListInTarget = async (languageId: number): Promise<Array<{id: number | null; group_name: string; group_size: number}>> => {
    try {
      if (!faqUserParams?.targetAuthorization) {
        return [];
      }
      const response = await axios.get('/api/home/api/faqGroup', {
        params: { language_id: languageId },
        headers: {
          authorization: faqUserParams.targetAuthorization,
          system_id: '5'
        }
      });
      const data = response.data as any;
      // 优先使用data.list
      if (Array.isArray(data.list)) {
        return data.list;
      }
      // 兼容旧版：使用data.data
      if (Array.isArray(data.data)) {
        return data.data;
      }
      console.error('获取目标系统分组列表失败:', data);
      message.error(`获取目标系统分组列表失败: ${data.message || '未知错误'}`, 3);
      return [];
    } catch (error) {
      console.error('获取目标系统分组列表出错:', error);
      return [];
    }
  };

  // 确保目标系统中存在指定名称的分组
  const ensureGroupExistsInTarget = async (groupName: string, languageId: number): Promise<number | null> => {
    // 应用前缀处理到分组名称
    let newGroupName = groupName;
    if (prefixProcessing) {
      // 去掉前缀
      if (prefixRemove) {
        newGroupName = newGroupName.replace(new RegExp(prefixRemove, 'g'), '');
      }
      // 添加前缀
      newGroupName = `${prefixAdd}${newGroupName}`;
    }

    // 1. 先检查已有分组
    const existingGroups = await getFaqGroupListInTarget(languageId);
    const found = existingGroups.find(g => g.group_name === newGroupName && g.id !== null);
    if (found && found.id !== null) {
      console.log(`✅ [FaqGroupMigration] 目标系统已存在分组 "${newGroupName}"，ID: ${found.id}`);
      return found.id;
    }

    // 2. 不存在则创建
    console.log(`ℹ️ [FaqGroupMigration] 目标系统中不存在分组 "${newGroupName}"，尝试创建...`);
    try {
      const resp = await axios.post('/api/home/api/faqGroup',
        { group_name: newGroupName, language_id: languageId, type: 4 },
        { headers: { authorization: faqUserParams?.targetAuthorization || '', system_id: '5' } }
      );
      const data = resp.data as any;
      // 创建成功
      if (data.code === 0) {
        console.log(`✅ [FaqGroupMigration] 在目标系统创建分组 "${newGroupName}" 成功，code=0`);
        // 由于API返回code=0但data为null，需要重新获取分组列表以获取ID
        console.log(`ℹ️ [FaqGroupMigration] 重新获取分组列表以获取新创建的分组ID`);
        const updatedGroups = await getFaqGroupListInTarget(languageId);
        const newGroup = updatedGroups.find(g => g.group_name === newGroupName && g.id !== null);
        if (newGroup && newGroup.id !== null) {
          console.log(`✅ [FaqGroupMigration] 成功获取到新创建的分组ID: ${newGroup.id}`);
          return newGroup.id;
        } else {
          console.warn(`⚠️ [FaqGroupMigration] 分组创建成功但无法获取ID，等待后重试`);
          // 可能需要等待一小段时间让服务器数据同步
          await new Promise(resolve => setTimeout(resolve, 1000));
          const retryGroups = await getFaqGroupListInTarget(languageId);
          const retryGroup = retryGroups.find(g => g.group_name === newGroupName && g.id !== null);
          if (retryGroup && retryGroup.id !== null) {
            console.log(`✅ [FaqGroupMigration] 重试成功获取到分组ID: ${retryGroup.id}`);
            return retryGroup.id;
          }
        }
        
        console.warn(`⚠️ [FaqGroupMigration] 分组 "${newGroupName}" 创建成功但未能获取ID`);
        return null;
      }
      // 如果是重复分组错误，则重新获取
      if (data.code === 11058) {
        console.warn(`⚠️ [FaqGroupMigration] 分组 "${newGroupName}" 重复，重新拉取列表`);
        const updated = await getFaqGroupListInTarget(languageId);
        const dup = updated.find(g => g.group_name === newGroupName && g.id !== null);
        if (dup && dup.id !== null) {
          console.log(`✅ [FaqGroupMigration] 通过重复错误获取到分组ID: ${dup.id}`);
          return dup.id;
        }
      }
      console.error(`❌ [FaqGroupMigration] 创建分组 "${newGroupName}" 失败:`, data);
      message.error(`创建分组 "${newGroupName}" 失败: ${data.message || '未知错误'}`, 3);
      return null;
    } catch (error: any) {
      console.error(`❌ [FaqGroupMigration] 调用创建分组 "${newGroupName}" 接口失败:`, error);
      return null;
    }
  };

  // 按属性对对象数组进行分组
  const groupByProperty = <T extends Record<string, any>>(array: T[], property: keyof T): Record<string, T[]> => {
    return array.reduce((result, item) => {
      const key = String(item[property]);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
      return result;
    }, {} as Record<string, T[]>);
  };

  // 关闭结果模态框
  const handleCloseModal = () => {
    setModalVisible(false);
    setSuccessFaqs([]);
    setFailedFaqs([]);
  };

  // 处理导出按钮点击 - 导出所选分组的所有FAQ
  const handleExportFaqs = async () => {
    message.loading('正在导出FAQ数据...');
    setExporting(true);
    
    try {
      if (!selectedLanguageId) {
        message.destroy();
        message.error('请先选择语言', 3);
        setExporting(false);
        return;
      }
      
      if (!faqUserParams || !faqUserParams.sourceAuthorization) {
        message.destroy();
        message.error('源租户授权Token缺失，请重新设置身份认证', 3);
        setExporting(false);
        return;
      }
      
      // 检查选中的分组
      const selectedGroups = faqList.filter(group => {
        // 修改：允许包含id为null的分组（未分类）
        return selectedRowKeys.includes(group.id === null ? -1 : group.id);
      });
    
      if (selectedGroups.length === 0) {
        message.destroy();
        message.warning('未选择有效的分组', 3);
        setExporting(false);
        return;
      }
      
      // 创建headers用于API调用
      const headers = {
        authorization: faqUserParams.sourceAuthorization,
        system_id: '5'
      };
      console.log(`🔑 [FaqGroupMigration] 导出FAQ时使用源租户Token: ${faqUserParams.sourceAuthorization.substring(0, 20)}...`);
      
      const allFaqData: Array<{
        group_name: string;
        id: number;
        question: string;
        content: string;
        ai_desc: string;
        status: string;
        update_time: string;
        language: string;
      }> = [];
      
      for (const group of selectedGroups) {
        // 调用API获取FAQ数据，getFaqsByGroupId返回FqaListData
        const faqData = await getFaqsByGroupId(group.id, selectedLanguageId, 10000, 1, headers);
        if (!faqData || !faqData.list || faqData.list.length === 0) {
          // 无数据则跳过
          continue;
        }
        // 格式化FAQ数据用于导出，确保faq类型被识别
        const faqs = faqData.list.map((faq: FaqItemDetailed) => ({
          group_name: group.group_name,
          id: faq.id,
          question: faq.question,
          content: faq.content,
          ai_desc: faq.ai_desc || '',
          status: faq.faq_status ? '启用' : '禁用',
          update_time: faq.update_time,
          language: faq.language
        }));
        
        // 将当前分组的FAQ添加到总列表
        allFaqData.push(...faqs);
      }
      
      if (allFaqData.length === 0) {
        message.destroy();
        message.warning('所选分组中没有FAQ数据可导出', 3);
        setExporting(false);
        return;
      }
      
      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(allFaqData);
      
      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, 'FAQ导出');
      
      // 生成Excel文件
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      
      // 生成文件名: FAQ导出_日期时间.xlsx
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const fileName = `FAQ导出_${dateStr}_${timeStr}.xlsx`;
      
      // 保存文件
      saveAs(blob, fileName);
      
      message.destroy();
      message.success(`成功导出 ${allFaqData.length} 条FAQ数据`, 3);
    } catch (error) {
      message.destroy();
      message.error('导出过程中发生错误', 3);
      console.error('❌ [FaqGroupMigration] 导出失败:', error);
    } finally {
      setExporting(false);
    }
  };

  // 处理导入按钮点击 - 在分组页面应该禁用
  const handleImportClick = () => {
    Modal.info({
      title: 'FAQ导入说明',
      content: (
        <div>
          <p>导入功能请在FAQ页面使用。导入的Excel文件应包含以下字段：</p>
          <ul>
            <li><strong>question</strong>: FAQ问题</li>
            <li><strong>content</strong>: 回答内容</li>
            <li><strong>ai_desc</strong>: AI理解描述(可选)</li>
            <li><strong>group_name</strong>: 分组名称(可选，默认为"未分类")</li>
          </ul>
          <p>导入时将自动匹配分组名称，如不存在则会归入"未分类"。</p>
        </div>
      ),
      okText: '知道了',
      width: 500,
    });
  };

  // 查看分组FAQ详情
  const handleViewGroupDetail = (group: { id: number | null; group_name: string; group_size: number }) => {
    setSelectedGroup(group);
    setDetailModalVisible(true);
    fetchGroupFaqs(group.id, 1);
  };

  // 获取分组内的FAQ列表
  const fetchGroupFaqs = async (groupId: number | null, page: number) => {
    if (!selectedLanguageId) {
      message.error('语言ID未设置', 3);
      return;
    }

    if (!faqUserParams || !faqUserParams.sourceAuthorization) {
      message.error('源租户授权Token缺失，请重新设置身份认证', 3);
      return;
    }

    setLoadingGroupFaqs(true);
    try {
      // 创建headers
      const headers = {
        authorization: faqUserParams.sourceAuthorization,
        system_id: '5'
      };
      
      // 直接使用axios调用API
      const response = await axios.get<any>('/api/home/api/faq', {
        headers,
        params: {
          group_id: groupId,
          language_id: selectedLanguageId,
          page_number: page,
          page_size: groupFaqPagination.pageSize
        }
      });
      
      const res = response.data;
      console.log(`✅ [FaqGroupMigration] 获取分组FAQ列表成功:`, res);

      if (res?.code !== 0) {
        throw new Error(res?.message || '未知错误');
      }
      
      // 更新列表和分页
      setGroupFaqList(Array.isArray(res.list) ? res.list : []);
      setGroupFaqPagination({
        current: res.page_number,
        pageSize: res.page_size,
        total: res.total
      });
    } catch (error: any) {
      console.error('❌ [FaqGroupMigration] 获取分组FAQ列表失败:', error);
      message.error('获取分组内FAQ列表失败，请稍后重试', 3);
      setGroupFaqList([]);
    } finally {
      setLoadingGroupFaqs(false);
    }
  };

  // 处理分组内FAQ分页变化
  const handleGroupFaqPageChange = (page: number, pageSize?: number) => {
    if (selectedGroup) {
      fetchGroupFaqs(selectedGroup.id, page);
    }
  };

  // 关闭分组详情模态框
  const handleCloseDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedGroup(null);
    setGroupFaqList([]);
  };

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number | null) => id === null ? '未分类' : id,
    },
    {
      title: '分组名称',
      dataIndex: 'group_name',
      key: 'group_name',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'FAQ数量',
      dataIndex: 'group_size',
      key: 'group_size',
      width: 100,
      render: (count: number, record: any) => (
        <Button 
          type="link" 
          onClick={() => handleViewGroupDetail(record)}
          style={{ padding: 0 }}
        >
          {count}
        </Button>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => handleViewGroupDetail(record)}
          size="small"
        >
          查看
        </Button>
      ),
    }
  ];

  // FAQ详情表格列定义
  const detailColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '问题',
      dataIndex: 'question',
      key: 'question',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '回答内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'AI理解描述',
      dataIndex: 'ai_desc',
      key: 'ai_desc',
      ellipsis: true,
      render: (text: string | null) => (
        <Tooltip title={text || '无'}>
          <span>{text || '无'}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'faq_status',
      key: 'faq_status',
      width: 80,
      render: (status: boolean) => (
        <Tag color={status ? 'success' : 'error'}>
          {status ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'update_time',
      key: 'update_time',
      width: 180,
    },
  ];

  // 修改结果模态框组件
  const renderMigrationResultModal = () => {
    // 获取租户信息
    const sourceInfo = getSourceTenantInfo();
    const targetInfo = getTargetTenantInfo();
    
    const sourceTenantName = sourceInfo?.tenantName || '未知源租户';
    const targetTenantName = targetInfo?.tenantName || '未知目标租户';
    
    return (
      <Modal
        title="迁移结果"
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={[
          <Button key="close" onClick={handleCloseModal}>
            关闭
          </Button>
        ]}
        width={700}
      >
        <Alert
          type="info"
          message={
            <div>
              <Typography.Text strong>迁移信息：</Typography.Text>
              <div>源租户：{sourceTenantName}</div>
              <div>目标租户：{targetTenantName}</div>
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        
        {migrating ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
            <p style={{ marginTop: 10 }}>正在迁移FAQ数据，请稍候...</p>
          </div>
        ) : (
          <>
            <h3>成功迁移的FAQ分组：</h3>
            
            {migrationResults.length > 0 ? (
              <Table
                dataSource={migrationResults.map((item, index) => ({
                  ...item,
                  key: index
                }))}
                columns={[
                  {
                    title: '序号',
                    dataIndex: 'key',
                    key: 'key',
                    render: (_, __, index) => index + 1
                  },
                  {
                    title: 'FAQ分组名称',
                    dataIndex: 'groupName',
                    key: 'groupName'
                  },
                  {
                    title: '迁移FAQ数量',
                    dataIndex: 'count',
                    key: 'count'
                  },
                  {
                    title: '状态',
                    key: 'status',
                    render: () => (
                      <Tag color="green">迁移成功</Tag>
                    )
                  }
                ]}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="暂无成功迁移的数据" />
            )}
            
            {/* 添加失败的FAQ显示 */}
            {failedFaqs.length > 0 && (
              <>
                <Divider />
                <h3>
                  <Text type="danger">迁移失败的FAQ ({failedFaqs.length}条)：</Text>
                </h3>
                <Table
                  dataSource={failedFaqs.map((item, index) => ({
                    ...item,
                    key: index
                  }))}
                  columns={[
                    {
                      title: '序号',
                      dataIndex: 'key',
                      key: 'key',
                      render: (_, __, index) => index + 1
                    },
                    {
                      title: '分组名称',
                      dataIndex: 'groupName',
                      key: 'groupName'
                    },
                    {
                      title: 'FAQ问题',
                      dataIndex: 'question',
                      key: 'question',
                      ellipsis: true,
                      render: (text) => (
                        <Tooltip title={text}>
                          <Text ellipsis style={{ maxWidth: 150 }}>{text}</Text>
                        </Tooltip>
                      )
                    },
                    {
                      title: '失败原因',
                      dataIndex: 'reason',
                      key: 'reason',
                      ellipsis: true,
                      render: (text) => (
                        <Tooltip title={text}>
                          <Text type="danger" ellipsis style={{ maxWidth: 200 }}>{text}</Text>
                        </Tooltip>
                      )
                    }
                  ]}
                  pagination={{ pageSize: 5 }}
                  size="small"
                />
              </>
            )}
            
            {successFaqs.length > 0 && (
              <>
                <Divider />
                <h3>成功迁移的FAQ问题：</h3>
                <ul>
                  {successFaqs.map((faq, index) => (
                    <li key={index}>{faq}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Modal>
    );
  };

  // 显示迁移选项模态框
  const handleMigrateOptions = () => {
    if (!faqUserParams) {
      message.error('请先设置FAQ参数');
      return;
    }

    if (!faqUserParams.targetAuthorization) {
      message.error('请设置目标租户Token');
      return;
    }

    if (selectedRowKeys.length === 0) {
      message.error('请选择要迁移的FAQ分组');
      return;
    }

    if (targetLanguageId === 0) {
      message.error('请选择目标语言');
      return;
    }

    // 打开选项模态框
    setOptionsModalVisible(true);
  };

  // 确认迁移并执行
  const confirmMigrate = async () => {
    // 关闭选项模态框
    setOptionsModalVisible(false);
    console.log('执行迁移，前缀处理:', { prefixProcessing, prefixAdd, prefixRemove });
    await handleMigrate();
  };

  // 如果用户参数未设置，显示提示
  if (!faqUserParams?.sourceAuthorization) {
    return (
      <Card title="FAQ分组">
        <Empty
          description="请先设置身份认证"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <span>FAQ分组</span>
          <Tag color="blue" style={{ marginRight: 0 }}>源租户操作</Tag>
        </Space>
      }
      extra={null}
      bodyStyle={{ padding: '12px', paddingBottom: '8px' }}
    >
      {/* 语言选择区域放到上方 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Select
            placeholder="选择语言"
            style={{ width: 150 }}
            onChange={handleLanguageChange}
            value={selectedLanguageId || undefined}
          >
            {tenantLanguageList.map(lang => (
              <Option key={lang.language_id} value={lang.language_id}>
                {lang.language_name}
              </Option>
            ))}
          </Select>
          <Button 
            icon={<PlusOutlined />} 
            onClick={showAddLanguageModal}
            type="default"
            size="middle"
          >
            添加语言
          </Button>
        </Space>
        <Tag color="blue" style={{ marginRight: 0 }}>当前显示: 源租户分组</Tag>
      </div>

      {/* 搜索和刷新区域 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          <Search
            placeholder="搜索分组名称"
            onSearch={handleSearch}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            enterButton={<SearchOutlined />}
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchFaqList}
            disabled={!selectedLanguageId}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 内部迁移 & 导出操作栏 */}
      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fafafa', borderRadius: 4 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <Text strong>已选择 {selectedRowKeys.length} 项源租户FAQ分组</Text>
            </Space>
            <Space>
              <Select
                placeholder="目标语言"
                style={{ width: 150 }}
                onChange={handleTargetLanguageChange}
                value={targetLanguageId || undefined}
              >
                {languageList.map(lang => (
                  <Option key={lang.id} value={lang.id}>
                    {lang.name}
                  </Option>
                ))}
              </Select>
              <Button
                type="primary"
                onClick={handleMigrateOptions}
                disabled={selectedRowKeys.length === 0 || migrating || targetLanguageId === 0}
                loading={migrating}
              >
                开始迁移
              </Button>
            </Space>
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportFaqs}
                loading={exporting}
              >
                导出源租户分组内FAQ
              </Button>
            </Space>
          </Space>
        </div>
      )}

      <Table
        rowKey={record => record.id === null ? -1 : record.id}
        rowSelection={rowSelection}
        columns={columns}
        dataSource={filteredFaqs}
        loading={loading}
        pagination={{ pageSize: 15 }}
        size="middle"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                !selectedLanguageId 
                  ? "请选择语言" 
                  : loading 
                    ? <Spin size="small" /> 
                    : "没有 FAQ 分组数据"
              }
            />
          )
        }}
      />

      {renderMigrationResultModal()}

      {/* 添加语言模态框 */}
      <Modal
        title="添加语言"
        open={addLanguageModalVisible}
        onCancel={closeAddLanguageModal}
        confirmLoading={addingLanguage}
        onOk={confirmAddLanguage}
        okText="确认添加"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <Text>请选择要添加的语言：</Text>
        </div>
        <Select
          placeholder="选择要添加的语言"
          style={{ width: '100%' }}
          onChange={handleAddLanguageSelect}
          value={selectedNewLanguageId}
        >
          {languageList
            .filter(lang => !tenantLanguageList.some(tl => tl.language_id === lang.id))
            .map(lang => (
              <Option key={lang.id} value={lang.id}>
                {lang.name}
              </Option>
            ))}
        </Select>
        {languageList.length === 0 && (
          <div style={{ marginTop: 16, color: '#ff4d4f' }}>
            <Text type="danger">获取语言列表失败，请刷新页面重试</Text>
          </div>
        )}
        {languageList.length > 0 && 
         languageList.filter(lang => !tenantLanguageList.some(tl => tl.language_id === lang.id)).length === 0 && (
          <div style={{ marginTop: 16 }}>
            <Text type="warning">所有可用语言已添加</Text>
          </div>
        )}
      </Modal>

      {/* FAQ分组详情模态框 */}
      <Modal
        title={
          <Space>
            <span>分组"{selectedGroup?.group_name || ''}"中的FAQ列表 (总数: {selectedGroup?.group_size || 0})</span>
            <Tag color="blue">源租户数据</Tag>
          </Space>
        }
        open={detailModalVisible}
        onCancel={handleCloseDetailModal}
        width={1000}
        footer={[
          <Button key="close" onClick={handleCloseDetailModal}>
            关闭
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16, backgroundColor: '#f9f9f9', padding: 12, borderRadius: 4, borderLeft: '4px solid #1890ff' }}>
          <Text>正在查看<Text strong>源租户</Text>中分组 <Text mark>"{selectedGroup?.group_name || ''}"</Text> 的FAQ数据</Text>
          <div style={{ marginTop: 8 }}>
            <small style={{ color: '#666' }}>提示：鼠标悬停在内容上可查看完整文本</small>
          </div>
        </div>
        <Table
          rowKey="id"
          columns={detailColumns}
          dataSource={groupFaqList}
          loading={loadingGroupFaqs}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  loadingGroupFaqs 
                    ? <Spin size="small" /> 
                    : "该分组内没有FAQ数据"
                }
              />
            )
          }}
        />
        {groupFaqList.length > 0 && (
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Pagination
              current={groupFaqPagination.current}
              pageSize={groupFaqPagination.pageSize}
              total={groupFaqPagination.total}
              onChange={handleGroupFaqPageChange}
              showSizeChanger={false}
              showTotal={(total) => `共 ${total} 条数据`}
            />
          </div>
        )}
      </Modal>

      {/* 迁移选项模态框 - 前缀处理 */}
      <Modal
        title="迁移设置"
        open={optionsModalVisible}
        onCancel={() => setOptionsModalVisible(false)}
        onOk={confirmMigrate}
        okText="确认"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Checkbox
            checked={prefixProcessing}
            onChange={e => setPrefixProcessing(e.target.checked)}
          >
            前缀处理
          </Checkbox>
          {prefixProcessing && (
            <>
              <Input
                addonBefore="添加前缀"
                value={prefixAdd}
                onChange={e => setPrefixAdd(e.target.value)}
              />
              <Input
                addonBefore="去掉前缀"
                value={prefixRemove}
                onChange={e => setPrefixRemove(e.target.value)}
              />
            </>
          )}
        </Space>
      </Modal>
    </Card>
  );
});

export default FaqGroupMigration;