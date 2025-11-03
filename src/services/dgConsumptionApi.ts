import axios from 'axios';
import { DGConsumptionRecord } from '../types/dgConsumption';

const BASE = '/local/dg-consumption';

export interface DGListResp {
  success: boolean;
  updatedAt: string;
  total: number;
  records: DGConsumptionRecord[];
}

export async function dgHealth(): Promise<{ ok: boolean; file: string }>{
  const res = await axios.get(`${BASE}/health`);
  return res.data;
}

export async function dgList(): Promise<DGListResp> {
  const res = await axios.get(`${BASE}/data`);
  return res.data;
}

export async function dgImport(records: Omit<DGConsumptionRecord, 'id'>[], strategy: 'merge' | 'replace' = 'merge'): Promise<{ success: boolean; inserted: number; updated: number; total: number; updatedAt: string }>{
  const res = await axios.post(`${BASE}/import`, { records, strategy });
  return res.data;
}

export async function dgAdd(record: Omit<DGConsumptionRecord, 'id'>): Promise<{ success: boolean; id: number; updatedAt: string }>{
  const res = await axios.post(`${BASE}/add`, record);
  return res.data;
}

export async function dgUpdate(id: number, partial: Partial<DGConsumptionRecord>): Promise<{ success: boolean; updatedAt: string }>{
  const res = await axios.put(`${BASE}/update/${id}`, partial);
  return res.data;
}

export async function dgDelete(ids: number[]): Promise<{ success: boolean; removed: number; total: number; updatedAt: string }>{
  const res = await axios.delete(`${BASE}/delete`, { data: { ids } });
  return res.data;
}

export async function dgClear(): Promise<{ success: boolean; total: number; updatedAt: string }>{
  const res = await axios.post(`${BASE}/clear`);
  return res.data;
}

export async function dgArchive(ids: number[]): Promise<{ success: boolean; archived: number; total: number; updatedAt: string }>{
  const res = await axios.post(`${BASE}/archive`, { ids });
  return res.data;
}

export async function dgRestore(ids: number[]): Promise<{ success: boolean; restored: number; total: number; updatedAt: string }>{
  const res = await axios.post(`${BASE}/restore`, { ids });
  return res.data;
}



