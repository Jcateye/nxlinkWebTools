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
  Checkbox
} from 'antd';
import { EyeOutlined, SearchOutlined, ReloadOutlined, DownloadOutlined, UploadOutlined, PlusOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from 'axios';
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
import { FaqUserParams } from '../types';

const { Text } = Typography;
const { Search } = Input;
const { Option } = Select;

// 定义组件类型
interface TargetFaqGroupMigrationProps {}

// 定义暴露给父组件的方法
export interface TargetFaqGroupMigrationHandle {
  refreshFaqs: () => Promise<void>;
  migrateToSource: () => Promise<void>;
  handleMigrateOptions: () => void;
}

const TargetFaqGroupMigration = forwardRef<TargetFaqGroupMigrationHandle, TargetFaqGroupMigrationProps>((props, ref) => {
  const { faqUserParams } = useUserContext();
  const [faqList, setFaqList] = useState<any[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [successFaqs, setSuccessFaqs] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [languageList, setLanguageList] = useState<{ id: number; name: string }[]>([]);
  const [tenantLanguageList, setTenantLanguageList] = useState<{ id: number; language_id: number; language_name: string }[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<number>(0);
  const [targetLanguageId, setTargetLanguageId] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addLanguageModalVisible, setAddLanguageModalVisible] = useState(false);
  const [selectedNewLanguageId, setSelectedNewLanguageId] = useState<number | undefined>(undefined);
  const [addingLanguage, setAddingLanguage] = useState(false);
  
  // 前缀处理相关状态
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [prefixProcessing, setPrefixProcessing] = useState(false);
  const [prefixAdd, setPrefixAdd] = useState<string>('');
  const [prefixRemove, setPrefixRemove] = useState<string>('');

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

  // 当用户参数变化时，加载语言列表
  useEffect(() => {
    if (faqUserParams?.targetAuthorization) {
      fetchLanguageList();
      fetchTenantLanguageList();
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

  // 获取语言列表 (目标租户)
  const fetchLanguageList = async () => {
    if (!faqUserParams?.targetAuthorization) {
      setLanguageList([]);
      return;
    }
    try {
      const response = await axios.get<any>('/api/home/api/language', {
        headers: {
          authorization: faqUserParams.targetAuthorization,
          system_id: '5'
        }
      });
      const data = response.data?.data;
      setLanguageList(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('获取FAQ语言列表失败，请重新登录', 3);
      console.error('❌ [TargetFaqGroupMigration] 获取FAQ语言列表失败:', error);
      setLanguageList([]);
    }
  };

  // 获取租户语言列表 (目标租户)
  const fetchTenantLanguageList = async () => {
    if (!faqUserParams?.targetAuthorization) {
      setTenantLanguageList([]);
      setSelectedLanguageId(0);
      return;
    }
    try {
      const response = await axios.get<any>('/api/home/api/faqTenantLanguage', {
        headers: {
          authorization: faqUserParams.targetAuthorization,
          system_id: '5'
        }
      });
      const data = response.data?.data;
      const list = Array.isArray(data) ? data : [];
      setTenantLanguageList(list);
      setSelectedLanguageId(list.length > 0 ? list[0].language_id : 0);
    } catch (error) {
      message.error('获取租户FAQ语言列表失败，请重新登录', 3);
      console.error('❌ [TargetFaqGroupMigration] 获取租户FAQ语言列表失败:', error);
      setTenantLanguageList([]);
      setSelectedLanguageId(0);
    }
  };

  // 获取FAQ列表 (目标租户)
  const fetchFaqList = async () => {
    if (!faqUserParams?.targetAuthorization || !selectedLanguageId) return;
    setLoading(true);
    try {
      const response = await axios.get<any>('/api/home/api/faqGroup', {
        headers: {
          authorization: faqUserParams.targetAuthorization,
          system_id: '5'
        },
        params: { language_id: selectedLanguageId }
      });
      const res = response.data;
      if (res?.code !== 0) {
        throw new Error(res?.message || '未知错误');
      }
      const rawList = Array.isArray(res.data) ? res.data : [];
      const filteredList = rawList.filter((group: any) => group.id !== null);
      setFaqList(filteredList);
      setFilteredFaqs(filteredList);
    } catch (error) {
      message.error('获取FAQ分组列表失败', 3);
      console.error('❌ [TargetFaqGroupMigration] 获取FAQ分组列表失败:', error);
      setFaqList([]);
      setFilteredFaqs([]);
    } finally {
      setLoading(false);
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
    
    if (!faqUserParams?.targetAuthorization) {
      message.error('目标租户授权Token缺失', 3);
      return;
    }
    
    setAddingLanguage(true);
    try {
      // 注意：这里直接使用axios和目标租户的授权信息，而不是使用addFaqLanguage函数
      const response = await axios.post('/api/home/api/faqTenantLanguage', 
        { language_id: selectedNewLanguageId },
        { 
          headers: {
            authorization: faqUserParams.targetAuthorization,
            system_id: '5'
          }
        }
      );
      
      if (response.data?.code === 0) {
        message.success('语言添加成功', 3);
        // 同时刷新两个语言列表
        await Promise.all([
          fetchTenantLanguageList(), // 刷新租户已有语言列表
          fetchLanguageList() // 刷新所有可选语言列表
        ]);
        closeAddLanguageModal();
      } else {
        throw new Error(response.data?.message || '未知错误');
      }
    } catch (error: any) {
      message.error(`添加语言失败: ${error.message || '未知错误'}`, 3);
      console.error('❌ [TargetFaqGroupMigration] 添加语言失败:', error);
    } finally {
      setAddingLanguage(false);
    }
  };

  // 显示迁移选项模态框
  const handleMigrateOptions = () => {
    if (!faqUserParams) {
      message.error('请先设置目标租户身份认证', 3);
      return;
    }
    if (selectedRowKeys.length === 0) {
      message.error('请选择要迁移的FAQ分组', 3);
      return;
    }
    if (!targetLanguageId) {
      message.error('请选择源租户目标语言', 3);
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

    // 打开选项模态框
    setOptionsModalVisible(true);
  };

  // 确认迁移，调用执行迁移函数
  const confirmMigrate = () => {
    // 关闭选项模态框
    setOptionsModalVisible(false);
    console.log('执行迁移，前缀处理:', { prefixProcessing, prefixAdd, prefixRemove });
    // 执行迁移
    handleMigrate();
  };

  // 处理迁移: 目标租户 -> 源租户
  const handleMigrate = async () => {
    if (!faqUserParams) {
      message.error('请先设置目标租户身份认证', 3);
      return;
    }
    if (selectedRowKeys.length === 0) {
      message.error('请选择要迁移的FAQ分组', 3);
      return;
    }
    if (!targetLanguageId) {
      message.error('请选择源租户目标语言', 3);
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
    
    setMigrating(true);
    setModalVisible(true);
    
    // 记录迁移方向和授权信息
    console.log('🔄 [TargetFaqGroupMigration] 开始从【目标租户】迁移FAQ到【源租户】');
    console.log(`🔑 目标租户Token(迁移源)前20位: ${faqUserParams.targetAuthorization.substring(0, 20)}...`);
    console.log(`🔑 源租户Token(迁移目标)前20位: ${faqUserParams.sourceAuthorization.substring(0, 20)}...`);
    
    const successFaqs: string[] = [];
    try {
      const selectedGroups = faqList.filter(group => group.id !== null && selectedRowKeys.includes(group.id));
      for (const group of selectedGroups) {
        try {
          // 修改：使用目标租户的token(targetAuthorization)调用API获取FAQ列表
          // 创建临时headers以便用于getFaqsByGroupId调用
          const headers = {
            authorization: faqUserParams.targetAuthorization,
            system_id: '5'
          };
          console.log(`🔍 [TargetFaqGroupMigration] 使用目标租户Token获取分组 "${group.group_name}" 的FAQ列表`);
          
          // 直接使用 axios 绕过拦截器，确保使用目标租户 token
          const axiosResp = await axios.get<any>('/api/home/api/faq', {
            headers,
            params: {
              group_id: group.id,
              language_id: selectedLanguageId,
              page_number: 1,
              page_size: 1000
            }
          });
          const resp = axiosResp.data;
          if (resp.code !== 0 || !Array.isArray(resp.list)) continue;
          
          // 在源租户系统中确保分组存在
          let newGroupName = group.group_name;
          if (prefixProcessing) {
            // 去掉前缀
            if (prefixRemove) {
              newGroupName = newGroupName.replace(new RegExp(prefixRemove, 'g'), '');
            }
            // 添加前缀
            newGroupName = `${prefixAdd}${newGroupName}`;
          }
          const sourceGroupId = await ensureGroupExistsInSource(newGroupName, targetLanguageId);
          if (!sourceGroupId) {
            console.error(`❌ [TargetFaqGroupMigration] 无法在源租户中创建分组 "${newGroupName}"`);
            continue;
          }
          
          // 修改FAQ数据中的group_id为源租户的分组ID
          const modifiedFaqs = resp.list.map((faq: any) => ({
            ...faq,
            group_id: sourceGroupId // 使用源租户系统中的分组ID
          }));
          
          // 特别注意：这里是从目标租户迁移到源租户，所以需要反转授权Token
          // sourceAuthorization -> 当前目标租户的Token (迁移的数据来源)
          // targetAuthorization -> 源租户的Token (迁移的目的地)
          const userParams: FaqUserParams = {
            sourceAuthorization: faqUserParams.targetAuthorization,  // 目标租户作为数据源
            targetAuthorization: faqUserParams.sourceAuthorization   // 源租户作为目标
          };
          
          console.log(`📤 [TargetFaqGroupMigration] 从目标租户迁移分组 "${group.group_name}" 下的FAQ到源租户分组 "${newGroupName}"`);
          console.log(`📤 [TargetFaqGroupMigration] 交换后 - 源租户Token(数据源)前20位: ${userParams.sourceAuthorization.substring(0, 20)}...`);
          console.log(`📤 [TargetFaqGroupMigration] 交换后 - 目标租户Token(迁移目标)前20位: ${userParams.targetAuthorization.substring(0, 20)}...`);
          
          // 使用migrateFaqs或直接使用axios
          // 方式一：使用migrateFaqs
          //const migrated = await migrateFaqs(userParams, modifiedFaqs, targetLanguageId);
          
          // 方式二：尝试直接使用axios确保token正确
          const migratedFaqs: string[] = [];
          for (const faq of modifiedFaqs) {
            try {
              // 应用前缀处理到FAQ问题和内容
              let question = faq.question;
              let content = faq.content;
              
              if (prefixProcessing) {
                // 去掉前缀
                if (prefixRemove) {
                  question = question.replace(new RegExp(prefixRemove, 'g'), '');
                  // 对内容也进行前缀处理，但仅处理文本部分，不处理HTML标签
                  content = content.replace(new RegExp(prefixRemove, 'g'), '');
                }
                // 添加前缀
                question = `${prefixAdd}${question}`;
              }

              const requestParams = {
                question: question,
                type: faq.type,
                group_id: faq.group_id,
                content: content,
                ai_desc: faq.ai_desc || '',
                language_id: targetLanguageId,
                faq_medias: faq.media_infos || [],
                faq_status: faq.faq_status
              };
              
              console.log(`📝 [TargetFaqGroupMigration] 添加FAQ "${question}" 到源租户, 使用源租户Token`);
              
              // 使用源租户token(userParams.targetAuthorization)直接调用API
              const response = await axios.post('/api/home/api/faq', requestParams, {
                headers: {
                  authorization: userParams.targetAuthorization,
                  system_id: '5'
                }
              });
              
              if (response.data.code === 0) {
                console.log(`✅ [TargetFaqGroupMigration] 成功添加FAQ "${question}" 到源租户`);
                migratedFaqs.push(question);
              } else {
                console.error(`❌ [TargetFaqGroupMigration] 添加FAQ失败: ${response.data.message}`);
              }
            } catch (faqError: any) {
              console.error(`❌ [TargetFaqGroupMigration] 添加FAQ "${faq.question}" 失败:`, faqError.message);
              if (faqError.response) {
                console.error(`服务器响应:`, faqError.response.status, faqError.response.data);
              }
            }
          }
          
          successFaqs.push(...migratedFaqs);
        } catch (err) {
          console.error('❌ [TargetFaqGroupMigration] 迁移分组失败:', err);
        }
      }
      setSuccessFaqs(successFaqs);
      if (successFaqs.length) {
        message.success(`成功迁移 ${successFaqs.length} 条FAQ数据`, 3);
      } else {
        message.warning('没有成功迁移的FAQ数据', 3);
      }
    } catch (err) {
      message.error('迁移过程中发生错误', 3);
      console.error(err);
    } finally {
      setMigrating(false);
    }
  };

  // 暴露刷新方法给父组件
  useImperativeHandle(ref, () => ({
    refreshFaqs: fetchFaqList,
    migrateToSource: handleMigrate,
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
  };

  // 处理语言变更
  const handleLanguageChange = (value: number) => {
    setSelectedLanguageId(value);
  };

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number | null) => id === null ? '/' : id,
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

  // FAQ详情表格列定义与源端一致
  const detailColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '问题', dataIndex: 'question', key: 'question', width: 200, ellipsis: true, render: (text: string) => (<Tooltip title={text}><span>{text}</span></Tooltip>) },
    { title: '回答内容', dataIndex: 'content', key: 'content', ellipsis: true, render: (text: string) => (<Tooltip title={text}><span>{text}</span></Tooltip>) },
    { title: 'AI理解描述', dataIndex: 'ai_desc', key: 'ai_desc', ellipsis: true, render: (text: string | null) => (<Tooltip title={text || '无'}><span>{text || '无'}</span></Tooltip>) },
    { title: '状态', dataIndex: 'faq_status', key: 'faq_status', width: 80, render: (status: boolean) => (<Tag color={status ? 'success' : 'error'}>{status ? '启用' : '禁用'}</Tag>) },
    { title: '更新时间', dataIndex: 'update_time', key: 'update_time', width: 180 }
  ];

  // 查看分组FAQ详情
  const handleViewGroupDetail = (group: { id: number | null; group_name: string; group_size: number }) => {
    setSelectedGroup(group);
    setDetailModalVisible(true);
    fetchGroupFaqs(group.id, 1);
  };

  // 获取分组内的FAQ列表
  const fetchGroupFaqs = async (groupId: number | null, page: number) => {
    if (!faqUserParams?.targetAuthorization || !selectedLanguageId) {
      message.error('语言ID未设置或未验证', 3);
      return;
    }
    setLoadingGroupFaqs(true);
    try {
      const response = await axios.get<any>('/api/home/api/faq', {
        headers: {
          authorization: faqUserParams.targetAuthorization,
          system_id: '5'
        },
        params: {
          group_id: groupId,
          language_id: selectedLanguageId,
          page_number: page,
          page_size: groupFaqPagination.pageSize
        }
      });
      const res = response.data;
      if (res?.code !== 0) {
        throw new Error(res?.message || '未知错误');
      }
      setGroupFaqList(Array.isArray(res.list) ? res.list : []);
      setGroupFaqPagination({
        current: res.page_number,
        pageSize: res.page_size,
        total: res.total
      });
    } catch (error) {
      console.error('❌ [TargetFaqGroupMigration] 获取分组FAQ列表失败:', error);
      message.error('获取分组内FAQ列表失败', 3);
      setGroupFaqList([]);
    } finally {
      setLoadingGroupFaqs(false);
    }
  };

  // 处理导出FAQ分组
  const handleExportFaqs = async () => {
    if (selectedRowKeys.length === 0) {
      message.error('请选择要导出的FAQ分组', 3);
      return;
    }

    setExporting(true);
    message.loading('正在导出FAQ分组数据，请稍候...', 0);

    try {
      // 过滤出选中的FAQ分组
      const selectedGroups = faqList.filter(group => {
        return group.id !== null && selectedRowKeys.includes(group.id);
      });
      
      if (selectedGroups.length === 0) {
        message.destroy();
        message.warning('未选择有效的分组或选择了"所有分类"', 3);
        setExporting(false);
        return;
      }
      
      const allFaqData: any[] = [];
      
      for (const group of selectedGroups) {
        // 修改：使用目标租户的token(targetAuthorization)调用API获取FAQ列表
        const headers = {
          authorization: faqUserParams?.targetAuthorization || '',
          system_id: '5'
        };
        console.log(`🔍 [TargetFaqGroupMigration] 导出 - 使用目标租户Token获取分组 "${group.group_name}" 的FAQ列表`);
        
        // 直接使用 axios 绕过拦截器，确保使用目标租户 token
        const axiosResp = await axios.get<any>('/api/home/api/faq', {
          headers,
          params: {
            group_id: group.id,
            language_id: selectedLanguageId,
            page_number: 1,
            page_size: 1000
          }
        });
        const response = axiosResp.data;
        
        if (response.code !== 0) {
          const msg = response.message || '未知错误';
          message.error(`导出FAQ分组失败（分组：${group.group_name}）：${msg}`, 3);
          continue;
        }
        if (!response.list || response.list.length === 0) {
          continue;
        }
        
        // 格式化FAQ数据
        const faqs = response.list.map((faq: any) => ({
          group_name: group.group_name,
          id: faq.id,
          question: faq.question,
          content: faq.content,
          ai_desc: faq.ai_desc || '',
          status: faq.faq_status ? '启用' : '禁用',
          update_time: faq.update_time,
          language: faq.language
        }));
        
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
      const fileName = `目标租户FAQ导出_${dateStr}_${timeStr}.xlsx`;
      
      // 保存文件
      saveAs(blob, fileName);
      
      message.destroy();
      message.success(`成功导出 ${allFaqData.length} 条FAQ数据`, 3);
    } catch (error) {
      message.destroy();
      message.error('导出过程中发生错误', 3);
      console.error('❌ [TargetFaqGroupMigration] 导出失败:', error);
    } finally {
      setExporting(false);
    }
  };

  // 确保源租户系统中存在指定名称的分组
  const ensureGroupExistsInSource = async (groupName: string, languageId: number): Promise<number | null> => {
    try {
      if (!faqUserParams?.sourceAuthorization) {
        return null;
      }
      
      // 1. 先检查源租户已有分组
      console.log(`🔍 [TargetFaqGroupMigration] 检查源租户中是否存在分组 "${groupName}"`);
      const sourceHeaders = {
        authorization: faqUserParams.sourceAuthorization,
        system_id: '5'
      };
      
      const response = await axios.get('/api/home/api/faqGroup', {
        params: { language_id: languageId },
        headers: sourceHeaders
      });
      
      const data = response.data as any;
      let existingGroups: any[] = [];
      
      if (Array.isArray(data.data)) {
        existingGroups = data.data;
      } else if (Array.isArray(data.list)) {
        existingGroups = data.list;
      }
      
      // 检查是否存在同名分组
      const found = existingGroups.find(g => g.group_name === groupName && g.id !== null);
      if (found && found.id !== null) {
        console.log(`✅ [TargetFaqGroupMigration] 源租户已存在分组 "${groupName}"，ID: ${found.id}`);
        return found.id;
      }

      // 2. 不存在则创建
      console.log(`ℹ️ [TargetFaqGroupMigration] 源租户中不存在分组 "${groupName}"，尝试创建...`);
      const resp = await axios.post('/api/home/api/faqGroup',
        { group_name: groupName, language_id: languageId, type: 4 },
        { headers: sourceHeaders }
      );
      
      const respData = resp.data as any;
      if (respData.code === 0) {
        console.log(`✅ [TargetFaqGroupMigration] 在源租户创建分组 "${groupName}" 成功`);
        
        // 重新获取分组列表以获取新创建的分组ID
        const refreshResp = await axios.get('/api/home/api/faqGroup', {
          params: { language_id: languageId },
          headers: sourceHeaders
        });
        
        const refreshData = refreshResp.data as any;
        let refreshGroups: any[] = [];
        
        if (Array.isArray(refreshData.data)) {
          refreshGroups = refreshData.data;
        } else if (Array.isArray(refreshData.list)) {
          refreshGroups = refreshData.list;
        }
        
        const newGroup = refreshGroups.find(g => g.group_name === groupName && g.id !== null);
        if (newGroup && newGroup.id !== null) {
          console.log(`✅ [TargetFaqGroupMigration] 成功获取到源租户新创建的分组ID: ${newGroup.id}`);
          return newGroup.id;
        }
        
        // 如果未能立即获取到，等待一下后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryResp = await axios.get('/api/home/api/faqGroup', {
          params: { language_id: languageId },
          headers: sourceHeaders
        });
        
        const retryData = retryResp.data as any;
        let retryGroups: any[] = [];
        
        if (Array.isArray(retryData.data)) {
          retryGroups = retryData.data;
        } else if (Array.isArray(retryData.list)) {
          retryGroups = retryData.list;
        }
        
        const retryGroup = retryGroups.find(g => g.group_name === groupName && g.id !== null);
        if (retryGroup && retryGroup.id !== null) {
          console.log(`✅ [TargetFaqGroupMigration] 重试成功获取到源租户分组ID: ${retryGroup.id}`);
          return retryGroup.id;
        }
      } else if (respData.code === 11058) {
        // 如果是重复分组错误，则重新获取
        console.warn(`⚠️ [TargetFaqGroupMigration] 分组 "${groupName}" 在源租户重复，重新拉取列表`);
        const dupResp = await axios.get('/api/home/api/faqGroup', {
          params: { language_id: languageId },
          headers: sourceHeaders
        });
        
        const dupData = dupResp.data as any;
        let dupGroups: any[] = [];
        
        if (Array.isArray(dupData.data)) {
          dupGroups = dupData.data;
        } else if (Array.isArray(dupData.list)) {
          dupGroups = dupData.list;
        }
        
        const dupGroup = dupGroups.find(g => g.group_name === groupName && g.id !== null);
        if (dupGroup && dupGroup.id !== null) {
          console.log(`✅ [TargetFaqGroupMigration] 通过重复错误获取到源租户分组ID: ${dupGroup.id}`);
          return dupGroup.id;
        }
      }
      
      console.error(`❌ [TargetFaqGroupMigration] 在源租户创建分组 "${groupName}" 失败:`, respData);
      message.error(`在源租户创建分组失败: ${respData.message || '未知错误'}`, 3);
      return null;
    } catch (error: any) {
      console.error(`❌ [TargetFaqGroupMigration] 源租户分组操作失败:`, error);
      return null;
    }
  };

  // 如果用户参数未设置，显示提示
  if (!faqUserParams?.targetAuthorization) {
    return (
      <Empty
        description="请先设置目标租户身份认证"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <Card title={
      <Space>
        <span>FAQ分组</span>
        <Tag color="green" style={{ marginRight: 0 }}>目标租户操作</Tag>
      </Space>
    }>
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
        <Tag color="blue" style={{ marginRight: 0 }}>当前显示: 目标租户分组</Tag>
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
              <Text strong>已选择 {selectedRowKeys.length} 项目标租户FAQ分组</Text>
            </Space>
            <Space>
              <Select
                placeholder="源租户目标语言"
                style={{ width: 150 }}
                onChange={(val) => setTargetLanguageId(val)}
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
                迁移到源租户
              </Button>
            </Space>
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportFaqs}
                loading={exporting}
              >
                导出目标租户分组内FAQ
              </Button>
            </Space>
          </Space>
        </div>
      )}

      <Table
        rowKey="id"
        rowSelection={rowSelection}
        columns={columns}
        dataSource={filteredFaqs}
        loading={loading}
        pagination={{ pageSize: 10 }}
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

      {/* FAQ分组详情模态框 */}
      <Modal
        title={
          <Space>
            <span>分组"{selectedGroup?.group_name || ''}"中的FAQ列表 (总数: {selectedGroup?.group_size || 0})</span>
            <Tag color="green">目标租户数据</Tag>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16, backgroundColor: '#f9f9f9', padding: 12, borderRadius: 4, borderLeft: '4px solid #52c41a' }}>
          <Text>正在查看<Text strong>目标租户</Text>中分组 <Text mark>"{selectedGroup?.group_name || ''}"</Text> 的FAQ数据</Text>
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
              onChange={(page) => fetchGroupFaqs(selectedGroup?.id || null, page)}
              showSizeChanger={false}
              showTotal={(total) => `共 ${total} 条数据`}
            />
          </div>
        )}
      </Modal>

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

export default TargetFaqGroupMigration; 