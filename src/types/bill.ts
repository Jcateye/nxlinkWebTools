// 账单相关类型定义

// 公司信息类型
export interface Company {
  id: number;
  customerId: number;
  customerCode: string;
  companyName: string;
}

// 团队信息类型
export interface Team {
  id: number;
  name: string;
}

// 账单记录类型
export interface BillRecord {
  id: number;
  customerId: number;
  tenantId: number;
  customerName: string;
  tenantName: string;
  agentFlowName: string;
  callDirection: number;
  caller: string;
  callee: string;
  callDurationSec: number;
  feeDurationSec: number;
  billingCycle: string;
  callId: string;
  size: number;
  customerPrice: number;
  customerTotalPrice: number;
  customerTotalPriceUSD: number;
  customerCurrency: string;
  callStartTime: string;
  callEndTime: string;
  callAnswerTime: string;
  feeTime: string;
  sipCurrency: string;
  sipFeeDuration: number;
  sipPriceType: string;
  sipTotalCustomerOriginalPrice: number;
  sipTotalCustomerOriginalPriceUSD: number;
  sipTotalCustomerPrice: number;
  allCustomerPriceUSD: number;
  asrCost: number;
  ttsCost: number | null;
  llmCost: number | null;
  totalCost: number;
  totalProfit: number;
  // 新增计算字段
  originalLineUnitPrice?: number; // 原线路单价
  newLineBillingCycle?: string; // 新线路计费周期
  newLineUnitPrice?: number; // 新线路单价
  newLineBillingQuantity?: number; // 新线路计费量
  newLineConsumption?: number; // 新线路消费
}

// 账单查询响应类型
export interface BillQueryResponse {
  code: number;
  message: string;
  traceId: string;
  data: {
    total: number;
    items: BillRecord[];
    pageNum: number;
    pageSize: number;
  };
}

// 公司查询响应类型
export interface CompanyQueryResponse {
  code: number;
  message: string | null;
  data: Company[];
  traceId: string;
}

// 团队查询响应类型
export interface TeamQueryResponse {
  code: number;
  message: string | null;
  data: Team[];
  traceId: string;
}

// 账单查询参数类型
export interface BillQueryParams {
  pageNum: number;
  pageSize: number;
  customerId: number;
  tenantId: number;
  agentFlowName?: string;
  callee?: string;
  startTime: string;
  endTime: string;
}

// 账单筛选条件类型
export interface BillFilters {
  companyNameQuery: string;
  selectedCompany: Company | null;
  selectedTeam: Team | null;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  timeRange: {
    start: string | null;
    end: string | null;
  };
  agentFlowName: string;
  userNumber: string;
  // 新增的高级筛选条件
  advancedFilters: {
    // 字符串模糊筛选
    customerName: string;
    tenantName: string;
    userNumber: string;
    caller: string;
    callId: string;
    billingCycle: string;
    customerCurrency: string;
    // 数字范围筛选
    callDurationRange: {
      min: number | null;
      max: number | null;
    };
    feeDurationRange: {
      min: number | null;
      max: number | null;
    };
    customerPriceRange: {
      min: number | null;
      max: number | null;
    };
    customerTotalPriceRange: {
      min: number | null;
      max: number | null;
    };
    asrCostRange: {
      min: number | null;
      max: number | null;
    };
    ttsCostRange: {
      min: number | null;
      max: number | null;
    };
    llmCostRange: {
      min: number | null;
      max: number | null;
    };
    totalCostRange: {
      min: number | null;
      max: number | null;
    };
    totalProfitRange: {
      min: number | null;
      max: number | null;
    };
    sizeRange: {
      min: number | null;
      max: number | null;
    };
    // 呼叫方向筛选
    callDirection: number | null;
  };
  // 自定义线路单价
  customLineUnitPrice: number | null;
}

// 分页信息类型
export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

// 账单用户参数类型
export interface BillUserParams {
  authorization: string;
}

// 呼叫方向枚举
export enum CallDirection {
  OUTGOING = 1, // 呼出
  INCOMING = 2  // 呼入
}

// 呼叫方向显示文本映射
export const CALL_DIRECTION_TEXT: Record<number, string> = {
  [CallDirection.OUTGOING]: '呼出',
  [CallDirection.INCOMING]: '呼入'
};

// 账单表格列配置类型
export interface BillTableColumn {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
  fixed?: 'left' | 'right';
  render?: (value: any, record: BillRecord) => React.ReactNode;
} 