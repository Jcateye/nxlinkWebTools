import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Typography, Alert, Spin, Button, Space, message, Modal, Progress } from 'antd';
import { DownloadOutlined, ExportOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { BillFilters, BillRecord, PaginationInfo, BillFieldConfig } from '../types/bill';
import { queryBillList, hasValidBillToken, exportBillData, exportAllBillData, exportAllBillDataInBatches, ProgressCallback, BatchExportCallback } from '../services/billApi';
import { calculateNewLineBilling } from '../utils/billingCalculator';
import BillFiltersComponent from '../components/bill/BillFilters';
import AdvancedFilters from '../components/bill/AdvancedFilters';
import BillTable from '../components/bill/BillTable';
import TokenManager from '../components/bill/TokenManager';
import FieldSelector from '../components/bill/FieldSelector';

const { Content } = Layout;
const { Title } = Typography;

// 本地存储的键名
const BILL_FILTERS_STORAGE_KEY = 'billFilters';
const BILL_DESENSITIZE_STORAGE_KEY = 'billDesensitize';

// 获取默认筛选条件
const getDefaultFilters = (): BillFilters => ({
  companyNameQuery: '',
  selectedCompany: null,
  selectedTeam: null,
  dateRange: {
    start: dayjs().format('YYYY-MM-DD'), // 默认今天
    end: dayjs().format('YYYY-MM-DD')
  },
  timeRange: {
    start: '00:00:00',
    end: '23:59:59'
  },
  agentFlowName: '',
  userNumber: '',
  // 高级筛选条件的默认值
  advancedFilters: {
    customerName: '',
    tenantName: '',
    userNumber: '',
    caller: '',
    callId: '',
    billingCycle: '',
    customerCurrency: '',
    callDurationRange: { min: null, max: null },
    feeDurationRange: { min: null, max: null },
    // AI相关字段筛选
    customerTotalPriceUSDRange: { min: null, max: null }, // AI消费(USD)
    sipTotalCustomerOriginalPriceUSDRange: { min: null, max: null }, // 线路消费(USD)
    sipFeeDurationRange: { min: null, max: null }, // 线路计费时长
    // 原有字段保持兼容
    customerPriceRange: { min: null, max: null },
    customerTotalPriceRange: { min: null, max: null },
    asrCostRange: { min: null, max: null },
    ttsCostRange: { min: null, max: null },
    llmCostRange: { min: null, max: null },
    totalCostRange: { min: null, max: null },
    totalProfitRange: { min: null, max: null },
    sizeRange: { min: null, max: null },
    callDirection: null
  },
  customLineUnitPrice: null
});

// 从localStorage读取保存的脱敏状态
const loadSavedDesensitizeState = (): boolean => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      return false;
    }
    
    const storageKey = `${BILL_DESENSITIZE_STORAGE_KEY}_${sessionId}`;
    const savedState = localStorage.getItem(storageKey);
    
    if (savedState) {
      return JSON.parse(savedState);
    }
  } catch (error) {
    console.warn('读取保存的脱敏状态失败:', error);
  }
  
  return false;
};

// 保存脱敏状态到localStorage
const saveDesensitizeStateToStorage = (isDesensitized: boolean) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      const storageKey = `${BILL_DESENSITIZE_STORAGE_KEY}_${sessionId}`;
      localStorage.setItem(storageKey, JSON.stringify(isDesensitized));
      console.log('[账单脱敏] 脱敏状态已保存:', isDesensitized);
    }
  } catch (error) {
    console.warn('保存脱敏状态失败:', error);
  }
};

// 从localStorage读取保存的筛选条件
const loadSavedFilters = (): BillFilters => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      return getDefaultFilters();
    }
    
    const storageKey = `${BILL_FILTERS_STORAGE_KEY}_${sessionId}`;
    const savedFilters = localStorage.getItem(storageKey);
    
    if (savedFilters) {
      const parsed = JSON.parse(savedFilters);
      // 验证数据完整性，如果缺少字段则使用默认值
      const defaultFilters = getDefaultFilters();
      return {
        ...defaultFilters,
        ...parsed,
        // 确保日期和时间范围存在
        dateRange: {
          ...defaultFilters.dateRange,
          ...parsed.dateRange
        },
        timeRange: {
          ...defaultFilters.timeRange,
          ...parsed.timeRange
        },
        // 确保高级筛选条件存在
        advancedFilters: {
          ...defaultFilters.advancedFilters,
          ...parsed.advancedFilters,
          // 确保新添加的AI相关字段存在
          customerTotalPriceUSDRange: {
            ...defaultFilters.advancedFilters.customerTotalPriceUSDRange,
            ...(parsed.advancedFilters?.customerTotalPriceUSDRange || {})
          },
          sipTotalCustomerOriginalPriceUSDRange: {
            ...defaultFilters.advancedFilters.sipTotalCustomerOriginalPriceUSDRange,
            ...(parsed.advancedFilters?.sipTotalCustomerOriginalPriceUSDRange || {})
          },
          sipFeeDurationRange: {
            ...defaultFilters.advancedFilters.sipFeeDurationRange,
            ...(parsed.advancedFilters?.sipFeeDurationRange || {})
          },
          sizeRange: {
            ...defaultFilters.advancedFilters.sizeRange,
            ...(parsed.advancedFilters?.sizeRange || {})
          }
        }
      };
    }
  } catch (error) {
    console.warn('读取保存的筛选条件失败:', error);
  }
  
  return getDefaultFilters();
};

// 保存筛选条件到localStorage
const saveFiltersToStorage = (filters: BillFilters) => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      const storageKey = `${BILL_FILTERS_STORAGE_KEY}_${sessionId}`;
      localStorage.setItem(storageKey, JSON.stringify(filters));
      console.log('[账单筛选] 筛选条件已保存');
    }
  } catch (error) {
    console.warn('保存筛选条件失败:', error);
  }
};

// 前端筛选逻辑
const applyAdvancedFilters = (records: BillRecord[], advancedFilters: BillFilters['advancedFilters']): BillRecord[] => {
  return records.filter(record => {
    // 字符串模糊筛选 - 添加空值检查
    if (advancedFilters.customerName && (!record.customerName || !record.customerName.toLowerCase().includes(advancedFilters.customerName.toLowerCase()))) {
      return false;
    }
    if (advancedFilters.tenantName && (!record.tenantName || !record.tenantName.toLowerCase().includes(advancedFilters.tenantName.toLowerCase()))) {
      return false;
    }
    if (advancedFilters.userNumber && (!record.callee || !record.callee.toLowerCase().includes(advancedFilters.userNumber.toLowerCase()))) {
      return false;
    }
    if (advancedFilters.caller && (!record.caller || !record.caller.toLowerCase().includes(advancedFilters.caller.toLowerCase()))) {
      return false;
    }
    if (advancedFilters.callId && (!record.callId || !record.callId.toLowerCase().includes(advancedFilters.callId.toLowerCase()))) {
      return false;
    }
    if (advancedFilters.billingCycle && (!record.billingCycle || !record.billingCycle.toLowerCase().includes(advancedFilters.billingCycle.toLowerCase()))) {
      return false;
    }
    if (advancedFilters.customerCurrency && (!record.customerCurrency || !record.customerCurrency.toLowerCase().includes(advancedFilters.customerCurrency.toLowerCase()))) {
      return false;
    }

    // 数字范围筛选
    const checkRange = (value: number | null, range: { min: number | null; max: number | null }): boolean => {
      // 将null视为0进行比较
      const actualValue = value === null ? 0 : value;
      if (range.min !== null && actualValue < range.min) return false;
      if (range.max !== null && actualValue > range.max) return false;
      return true;
    };

    if (!checkRange(record.callDurationSec, advancedFilters.callDurationRange)) return false;
    if (!checkRange(record.feeDurationSec, advancedFilters.feeDurationRange)) return false;
    
    // AI相关字段筛选
    if (!checkRange(record.customerTotalPriceUSD, advancedFilters.customerTotalPriceUSDRange)) return false; // AI消费(USD)
    if (!checkRange(record.sipTotalCustomerOriginalPriceUSD, advancedFilters.sipTotalCustomerOriginalPriceUSDRange)) return false; // 线路消费(USD)
    if (!checkRange(record.sipFeeDuration, advancedFilters.sipFeeDurationRange)) return false; // 线路计费时长
    
    // 原有字段保持兼容
    if (!checkRange(record.customerPrice, advancedFilters.customerPriceRange)) return false;
    if (!checkRange(record.customerTotalPrice, advancedFilters.customerTotalPriceRange)) return false;
    if (!checkRange(record.asrCost, advancedFilters.asrCostRange)) return false;
    
    // TTS和LLM成本处理，null值视为0
    if (!checkRange(record.ttsCost, advancedFilters.ttsCostRange)) return false;
    if (!checkRange(record.llmCost, advancedFilters.llmCostRange)) return false;
    
    if (!checkRange(record.totalCost, advancedFilters.totalCostRange)) return false;
    if (!checkRange(record.totalProfit, advancedFilters.totalProfitRange)) return false;
    if (!checkRange(record.size, advancedFilters.sizeRange)) return false;

    // 呼叫方向筛选
    if (advancedFilters.callDirection !== null && record.callDirection !== advancedFilters.callDirection) {
      return false;
    }

    return true;
  });
};

const BillManagementPage: React.FC = () => {
  // 状态管理 - 初始化时读取保存的筛选条件
  const [filters, setFilters] = useState<BillFilters>(loadSavedFilters());

  const [originalBillRecords, setOriginalBillRecords] = useState<BillRecord[]>([]); // 原始数据
  const [billRecords, setBillRecords] = useState<BillRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportingAll, setExportingAll] = useState<boolean>(false); // 新增：导出全部数据状态
  const [exportProgress, setExportProgress] = useState<{
    visible: boolean;
    step: 'confirm' | 'progress'; // 新增：当前步骤
    current: number;
    total: number;
    percentage: number;
    currentPage: number;
    totalPages: number;
    currentBatch: number; // 新增：当前批次
    totalBatches: number; // 新增：总批次数
    downloadedFiles: string[]; // 新增：已下载的文件名列表
  }>({
    visible: false,
    step: 'confirm',
    current: 0,
    total: 0,
    percentage: 0,
    currentPage: 0,
    totalPages: 0,
    currentBatch: 0,
    totalBatches: 0,
    downloadedFiles: []
  }); // 新增：导出进度状态
  const [isDesensitized, setIsDesensitized] = useState<boolean>(loadSavedDesensitizeState());
  const [hasSearched, setHasSearched] = useState<boolean>(false); // 新增：跟踪是否已经执行过搜索
  const [fieldSelectorVisible, setFieldSelectorVisible] = useState<boolean>(false); // 字段选择器可见性
  const [fieldConfig, setFieldConfig] = useState<BillFieldConfig | null>(null); // 当前字段配置
  
  // 后端分页信息（用于没有高级筛选的情况）
  const [backendPagination, setBackendPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 1000,
    totalRecords: 0,
    totalPages: 0
  });
  
  // 前端分页信息（用于有高级筛选的情况）
  const [frontendPagination, setFrontendPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 1000,
    totalRecords: 0,
    totalPages: 0
  });

  // 检查是否有有效的API令牌
  const [hasToken, setHasToken] = useState<boolean>(false);

  useEffect(() => {
    setHasToken(hasValidBillToken());
  }, []);

  // 加载保存的字段配置
  useEffect(() => {
    try {
      const saved = localStorage.getItem('billFieldConfig');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        // 兼容升级：如果历史配置缺少新字段，则补全并默认开启
        const upgradedConfig: BillFieldConfig = {
          ...parsedConfig,
          // 新增字段：线路通话时长(秒)
          sipCallDurationSec: typeof parsedConfig.sipCallDurationSec === 'boolean' ? parsedConfig.sipCallDurationSec : true,
          // 明确AI通话时长(秒)键存在
          callDurationSec: typeof parsedConfig.callDurationSec === 'boolean' ? parsedConfig.callDurationSec : true
        } as BillFieldConfig;
        setFieldConfig(upgradedConfig);
      }
    } catch (error) {
      console.warn('加载字段配置失败:', error);
    }
  }, []);

  // 监听筛选条件变化，自动保存到localStorage
  useEffect(() => {
    saveFiltersToStorage(filters);
  }, [filters]);

  // 监听脱敏状态变化，自动保存到localStorage
  useEffect(() => {
    saveDesensitizeStateToStorage(isDesensitized);
  }, [isDesensitized]);

  // 检查是否有活跃的高级筛选条件
  const hasActiveAdvancedFilters = () => {
    const { advancedFilters } = filters;
    return (
      advancedFilters.customerName ||
      advancedFilters.tenantName ||
      advancedFilters.userNumber ||
      advancedFilters.caller ||
      advancedFilters.callId ||
      advancedFilters.billingCycle ||
      advancedFilters.customerCurrency ||
      advancedFilters.callDirection !== null ||
      Object.values(advancedFilters).some(filter => 
        typeof filter === 'object' && filter !== null && (filter.min !== null || filter.max !== null)
      )
    );
  };

  // 监听高级筛选条件变化，应用前端筛选
  useEffect(() => {
    const hasAdvancedFilters = hasActiveAdvancedFilters();
    
    if (hasAdvancedFilters) {
      // 有高级筛选时，对原始数据进行筛选
      const filteredRecords = applyAdvancedFilters(originalBillRecords, filters.advancedFilters);
      setBillRecords(filteredRecords);
      
      // 只在未搜索过且有公司和团队选择时才自动搜索数据，避免无限循环
      if (!hasSearched && originalBillRecords.length === 0 && filters.selectedCompany && filters.selectedTeam) {
        setHasSearched(true);
        handleSearch(1, 1000); // 加载大量数据用于筛选
        return;
      }
      
      // 更新前端分页信息
      setFrontendPagination(prev => ({
        ...prev,
        totalRecords: filteredRecords.length,
        totalPages: Math.ceil(filteredRecords.length / prev.pageSize),
        currentPage: 1 // 重置到第一页
      }));
    } else {
      // 无高级筛选时，直接使用原始数据
      setBillRecords(originalBillRecords);
      
      // 使用后端分页信息
      setFrontendPagination(backendPagination);
    }
  }, [originalBillRecords, filters.advancedFilters, backendPagination, filters.selectedCompany, filters.selectedTeam, hasSearched]);

  // 处理API令牌变化
  const handleTokenChange = (tokenExists: boolean) => {
    setHasToken(tokenExists);
  };

  // 处理脱敏状态变化
  const handleDesensitizeChange = (desensitized: boolean) => {
    setIsDesensitized(desensitized);
  };

  // 脱敏处理函数
  const desensitizePhone = (phone: string): string => {
    if (!phone || phone.length < 6) {
      return phone; // 号码太短，不脱敏
    }
    const firstTwo = phone.substring(0, 2);
    const lastFour = phone.substring(phone.length - 4);
    const middleStars = '*'.repeat(Math.max(1, phone.length - 6));
    return `${firstTwo}${middleStars}${lastFour}`;
  };

  // 构建查询参数
  const buildQueryParams = (page: number = 1, size: number = 1000) => {
    if (!filters.selectedCompany || !filters.selectedTeam) {
      throw new Error('请先选择公司和团队');
    }

    // 构建开始和结束时间
    const startDate = filters.dateRange.start || dayjs().format('YYYY-MM-DD');
    const endDate = filters.dateRange.end || dayjs().format('YYYY-MM-DD');
    const startTime = filters.timeRange.start || '00:00:00';
    const endTime = filters.timeRange.end || '23:59:59';

    return {
      pageNum: page,
      pageSize: size,
      customerId: filters.selectedCompany.customerId,
      tenantId: filters.selectedTeam.id,
      agentFlowName: filters.agentFlowName.trim(),
      callee: filters.userNumber.trim(),
      startTime: `${startDate} ${startTime}`,
      endTime: `${endDate} ${endTime}`
    };
  };

  // 计算增强数据（包含新字段计算）
  const enhancedBillRecords = useMemo(() => {
    return billRecords.map(record => {
      // 计算新线路相关数据
      const newLineBillingData = calculateNewLineBilling(
        record.callDurationSec || 0,
        record.sipTotalCustomerOriginalPriceUSD || 0,
        record.size || 0,
        filters.customLineUnitPrice // 使用自定义单价
      );
      
      return {
        ...record,
        ...newLineBillingData
      };
    });
  }, [billRecords, filters.customLineUnitPrice]);

  // 获取当前页面应该显示的数据
  const getCurrentPageData = () => {
    if (hasActiveAdvancedFilters()) {
      // 有高级筛选时，对筛选后的数据进行前端分页
      const startIndex = (frontendPagination.currentPage - 1) * frontendPagination.pageSize;
      const endIndex = startIndex + frontendPagination.pageSize;
      return enhancedBillRecords.slice(startIndex, endIndex);
    } else {
      // 无高级筛选时，直接使用后端分页的数据
      return enhancedBillRecords;
    }
  };

  // 执行搜索 - 有高级筛选时加载更多数据
  const handleSearch = async (page: number = 1, size: number = 1000) => {
    if (!hasToken) {
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true); // 标记已经搜索过
      
      // 如果有高级筛选，需要加载大量数据进行前端筛选
      const actualSize = hasActiveAdvancedFilters() ? 1000 : size; // 有高级筛选时加载1000条数据
      const actualPage = hasActiveAdvancedFilters() ? 1 : page; // 有高级筛选时固定从第1页开始
      
      const params = buildQueryParams(actualPage, actualSize);
      const result = await queryBillList(params);

      // 保存原始数据
      setOriginalBillRecords(result.items);
      
      // 更新后端分页信息
      if (!hasActiveAdvancedFilters()) {
        setBackendPagination({
          currentPage: page,
          pageSize: size,
          totalRecords: result.total,
          totalPages: Math.ceil(result.total / size)
        });
      } else {
        // 有高级筛选时，设置后端分页信息以便前端分页计算
        setBackendPagination({
          currentPage: 1,
          pageSize: actualSize,
          totalRecords: result.total,
          totalPages: Math.ceil(result.total / actualSize)
        });
      }

    } catch (error) {
      console.error('查询账单失败:', error);
      setOriginalBillRecords([]);
      setBillRecords([]);
      setBackendPagination({
        currentPage: page,
        pageSize: size,
        totalRecords: 0,
        totalPages: 0
      });
      setFrontendPagination({
        currentPage: page,
        pageSize: size,
        totalRecords: 0,
        totalPages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // 处理筛选条件变化
  const handleFiltersChange = (newFilters: BillFilters) => {
    // 如果公司或团队发生变化，重置搜索状态
    if (newFilters.selectedCompany?.customerId !== filters.selectedCompany?.customerId ||
        newFilters.selectedTeam?.id !== filters.selectedTeam?.id) {
      setHasSearched(false);
    }
    setFilters(newFilters);
    // 保存操作在useEffect中自动处理
  };

  // 处理重置
  const handleReset = () => {
    const defaultFilters = getDefaultFilters();
    setFilters(defaultFilters);
    setHasSearched(false); // 重置搜索状态
    setOriginalBillRecords([]);
    setBillRecords([]);
    setBackendPagination({
      currentPage: 1,
      pageSize: 1000,
      totalRecords: 0,
      totalPages: 0
    });
    setFrontendPagination({
      currentPage: 1,
      pageSize: 1000,
      totalRecords: 0,
      totalPages: 0
    });
    // 清除保存的筛选条件
    try {
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        const storageKey = `${BILL_FILTERS_STORAGE_KEY}_${sessionId}`;
        localStorage.removeItem(storageKey);
        console.log('[账单筛选] 已清除保存的筛选条件');
      }
    } catch (error) {
      console.warn('清除保存的筛选条件失败:', error);
    }
  };

  // 处理分页变化
  const handlePageChange = (page: number, pageSize: number) => {
    if (hasActiveAdvancedFilters()) {
      // 有高级筛选时，只更新前端分页状态
      setFrontendPagination(prev => ({
        ...prev,
        currentPage: page,
        pageSize: pageSize
      }));
    } else {
      // 无高级筛选时，调用后端API
      handleSearch(page, pageSize);
    }
  };

  // 处理导出
  const handleExport = async () => {
    if (!hasToken) {
      message.error('缺少API令牌');
      return;
    }

    if (!filters.selectedCompany || !filters.selectedTeam) {
      message.error('请先选择公司和团队');
      return;
    }

    setExporting(true);
    message.loading('正在导出账单数据，请稍候...', 0);

    try {
      // 构建导出参数（不包含分页）
      const startDate = filters.dateRange.start || dayjs().format('YYYY-MM-DD');
      const endDate = filters.dateRange.end || dayjs().format('YYYY-MM-DD');
      const startTime = filters.timeRange.start || '00:00:00';
      const endTime = filters.timeRange.end || '23:59:59';

      const exportParams = {
        customerId: filters.selectedCompany.customerId,
        tenantId: filters.selectedTeam.id,
        agentFlowName: filters.agentFlowName.trim(),
        callee: filters.userNumber.trim(),
        startTime: `${startDate} ${startTime}`,
        endTime: `${endDate} ${endTime}`
      };

      console.log('[导出账单] 开始导出，参数:', exportParams);
      
      let billData = await exportBillData(exportParams, 10000);

      if (billData.length === 0) {
        message.destroy();
        message.warning('没有找到符合条件的账单数据');
        return;
      }

      // 应用高级筛选到导出数据
      billData = applyAdvancedFilters(billData, filters.advancedFilters);

      if (billData.length === 0) {
        message.destroy();
        message.warning('应用高级筛选后没有符合条件的账单数据');
        return;
      }

      // 为导出数据计算新字段
      const enhancedBillData = billData.map(record => {
        const newLineBillingData = calculateNewLineBilling(
          record.callDurationSec || 0,
          record.sipTotalCustomerOriginalPriceUSD || 0,
          record.size || 0,
          filters.customLineUnitPrice // 使用自定义单价
        );
        return {
          ...record,
          ...newLineBillingData
        };
      });

      // 获取币种信息（从第一条记录中获取）
      const sipCurrency = enhancedBillData.length > 0 ? (enhancedBillData[0].sipCurrency || 'USD') : 'USD';
      const customerCurrency = enhancedBillData.length > 0 ? (enhancedBillData[0].customerCurrency || 'USD') : 'USD';

      // 转换数据为Excel友好格式，应用脱敏逻辑 - 币种和数值分离，数值保持数字类型
      const excelData = enhancedBillData.map(record => ({
        '消费时间': record.feeTime,
        'Agent流程名称': record.agentFlowName,
        '用户号码': record.callee && isDesensitized ? desensitizePhone(record.callee) : record.callee,
        '线路号码': record.caller,
        '呼叫方向': record.callDirection === 1 ? '呼出' : 
                   record.callDirection === 2 ? '呼入' : `未知(${record.callDirection})`,
        // USD金额（数值类型）
        '线路消费(USD)': record.sipTotalCustomerOriginalPriceUSD || 0,
        'AI消费(USD)': record.customerTotalPriceUSD || 0,
        'AI总成本(USD)': record.totalCost || 0,
        // 原始币种金额（数值类型）
        '线路消费(原始金额)': record.sipTotalCustomerOriginalPrice || 0,
        '线路消费币种': record.sipCurrency || 'USD',
        'AI消费(原始金额)': record.customerTotalPrice || 0,
        'AI消费币种': record.customerCurrency || 'USD',
        // 时长和计量（数值类型）
        'AI通话时长(秒)': record.callDurationSec || 0,
        '线路通话时长(秒)': record.sipCallDurationSec || 0,
        '线路计费时长(秒)': record.sipFeeDuration || 0,
        'AI计费时长(秒)': record.feeDurationSec || 0,
        '计费量': record.size || 0,
        // 成本分解（数值类型）
        'ASR成本(USD)': record.asrCost || 0,
        'TTS成本(USD)': record.ttsCost || 0,
        'LLM成本(USD)': record.llmCost || 0,
        // 计费规则
        '线路计费规则': record.sipPriceType || '',
        'AI计费规则': record.billingCycle || '',
        // 新线路计费相关（数值类型）
        '原线路单价(USD)': record.originalLineUnitPrice || 0,
        '新线路计费周期': record.newLineBillingCycle || '20+20',
        '新线路单价(USD)': record.newLineUnitPrice || 0,
        '新线路计费量': record.newLineBillingQuantity || 0,
        '新线路消费(USD)': record.newLineConsumption || 0,
        '使用自定义单价': record.isUsingCustomPrice ? '是' : '否',
        '实际使用单价(USD)': record.actualUnitPrice || 0,
        // 基本信息
        '客户名称': record.customerName,
        '团队名称': record.tenantName
      }));

      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // 设置列宽 - 重新排列后的列结构
      const cols = [
        { wch: 20 }, // 消费时间
        { wch: 25 }, // Agent流程名称
        { wch: 15 }, // 用户号码
        { wch: 15 }, // 线路号码
        { wch: 12 }, // 呼叫方向
        { wch: 18 }, // 线路消费(USD)
        { wch: 18 }, // AI消费(USD)
        { wch: 18 }, // AI总成本(USD)
        { wch: 20 }, // 线路消费(原始金额)
        { wch: 12 }, // 线路消费币种
        { wch: 18 }, // AI消费(原始金额)
        { wch: 12 }, // AI消费币种
        { wch: 17 }, // AI通话时长(秒)
        { wch: 18 }, // 线路通话时长(秒)
        { wch: 18 }, // 线路计费时长(秒)
        { wch: 17 }, // AI计费时长(秒)
        { wch: 12 }, // 计费量
        { wch: 15 }, // ASR成本(USD)
        { wch: 15 }, // TTS成本(USD)
        { wch: 15 }, // LLM成本(USD)
        { wch: 15 }, // 线路计费规则
        { wch: 15 }, // AI计费规则
        { wch: 18 }, // 原线路单价(USD)
        { wch: 18 }, // 新线路计费周期
        { wch: 18 }, // 新线路单价(USD)
        { wch: 15 }, // 新线路计费量
        { wch: 18 }, // 新线路消费(USD)
        { wch: 16 }, // 使用自定义单价
        { wch: 20 }, // 实际使用单价(USD)
        { wch: 30 }, // 客户名称
        { wch: 20 }  // 团队名称
      ];
      worksheet['!cols'] = cols;
      
      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '账单数据');
      
      // 生成Excel文件
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      
      // 生成文件名: 账单导出_公司名_开始日期_结束日期_脱敏状态.csv
      const companyName = filters.selectedCompany.companyName.replace(/[\\/:*?"<>|]/g, '_');
      const desensitizePrefix = isDesensitized ? '_脱敏' : '';
      const selectedFieldsCount = fieldConfig ? Object.values(fieldConfig).filter(Boolean).length : '全部';
      const fileName = `账单导出_${companyName}_${startDate}_${endDate}${desensitizePrefix}_${selectedFieldsCount}字段.csv`;
      
      // 应用脱敏逻辑到数据
      const processedData = enhancedBillData.map(record => ({
        ...record,
        callee: record.callee && isDesensitized ? desensitizePhone(record.callee) : record.callee
      }));

      // 使用CSV导出
      generateCSVFile(processedData, fileName, fieldConfig);
      
      message.destroy();
      const statusText = isDesensitized ? '（用户号码已脱敏）' : '';
      const fieldText = fieldConfig ? `，已应用字段配置(${selectedFieldsCount}个字段)` : '';
      message.success(`成功导出 ${enhancedBillData.length} 条账单数据${statusText}${fieldText}`);
    } catch (error) {
      message.destroy();
      console.error('导出账单数据失败:', error);
      message.error('导出账单数据失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  // 根据字段配置筛选数据
  const filterDataByFieldConfig = (data: any[], fieldConfig: BillFieldConfig): any[] => {
    if (!fieldConfig) return data;

    return data.map(record => {
      const filteredRecord: any = {};

      // 按页面列顺序采集被选中的字段，确保导出顺序与页面一致
      const orderedKeys: string[] = [
        'feeTime', 'agentFlowName', 'callee', 'caller', 'callDirection',
        'sipTotalCustomerOriginalPriceUSD', 'customerTotalPriceUSD', 'totalCost',
        'sipTotalCustomerOriginalPrice', 'customerTotalPrice',
        'sipCallDurationSec', 'callDurationSec', 'sipFeeDuration', 'feeDurationSec', 'size',
        'asrCost', 'ttsCost', 'llmCost',
        'sipPriceType', 'billingCycle',
        'originalLineUnitPrice', 'newLineBillingCycle', 'newLineUnitPrice', 'newLineBillingQuantity', 'newLineConsumption',
        'customerName', 'tenantName'
      ];

      orderedKeys.forEach((key) => {
        const selected = (fieldConfig as any)[key];
        if (selected && Object.prototype.hasOwnProperty.call(record, key)) {
          filteredRecord[key] = (record as any)[key];
        }
      });

      return filteredRecord;
    });
  };

  // 字段名到中文表头的映射
  const fieldHeaderMap: Record<string, string> = {
    feeTime: '消费时间',
    agentFlowName: 'Agent流程名称',
    customerName: '客户名称',
    tenantName: '团队名称',
    callee: '用户号码',
    caller: '线路号码',
    callDirection: '呼叫方向',
    sipCallDurationSec: '线路通话时长(秒)',
    callDurationSec: 'AI通话时长(秒)',
    feeDurationSec: 'AI计费时长(秒)',
    sipFeeDuration: '线路计费时长(秒)',
    size: '计费量',
    billingCycle: 'AI计费规则',
    sipPriceType: '线路计费规则',
    sipTotalCustomerOriginalPriceUSD: '线路消费(USD)',
    customerTotalPriceUSD: 'AI消费(USD)',
    sipTotalCustomerOriginalPrice: '线路消费(原币种)',
    customerTotalPrice: 'AI消费(原币种)',
    totalCost: 'AI总成本',
    asrCost: 'ASR成本',
    ttsCost: 'TTS成本',
    llmCost: 'LLM成本',
    originalLineUnitPrice: '原线路单价',
    newLineBillingCycle: '新线路计费周期',
    newLineUnitPrice: '新线路单价',
    newLineBillingQuantity: '新线路计费量',
    newLineConsumption: '新线路消费'
  };

  // 页面列顺序（与 BillTable.tsx 一致），用于导出时保持一致的字段顺序
  const pageFieldOrder: string[] = [
    'feeTime', 'agentFlowName', 'callee', 'caller', 'callDirection',
    'sipTotalCustomerOriginalPriceUSD', 'customerTotalPriceUSD', 'totalCost',
    'sipTotalCustomerOriginalPrice', 'customerTotalPrice',
    'sipCallDurationSec', 'callDurationSec', 'sipFeeDuration', 'feeDurationSec', 'size',
    'asrCost', 'ttsCost', 'llmCost',
    'sipPriceType', 'billingCycle',
    'originalLineUnitPrice', 'newLineBillingCycle', 'newLineUnitPrice', 'newLineBillingQuantity', 'newLineConsumption',
    'customerName', 'tenantName'
  ];

  // 生成CSV文件的轻量级函数
  const generateCSVFile = (data: any[], fileName: string, fieldConfig?: BillFieldConfig) => {
    if (data.length === 0) {
      console.warn('没有数据可导出');
      return;
    }

    try {
      // 根据字段配置筛选数据
      const filteredData = fieldConfig ? filterDataByFieldConfig(data, fieldConfig) : data;
      
      if (filteredData.length === 0 || (filteredData[0] && Object.keys(filteredData[0]).length === 0)) {
        message.warning('没有选择任何字段进行导出');
        return;
      }

      // 按页面字段顺序确定导出字段
      const fieldKeys = pageFieldOrder.filter(k => Object.prototype.hasOwnProperty.call(filteredData[0], k));
      const chineseHeaders = fieldKeys.map(key => fieldHeaderMap[key] || key);
      
      // 转义CSV字段的函数
      const escapeCSVField = (field: any): string => {
        if (field === null || field === undefined) {
          return '';
        }
        const str = String(field);
        // 如果包含逗号、引号或换行符，需要用引号包围并转义内部引号
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // 构建CSV内容
      const csvLines: string[] = [];
      
      // 添加中文表头
      csvLines.push(chineseHeaders.map(escapeCSVField).join(','));
      
      // 添加数据行
      for (const row of filteredData) {
        const csvRow = fieldKeys.map(key => {
          let value = row[key];
          
          // 特殊字段处理
          if (key === 'callDirection') {
            // 呼叫方向转换为中文
            if (value === 1) value = '呼出';
            else if (value === 2) value = '呼入';
            else value = `未知(${value})`;
          }
          
          return escapeCSVField(value);
        }).join(',');
        csvLines.push(csvRow);
      }

      // 创建CSV内容，添加BOM以支持中文
      const csvContent = '\uFEFF' + csvLines.join('\n');
      
      // 创建Blob并下载
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, fileName);
      
      console.log(`✅ CSV文件导出成功: ${fileName}`, fieldConfig ? `已筛选字段: ${fieldKeys.length}个` : '');
    } catch (error) {
      console.error('❌ CSV导出失败:', error);
      message.error(`CSV导出失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 转换数据为Excel格式的通用函数
  const convertToExcelFormat = (records: BillRecord[]) => {
    return records.map(record => ({
      '消费时间': record.feeTime,
      'Agent流程名称': record.agentFlowName,
      '用户号码': record.callee && isDesensitized ? desensitizePhone(record.callee) : record.callee,
      '线路号码': record.caller,
      '呼叫方向': record.callDirection === 1 ? '呼出' : 
                 record.callDirection === 2 ? '呼入' : `未知(${record.callDirection})`,
      // USD金额（数值类型）
      '线路消费(USD)': record.sipTotalCustomerOriginalPriceUSD || 0,
      'AI消费(USD)': record.customerTotalPriceUSD || 0,
      'AI总成本(USD)': record.totalCost || 0,
      // 原始币种金额（数值类型）
      '线路消费(原始金额)': record.sipTotalCustomerOriginalPrice || 0,
      '线路消费币种': record.sipCurrency || 'USD',
      'AI消费(原始金额)': record.customerTotalPrice || 0,
      'AI消费币种': record.customerCurrency || 'USD',
      // 时长和计量（数值类型）
      '通话时长(秒)': record.callDurationSec || 0,
      '线路计费时长(秒)': record.sipFeeDuration || 0,
      'AI计费时长(秒)': record.feeDurationSec || 0,
      '计费量': record.size || 0,
      // 成本分解（数值类型）
      'ASR成本(USD)': record.asrCost || 0,
      'TTS成本(USD)': record.ttsCost || 0,
      'LLM成本(USD)': record.llmCost || 0,
      // 计费规则
      '线路计费规则': record.sipPriceType || '',
      'AI计费规则': record.billingCycle || '',
      // 新线路计费相关（数值类型）
      '原线路单价(USD)': record.originalLineUnitPrice || 0,
      '新线路计费周期': record.newLineBillingCycle || '20+20',
      '新线路单价(USD)': record.newLineUnitPrice || 0,
      '新线路计费量': record.newLineBillingUnit || 0,
      '新线路消费(USD)': record.newLineConsumption || 0,
      '使用自定义单价': record.usingCustomPrice ? '是' : '否',
      '实际使用单价(USD)': record.actualUnitPrice || 0,
      // 客户和团队信息
      '客户名称': record.customerName || '',
      '团队名称': record.tenantName || ''
    }));
  };

  // 处理字段配置确认
  const handleFieldConfigConfirm = (newFieldConfig: BillFieldConfig) => {
    setFieldConfig(newFieldConfig);
    setFieldSelectorVisible(false);
    
    // 保存到localStorage
    try {
      localStorage.setItem('billFieldConfig', JSON.stringify(newFieldConfig));
      message.success('字段配置已保存');
    } catch (error) {
      console.warn('保存字段配置失败:', error);
      message.error('保存字段配置失败');
    }
  };

  // 使用字段配置进行导出
  const handleExportWithConfig = async (fieldConfig: BillFieldConfig) => {
    if (!filters.selectedCompany || !filters.selectedTeam) {
      message.warning('请先选择公司和团队');
      return;
    }

    setExporting(true);
    const loadingMessage = message.loading('正在导出账单数据...', 0);

    try {
      const startDate = filters.dateRange.start || dayjs().format('YYYY-MM-DD');
      const endDate = filters.dateRange.end || dayjs().format('YYYY-MM-DD');
      const startTime = filters.timeRange.start || '00:00:00';
      const endTime = filters.timeRange.end || '23:59:59';

      const exportParams = {
        customerId: filters.selectedCompany.customerId,
        tenantId: filters.selectedTeam.id,
        agentFlowName: filters.agentFlowName.trim(),
        callee: filters.userNumber.trim(),
        startTime: `${startDate} ${startTime}`,
        endTime: `${endDate} ${endTime}`
      };

      console.log('[自定义字段导出] 开始导出，参数:', exportParams);
      
      let billData = await exportBillData(exportParams, 10000);

      if (billData.length === 0) {
        message.destroy();
        message.warning('没有找到符合条件的账单数据');
        return;
      }

      // 应用高级筛选到导出数据
      billData = applyAdvancedFilters(billData, filters.advancedFilters);

      if (billData.length === 0) {
        message.destroy();
        message.warning('应用高级筛选后没有符合条件的账单数据');
        return;
      }

      // 为导出数据计算新字段
      const enhancedBillData = billData.map(record => {
        const newLineBillingData = calculateNewLineBilling(
          record.callDurationSec || 0,
          record.sipTotalCustomerOriginalPriceUSD || 0,
          record.size || 0,
          filters.customLineUnitPrice
        );
        return {
          ...record,
          ...newLineBillingData
        };
      });

      // 生成文件名
      const companyName = filters.selectedCompany.companyName.replace(/[\\/:*?"<>|]/g, '_');
      const desensitizePrefix = isDesensitized ? '_脱敏' : '';
      const selectedFieldsCount = Object.values(fieldConfig).filter(Boolean).length;
      const fileName = `账单导出_${companyName}_${startDate}_${endDate}${desensitizePrefix}_${selectedFieldsCount}字段.csv`;

      // 使用字段配置导出CSV
      generateCSVFile(enhancedBillData, fileName, fieldConfig);
      
      message.destroy();
      const statusText = isDesensitized ? '（用户号码已脱敏）' : '';
      message.success(`成功导出 ${enhancedBillData.length} 条账单数据${statusText}，包含 ${selectedFieldsCount} 个字段`);
    } catch (error) {
      message.destroy();
      console.error('自定义字段导出失败:', error);
      message.error('导出账单数据失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  // 处理导出全部数据
  const handleExportAll = async () => {
    if (!hasToken) {
      message.error('缺少API令牌');
      return;
    }

    if (!filters.selectedCompany || !filters.selectedTeam) {
      message.error('请先选择公司和团队');
      return;
    }

    // 显示确认和进度Modal
    setExportProgress({
      visible: true,
      step: 'confirm',
      current: 0,
      total: 0,
      percentage: 0,
      currentPage: 0,
      totalPages: 0,
      currentBatch: 0,
      totalBatches: 0,
      downloadedFiles: []
    });
  };

  // 确认导出操作
  const confirmExport = async () => {
    setExportingAll(true);
    setExportProgress(prev => ({
      ...prev,
      step: 'progress'
    }));

    try {
      // 构建导出参数（不包含分页）
      const startDate = filters.dateRange.start || dayjs().format('YYYY-MM-DD');
      const endDate = filters.dateRange.end || dayjs().format('YYYY-MM-DD');
      const startTime = filters.timeRange.start || '00:00:00';
      const endTime = filters.timeRange.end || '23:59:59';

      const exportParams = {
        customerId: filters.selectedCompany.customerId,
        tenantId: filters.selectedTeam.id,
        agentFlowName: filters.agentFlowName.trim(),
        callee: filters.userNumber.trim(),
        startTime: `${startDate} ${startTime}`,
        endTime: `${endDate} ${endTime}`
      };

      console.log('[导出全部账单] 开始分批导出，参数:', exportParams);
      
      const companyName = filters.selectedCompany.companyName.replace(/[\\/:*?"<>|]/g, '_');
      const desensitizePrefix = isDesensitized ? '_脱敏' : '';
      const downloadedFiles: string[] = [];
      let totalProcessed = 0;

      // 数据获取进度回调函数
      const onProgress: ProgressCallback = (progress) => {
        setExportProgress(prev => ({
          ...prev,
          current: progress.current,
          total: progress.total,
          percentage: Math.min(progress.percentage, 95), // 留5%给文件生成
          currentPage: progress.currentPage,
          totalPages: progress.totalPages || 0
        }));
      };

      // 批次处理回调函数（边获取边生成）
      const onBatchReady: BatchExportCallback = async (batchData, batchInfo) => {
        console.log(`[导出批次] 处理第 ${batchInfo.batchNumber} 批次，${batchInfo.batchSize} 条记录`);
        
        // 更新批次信息
        setExportProgress(prev => ({
          ...prev,
          currentBatch: batchInfo.batchNumber,
          totalBatches: batchInfo.totalBatches,
          percentage: 95 + (batchInfo.batchNumber / batchInfo.totalBatches) * 5 // 最后5%为文件生成进度
        }));

        // 应用高级筛选到当前批次数据
        let filteredBatchData = applyAdvancedFilters(batchData, filters.advancedFilters);

        // 如果过滤后没有数据，跳过这个批次
        if (filteredBatchData.length === 0) {
          console.log(`[导出批次] 第 ${batchInfo.batchNumber} 批次过滤后没有数据，跳过`);
          return;
        }

        // 为导出数据计算新字段
        const enhancedBatchData = filteredBatchData.map(record => {
          const newLineBillingData = calculateNewLineBilling(
            record.callDurationSec || 0,
            record.sipTotalCustomerOriginalPriceUSD || 0,
            record.size || 0,
            filters.customLineUnitPrice
          );
          return {
            ...record,
            ...newLineBillingData
          };
        });

        // 应用脱敏逻辑到数据
        const processedBatchData = enhancedBatchData.map(record => ({
          ...record,
          callee: record.callee && isDesensitized ? desensitizePhone(record.callee) : record.callee
        }));

        // 生成文件名
        const selectedFieldsCount = fieldConfig ? Object.values(fieldConfig).filter(Boolean).length : '全部';
        const fileName = batchInfo.totalBatches > 1 
          ? `账单批量导出_${companyName}_${startDate}_${endDate}_第${batchInfo.batchNumber}批次_共${batchInfo.totalBatches}批次${desensitizePrefix}_${selectedFieldsCount}字段.csv`
          : `账单全部导出_${companyName}_${startDate}_${endDate}${desensitizePrefix}_${selectedFieldsCount}字段.csv`;
        
        // 生成并下载文件
        generateCSVFile(processedBatchData, fileName, fieldConfig);
        downloadedFiles.push(fileName);

        // 更新已下载文件列表
        setExportProgress(prev => ({
          ...prev,
          downloadedFiles: [...downloadedFiles]
        }));

        totalProcessed += enhancedBatchData.length;
        console.log(`[导出批次] 第 ${batchInfo.batchNumber} 批次完成，累计处理 ${totalProcessed} 条有效记录`);

        // 批次间延迟，让浏览器处理下载
        await new Promise(resolve => setTimeout(resolve, 1000));
      };

      // 使用内存友好的分批导出
      const totalRecords = await exportAllBillDataInBatches(
        exportParams,
        50000, // 每5万条一个批次，CSV更轻量
        onProgress,
        onBatchReady
      );

      if (totalRecords === 0) {
        message.warning('没有找到符合条件的账单数据');
        setExportProgress(prev => ({ ...prev, visible: false }));
        setExportingAll(false);
        return;
      }

      if (totalProcessed === 0) {
        message.warning('应用高级筛选后没有符合条件的账单数据');
        setExportProgress(prev => ({ ...prev, visible: false }));
        setExportingAll(false);
        return;
      }

      // 最终进度更新
      setExportProgress(prev => ({
        ...prev,
        percentage: 100
      }));

      const statusText = isDesensitized ? '（用户号码已脱敏）' : '';
      const fileText = downloadedFiles.length > 1 ? `${downloadedFiles.length}个文件` : '1个文件';
      message.success(`成功导出 ${totalProcessed} 条有效账单数据（原始${totalRecords}条），共${fileText}${statusText}`);

    } catch (error) {
      console.error('导出全部账单数据失败:', error);
      message.error('导出全部账单数据失败，请稍后重试');
    } finally {
      setExportingAll(false);
      // 保持Modal显示3秒后自动关闭
      setTimeout(() => {
        setExportProgress(prev => ({ ...prev, visible: false }));
      }, 3000);
    }
  };

  // 取消导出
  const cancelExport = () => {
    setExportProgress(prev => ({ ...prev, visible: false }));
  };

  return (
    <Layout style={{ minHeight: '100vh', padding: '24px' }}>
      <Content>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
          <Title level={2} style={{ marginBottom: 24 }}>
            账单查询管理
          </Title>

          <TokenManager onTokenChange={handleTokenChange} />

          {hasToken ? (
            <>
              <BillFiltersComponent
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onSearch={() => handleSearch(1, frontendPagination.pageSize)}
                onReset={handleReset}
                loading={loading}
              />

              <AdvancedFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />

              <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Space>
                  <Button 
                    icon={<DownloadOutlined />} 
                    onClick={handleExport}
                    loading={exporting}
                    disabled={!filters.selectedCompany || !filters.selectedTeam || loading || exportingAll}
                    type="default"
                  >
                    {exporting ? '导出中...' : `导出数据 ${isDesensitized ? '(脱敏)' : '(完整)'} - 最多10000条`}
                  </Button>
                  <Button 
                    icon={<SettingOutlined />} 
                    onClick={() => setFieldSelectorVisible(true)}
                    disabled={!filters.selectedCompany || !filters.selectedTeam || loading || exporting || exportingAll}
                    type="default"
                  >
                    自定义字段配置
                  </Button>
                  <Button 
                    icon={<ExportOutlined />} 
                    onClick={handleExportAll}
                    loading={exportingAll}
                    disabled={!filters.selectedCompany || !filters.selectedTeam || loading || exporting}
                    type="primary"
                  >
                    {exportingAll ? '导出全部中...' : `导出全部数据为CSV ${isDesensitized ? '(脱敏)' : '(完整)'}`}
                  </Button>
                </Space>
              </div>

              <BillTable
                data={getCurrentPageData()}
                loading={loading}
                pagination={frontendPagination}
                onPageChange={handlePageChange}
                onDesensitizeChange={handleDesensitizeChange}
                initialDesensitized={isDesensitized}
                companyName={filters.selectedCompany?.companyName}
                dateRange={filters.dateRange}
                timeRange={filters.timeRange}
                customLineUnitPrice={filters.customLineUnitPrice}
                fieldConfig={fieldConfig}
              />
            </>
          ) : (
            <Alert
              message="缺少API令牌"
              description="请在上方API令牌管理区域设置有效的API令牌后再进行账单查询。API令牌与标签迁移工具共享。"
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      </Content>

      {/* 导出全部数据确认和进度对话框 */}
      <Modal
        title={exportProgress.step === 'confirm' ? '确认导出全部数据' : '导出全部数据进度'}
        open={exportProgress.visible}
        footer={exportProgress.step === 'confirm' ? [
          <Button key="cancel" onClick={cancelExport}>
            取消
          </Button>,
          <Button key="confirm" type="primary" onClick={confirmExport}>
            确认导出
          </Button>
        ] : null}
        closable={exportProgress.step === 'confirm'}
        maskClosable={false}
        width={600}
      >
        {exportProgress.step === 'confirm' ? (
          <div style={{ padding: '16px 0' }}>
            <Alert
              message="重要提示"
              description={
                <div>
                  <p>即将导出符合当前筛选条件的<strong>全部</strong>账单数据。</p>
                  <p>• 数据将按每 <strong>5万条</strong> 自动分批下载为 <strong>CSV格式</strong></p>
                  <p>• 导出过程可能需要较长时间，请耐心等待</p>
                  <p>• 请不要在导出过程中关闭页面</p>
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px' }}>
              <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
                <strong>当前筛选条件：</strong>
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: 14 }}>
                公司：{filters.selectedCompany?.companyName || '未选择'}<br/>
                团队：{filters.selectedTeam?.name || '未选择'}<br/>
                日期：{filters.dateRange.start} 到 {filters.dateRange.end}<br/>
                脱敏模式：{isDesensitized ? '开启' : '关闭'}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            {exportProgress.total > 0 && exportProgress.currentBatch === 0 && (
              <div style={{ marginBottom: 24 }}>
                <Progress
                  type="circle"
                  percent={Math.round(exportProgress.percentage)}
                  format={(percent) => `${percent}%`}
                  size={120}
                />
                <div style={{ marginTop: 16, fontSize: 16 }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>正在获取数据...</strong>
                  </div>
                  <div style={{ color: '#666', fontSize: 14 }}>
                    已获取: {exportProgress.current.toLocaleString()} / {exportProgress.total.toLocaleString()} 条
                  </div>
                  <div style={{ color: '#666', fontSize: 14 }}>
                    页面进度: {exportProgress.currentPage} / {exportProgress.totalPages}
                  </div>
                </div>
              </div>
            )}

            {exportProgress.totalBatches > 0 && (
              <div style={{ marginBottom: 24 }}>
                <Progress
                  type="circle"
                  percent={Math.round(exportProgress.percentage)}
                  format={(percent) => `${percent}%`}
                  size={120}
                />
                <div style={{ marginTop: 16, fontSize: 16 }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>正在生成文件...</strong>
                  </div>
                  <div style={{ color: '#666', fontSize: 14 }}>
                    批次进度: {exportProgress.currentBatch} / {exportProgress.totalBatches}
                  </div>
                  {exportProgress.currentBatch > 0 && (
                    <div style={{ color: '#1890ff', fontSize: 14 }}>
                      正在处理第 {exportProgress.currentBatch} 批次数据
                    </div>
                  )}
                </div>
              </div>
            )}

            {exportProgress.downloadedFiles.length > 0 && (
              <div style={{ marginTop: 16, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
                  已下载文件：
                </div>
                <div style={{ 
                  maxHeight: 150, 
                  overflowY: 'auto', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px',
                  padding: '8px',
                  background: '#fafafa'
                }}>
                  {exportProgress.downloadedFiles.map((fileName, index) => (
                    <div key={index} style={{ 
                      fontSize: 12, 
                      color: '#52c41a',
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <span style={{ marginRight: 8 }}>✓</span>
                      {fileName}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ marginTop: 16, color: '#999', fontSize: 12 }}>
              请耐心等待，不要关闭页面
            </div>
          </div>
        )}
      </Modal>

      {/* 自定义字段选择器 */}
      <FieldSelector
        visible={fieldSelectorVisible}
        onCancel={() => setFieldSelectorVisible(false)}
        onConfirm={handleFieldConfigConfirm}
        initialConfig={fieldConfig || undefined}
      />
    </Layout>
  );
};

export default BillManagementPage; 