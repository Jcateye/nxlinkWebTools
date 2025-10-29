import axios from 'axios';
import { BillRecord } from '../types/bill';

export interface BillTrackingImportResp {
  success: boolean;
  total: number;
  inserted: number;
  updated: number;
  updatedAt: string;
}

export interface BillTrackingListResp {
  success: boolean;
  updatedAt: string;
  total: number;
  records: BillRecord[];
}

const BASE = '/local/bill-tracking';

export async function btHealth(): Promise<{ ok: boolean; file: string }>{
  const res = await axios.get(`${BASE}/health`);
  return res.data;
}

export async function btList(params?: { offset?: number; limit?: number }): Promise<BillTrackingListResp> {
  const res = await axios.get(`${BASE}/data`, { params });
  return res.data;
}

export async function btImport(records: BillRecord[], strategy: 'merge' | 'replace' = 'merge'): Promise<BillTrackingImportResp> {
  const res = await axios.post(`${BASE}/import`, { records, strategy });
  return res.data;
}

export async function btAdd(record: Partial<BillRecord>): Promise<{ success: boolean; id: number; updatedAt: string }>{
  const res = await axios.post(`${BASE}/add`, record);
  return res.data;
}

export async function btUpdate(id: number, partial: Partial<BillRecord>): Promise<{ success: boolean; updatedAt: string }>{
  const res = await axios.put(`${BASE}/update/${id}`, partial);
  return res.data;
}

export async function btDelete(ids: number[]): Promise<{ success: boolean; removed: number; total: number; updatedAt: string }>{
  const res = await axios.delete(`${BASE}/delete`, { data: { ids } });
  return res.data;
}

export async function btClear(): Promise<{ success: boolean; total: number; updatedAt: string }>{
  const res = await axios.post(`${BASE}/clear`);
  return res.data;
}



