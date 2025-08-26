// 基于 /apiDemo/open_api/nxai-bot-0729.openapi.json 抽取的必要类型

export interface OpenApiPageQuery {
  pageNumber: number;
  pageSize: number;
}

export interface TaskListQuery extends OpenApiPageQuery {
  createEndTs?: number;
  createStartTs?: number;
  maxCallsAnsweredRate?: number;
  maxTaskTotalQuantity?: number;
  minCallsAnsweredRate?: number;
  minTaskTotalQuantity?: number;
  taskName?: string;
  taskStatus?: number;
}

export interface CallRecordQuery extends OpenApiPageQuery {
  callId?: string;
  callResult?: number;
  endTs?: number;
  maxElapsed?: number;
  minElapsed?: number;
  phone?: string;
  startTs?: number;
  taskId?: string;
  userIntent?: string;
}

export interface CallInfoItemParam {
  name: string;
  value: string;
}

export interface CallAppendItem {
  contactId?: string;
  name?: string;
  params?: CallInfoItemParam[];
  phoneNumber: string;
}

export interface CallAppendCmd {
  autoFlowId?: number;
  countryCode?: string;
  taskId: string;
  tenantId?: number;
  list: CallAppendItem[];
}

export interface OrderDeleteCmd {
  contactId: string;
  taskId: string;
}

export interface PageResp<T> {
  code: number;
  list: T[];
  message?: string;
  pageNumber: number;
  pageSize: number;
  total: number;
  traceId?: string;
}

// 通用响应包装：服务端实际返回 { code, message, data, traceId }
export interface ApiWrap<T> {
  code: number;
  message?: string;
  data: T;
  traceId?: string;
}

export interface CallTaskInfoVO {
  taskId: string;
  taskName: string;
  taskStatus: number;
  autoFlowId?: number;
  autoFlowName?: string;
  createTs?: number;
  // 根据实际API响应添加的字段
  agentGroupId?: string;
  importType?: number;
  maxCall?: number;
  maxRingTime?: number;
  orderMaxCall?: number;
  pauseReason?: number;
  replayInterval?: number;
  routeId?: string;
  shutdownAt?: number;
  startupAt?: number;
  startupBy?: string;
  startupType?: number;
  strategyId?: string;
  taskCallbackUrl?: string;
  taskDesc?: string;
  taskKeep?: number;
  userTaskId?: string;
  weekDay?: string;
  zoneSecond?: number;
  funcFlag?: number;
  id?: number;
  // 统计信息相关字段
  statInfo?: {
    answerCallCount?: number;
    answerOrderCount?: number;
    answerRate?: string;
    avgCallDuration?: number;
    avgManualDuration?: number;
    dialProgress?: string;
    dialedOrderCount?: number;
    finishOrderCount?: number;
    finishRate?: string;
    manualAnswerCount?: number;
    manualAnswerRate?: string;
    manualElapsed?: number;
    manualFailCount?: number;
    totalCallCount?: number;
    totalCallElapsed?: number;
    totalOrderCount?: number;
  };
}

export interface CallRecordDetail {
  callId: string;
  taskId: string;
  calleePhone?: string;
  callElapsed?: number;
  callResult?: number;
  createTs?: number;
  contactId?: string;
  userIntent?: string;
}


