import * as XLSX from 'xlsx';
import { DGConsumptionRecord } from '../types/dgConsumption';

const headerMap: Record<string, keyof DGConsumptionRecord | 'skip'> = {
  '时间': 'time',
  '代币消耗（M）': 'tokenConsumptionM',
  '代币消耗(M)': 'tokenConsumptionM',
  '消耗分钟': 'consumedMinutes',
  '每分钟消耗代币（K）': 'tokensPerMinuteK',
  '每分钟消耗代币(K)': 'tokensPerMinuteK',
  '通话数量(万)': 'callCountWan',
  '通话数量（万）': 'callCountWan',
  '总通话时长（小时）': 'totalTalkHours',
  '总通话时长(小时)': 'totalTalkHours',
  '平均通话时长（Sec）': 'avgTalkSeconds',
  '平均通话时长(Sec)': 'avgTalkSeconds',
  '利润率（%）': 'profitMarginPercent',
  '利润率(%)': 'profitMarginPercent',
  // 英文字段支持
  'time': 'time',
  'Time': 'time',
};

function normalizeHeader(h: string): string {
  return (h || '').trim();
}

function toNumber(v: any): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(/[,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

// 日期解析和标准化函数
function parseAndNormalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  
  const str = String(dateStr).trim();
  
  // 处理Excel序列号格式（如 45924）
  if (/^\d{5}$/.test(str)) {
    // Excel日期系统：1900年1月1日为第1天，但实际上Excel错误地认为1900年是闰年
    // 所以需要从1899年12月30日开始计算
    const excelEpoch = new Date(1899, 11, 30); // 1899年12月30日
    const days = parseInt(str);
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    
    // 使用本地时间格式化，避免时区问题
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // 处理常见日期格式
  let parsedDate: Date | null = null;
  
  // 尝试解析 MM/dd/yyyy 或 M/d/yyyy 格式
  const mmddyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // 尝试解析 yyyy/MM/dd 格式
  if (!parsedDate) {
    const yyyymmdd = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd;
      parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }
  
  // 尝试解析 yyyy-MM-dd 格式
  if (!parsedDate) {
    const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
      const [, year, month, day] = iso;
      parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }
  
  // 如果都解析失败，尝试直接用Date构造函数
  if (!parsedDate) {
    parsedDate = new Date(str);
  }
  
  // 验证日期有效性并格式化
  if (parsedDate && !isNaN(parsedDate.getTime())) {
    // 使用本地时间格式化，避免时区问题
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // 如果都失败了，返回原始字符串
  console.warn('无法解析日期:', str);
  return str;
}

export async function parseDGConsumptionExcel(file: File): Promise<Omit<DGConsumptionRecord, 'id'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string | ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        if (!Array.isArray(jsonData) || jsonData.length < 2) {
          throw new Error('Excel内容为空或缺少表头');
        }
        const headers = (jsonData[0] as any[]).map(h => normalizeHeader(String(h || '')));
        console.log('DG Excel 表头:', headers);

        const mappedIndexes: { idx: number; key: keyof DGConsumptionRecord }[] = [];
        headers.forEach((h, idx) => {
          const m = headerMap[h];
          if (m && m !== 'skip') {
            mappedIndexes.push({ idx, key: m });
            console.log(`映射字段: "${h}" -> ${m}`);
          } else {
            console.log(`未映射字段: "${h}"`);
          }
        });

        if (mappedIndexes.length === 0) {
          throw new Error(`未找到可识别的DG消费字段。表头: ${headers.join(', ')}`);
        }

        const results: Omit<DGConsumptionRecord, 'id'>[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === '')) continue;
          
          const rec: any = {
            time: '',
            tokenConsumptionM: 0,
            consumedMinutes: 0,
            tokensPerMinuteK: 0,
            callCountWan: 0,
            totalTalkHours: 0,
            avgTalkSeconds: 0,
            profitMarginPercent: 0
          };
          
          mappedIndexes.forEach(({ idx, key }) => {
            const val = row[idx];
            if (key === 'time') {
              rec[key] = parseAndNormalizeDate(String(val || ''));
            } else {
              rec[key] = toNumber(val);
            }
          });

          // 只要有时间和流程名称字段就认为是有效记录
          if (rec.time) {
            results.push(rec);
          }
        }
        resolve(results);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('DG消费Excel解析失败'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsBinaryString(file);
  });
}

export function mergeDGConsumptionData(dataList: Omit<DGConsumptionRecord, 'id'>[][]): Omit<DGConsumptionRecord, 'id'>[] {
  const map = new Map<string, Omit<DGConsumptionRecord, 'id'>>();
  dataList.flat().forEach(r => {
    const key = String(r.time);
    const prev = map.get(key);
    map.set(key, { ...(prev || {} as any), ...r });
  });
  return Array.from(map.values()).sort((a, b) => {
    return String(a.time).localeCompare(String(b.time));
  });
}


