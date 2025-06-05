import React, { useState, useEffect } from 'react';
import { Layout, Typography, Alert, Spin, Button, Space, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { BillFilters, BillRecord, PaginationInfo } from '../types/bill';
import { queryBillList, hasValidBillToken, exportBillData } from '../services/billApi';
import BillFiltersComponent from '../components/bill/BillFilters';
import AdvancedFilters from '../components/bill/AdvancedFilters';
import BillTable from '../components/bill/BillTable';
import TokenManager from '../components/bill/TokenManager';

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
    customerPriceRange: { min: null, max: null },
    customerTotalPriceRange: { min: null, max: null },
    asrCostRange: { min: null, max: null },
    ttsCostRange: { min: null, max: null },
    llmCostRange: { min: null, max: null },
    totalCostRange: { min: null, max: null },
    totalProfitRange: { min: null, max: null },
    callDirection: null
  }
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
          ...parsed.advancedFilters
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
    if (!checkRange(record.customerPrice, advancedFilters.customerPriceRange)) return false;
    if (!checkRange(record.customerTotalPrice, advancedFilters.customerTotalPriceRange)) return false;
    if (!checkRange(record.asrCost, advancedFilters.asrCostRange)) return false;
    
    // TTS和LLM成本处理，null值视为0
    if (!checkRange(record.ttsCost, advancedFilters.ttsCostRange)) return false;
    if (!checkRange(record.llmCost, advancedFilters.llmCostRange)) return false;
    
    if (!checkRange(record.totalCost, advancedFilters.totalCostRange)) return false;
    if (!checkRange(record.totalProfit, advancedFilters.totalProfitRange)) return false;

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
  const [isDesensitized, setIsDesensitized] = useState<boolean>(loadSavedDesensitizeState());
  
  // 后端分页信息（用于没有高级筛选的情况）
  const [backendPagination, setBackendPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 0
  });
  
  // 前端分页信息（用于有高级筛选的情况）
  const [frontendPagination, setFrontendPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 0
  });

  // 检查是否有有效的API令牌
  const [hasToken, setHasToken] = useState<boolean>(false);

  useEffect(() => {
    setHasToken(hasValidBillToken());
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
      
      // 如果原始数据为空但有公司和团队选择，自动搜索数据
      if (originalBillRecords.length === 0 && filters.selectedCompany && filters.selectedTeam) {
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
  }, [originalBillRecords, filters.advancedFilters, backendPagination, filters.selectedCompany, filters.selectedTeam]);

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
  const buildQueryParams = (page: number = 1, size: number = 10) => {
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

  // 获取当前页面应该显示的数据
  const getCurrentPageData = () => {
    if (hasActiveAdvancedFilters()) {
      // 有高级筛选时，对筛选后的数据进行前端分页
      const startIndex = (frontendPagination.currentPage - 1) * frontendPagination.pageSize;
      const endIndex = startIndex + frontendPagination.pageSize;
      return billRecords.slice(startIndex, endIndex);
    } else {
      // 无高级筛选时，直接使用后端分页的数据
      return billRecords;
    }
  };

  // 执行搜索 - 有高级筛选时加载更多数据
  const handleSearch = async (page: number = 1, size: number = 10) => {
    if (!hasToken) {
      return;
    }

    try {
      setLoading(true);
      
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
    setFilters(newFilters);
    // 保存操作在useEffect中自动处理
  };

  // 处理重置
  const handleReset = () => {
    const defaultFilters = getDefaultFilters();
    setFilters(defaultFilters);
    setOriginalBillRecords([]);
    setBillRecords([]);
    setBackendPagination({
      currentPage: 1,
      pageSize: 10,
      totalRecords: 0,
      totalPages: 0
    });
    setFrontendPagination({
      currentPage: 1,
      pageSize: 10,
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

      // 转换数据为Excel友好格式，应用脱敏逻辑
      const excelData = billData.map(record => ({
        '消费时间': record.feeTime,
        'Agent流程名称': record.agentFlowName,
        '用户号码': record.callee && isDesensitized ? desensitizePhone(record.callee) : record.callee,
        '主叫号码': record.caller,
        '呼叫方向': record.callDirection === 1 ? '呼出' : 
                   record.callDirection === 2 ? '呼入' : `未知(${record.callDirection})`,
        '通话时长(秒)': record.callDurationSec,
        '计费时长(秒)': record.feeDurationSec,
        '计费周期': record.billingCycle,
        '呼叫ID': record.callId,
        '客户价格': record.customerPrice,
        '客户总价': record.customerTotalPrice,
        '客户总价(USD)': record.customerTotalPriceUSD,
        '客户货币': record.customerCurrency,
        '呼叫开始时间': record.callStartTime,
        '呼叫结束时间': record.callEndTime,
        '呼叫应答时间': record.callAnswerTime,
        'ASR成本': record.asrCost,
        'TTS成本': record.ttsCost,
        'LLM成本': record.llmCost,
        '总成本': record.totalCost,
        '总利润': record.totalProfit,
        '客户编号': record.customerId,
        '租户编号': record.tenantId,
        '客户名称': record.customerName,
        '租户名称': record.tenantName
      }));

      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // 设置列宽
      const cols = [
        { wch: 20 }, // 消费时间
        { wch: 25 }, // Agent流程名称
        { wch: 15 }, // 用户号码
        { wch: 15 }, // 主叫号码
        { wch: 10 }, // 呼叫方向
        { wch: 15 }, // 通话时长(秒)
        { wch: 15 }, // 计费时长(秒)
        { wch: 12 }, // 计费周期
        { wch: 12 }, // 呼叫ID
        { wch: 15 }, // 客户价格
        { wch: 15 }, // 客户总价
        { wch: 15 }, // 客户总价(USD)
        { wch: 12 }, // 客户货币
        { wch: 18 }, // 呼叫开始时间
        { wch: 18 }, // 呼叫结束时间
        { wch: 18 }, // 呼叫应答时间
        { wch: 12 }, // ASR成本
        { wch: 12 }, // TTS成本
        { wch: 12 }, // LLM成本
        { wch: 12 }, // 总成本
        { wch: 12 }, // 总利润
        { wch: 12 }, // 客户编号
        { wch: 12 }, // 租户编号
        { wch: 15 }, // 客户名称
        { wch: 15 }  // 租户名称
      ];
      worksheet['!cols'] = cols;
      
      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '账单数据');
      
      // 生成Excel文件
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      
      // 生成文件名: 账单导出_公司名_开始日期_结束日期_脱敏状态.xlsx
      const companyName = filters.selectedCompany.companyName.replace(/[\\/:*?"<>|]/g, '_');
      const desensitizePrefix = isDesensitized ? '_脱敏' : '';
      const fileName = `账单导出_${companyName}_${startDate}_${endDate}${desensitizePrefix}.xlsx`;
      
      // 保存文件
      saveAs(blob, fileName);
      
      message.destroy();
      const statusText = isDesensitized ? '（用户号码已脱敏）' : '';
      message.success(`成功导出 ${billData.length} 条账单数据${statusText}`);
    } catch (error) {
      message.destroy();
      console.error('导出账单数据失败:', error);
      message.error('导出账单数据失败，请稍后重试');
    } finally {
      setExporting(false);
    }
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
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={handleExport}
                  loading={exporting}
                  disabled={!filters.selectedCompany || !filters.selectedTeam || loading}
                  type="default"
                >
                  {exporting ? '导出中...' : `导出数据 ${isDesensitized ? '(脱敏)' : '(完整)'} - 最多10000条`}
                </Button>
              </div>

              <BillTable
                data={getCurrentPageData()}
                loading={loading}
                pagination={frontendPagination}
                onPageChange={handlePageChange}
                onDesensitizeChange={handleDesensitizeChange}
                initialDesensitized={isDesensitized}
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
    </Layout>
  );
};

export default BillManagementPage; 