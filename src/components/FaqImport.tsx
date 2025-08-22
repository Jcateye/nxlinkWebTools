import React, { useState, useEffect } from 'react';
import { Upload, Button, message, Card, Space, Progress, Modal, Typography, List, Spin, Empty, Tag, Alert, Select } from 'antd';
import { UploadOutlined, FileExcelOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { RcFile } from 'antd/es/upload';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { batchImportFaqs, getFaqLanguageList, addFaqLanguage, getFaqGroupList, addFaq } from '../services/api';
import { useUserContext } from '../context/UserContext';
import { ApiResponse } from '../types';

const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface ImportedFaq {
  question: string;
  answer: string;
  group_name?: string;
  language?: string;
  language_id?: number;
  ai_desc?: string;
}

interface ImportResult {
  success: number;
  failed: number;
}

interface FaqGroup {
  id: number | null;
  group_name: string;
  group_size: number;
}

interface FaqLanguage {
  id: number;
  name: string;
}

interface TenantFaqLanguage {
  id: number;
  language_id: number;
  language_name: string;
}

interface FaqImportProps {
  onImportComplete?: () => void;
  formType: 'source' | 'target'; // 区分源租户和目标租户
}

const FaqImport: React.FC<FaqImportProps> = ({ onImportComplete, formType }) => {
  const { faqUserParams } = useUserContext();
  const [importedFaqs, setImportedFaqs] = useState<ImportedFaq[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [languageList, setLanguageList] = useState<FaqLanguage[]>([]);
  const [groupList, setGroupList] = useState<FaqGroup[]>([]);
  const [languageMapByName, setLanguageMapByName] = useState<Record<string, number>>({});

  // 获取授权信息
  const getAuthorization = () => {
    if (!faqUserParams) return null;
    return formType === 'source' 
      ? faqUserParams.sourceAuthorization 
      : faqUserParams.targetAuthorization;
  };

  // 加载语言列表（仅在有授权token时）
  useEffect(() => {
    const auth = formType === 'source'
      ? faqUserParams?.sourceAuthorization
      : faqUserParams?.targetAuthorization;
    
    if (auth) {
      fetchLanguageList();
    }
  }, [faqUserParams, formType]);

  // 获取语言列表
  const fetchLanguageList = async () => {
    try {
      // 根据formType选择正确的token
      const auth = formType === 'source'
        ? faqUserParams?.sourceAuthorization
        : faqUserParams?.targetAuthorization;
        
      if (!auth) {
        console.log(`🚫 [FaqImport] 跳过语言列表获取：${formType === 'source' ? '源' : '目标'}租户授权信息缺失`);
        return;
      }
      
      console.log(`🔍 [FaqImport] 获取${formType === 'source' ? '源' : '目标'}租户语言列表`);
      console.log(`🔑 [FaqImport] 使用Token: ${auth.substring(0, 20)}...`);
      
      // 直接使用axios调用API获取所有可用语言
      const availableResponse = await axios.get<ApiResponse<FaqLanguage[]>>('/api/home/api/language', {
        headers: {
          authorization: auth,
          system_id: '5'
        }
      });
      
      if (availableResponse.data.code !== 0) {
        console.error(`❌ [FaqImport] 获取可用语言列表失败:`, availableResponse.data);
        message.error('获取可用语言列表失败');
        return;
      }
      
      const languages = availableResponse.data.data || [];
      
      // 再获取租户已经拥有的语言
      const tenantResponse = await axios.get<ApiResponse<TenantFaqLanguage[]>>('/api/home/api/faqTenantLanguage', {
        headers: {
          authorization: auth,
          system_id: '5'
        }
      });
      
      if (tenantResponse.data.code !== 0) {
        console.error(`❌ [FaqImport] 获取租户已有语言列表失败:`, tenantResponse.data);
      } else {
        console.log(`✅ [FaqImport] 租户已有语言: `, tenantResponse.data.data);
      }
      
      setLanguageList(languages);
      
      // 创建语言名称到ID的映射
      const langMap: Record<string, number> = {};
      languages.forEach((lang: FaqLanguage) => {
        langMap[lang.name] = lang.id;
      });
      setLanguageMapByName(langMap);
      
      console.log(`✅ [FaqImport] 成功获取语言列表: ${languages.length} 种语言`);
      languages.forEach((lang: FaqLanguage) => {
        console.log(`   - ${lang.name} (ID: ${lang.id})`);
      });
    } catch (error) {
      let errorMessage = '未知错误';
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response) {
          errorMessage = `HTTP状态: ${error.response.status}`;
        } else if (error.request) {
          errorMessage = '未收到服务器响应';
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error(`❌ [FaqImport] 获取语言列表失败:`, errorMessage);
      message.error(`获取语言列表失败: ${errorMessage}`);
    }
  };

  // 获取FAQ分组列表
  const fetchGroupList = async (languageId: number) => {
    try {
      // 根据formType确定使用的token
      const auth = formType === 'source'
        ? faqUserParams?.sourceAuthorization
        : faqUserParams?.targetAuthorization;
        
      if (!auth) {
        console.log(`🚫 [FaqImport] 跳过分组列表获取：${formType === 'source' ? '源' : '目标'}租户授权信息缺失`);
        return [];
      }
      
      console.log(`🔍 [FaqImport] 获取${formType === 'source' ? '源' : '目标'}租户分组列表，语言ID: ${languageId}`);
      console.log(`🔑 [FaqImport] 使用Token: ${auth.substring(0, 20)}...`);
      
      // 直接使用axios调用API，而不是使用getFaqGroupList函数
      const response = await axios.get('/api/home/api/faqGroup', {
        params: { language_id: languageId },
        headers: {
          authorization: auth,
          system_id: '5'
        }
      });
      
      const data = response.data;
      if (data.code === 0 && Array.isArray(data.data)) {
        setGroupList(data.data);
        return data.data;
      }
      
      // 处理业务错误
      if (data.code !== 0) {
        console.error(`❌ [FaqImport] 获取分组列表失败: ${data.message || '未知错误'}`);
        message.error(`获取${formType === 'source' ? '源' : '目标'}租户FAQ分组列表失败: ${data.message || '未知错误'}`);
      }
      
      return [];
    } catch (error) {
      // 提取并显示详细错误信息
      let errorMessage = '未知错误';
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response) {
          errorMessage = `HTTP状态: ${error.response.status}`;
        } else if (error.request) {
          errorMessage = '未收到服务器响应';
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error(`❌ [FaqImport] 获取${formType === 'source' ? '源' : '目标'}租户语言ID ${languageId} 的FAQ分组列表失败:`, errorMessage);
      message.error(`获取FAQ分组列表失败: ${errorMessage}`);
      return [];
    }
  };

  // 确保语言存在，如不存在则添加
  const ensureLanguageExists = async (languageName: string): Promise<number | null> => {
    // 检查语言是否在列表中
    if (languageMapByName[languageName]) {
      const langId = languageMapByName[languageName];
      console.log(`✅ [FaqImport] 语言 "${languageName}" (ID: ${langId}) 在列表中找到`);
      
      // 确认此语言已添加到租户
      try {
        // 根据formType获取正确的token
        const auth = formType === 'source' 
          ? faqUserParams?.sourceAuthorization 
          : faqUserParams?.targetAuthorization;
          
        if (!auth) {
          message.error(`${formType === 'source' ? '源' : '目标'}租户授权信息缺失`);
          return null;
        }
        
        console.log(`🔍 [FaqImport] 检查语言 "${languageName}" 是否已添加到${formType === 'source' ? '源' : '目标'}租户`);
        
        // 获取租户已有语言
        const tenantResponse = await axios.get<ApiResponse<TenantFaqLanguage[]>>('/api/home/api/faqTenantLanguage', {
          headers: {
            authorization: auth,
            system_id: '5'
          }
        });
        
        if (tenantResponse.data.code === 0 && Array.isArray(tenantResponse.data.data)) {
          // 检查此语言是否已存在于租户中
          const tenantLangs = tenantResponse.data.data;
          const exists = tenantLangs.some((l: TenantFaqLanguage) => l.language_id === langId);
          
          if (exists) {
            console.log(`✅ [FaqImport] 语言 "${languageName}" 已添加到租户`);
            return langId;
          }
          
          // 语言存在但未添加到租户，现在添加它
          console.log(`🔄 [FaqImport] 语言 "${languageName}" 存在但未添加到租户，现在添加它`);
          
          // 使用正确的URL路径添加语言到租户
          const addResponse = await axios.post('/api/home/api/faqTenantLanguage', 
            { language_id: langId },
            { 
              headers: { 
                authorization: auth, 
                system_id: '5' 
              } 
            }
          );
          
          if (addResponse.data.code === 0) {
            console.log(`✅ [FaqImport] 成功添加语言 "${languageName}" 到租户`);
            return langId;
          } else {
            console.error(`❌ [FaqImport] 添加语言 "${languageName}" 到租户失败:`, addResponse.data);
            message.error(`添加语言 "${languageName}" 失败: ${addResponse.data.message || '未知错误'}`);
            return null;
          }
        } else {
          console.error(`❌ [FaqImport] 获取租户语言列表失败:`, tenantResponse.data);
          return langId; // 返回语言ID，假设它可能已存在
        }
      } catch (error) {
        console.error(`❌ [FaqImport] 检查语言 "${languageName}" 时出错:`, error);
        return langId; // 发生错误时仍返回语言ID，尝试继续
      }
    }
    
    // 语言不在映射中，检查是否在语言列表中
    const foundLang = languageList.find(l => l.name === languageName);
    if (foundLang) {
      console.log(`🔍 [FaqImport] 在语言列表中找到 "${languageName}"，但不在映射中，添加到租户`);
      
      try {
        // 根据formType获取正确的token
        const auth = formType === 'source' 
          ? faqUserParams?.sourceAuthorization 
          : faqUserParams?.targetAuthorization;
          
        if (!auth) {
          message.error(`${formType === 'source' ? '源' : '目标'}租户授权信息缺失`);
          return null;
        }
        
        // 使用正确的URL路径添加语言到租户
        const response = await axios.post('/api/home/api/faqTenantLanguage',
          { language_id: foundLang.id },
          { 
            headers: { 
              authorization: auth, 
              system_id: '5' 
            } 
          }
        );
        
        // 检查响应
        if (response.data.code === 0) {
          console.log(`✅ [FaqImport] 成功添加语言 "${languageName}" (ID: ${foundLang.id}) 到租户`);
          
          // 更新本地映射
          setLanguageMapByName(prev => ({
            ...prev,
            [languageName]: foundLang.id
          }));
          
          return foundLang.id;
        } else {
          console.error(`❌ [FaqImport] 添加语言 "${languageName}" 到租户失败:`, response.data);
          message.error(`添加语言 "${languageName}" 失败: ${response.data.message || '未知错误'}`);
          return null;
        }
      } catch (error: any) {
        // 提取并显示错误消息
        let errorMessage = '未知错误';
        if (axios.isAxiosError(error) && error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        console.error(`❌ [FaqImport] 添加语言 "${languageName}" 失败:`, errorMessage);
        message.error(`添加语言 "${languageName}" 失败: ${errorMessage}`);
        return null;
      }
    }
    
    console.error(`❌ [FaqImport] 未找到语言 "${languageName}"，请确保此语言已在系统中定义`);
    message.error(`未找到语言 "${languageName}"，请确保此语言已在系统中定义`);
    return null;
  };

  // 查找或创建FAQ分组
  const findOrCreateGroup = async (groupName: string, languageId: number): Promise<number | null> => {
    // 获取当前语言的分组列表
    const currentGroups = await fetchGroupList(languageId);
    
    // 先在现有分组中查找
    const existingGroup = currentGroups.find((g: FaqGroup) => g.group_name === groupName);
    if (existingGroup && existingGroup.id !== null) {
      return existingGroup.id;
    }

    try {
      // 创建新分组
      const auth = getAuthorization();
      if (!auth) {
        message.error(`${formType === 'source' ? '源' : '目标'}租户授权信息缺失`);
        return null;
      }
      
      // 使用axios直接调用API创建分组
      const resp = await axios.post('/api/home/api/faqGroup', 
        { group_name: groupName, language_id: languageId, type: 4 },
        { headers: { authorization: auth, system_id: '5' } }
      );
      
      const data = resp.data;
      if (data.code === 0) {
        console.log(`✅ 成功创建分组: ${groupName}`);
        
        // 重新获取分组列表以获取新创建的分组ID
        const updatedGroups = await fetchGroupList(languageId);
        const newGroup = updatedGroups.find((g: FaqGroup) => g.group_name === groupName);
        return newGroup && newGroup.id !== null ? newGroup.id : null;
      } else {
        // 如果是分组重复错误(11058)，不显示为错误，继续处理
        if (data.code === 11058) {
          console.warn(`分组 "${groupName}" 已存在，正在获取ID`);
          // 重新获取分组列表
          const updatedGroups = await fetchGroupList(languageId);
          const existingGroup = updatedGroups.find((g: FaqGroup) => g.group_name === groupName);
          if (existingGroup && existingGroup.id !== null) {
            return existingGroup.id;
          }
        } else {
          console.error(`创建分组失败: ${groupName}, 错误: ${data.message || '未知错误'}`);
        }
        return null;
      }
    } catch (error: any) {
      // 提取并显示错误消息
      let errorMessage = '未知错误';
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      console.error(`创建分组 "${groupName}" 失败: ${errorMessage}`);
      return null;
    }
  };

  // 解析Excel/CSV文件
  const parseFile = (file: RcFile): Promise<ImportedFaq[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<any>(worksheet);

          // 验证和转换数据
          const faqs: ImportedFaq[] = json.map((row: any) => {
            // 检查必要的字段
            if (!row['问题'] || !row['答案']) {
              throw new Error('文件中必须包含"问题"和"答案"两列');
            }

            return {
              question: row['问题'],
              answer: row['答案'],
              group_name: row['分类'] || '未分类',
              language: row['语言'] || '',
              ai_desc: row['AI理解描述'] || ''
            };
          });

          resolve(faqs);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  // 处理文件上传
  const handleFileUpload = async (file: RcFile) => {
    // 检查文件类型
    const isExcelOrCSV = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                          file.type === 'application/vnd.ms-excel' ||
                          file.type === 'text/csv';
    
    if (!isExcelOrCSV) {
      message.error('只支持上传Excel或CSV文件!');
      return Upload.LIST_IGNORE;
    }

    setUploading(true);
    try {
      const faqs = await parseFile(file);
      setImportedFaqs(faqs);
      message.success(`成功解析 ${faqs.length} 条FAQ数据`);
      setPreviewModalVisible(true);
    } catch (error) {
      console.error('解析文件失败', error);
      message.error('解析文件失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setUploading(false);
    }

    return Upload.LIST_IGNORE;
  };

  // 导入FAQ
  const handleImport = async () => {
    if (!faqUserParams || !importedFaqs.length) {
      message.error('参数不完整或没有导入数据');
      return;
    }

    // 根据formType获取正确的token
    const auth = formType === 'source' 
      ? faqUserParams.sourceAuthorization 
      : faqUserParams.targetAuthorization;
      
    if (!auth) {
      message.error(`${formType === 'source' ? '源' : '目标'}租户授权信息缺失`);
      return;
    }
    
    // 添加日志记录，显示使用的是哪个租户的token
    console.log(`🔑 [FaqImport] 导入FAQ使用${formType === 'source' ? '源' : '目标'}租户Token: ${auth.substring(0, 20)}...`);

    setImporting(true);
    setImportProgress(0);
    setResultModalVisible(true);

    // 定义成功和失败计数
    let successCount = 0;
    let failedCount = 0;
    
    try {
      // 统计所有需要处理的语言
      const uniqueLanguages = [...new Set(
        importedFaqs
          .map(faq => faq.language || '')
          .filter(name => !!name)
      )];
      
      // 确保所有语言都存在
      const languageIdMap: Record<string, number> = {};
      for (const langName of uniqueLanguages) {
        try {
          const langId = await ensureLanguageExists(langName);
          if (langId !== null) {
            languageIdMap[langName] = langId;
          } else {
            message.warning(`无法找到或创建语言: "${langName}"`);
          }
        } catch (error) {
          console.error(`确保语言 "${langName}" 存在时出错:`, error);
          message.warning(`处理语言 "${langName}" 时出错`);
        }
      }
      
      // 分组映射，按语言ID分组
      const groupMappingByLang: Record<number, Record<string, number>> = {};
      
      // 逐个导入FAQ
      for (let i = 0; i < importedFaqs.length; i++) {
        const faq = importedFaqs[i];
        
        // 更新进度
        setImportProgress(Math.round(((i + 1) / importedFaqs.length) * 100));
        
        if (!faq.language) {
          failedCount++;
          console.error(`FAQ "${faq.question}" 未指定语言，跳过`);
          continue;
        }
        
        // 确认语言ID
        const langId = languageIdMap[faq.language];
        if (langId === undefined) {
          failedCount++;
          console.error(`找不到语言 "${faq.language}" 的ID，跳过FAQ "${faq.question}"`);
          continue;
        }
        
        // 确保分组存在
        const groupName = faq.group_name || '未分类';
        
        // 如果该语言的分组映射不存在，创建一个
        if (!groupMappingByLang[langId]) {
          groupMappingByLang[langId] = {};
        }
        
        // 查找或创建分组
        let groupId: number | null = null;
        try {
          if (groupMappingByLang[langId][groupName] !== undefined) {
            groupId = groupMappingByLang[langId][groupName];
          } else {
            groupId = await findOrCreateGroup(groupName, langId);
            groupMappingByLang[langId][groupName] = groupId || 0;
          }
          
          if (groupId === null) {
            console.warn(`无法创建分组 "${groupName}"，使用默认分组`);
            groupId = 0; // 使用默认分组
          }
        } catch (error) {
          console.error(`查找或创建分组 "${groupName}" 失败:`, error);
          failedCount++;
          continue;
        }

        // 导入单个FAQ
        try {
          // 增加调试日志
          console.log(`📝 [FaqImport] 正在导入FAQ "${faq.question}" 到${formType === 'source' ? '源' : '目标'}租户`);
          console.log(`📝 [FaqImport] 使用的是${formType === 'source' ? '源租户' : '目标租户'}的Token`);
          
          // 不再使用addFaq函数，直接用axios调用接口
          const faqData = {
            question: faq.question,
            type: 0, // 默认类型
            group_id: groupId,
            content: faq.answer,
            ai_desc: faq.ai_desc || '',
            language_id: langId,
            faq_medias: [],
            faq_status: true // 默认启用
          };
          
          // 发起请求
          const resp = await axios.post('/api/home/api/faq', 
            faqData,
            { 
              headers: { 
                authorization: auth, // 使用前面根据formType确定的token
                system_id: '5'
              } 
            }
          );
          
          // 检查业务错误
          if (resp.data.code !== 0) {
            // 只有在不是已存在问题的情况下才算错误
            if (resp.data.code === 22195) {
              console.warn(`问题 "${faq.question}" 已存在，跳过`);
              successCount++; // 也计入成功
            } else {
              throw new Error(resp.data.message || '导入FAQ失败');
            }
          } else {
            successCount++;
            console.log(`✅ [FaqImport] FAQ "${faq.question}" 导入成功`);
          }
        } catch (error: any) {
          // 详细记录错误信息
          let errorMessage = '未知错误';
          if (axios.isAxiosError(error)) {
            if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
            } else if (error.response) {
              errorMessage = `HTTP状态: ${error.response.status}`;
            } else if (error.request) {
              errorMessage = '未收到服务器响应';
            } else {
              errorMessage = error.message;
            }
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          console.error(`❌ [FaqImport] 导入FAQ "${faq.question}" 失败: ${errorMessage}`);
          failedCount++;
        }
      }

      // 更新结果
      setImportResult({
        success: successCount,
        failed: failedCount
      });

      // 根据导入结果显示消息
      if (successCount > 0) {
        message.success(`成功导入 ${successCount} 条FAQ到${formType === 'source' ? '源' : '目标'}租户`, 3);
        if (onImportComplete) {
          onImportComplete();
        }
      }
      
      if (failedCount > 0) {
        message.error(`有 ${failedCount} 条FAQ导入失败`, 3);
      }
    } catch (error) {
      console.error('导入FAQ过程中发生错误', error);
      message.error('导入过程中发生错误');
      setImportResult({
        success: successCount,
        failed: failedCount + (importedFaqs.length - successCount - failedCount)
      });
    } finally {
      setImporting(false);
    }
  };

  // 下载模板
  const downloadTemplate = () => {
    // 创建示例数据，使用与导出相同的字段
    const exampleData = [
      { 
        '问题': '如何重置密码?', 
        '答案': '您可以在登录页面点击"忘记密码"，按照提示操作进行密码重置。', 
        '分类': '账号问题',
        '语言': '中文',
        'AI理解描述': '用户忘记密码需要重置'
      },
      { 
        '问题': '系统支持哪些浏览器?', 
        '答案': '系统支持Chrome、Firefox、Edge等现代浏览器，推荐使用Chrome获得最佳体验。', 
        '分类': '系统问题',
        '语言': '中文',
        'AI理解描述': '询问系统浏览器兼容性'
      },
      { 
        '问题': '如何联系客服?', 
        '答案': '您可以通过页面右下角的客服图标，或拨打400-xxx-xxxx联系我们的客服团队。', 
        '分类': '客服支持',
        '语言': '中文',
        'AI理解描述': '用户需要联系客服寻求帮助'
      }
    ];

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exampleData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'FAQ导入模板');

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `FAQ导入模板_${formType === 'source' ? '源租户' : '目标租户'}.xlsx`);
  };

  // 清空数据
  const handleClear = () => {
    setImportedFaqs([]);
    setImportResult(null);
  };

  // 关闭结果模态框
  const handleCloseResultModal = () => {
    setResultModalVisible(false);
    if (importResult && importResult.success > 0) {
      handleClear();
    }
  };

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            FAQ批量导入 - {formType === 'source' ? '源租户' : '目标租户'}
          </Typography.Title>
          <Space>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={downloadTemplate}
              size="small"
            >
              下载模板
            </Button>
            {importedFaqs.length > 0 && (
              <Button
                type="primary"
                onClick={handleImport}
                disabled={importing || !faqUserParams}
                loading={importing}
                size="small"
              >
                开始导入
              </Button>
            )}
          </Space>
        </div>

        {!importedFaqs.length ? (
          <>
            <Alert 
              type="info" 
              message={
                <div style={{ fontSize: '13px' }}>
                  Excel文件必须包含: <strong>问题</strong>、<strong>答案</strong>、<strong>语言</strong>(如"中文"、"英语")、
                  <strong>分类</strong>(可选)、<strong>AI理解描述</strong>(可选)
                </div>
              }
              style={{ marginBottom: 12 }}
            />
            <Dragger
              name="file"
              multiple={false}
              beforeUpload={handleFileUpload}
              showUploadList={false}
              disabled={uploading || !faqUserParams}
              style={{ padding: '8px 0', height: '120px' }}
            >
              <p className="ant-upload-drag-icon" style={{ marginTop: 0 }}>
                <FileExcelOutlined style={{ fontSize: '28px', color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text" style={{ marginTop: 8, marginBottom: 4 }}>点击或拖拽Excel/CSV文件到此区域上传</p>
              <p className="ant-upload-hint" style={{ fontSize: '12px', marginTop: 0 }}>
                支持Excel(.xlsx/.xls)或CSV文件
              </p>
            </Dragger>
          </>
        ) : (
          <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '4px', border: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong>已解析 {importedFaqs.length} 条FAQ数据</Text>
              <Space>
                <Button onClick={() => setPreviewModalVisible(true)} size="small">预览</Button>
                <Button onClick={handleImport} type="primary" size="small" disabled={importing || !faqUserParams} loading={importing}>开始导入</Button>
                <Button danger onClick={handleClear} size="small" icon={<DeleteOutlined />} />
              </Space>
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>将导入到<Text strong>{formType === 'source' ? '源' : '目标'}</Text>租户，系统将自动处理语言和分组</li>
                <li>点击"预览"可查看导入的数据，点击"开始导入"执行导入操作</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 预览模态框 */}
      <Modal
        title="导入数据预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="import" 
            type="primary" 
            onClick={() => {
              setPreviewModalVisible(false);
              handleImport();
            }}
            disabled={importing || !faqUserParams}
            loading={importing}
          >
            开始导入
          </Button>
        ]}
        width={700}
        className="preview-modal"
      >
        <Alert
          type="info"
          message={`共 ${importedFaqs.length} 条数据${importedFaqs.length > 100 ? '，下方仅显示前100条' : ''}`}
          style={{ marginBottom: 12 }}
        />
        <List
          className="import-preview-list"
          dataSource={importedFaqs.slice(0, 100)}
          size="small"
          renderItem={(item, index) => (
            <List.Item style={{ padding: '8px 12px' }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong style={{ fontSize: '14px' }}>{index + 1}. {item.question}</Text>
                  <div>
                    {item.language && <Tag color="green" style={{ marginRight: 4 }}>{item.language}</Tag>}
                    <Tag color="blue">{item.group_name || '未分类'}</Tag>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  <Text type="secondary" style={{ fontSize: '13px' }}>答案: </Text>
                  {item.answer.length > 80 ? item.answer.substring(0, 80) + '...' : item.answer}
                </div>
                {item.ai_desc && (
                  <div style={{ fontSize: '12px', color: '#999', marginTop: 2 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>AI描述: </Text>
                    {item.ai_desc}
                  </div>
                )}
              </div>
            </List.Item>
          )}
          bordered
          pagination={importedFaqs.length > 10 ? { pageSize: 10, size: 'small' } : false}
          locale={{ emptyText: <Empty description="没有FAQ数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Modal>

      {/* 导入结果模态框 */}
      <Modal
        title="导入结果"
        open={resultModalVisible}
        onCancel={handleCloseResultModal}
        footer={[
          <Button key="close" type="primary" onClick={handleCloseResultModal}>
            关闭
          </Button>
        ]}
        width={400}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {importing ? (
            <>
              <Spin size="large" />
              <Progress percent={importProgress} status="active" style={{ marginTop: 20 }} />
              <Paragraph style={{ marginTop: 16 }}>
                正在导入FAQ数据到{formType === 'source' ? '源' : '目标'}租户...
              </Paragraph>
            </>
          ) : importResult ? (
            <>
              <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 16, color: importResult.success > 0 ? '#52c41a' : '#faad14' }}>
                {importResult.success > 0 ? '✅' : '⚠️'}
              </div>
              <Title level={4} style={{ margin: '0 0 16px 0' }}>
                导入完成
              </Title>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '32px',
                marginBottom: importResult.failed > 0 ? '16px' : '0' 
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', color: '#52c41a', fontWeight: 'bold' }}>{importResult.success}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>成功导入</div>
                </div>
                {importResult.failed > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', color: '#ff4d4f', fontWeight: 'bold' }}>{importResult.failed}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>导入失败</div>
                  </div>
                )}
              </div>
              {importResult.failed > 0 && (
                <Alert
                  message="部分FAQ导入失败"
                  description="失败原因可能是内容格式不兼容、重复数据或系统限制。"
                  type="warning"
                  showIcon
                  style={{ marginTop: 16, textAlign: 'left' }}
                />
              )}
            </>
          ) : null}
        </div>
      </Modal>
    </>
  );
};

export default FaqImport; 