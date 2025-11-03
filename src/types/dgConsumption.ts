export interface DGConsumptionRecord {
  id: number;
  time: string; // 时间（可为日期或月份字符串）
  tokenConsumptionM: number; // 代币消耗（M）
  consumedMinutes: number; // 消耗分钟
  tokensPerMinuteK: number; // 每分钟消耗代币（K）
  callCountWan: number; // 通话数量(万)
  totalTalkHours: number; // 总通话时长（小时）
  avgTalkSeconds: number; // 平均通话时长（Sec）
  profitMarginPercent: number; // 利润率（%）
  archived?: boolean; // 是否归档（true=归档, false=删除但保留, 不存在或undefined=未删除）
}



