import * as XLSX from 'xlsx';

// AI账单数据类型定义 - 基于真实API数据结构
export interface AIBillItem {
  id: number;
  customerId: number;
  tenantId: number;
  customerName: string;
  tenantName: string;
  agentFlowName: string;
  callDirection: number;
  caller: string;
  callee: string;
  // AI 通话时长
  callDurationSec: number;
  // 线路通话时长
  sipCallDurationSec?: number;
  feeDurationSec: number;
  sipFeeDuration: number;
  billingCycle: string;
  sipPriceType: string;
  callId: string;
  size: number;
  customerPrice: number;
  customerTotalPrice: number;
  customerTotalPriceUSD: number;
  sipTotalCustomerOriginalPriceUSD: number;
  customerCurrency: string;
  callStartTime: string;
  callEndTime: string;
  callAnswerTime: string;
  feeTime: string;
  sipCurrency: string;
  sipTotalCustomerOriginalPrice: number;
  sipTotalCustomerPrice: number;
  allCustomerPriceUSD: number;
  asrCost: number;
  ttsCost: number | null;
  llmCost: number | null;
  totalCost: number;
  totalProfit: number;
}

// 列配置接口
interface ColumnConfig<T = any> {
  key: keyof AIBillItem;
  title: string;
  width: number;
  formatter?: (value: T) => string;
}

// Excel列配置 - 完全与BillTable.tsx中的列一致
const AI_BILL_COLUMNS: ColumnConfig[] = [
  { key: 'feeTime', title: '消费时间', width: 20, formatter: (value: string) => formatDateTime(value) },
  { key: 'agentFlowName', title: 'Agent流程名称', width: 25 },
  { key: 'callee', title: '用户号码', width: 15 },
  { key: 'caller', title: '线路号码', width: 15 },
  { key: 'callDirection', title: '呼叫方向', width: 12, formatter: (value: number) => value === 1 ? '呼出' : value === 2 ? '呼入' : '未知' },
  { key: 'sipTotalCustomerOriginalPriceUSD', title: '线路消费', width: 15, formatter: (value: number) => formatCurrency(value) },
  { key: 'customerTotalPriceUSD', title: 'AI消费', width: 15, formatter: (value: number) => formatCurrency(value) },
  { key: 'totalCost', title: 'AI总成本', width: 15, formatter: (value: number) => formatCurrency(value) },
  { key: 'sipCallDurationSec', title: '线路通话时长(秒)', width: 18 },
  { key: 'callDurationSec', title: 'AI通话时长(秒)', width: 17, formatter: (value: number) => (value || 0).toString() },
  { key: 'sipFeeDuration', title: '线路计费时长(秒)', width: 18 },
  { key: 'feeDurationSec', title: 'AI计费时长(秒)', width: 17 },
  { key: 'asrCost', title: 'ASR成本', width: 15, formatter: (value: number) => formatCurrency(value) },
  { key: 'ttsCost', title: 'TTS成本', width: 15, formatter: (value: number | null) => formatCurrency(value) },
  { key: 'llmCost', title: 'LLM成本', width: 15, formatter: (value: number | null) => formatCurrency(value) },
  { key: 'billingCycle', title: '线路计费规则', width: 15 },
  { key: 'sipPriceType', title: 'AI计费规则', width: 15 },
  { key: 'customerName', title: '客户名称', width: 30 },
  { key: 'tenantName', title: '团队名称', width: 20 }
];

/**
 * 格式化日期时间
 */
function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    return dateStr;
  }
}

/**
 * 格式化货币金额
 */
function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return 'USD\n0.00000000';
  return `USD\n${amount.toFixed(8)}`;
}

/**
 * 导出AI账单数据到Excel
 */
export function exportAIBillToExcel(
  data: AIBillItem[], 
  filename: string = 'AI账单导出',
  sheetName: string = 'AI账单'
): void {
  try {
    // 1. 准备表头
    const headers = AI_BILL_COLUMNS.map(col => col.title);
    
    // 2. 准备数据行
    const rows = data.map(item => {
      return AI_BILL_COLUMNS.map(col => {
        const value = item[col.key];
        // 应用格式化器
        return col.formatter ? col.formatter(value) : value;
      });
    });
    
    // 3. 合并表头和数据
    const sheetData = [headers, ...rows];
    
    // 4. 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    
    // 5. 设置列宽
    const colWidths = AI_BILL_COLUMNS.map(col => ({ wch: col.width }));
    worksheet['!cols'] = colWidths;
    
    // 6. 设置样式（表头加粗）
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "EFEFEF" } }
      };
    }
    
    // 7. 创建工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // 8. 生成文件名（包含时间戳）
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const finalFilename = `${filename}_${timestamp}.xlsx`;
    
    // 9. 下载文件
    XLSX.writeFile(workbook, finalFilename);
    
    console.log(`✅ Excel文件导出成功: ${finalFilename}`);
  } catch (error) {
    console.error('❌ Excel导出失败:', error);
    throw new Error(`Excel导出失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 批量导出AI账单（支持大数据量分页导出）
 */
export async function exportAIBillBatch(
  fetchDataFn: (pageNum: number, pageSize: number) => Promise<{ items: AIBillItem[], total: number }>,
  queryParams: Record<string, any>,
  filename: string = 'AI账单批量导出'
): Promise<void> {
  try {
    console.log('🔄 开始批量导出AI账单...');
    
    let allData: AIBillItem[] = [];
    let pageNum = 1;
    const pageSize = 1000; // 每页1000条记录
    let total = 0;
    
    // 第一次查询获取总数
    const firstPage = await fetchDataFn(pageNum, pageSize);
    total = firstPage.total;
    allData = [...firstPage.items];
    
    console.log(`📊 总记录数: ${total}, 预计需要 ${Math.ceil(total / pageSize)} 页`);
    
    // 如果还有更多数据，继续分页获取
    while (allData.length < total && firstPage.items.length === pageSize) {
      pageNum++;
      console.log(`📥 正在获取第 ${pageNum} 页数据...`);
      
      const pageData = await fetchDataFn(pageNum, pageSize);
      allData = [...allData, ...pageData.items];
      
      // 如果返回的数据少于pageSize，说明是最后一页
      if (pageData.items.length < pageSize) {
        break;
      }
    }
    
    console.log(`✅ 数据获取完成，共 ${allData.length} 条记录`);
    
    // 导出Excel
    exportAIBillToExcel(allData, filename);
    
  } catch (error) {
    console.error('❌ 批量导出失败:', error);
    throw error;
  }
}

/**
 * 根据查询条件导出AI账单
 */
export interface AIBillExportParams {
  customerId?: number;
  tenantId?: number;
  agentFlowName?: string;
  callee?: string;
  startTime?: string;
  endTime?: string;
}

export async function exportAIBillByQuery(
  apiCall: (params: AIBillExportParams & { pageNum: number, pageSize: number }) => Promise<{ data: { items: AIBillItem[], total: number } }>,
  queryParams: AIBillExportParams,
  filename?: string
): Promise<void> {
  
  const fetchDataFn = async (pageNum: number, pageSize: number) => {
    const response = await apiCall({
      ...queryParams,
      pageNum,
      pageSize
    });
    return response.data;
  };
  
  const exportFilename = filename || `AI账单导出_${queryParams.customerId || 'ALL'}_${new Date().toISOString().slice(0, 10)}`;
  
  await exportAIBillBatch(fetchDataFn, queryParams, exportFilename);
} 