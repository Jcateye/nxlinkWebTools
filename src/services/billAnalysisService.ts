import * as XLSX from 'xlsx';
import { BillRecord } from '../types/bill';
import dayjs from 'dayjs';
// 使用内置方法替代lodash以减少依赖
// import _ from 'lodash';

export interface AnalysisData {
  totalRecords: number;
  dateRange: {
    start: string;
    end: string;
  };
  customers: string[];
  raw: BillRecord[];
}

export interface UsageAnalysis {
  totalCalls: number;
  totalDuration: number; // AI通话总时长(秒)
  totalLineDuration: number; // 线路通话总时长(秒)
  avgCallDuration: number;
  avgLineDuration: number;
  callsByDirection: {
    inbound: number;
    outbound: number;
  };
  callsByTimeRange: Array<{
    hour: number;
    count: number;
  }>;
  topFlows: Array<{
    flowName: string;
    count: number;
    duration: number;
  }>;
}

export interface ConsumptionAnalysis {
  totalAIConsumption: number; // AI消费总额(USD)
  totalLineConsumption: number; // 线路消费总额(USD)
  totalConsumption: number; // 总消费(USD)
  avgConsumptionPerCall: number;
  consumptionByCustomer: Array<{
    customerName: string;
    aiConsumption: number;
    lineConsumption: number;
    totalConsumption: number;
    callCount: number;
  }>;
  consumptionTrend: Array<{
    date: string;
    aiConsumption: number;
    lineConsumption: number;
    totalConsumption: number;
  }>;
  topSpenders: Array<{
    customerName: string;
    totalConsumption: number;
    callCount: number;
    avgPerCall: number;
  }>;
}

export interface CostAnalysis {
  totalCost: number; // AI总成本(USD)
  costBreakdown: {
    asrCost: number;
    ttsCost: number;
    llmCost: number;
  };
  avgCostPerCall: number;
  costEfficiency: number; // 成本效率：收入/成本比
  costByCustomer: Array<{
    customerName: string;
    totalCost: number;
    breakdown: {
      asrCost: number;
      ttsCost: number;
      llmCost: number;
    };
    callCount: number;
  }>;
  profitability: Array<{
    customerName: string;
    revenue: number; // AI消费
    cost: number;
    profit: number;
    margin: number; // 利润率
  }>;
}

export interface ComprehensiveAnalysis {
  usage: UsageAnalysis;
  consumption: ConsumptionAnalysis;
  cost: CostAnalysis;
  summary: {
    totalRecords: number;
    dateRange: { start: string; end: string };
    topCustomer: string;
    mostUsedFlow: string;
    peakHour: number;
    overallProfitMargin: number;
  };
}

/**
 * 解析CSV文件内容
 */
export const parseCSVFile = async (file: File): Promise<BillRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV文件格式不正确，至少需要表头和一行数据');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const records: BillRecord[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length === 0 || values.every(v => !v.trim())) {
            continue; // 跳过空行
          }
          
          const record = mapCSVToRecord(headers, values);
          if (record) {
            records.push(record);
          }
        }
        
        resolve(records);
      } catch (error) {
        reject(new Error(`CSV解析失败: ${error instanceof Error ? error.message : '未知错误'}`));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'utf-8');
  });
};

/**
 * 解析Excel文件内容
 */
export const parseExcelFile = async (file: File): Promise<BillRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          throw new Error('Excel文件格式不正确，至少需要表头和一行数据');
        }
        
        const headers = jsonData[0] as string[];
        const records: BillRecord[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const values = jsonData[i];
          if (!values || values.length === 0 || values.every(v => v === null || v === undefined || v === '')) {
            continue; // 跳过空行
          }
          
          const record = mapCSVToRecord(headers, values.map(v => String(v || '')));
          if (record) {
            records.push(record);
          }
        }
        
        resolve(records);
      } catch (error) {
        reject(new Error(`Excel解析失败: ${error instanceof Error ? error.message : '未知错误'}`));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsBinaryString(file);
  });
};

/**
 * 解析CSV行，支持引号包围的字段
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // 转义的引号
        current += '"';
        i += 2;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  result.push(current.trim());
  return result;
};

/**
 * 将CSV/Excel数据映射为BillRecord对象
 */
const mapCSVToRecord = (headers: string[], values: string[]): BillRecord | null => {
  try {
    const record: any = {};
    
    // 字段映射表 - 支持中英文字段名
    const fieldMap: Record<string, string> = {
      '消费时间': 'feeTime',
      'Agent流程名称': 'agentFlowName',
      '用户号码': 'callee',
      '线路号码': 'caller',
      '呼叫方向': 'callDirection',
      '线路消费(USD)': 'sipTotalCustomerOriginalPriceUSD',
      'AI消费(USD)': 'customerTotalPriceUSD',
      'AI总成本': 'totalCost',
      '线路消费(原币种)': 'sipTotalCustomerOriginalPrice',
      'AI消费(原币种)': 'customerTotalPrice',
      '线路通话时长(秒)': 'sipCallDurationSec',
      'AI通话时长(秒)': 'callDurationSec',
      '线路计费时长(秒)': 'sipFeeDuration',
      'AI计费时长(秒)': 'feeDurationSec',
      '计费量': 'size',
      'ASR成本': 'asrCost',
      'TTS成本': 'ttsCost',
      'LLM成本': 'llmCost',
      '线路计费规则': 'sipPriceType',
      'AI计费规则': 'billingCycle',
      '客户名称': 'customerName',
      '团队名称': 'tenantName',
      // 英文字段名也支持
      'feeTime': 'feeTime',
      'agentFlowName': 'agentFlowName',
      'callee': 'callee',
      'caller': 'caller',
      'callDirection': 'callDirection',
      'sipTotalCustomerOriginalPriceUSD': 'sipTotalCustomerOriginalPriceUSD',
      'customerTotalPriceUSD': 'customerTotalPriceUSD',
      'totalCost': 'totalCost',
      'customerName': 'customerName',
      'tenantName': 'tenantName'
    };
    
    for (let i = 0; i < headers.length && i < values.length; i++) {
      const header = headers[i]?.trim();
      const value = values[i]?.trim();
      
      if (!header || value === undefined) continue;
      
      const fieldName = fieldMap[header] || header;
      
      // 数据类型转换
      if (['callDirection', 'sipCallDurationSec', 'callDurationSec', 'sipFeeDuration', 'feeDurationSec', 'size'].includes(fieldName)) {
        record[fieldName] = parseFloat(value) || 0;
      } else if (['sipTotalCustomerOriginalPriceUSD', 'customerTotalPriceUSD', 'totalCost', 'sipTotalCustomerOriginalPrice', 'customerTotalPrice', 'asrCost', 'ttsCost', 'llmCost'].includes(fieldName)) {
        record[fieldName] = parseFloat(value) || 0;
      } else if (fieldName === 'callDirection' && typeof value === 'string') {
        // 处理中文呼叫方向
        if (value === '呼出') record[fieldName] = 1;
        else if (value === '呼入') record[fieldName] = 2;
        else record[fieldName] = parseInt(value) || 0;
      } else {
        record[fieldName] = value;
      }
    }
    
    // 验证必要字段
    if (!record.feeTime || !record.customerName) {
      return null;
    }
    
    return record as BillRecord;
  } catch (error) {
    console.warn('记录映射失败:', error, headers, values);
    return null;
  }
};

/**
 * 用量分析
 */
export const analyzeUsage = (records: BillRecord[]): UsageAnalysis => {
  const totalCalls = records.length;
  const totalDuration = records.reduce((sum, r) => sum + (r.callDurationSec || 0), 0);
  const totalLineDuration = records.reduce((sum, r) => sum + (r.sipCallDurationSec || 0), 0);
  
  // 按呼叫方向统计
  const callsByDirection = {
    inbound: records.filter(r => r.callDirection === 2).length,
    outbound: records.filter(r => r.callDirection === 1).length
  };
  
  // 按时段统计
  const callsByTimeRange = Array.from({ length: 24 }, (_, hour) => {
    const count = records.filter(r => {
      const feeTime = r.feeTime;
      if (!feeTime) return false;
      const hourOfDay = dayjs(feeTime).hour();
      return hourOfDay === hour;
    }).length;
    return { hour, count };
  });
  
  // 热门流程统计
  const flowGroups = records.reduce((groups: Record<string, BillRecord[]>, record) => {
    const flowName = record.agentFlowName || 'unknown';
    if (!groups[flowName]) groups[flowName] = [];
    groups[flowName].push(record);
    return groups;
  }, {});
  
  const flowStats = Object.entries(flowGroups)
    .map(([flowName, group]) => ({
      flowName,
      count: group.length,
      duration: group.reduce((sum, r) => sum + (r.callDurationSec || 0), 0)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    totalCalls,
    totalDuration,
    totalLineDuration,
    avgCallDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
    avgLineDuration: totalCalls > 0 ? totalLineDuration / totalCalls : 0,
    callsByDirection,
    callsByTimeRange,
    topFlows: flowStats
  };
};

/**
 * 消费分析
 */
export const analyzeConsumption = (records: BillRecord[]): ConsumptionAnalysis => {
  const totalAIConsumption = records.reduce((sum, r) => sum + (r.customerTotalPriceUSD || 0), 0);
  const totalLineConsumption = records.reduce((sum, r) => sum + (r.sipTotalCustomerOriginalPriceUSD || 0), 0);
  const totalConsumption = totalAIConsumption + totalLineConsumption;
  
  // 按客户统计消费
  const customerGroups = records.reduce((groups: Record<string, BillRecord[]>, record) => {
    const customerName = record.customerName || 'unknown';
    if (!groups[customerName]) groups[customerName] = [];
    groups[customerName].push(record);
    return groups;
  }, {});
  
  const consumptionByCustomer = Object.entries(customerGroups)
    .map(([customerName, group]) => ({
      customerName,
      aiConsumption: group.reduce((sum, r) => sum + (r.customerTotalPriceUSD || 0), 0),
      lineConsumption: group.reduce((sum, r) => sum + (r.sipTotalCustomerOriginalPriceUSD || 0), 0),
      totalConsumption: group.reduce((sum, r) => sum + ((r.customerTotalPriceUSD || 0) + (r.sipTotalCustomerOriginalPriceUSD || 0)), 0),
      callCount: group.length
    }))
    .sort((a, b) => b.totalConsumption - a.totalConsumption);
  
  // 消费趋势（按日期）
  const dateGroups = records.reduce((groups: Record<string, BillRecord[]>, record) => {
    const date = record.feeTime ? dayjs(record.feeTime).format('YYYY-MM-DD') : 'unknown';
    if (!groups[date]) groups[date] = [];
    groups[date].push(record);
    return groups;
  }, {});
  
  const consumptionTrend = Object.entries(dateGroups)
    .map(([date, group]) => ({
      date,
      aiConsumption: group.reduce((sum, r) => sum + (r.customerTotalPriceUSD || 0), 0),
      lineConsumption: group.reduce((sum, r) => sum + (r.sipTotalCustomerOriginalPriceUSD || 0), 0),
      totalConsumption: group.reduce((sum, r) => sum + ((r.customerTotalPriceUSD || 0) + (r.sipTotalCustomerOriginalPriceUSD || 0)), 0)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // 消费排行榜
  const topSpenders = consumptionByCustomer
    .slice(0, 10)
    .map(customer => ({
      ...customer,
      avgPerCall: customer.callCount > 0 ? customer.totalConsumption / customer.callCount : 0
    }));
  
  return {
    totalAIConsumption,
    totalLineConsumption,
    totalConsumption,
    avgConsumptionPerCall: records.length > 0 ? totalConsumption / records.length : 0,
    consumptionByCustomer,
    consumptionTrend,
    topSpenders
  };
};

/**
 * 成本分析
 */
export const analyzeCost = (records: BillRecord[]): CostAnalysis => {
  const totalCost = records.reduce((sum, r) => sum + (r.totalCost || 0), 0);
  const asrCost = records.reduce((sum, r) => sum + (r.asrCost || 0), 0);
  const ttsCost = records.reduce((sum, r) => sum + (r.ttsCost || 0), 0);
  const llmCost = records.reduce((sum, r) => sum + (r.llmCost || 0), 0);
  
  const totalRevenue = records.reduce((sum, r) => sum + (r.customerTotalPriceUSD || 0), 0);
  
  // 按客户统计成本
  const costCustomerGroups = records.reduce((groups: Record<string, BillRecord[]>, record) => {
    const customerName = record.customerName || 'unknown';
    if (!groups[customerName]) groups[customerName] = [];
    groups[customerName].push(record);
    return groups;
  }, {});
  
  const costByCustomer = Object.entries(costCustomerGroups)
    .map(([customerName, group]) => ({
      customerName,
      totalCost: group.reduce((sum, r) => sum + (r.totalCost || 0), 0),
      breakdown: {
        asrCost: group.reduce((sum, r) => sum + (r.asrCost || 0), 0),
        ttsCost: group.reduce((sum, r) => sum + (r.ttsCost || 0), 0),
        llmCost: group.reduce((sum, r) => sum + (r.llmCost || 0), 0)
      },
      callCount: group.length
    }))
    .sort((a, b) => b.totalCost - a.totalCost);
  
  // 盈利能力分析
  const profitCustomerGroups = records.reduce((groups: Record<string, BillRecord[]>, record) => {
    const customerName = record.customerName || 'unknown';
    if (!groups[customerName]) groups[customerName] = [];
    groups[customerName].push(record);
    return groups;
  }, {});
  
  const profitability = Object.entries(profitCustomerGroups)
    .map(([customerName, group]) => {
      const revenue = group.reduce((sum, r) => sum + (r.customerTotalPriceUSD || 0), 0);
      const cost = group.reduce((sum, r) => sum + (r.totalCost || 0), 0);
      const profit = revenue - cost;
      return {
        customerName,
        revenue,
        cost,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0
      };
    })
    .sort((a, b) => b.profit - a.profit);
  
  return {
    totalCost,
    costBreakdown: {
      asrCost,
      ttsCost,
      llmCost
    },
    avgCostPerCall: records.length > 0 ? totalCost / records.length : 0,
    costEfficiency: totalCost > 0 ? totalRevenue / totalCost : 0,
    costByCustomer,
    profitability
  };
};

/**
 * 综合分析
 */
export const performComprehensiveAnalysis = (records: BillRecord[]): ComprehensiveAnalysis => {
  const usage = analyzeUsage(records);
  const consumption = analyzeConsumption(records);
  const cost = analyzeCost(records);
  
  // 汇总信息
  const dateRange = {
    start: records.length > 0 ? 
      records.reduce((earliest, record) => 
        !earliest || (record.feeTime && record.feeTime < earliest) ? record.feeTime || earliest : earliest, 
        '' as string
      ) : '',
    end: records.length > 0 ? 
      records.reduce((latest, record) => 
        !latest || (record.feeTime && record.feeTime > latest) ? record.feeTime || latest : latest, 
        '' as string
      ) : ''
  };
  
  const topCustomer = consumption.topSpenders[0]?.customerName || '';
  const mostUsedFlow = usage.topFlows[0]?.flowName || '';
  const peakHour = usage.callsByTimeRange.reduce((max, item) => 
    item.count > max.count ? item : max, { hour: 0, count: 0 }
  ).hour;
  const overallProfitMargin = cost.profitability.length > 0 ? 
    cost.profitability.reduce((sum, item) => sum + item.margin, 0) / cost.profitability.length : 0;
  
  return {
    usage,
    consumption,
    cost,
    summary: {
      totalRecords: records.length,
      dateRange,
      topCustomer,
      mostUsedFlow,
      peakHour,
      overallProfitMargin
    }
  };
};

/**
 * 合并多个文件的分析数据
 */
export const mergeAnalysisData = (dataList: BillRecord[][]): BillRecord[] => {
  const merged = dataList.flat();
  
  // 去重（基于关键字段）
  const uniqueMap = new Map<string, BillRecord>();
  merged.forEach(record => {
    const key = `${record.feeTime}_${record.callee}_${record.customerName}_${record.agentFlowName}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, record);
    }
  });
  
  return Array.from(uniqueMap.values());
};
