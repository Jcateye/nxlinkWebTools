import React, { useEffect, useState } from 'react';
import { Layout, Card, Space, Button, message, Typography, Row, Col, Table, Modal, Form, Input, InputNumber, DatePicker, Upload, Popconfirm } from 'antd';
import { ReloadOutlined, PlusOutlined, DeleteOutlined, UploadOutlined, EditOutlined, InboxOutlined, ClearOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { parseDGConsumptionExcel, mergeDGConsumptionData } from '../services/dgConsumptionService';
import { dgHealth, dgList, dgImport, dgAdd, dgUpdate, dgDelete, dgClear } from '../services/dgConsumptionApi';
import { DGConsumptionRecord } from '../types/dgConsumption';
import DGConsumptionCharts from '../components/dg/DGConsumptionCharts';

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const { Dragger } = Upload;

const BillTrackingPage: React.FC = () => {
  // DG消费数据状态
  const [dgRecords, setDgRecords] = useState<DGConsumptionRecord[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<DGConsumptionRecord> | null>(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      await dgHealth().catch(() => null);
      const dgRes = await dgList();
      setDgRecords(dgRes.records || []);
    } catch (e: any) {
      message.error(`加载数据失败: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // DG消费Excel导入
  const handleImportDGExcel = async (files: File[]) => {
    if (files.length === 0) return;
    try {
      setImporting(true);
      const parsedList: Omit<DGConsumptionRecord, 'id'>[][] = [];
      for (const f of files) {
        console.log('开始解析DG文件:', f.name);
        const parsed = await parseDGConsumptionExcel(f);
        console.log('解析结果:', parsed);
        parsedList.push(parsed);
      }
      const merged = mergeDGConsumptionData(parsedList);
      console.log('合并后数据:', merged);
      const resp = await dgImport(merged, 'merge');
      message.success(`DG消费导入成功: 新增 ${resp.inserted}, 更新 ${resp.updated}`);
      await loadData();
    } catch (e: any) {
      console.error('DG导入错误:', e);
      message.error(`DG消费导入失败: ${e.message || e}`);
    } finally {
      setImporting(false);
    }
  };

  const openCreate = () => {
    setEditingRecord({ 
      time: dayjs().format('YYYY-MM-DD'),
      tokenConsumptionM: 0,
      consumedMinutes: 0,
      tokensPerMinuteK: 0,
      callCountWan: 0,
      totalTalkHours: 0,
      avgTalkSeconds: 0,
      profitMarginPercent: 0
    });
    setTimeout(() => {
      form.resetFields();
    }, 0);
    setEditModalVisible(true);
  };

  const openEdit = (rec: DGConsumptionRecord) => {
    console.log('打开编辑，数据:', rec);
    setEditingRecord(rec);
    setEditModalVisible(true);
    
    // 使用 setTimeout 确保 Form 已挂载
    setTimeout(() => {
      const fieldValues = {
        time: rec.time ? dayjs(rec.time) : null,
        tokenConsumptionM: rec.tokenConsumptionM,
        consumedMinutes: rec.consumedMinutes,
        tokensPerMinuteK: rec.tokensPerMinuteK,
        callCountWan: rec.callCountWan,
        totalTalkHours: rec.totalTalkHours,
        avgTalkSeconds: rec.avgTalkSeconds,
        profitMarginPercent: rec.profitMarginPercent,
      };
      console.log('设置表单值:', fieldValues);
      form.setFieldsValue(fieldValues);
    }, 100);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      console.log('表单值:', values);
      
      const payload: Partial<DGConsumptionRecord> = {
        ...editingRecord,
        ...values,
        time: values.time ? values.time.format('YYYY-MM-DD') : undefined,
      };
      
      console.log('编辑记录:', editingRecord);
      console.log('保存数据:', payload);
      
      const recordId = editingRecord && (editingRecord as any).id;
      if (recordId) {
        // 更新现有记录
        console.log('更新ID为', recordId, '的记录');
        await dgUpdate(recordId, payload);
        message.success('更新成功');
      } else {
        // 创建新记录
        console.log('创建新记录');
        await dgAdd(payload as Omit<DGConsumptionRecord, 'id'>);
        message.success('创建成功');
      }
      
      setEditModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
      console.log('重新加载数据');
      await loadData();
    } catch (e: any) {
      if (e?.errorFields) return; // 表单校验错误
      console.error('保存错误:', e);
      message.error(`保存失败: ${e.message || e}`);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的记录');
      return;
    }
    await dgDelete(selectedRowKeys as number[]);
    message.success('删除成功');
    setSelectedRowKeys([]);
    await loadData();
  };

  const handleClearAll = async () => {
    Modal.confirm({
      title: '确认清空所有DG消费记录?',
      content: '此操作不可恢复，请谨慎操作。',
      okType: 'danger',
      onOk: async () => {
        await dgClear();
        await loadData();
        message.success('已清空所有数据');
      }
    });
  };

  // 上传配置
  const uploadProps = {
    name: 'file',
    multiple: true,
    accept: '.xlsx,.xls',
    showUploadList: false,
    beforeUpload: (file: File) => {
      handleImportDGExcel([file]);
      return false; // 阻止默认上传
    },
    onDrop(e: React.DragEvent<HTMLDivElement>) {
      const files = Array.from(e.dataTransfer.files);
      handleImportDGExcel(files);
    },
  };

  // 表格列定义
  const columns = [
    { 
      title: '时间', 
      dataIndex: 'time', 
      key: 'time', 
      width: 110,
      sorter: (a: DGConsumptionRecord, b: DGConsumptionRecord) => {
        const dateA = new Date(a.time);
        const dateB = new Date(b.time);
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return dateA.getTime() - dateB.getTime();
        }
        return a.time.localeCompare(b.time);
      },
      defaultSortOrder: 'ascend' as const,
    },
    { 
      title: '代币消耗(M)', 
      dataIndex: 'tokenConsumptionM', 
      key: 'tokenConsumptionM', 
      width: 110,
      render: (val: number) => val?.toFixed(2) || '0.00',
      sorter: (a: DGConsumptionRecord, b: DGConsumptionRecord) => (a.tokenConsumptionM || 0) - (b.tokenConsumptionM || 0),
    },
    { 
      title: '消耗分钟', 
      dataIndex: 'consumedMinutes', 
      key: 'consumedMinutes', 
      width: 100,
      render: (val: number) => val?.toString() || '0',
      sorter: (a: DGConsumptionRecord, b: DGConsumptionRecord) => (a.consumedMinutes || 0) - (b.consumedMinutes || 0),
    },
    { 
      title: '每分钟代币(K)', 
      dataIndex: 'tokensPerMinuteK', 
      key: 'tokensPerMinuteK', 
      width: 130,
      render: (val: number) => val?.toFixed(3) || '0.000',
      sorter: (a: DGConsumptionRecord, b: DGConsumptionRecord) => (a.tokensPerMinuteK || 0) - (b.tokensPerMinuteK || 0),
    },
    { 
      title: '通话数量(万)', 
      dataIndex: 'callCountWan', 
      key: 'callCountWan', 
      width: 110,
      render: (val: number) => val?.toFixed(2) || '0.00',
      sorter: (a: DGConsumptionRecord, b: DGConsumptionRecord) => (a.callCountWan || 0) - (b.callCountWan || 0),
    },
    { 
      title: '通话时长(小时)', 
      dataIndex: 'totalTalkHours', 
      key: 'totalTalkHours', 
      width: 130,
      render: (val: number) => val?.toFixed(1) || '0.0',
      sorter: (a: DGConsumptionRecord, b: DGConsumptionRecord) => (a.totalTalkHours || 0) - (b.totalTalkHours || 0),
    },
    { 
      title: '平均通话时长(秒)', 
      dataIndex: 'avgTalkSeconds', 
      key: 'avgTalkSeconds', 
      width: 140,
      render: (val: number) => val?.toString() || '0',
      sorter: (a: DGConsumptionRecord, b: DGConsumptionRecord) => (a.avgTalkSeconds || 0) - (b.avgTalkSeconds || 0),
    },
    { 
      title: '利润率(%)', 
      dataIndex: 'profitMarginPercent', 
      key: 'profitMarginPercent', 
      width: 110,
      render: (val: number) => {
        const color = val >= 70 ? '#52c41a' : val >= 50 ? '#faad14' : '#ff4d4f';
        return <span style={{ color, fontWeight: 'bold' }}>{val?.toFixed(2) || '0.00'}%</span>;
      },
      sorter: (a: DGConsumptionRecord, b: DGConsumptionRecord) => (a.profitMarginPercent || 0) - (b.profitMarginPercent || 0),
    },
    { 
      title: '操作', 
      key: 'action', 
      fixed: 'right' as const, 
      width: 120, 
      render: (_: any, rec: DGConsumptionRecord) => (
        <Space>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEdit(rec)}>
            编辑
          </Button>
        </Space>
      )
    },
  ];

  return (
    <Content>
      <div style={{ padding: 12 }}>
        <Row gutter={24}>
          <Col span={24}>
            <Card 
              title="DG消费数据追踪（长期趋势分析）" 
              extra={
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
                    重新加载
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    新增记录
                  </Button>
                  <Popconfirm title="确认删除选中记录?" onConfirm={handleBatchDelete} okType="danger">
                    <Button danger icon={<DeleteOutlined />} disabled={selectedRowKeys.length === 0}>
                      批量删除
                    </Button>
                  </Popconfirm>
                  <Button danger icon={<ClearOutlined />} onClick={handleClearAll}>
                    清空全部
                  </Button>
                </Space>
              }
            >
              <Paragraph style={{ marginBottom: 16 }}>
                支持从 Excel 导入DG消费数据，支持手动新增/编辑/删除，数据存储于服务端JSON文件并在重启后可恢复。
                可用于长期对代币消耗、通话数量、利润率、通话时长等维度进行趋势分析。
              </Paragraph>

              {/* 文件上传区域 */}
              <Card title="📁 数据导入" style={{ marginBottom: 24 }}>
                <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽Excel文件到此区域上传</p>
                  <p className="ant-upload-hint">
                    支持 .xlsx, .xls 格式的DG消费数据文件，自动解析时间、代币消耗、通话数量、利润率等字段
                  </p>
                </Dragger>
              </Card>

              {/* 数据表格 */}
              <Card title="📊 数据列表" style={{ marginBottom: 24 }}>
                <Table
                  rowKey="id"
                  dataSource={dgRecords}
                  columns={columns}
                  size="small"
                  scroll={{ x: 1400 }}
                  loading={loading || importing}
                  rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                  pagination={{ 
                    pageSize: 20, 
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
                  }}
                />
              </Card>

              {/* 趋势分析图表 */}
              <DGConsumptionCharts records={dgRecords} loading={loading} />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 编辑/新增对话框 */}
      <Modal
        title={editingRecord && (editingRecord as any).id ? '编辑DG消费记录' : '新增DG消费记录'}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={handleSave}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="时间" name="time" rules={[{ required: true, message: '请选择时间' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="代币消耗(M)" name="tokenConsumptionM">
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="消耗分钟" name="consumedMinutes">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="每分钟消耗代币(K)" name="tokensPerMinuteK">
                <InputNumber min={0} precision={3} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="通话数量(万)" name="callCountWan">
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="总通话时长(小时)" name="totalTalkHours">
                <InputNumber min={0} precision={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="平均通话时长(秒)" name="avgTalkSeconds">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="利润率(%)" name="profitMarginPercent">
                <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Content>
  );
};

export default BillTrackingPage;