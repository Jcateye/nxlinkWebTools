import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// DG消费追踪数据目录和文件路径
const DG_DATA_DIR = path.join(__dirname, '../../data');
const DG_FILE = path.join(DG_DATA_DIR, 'dg-consumption.json');

// 确保数据目录存在
function ensureDgDir() {
  if (!fs.existsSync(DG_DATA_DIR)) {
    fs.mkdirSync(DG_DATA_DIR, { recursive: true });
  }
}

// 读取DG消费存储
function readDgStore() {
  try {
    ensureDgDir();
    
    if (!fs.existsSync(DG_FILE)) {
      const initStore = {
        records: [],
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(DG_FILE, JSON.stringify(initStore, null, 2), 'utf8');
      return initStore;
    }
    
    const raw = fs.readFileSync(DG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e: any) {
    console.error('读取DG消费存储失败:', e.message);
    throw e;
  }
}

// 写入DG消费存储
function writeDgStore(store: any) {
  try {
    ensureDgDir();
    fs.writeFileSync(DG_FILE, JSON.stringify(store, null, 2), 'utf8');
    return true;
  } catch (e: any) {
    console.error('写入DG消费存储失败:', e.message);
    return false;
  }
}

// 健康检查端点
router.get('/health', (req, res) => {
  res.json({ ok: true, file: DG_FILE });
});

// 获取DG消费数据
router.get('/data', (req, res) => {
  try {
    const store = readDgStore();
    res.json({ 
      success: true, 
      updatedAt: store.updatedAt, 
      total: store.records.length, 
      records: store.records 
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 导入DG消费数据
router.post('/import', (req, res) => {
  try {
    const { records, strategy = 'merge' } = req.body;
    
    if (!Array.isArray(records)) {
      res.status(400).json({ success: false, message: 'records must be an array' });
      return;
    }
    
    const store = readDgStore();
    let inserted = 0;
    let updated = 0;
    
    if (strategy === 'replace') {
      store.records = records;
      inserted = records.length;
    } else {
      // merge strategy
      for (const record of records) {
        const existingIndex = store.records.findIndex((r: any) => r.id === record.id);
        if (existingIndex >= 0) {
          store.records[existingIndex] = { ...store.records[existingIndex], ...record };
          updated++;
        } else {
          store.records.push(record);
          inserted++;
        }
      }
    }
    
    store.updatedAt = new Date().toISOString();
    
    if (writeDgStore(store)) {
      res.json({
        success: true,
        inserted,
        updated,
        total: store.records.length,
        updatedAt: store.updatedAt
      });
    } else {
      res.status(500).json({ success: false, message: 'Failed to save data' });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 添加单条DG消费记录
router.post('/add', (req, res) => {
  try {
    const record = req.body;
    
    if (!record) {
      res.status(400).json({ success: false, message: 'Record data is required' });
      return;
    }
    
    const store = readDgStore();
    
    // 生成ID（如果没有提供）
    if (!record.id) {
      record.id = `dg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    store.records.push(record);
    store.updatedAt = new Date().toISOString();
    
    if (writeDgStore(store)) {
      res.json({
        success: true,
        record,
        total: store.records.length,
        updatedAt: store.updatedAt
      });
    } else {
      res.status(500).json({ success: false, message: 'Failed to save data' });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 更新DG消费记录
router.put('/update/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (!id) {
      res.status(400).json({ success: false, message: 'Record ID is required' });
      return;
    }
    
    const store = readDgStore();
    const recordIndex = store.records.findIndex((r: any) => r.id === id);
    
    if (recordIndex === -1) {
      res.status(404).json({ success: false, message: 'Record not found' });
      return;
    }
    
    store.records[recordIndex] = { ...store.records[recordIndex], ...updates };
    store.updatedAt = new Date().toISOString();
    
    if (writeDgStore(store)) {
      res.json({
        success: true,
        record: store.records[recordIndex],
        updatedAt: store.updatedAt
      });
    } else {
      res.status(500).json({ success: false, message: 'Failed to save data' });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 删除DG消费记录
router.delete('/delete', (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: 'ids must be a non-empty array' });
      return;
    }
    
    const store = readDgStore();
    const originalLength = store.records.length;
    
    store.records = store.records.filter((r: any) => !ids.includes(r.id));
    store.updatedAt = new Date().toISOString();
    
    const deletedCount = originalLength - store.records.length;
    
    if (writeDgStore(store)) {
      res.json({
        success: true,
        deleted: deletedCount,
        total: store.records.length,
        updatedAt: store.updatedAt
      });
    } else {
      res.status(500).json({ success: false, message: 'Failed to save data' });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 清空所有DG消费数据
router.post('/clear', (req, res) => {
  try {
    const store = {
      records: [],
      updatedAt: new Date().toISOString()
    };
    
    if (writeDgStore(store)) {
      res.json({
        success: true,
        message: 'All data cleared',
        updatedAt: store.updatedAt
      });
    } else {
      res.status(500).json({ success: false, message: 'Failed to clear data' });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
