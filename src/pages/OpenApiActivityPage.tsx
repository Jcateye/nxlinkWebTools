import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Space, message, DatePicker, Select, Tag, Breadcrumb, Row, Col, Statistic } from 'antd';
import { SearchOutlined, ReloadOutlined, HomeOutlined, PhoneOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import OpenApiAuthForm from '../components/openapi/OpenApiAuthForm';
import ConfigTest from '../components/openapi/ConfigTest';
import { fixApiUrl } from '../utils/apiHelper';
import { generateContactIdFromPhone } from '../utils/id';
import DynamicTableEditor from '../components/openapi/DynamicTableEditor';
import {
  getCallTaskList,
  getCallRecords,
  appendNumbers,
  deleteNumber,
} from '../services/openApiService';
import { CallAppendCmd, CallRecordDetail, CallTaskInfoVO } from '../types/openApi';

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function OpenApiActivityPage() {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<CallTaskInfoVO[]>([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [page, setPage] = useState({ pageNumber: 1, pageSize: 10 });

  // 筛选条件
  const [searchForm] = Form.useForm();
  const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [taskNameSearch, setTaskNameSearch] = useState('');

  const [detailVisible, setDetailVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState<CallTaskInfoVO | null>(null);
  const [records, setRecords] = useState<CallRecordDetail[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState({ pageNumber: 1, pageSize: 10 });

  // 详情页筛选条件
  const [detailForm] = Form.useForm();
  const [phoneSearch, setPhoneSearch] = useState('');
  const [callResult, setCallResult] = useState<number | undefined>();

  const [appendVisible, setAppendVisible] = useState(false);
  const [appendForm] = Form.useForm<{ countryCode?: string; autoFlowId?: number }>();
  const [tableData, setTableData] = useState<Array<{ key: string; phoneNumber: string; [key: string]: any }>>([]);

  // 解析批量粘贴的表格内容：第一行列名，包含 Phone Number/phone/手机号，其余列作为变量
  const parsePastedTable = (raw: string): { phone: string; params: { name: string; value: string }[] }[] => {
    const text = raw.trim();
    if (!text) return [];
    const rows = text.split(/\r?\n/).filter(r => r.trim().length > 0);
    if (rows.length < 2) return [];
    const delimiter = rows[0].includes('\t') ? '\t' : ',';
    const headers = rows[0].split(delimiter).map(h => h.trim());
    // 查找号码列
    const phoneIdx = headers.findIndex(h => /^(phone\s*number|phone|手机号|number)$/i.test(h));
    const varHeaders = headers
      .map((h, idx) => ({ name: h, idx }))
      .filter(h => h.idx !== phoneIdx);
    const items: { phone: string; params: { name: string; value: string }[] }[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(delimiter);
      const phone = (phoneIdx >= 0 ? cols[phoneIdx] : cols[0] || '').trim();
      if (!phone) continue;
      const params = varHeaders
        .map(h => ({ name: h.name, value: (cols[h.idx] || '').trim() }))
        .filter(p => p.name && p.value);
      items.push({ phone, params });
    }
    return items;
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params: any = { ...page };
      
      // 添加时间范围筛选
      if (timeRange) {
        params.createStartTs = Math.floor(timeRange[0].valueOf() / 1000);
        params.createEndTs = Math.floor(timeRange[1].valueOf() / 1000);
      }
      
      // 添加任务名称筛选
      if (taskNameSearch.trim()) {
        params.taskName = taskNameSearch.trim();
      }
      
      const data = await getCallTaskList(params);
      console.log('API返回数据:', data); // 调试日志
      setTasks(data.list || []);
      setTaskTotal(data.total || 0);
    } catch (e: any) {
      message.error(e.message || '加载任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage({ ...page, pageNumber: 1 });
    loadTasks();
  };

  const handleReset = () => {
    setTimeRange(null);
    setTaskNameSearch('');
    searchForm.resetFields();
    setPage({ pageNumber: 1, pageSize: 10 });
  };

  useEffect(() => { loadTasks(); }, [page.pageNumber, page.pageSize]);

  const openDetail = async (task: CallTaskInfoVO) => {
    setCurrentTask(task);
    setDetailVisible(true);
    await loadRecords(task, 1, recordsPage.pageSize);
  };

  const loadRecords = async (task: CallTaskInfoVO, pageNumber: number, pageSize: number) => {
    try {
      const params: any = { taskId: task.taskId, pageNumber, pageSize };
      
      // 添加详情页筛选条件
      if (phoneSearch.trim()) {
        params.phone = phoneSearch.trim();
      }
      if (callResult !== undefined) {
        params.callResult = callResult;
      }
      
      const data = await getCallRecords(params);
      setRecords(data.list || []);
      setRecordsTotal(data.total || 0);
      setRecordsPage({ pageNumber, pageSize });
    } catch (e: any) {
      message.error(e.message || '加载外呼记录失败');
    }
  };

  const handleDetailSearch = () => {
    if (currentTask) {
      loadRecords(currentTask, 1, recordsPage.pageSize);
    }
  };

  const handleDetailReset = () => {
    setPhoneSearch('');
    setCallResult(undefined);
    detailForm.resetFields();
    if (currentTask) {
      loadRecords(currentTask, 1, recordsPage.pageSize);
    }
  };

  const submitAppend = async () => {
    try {
      const values = await appendForm.validateFields();
      if (!currentTask) return;
      
      // 验证表格数据
      const validRows = tableData.filter(row => row.phoneNumber?.trim());
      if (validRows.length === 0) {
        message.warning('请至少输入一个有效的手机号');
        return;
      }

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      // 每行数据单独调用API
      for (const row of validRows) {
        try {
          // 构建params数组，排除key和phoneNumber
          const params = Object.entries(row)
            .filter(([key, value]) => key !== 'key' && key !== 'phoneNumber' && value?.trim())
            .map(([name, value]) => ({ name, value: String(value) }));

          const cmd: CallAppendCmd = {
            taskId: currentTask.taskId,
            autoFlowId: values.autoFlowId,
            countryCode: values.countryCode,
            list: [{
              contactId: generateContactIdFromPhone(row.phoneNumber),
              phoneNumber: row.phoneNumber,
              name: row.phoneNumber, // 使用手机号作为名称
              params
            }]
          };

          const resp = await appendNumbers(cmd);
          if (resp?.code === 0 || resp?.code === 200) {
            successCount++;
          } else {
            failCount++;
            errors.push(`${row.phoneNumber}: ${resp?.message || '未知错误'}`);
          }
        } catch (error: any) {
          failCount++;
          errors.push(`${row.phoneNumber}: ${error.message}`);
        }
      }

      // 显示结果
      if (successCount > 0 && failCount === 0) {
        message.success(`成功追加 ${successCount} 个号码`);
      } else if (successCount > 0 && failCount > 0) {
        message.warning(`成功追加 ${successCount} 个号码，失败 ${failCount} 个`);
        console.error('追加失败的号码:', errors);
      } else {
        message.error('所有号码追加失败');
        console.error('追加失败的号码:', errors);
      }

      setAppendVisible(false);
      appendForm.resetFields();
      setTableData([]);
      await loadRecords(currentTask, recordsPage.pageNumber, recordsPage.pageSize);
    } catch (error: any) {
      message.error(`追加号码失败: ${error.message}`);
    }
  };

  const doDelete = async (record: CallRecordDetail) => {
    Modal.confirm({
      title: '确认删除该号码？',
      onOk: async () => {
        if (!currentTask || !record.contactId) return;
        const resp = await deleteNumber({ taskId: currentTask.taskId, contactId: record.contactId });
        if (resp?.code === 0 || resp?.code === 200) {
          message.success('删除成功');
          await loadRecords(currentTask, recordsPage.pageNumber, recordsPage.pageSize);
        } else { message.error(resp?.message || '删除失败'); }
      }
    });
  };

  return (
    <div>
      {!detailVisible ? (
        <Card title="OpenAPI 活动管理">
          <OpenApiAuthForm onSaved={() => loadTasks()} />
          
          {/* 配置测试组件 - 开发时使用，生产环境可以隐藏 */}
          {process.env.NODE_ENV === 'development' && <ConfigTest />}
          
          {/* 筛选条件 */}
          <Form form={searchForm} layout="inline" style={{ marginBottom: 16 }}>
            <Form.Item label="输入任务名称">
              <Input 
                placeholder="输入任务名称" 
                value={taskNameSearch}
                onChange={e => setTaskNameSearch(e.target.value)}
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="选择时间范围">
              <RangePicker 
                value={timeRange}
                onChange={setTimeRange}
                showTime
                format="YYYY-MM-DD HH:mm:ss"
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  搜索
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
                <Button 
                  onClick={() => {
                    console.log('当前任务数据:', tasks);
                    console.log('任务总数:', taskTotal);
                    if (tasks.length > 0) {
                      console.log('第一个任务详情:', tasks[0]);
                    }
                  }}
                >
                  调试数据
                </Button>
              </Space>
            </Form.Item>
          </Form>

          <Table
            rowKey={r => r.taskId}
            loading={loading}
            dataSource={tasks}
            pagination={{
              current: page.pageNumber,
              pageSize: page.pageSize,
              total: taskTotal,
              onChange: (pn, ps) => setPage({ pageNumber: pn, pageSize: ps }),
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`
            }}
            columns={[
              { title: '任务名称', dataIndex: 'taskName', width: 200 },
              { title: 'AI Agent', dataIndex: 'autoFlowName', width: 150 },
              { 
                title: '任务状态', 
                dataIndex: 'taskStatus', 
                width: 100,
                render: (status: number) => {
                  const statusMap: Record<number, { text: string; color: string }> = {
                    1: { text: '未开始', color: 'default' },
                    2: { text: '进行中', color: 'processing' },
                    3: { text: '已完成', color: 'success' },
                    5: { text: '已暂停', color: 'warning' },
                  };
                  const config = statusMap[status] || { text: '未知', color: 'default' };
                  return <Tag color={config.color}>{config.text}</Tag>;
                }
              },
              { 
                title: '客户总数', 
                width: 100,
                render: (_, record) => record.statInfo?.totalOrderCount || '-'
              },
              { 
                title: '外呼进度', 
                width: 100,
                render: (_, record) => record.statInfo?.dialProgress || '-'
              },
              { 
                title: '已呼数', 
                width: 100,
                render: (_, record) => record.statInfo?.dialedOrderCount || '-'
              },
              { 
                title: '外呼效数', 
                width: 100,
                render: (_, record) => record.statInfo?.totalCallCount || '-'
              },
              { 
                title: '接通数', 
                width: 100,
                render: (_, record) => record.statInfo?.answerCallCount || '-'
              },
              { 
                title: '接通率', 
                width: 100,
                render: (_, record) => record.statInfo?.answerRate || '-'
              },
              { 
                title: '任务创建时间', 
                dataIndex: 'createTs', 
                width: 180,
                render: (ts: number) => ts ? dayjs(ts * 1000).format('YYYY-MM-DD HH:mm:ss') : '-'
              },
              {
                title: '操作',
                width: 120,
                fixed: 'right',
                render: (_, record) => (
                  <Space>
                    <Button size="small" type="link" onClick={() => openDetail(record)}>
                      详情
                    </Button>
                  </Space>
                )
              }
            ]}
            scroll={{ x: 1400 }}
          />
        </Card>
      ) : (
        // 详情页面
        <Card>
          <Breadcrumb style={{ marginBottom: 16 }}>
            <Breadcrumb.Item>
              <HomeOutlined />
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <Button type="link" onClick={() => setDetailVisible(false)} style={{ padding: 0 }}>
                语音通道
              </Button>
            </Breadcrumb.Item>
            <Breadcrumb.Item>任务详情</Breadcrumb.Item>
          </Breadcrumb>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Statistic title="任务名称" value={currentTask?.taskName || '-'} />
            </Col>
            <Col span={6}>
              <Statistic title="AI Agent" value={currentTask?.autoFlowName || '-'} />
            </Col>
            <Col span={6}>
              <Statistic title="Task ID" value={currentTask?.taskId || '-'} />
            </Col>
            <Col span={6}>
              <Space>
                <Button type="primary" onClick={() => setAppendVisible(true)}>
                  任务配置
                </Button>
                <Button icon={<ReloadOutlined />} onClick={() => currentTask && loadRecords(currentTask, recordsPage.pageNumber, recordsPage.pageSize)}>
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>

          {/* 详情页筛选条件 */}
          <Form form={detailForm} layout="inline" style={{ marginBottom: 16 }}>
            <Form.Item label="被叫号码">
              <Input 
                placeholder="请输入号码" 
                value={phoneSearch}
                onChange={e => setPhoneSearch(e.target.value)}
                style={{ width: 150 }}
              />
            </Form.Item>
            <Form.Item label="通话结果">
              <Select 
                placeholder="请选择结果"
                value={callResult}
                onChange={setCallResult}
                style={{ width: 120 }}
                allowClear
              >
                <Option value={1}>接通</Option>
                <Option value={2}>未接通</Option>
                <Option value={3}>忙线</Option>
                <Option value={4}>关机</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleDetailSearch}>
                  搜索
                </Button>
                <Button onClick={handleDetailReset}>重置</Button>
                <Button onClick={() => setAppendVisible(true)}>导出明细</Button>
              </Space>
            </Form.Item>
          </Form>

          <Table
            rowKey={r => r.callId}
            dataSource={records}
            pagination={{
              current: recordsPage.pageNumber,
              pageSize: recordsPage.pageSize,
              total: recordsTotal,
              onChange: (pn, ps) => currentTask && loadRecords(currentTask, pn, ps || 10),
              showSizeChanger: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`
            }}
            columns={[
              { title: '被叫号码', dataIndex: 'calleePhone', width: 140 },
              { 
                title: '通话状态', 
                dataIndex: 'callResult', 
                width: 100,
                render: (result: number) => {
                  const resultMap: Record<number, { text: string; color: string }> = {
                    1: { text: '完成通话', color: 'success' },
                    2: { text: '用户挂断', color: 'warning' },
                    3: { text: '忙线', color: 'error' },
                    4: { text: '关机', color: 'error' }
                  };
                  const config = resultMap[result] || { text: '未知', color: 'default' };
                  return <Tag color={config.color}>{config.text}</Tag>;
                }
              },
              { title: '接听原因', dataIndex: 'hangupReason', width: 120 },
              { 
                title: '通话时长', 
                dataIndex: 'callElapsed', 
                width: 100,
                render: (elapsed: number) => elapsed ? `${elapsed}秒` : '-'
              },
              { title: '备注', dataIndex: 'userIntent', width: 100 },
              { 
                title: '通话录音', 
                width: 220,
                render: (_, record) => (
                  record.callAudioUrl ? (
                    <audio
                      controls
                      preload="none"
                      src={fixApiUrl(record.callAudioUrl)}
                      style={{ width: 200 }}
                    />
                  ) : '-'
                )
              },
              { 
                title: '操作时间', 
                dataIndex: 'createTs', 
                width: 160,
                render: (ts: number) => ts ? dayjs(ts * 1000).format('YYYY-MM-DD HH:mm:ss') : '-'
              },
              { title: '通话原因', dataIndex: 'callSummary', width: 120 },
              { title: '结果', dataIndex: 'callStatus', width: 80 },
              {
                title: '操作',
                width: 120,
                render: (_, record) => (
                  <Space>
                    <Button danger size="small" onClick={() => doDelete(record)} disabled={!record.contactId}>
                      删除号码
                    </Button>
                  </Space>
                )
              }
            ]}
            scroll={{ x: 1200 }}
          />
        </Card>
      )}



      <Modal
        open={appendVisible}
        title="任务追加号码"
        onCancel={() => {
          setAppendVisible(false);
          setTableData([]);
          appendForm.resetFields();
        }}
        onOk={submitAppend}
        width={800}
        style={{ top: 20 }}
      >
        <Form form={appendForm} layout="vertical">
          <Form.Item label="国家码(可选)" name="countryCode">
            <Input placeholder="如 86" />
          </Form.Item>
          <Form.Item label="机器人ID(可选)" name="autoFlowId">
            <Input placeholder="autoFlowId" />
          </Form.Item>
          <Form.Item label="号码和变量信息">
            <DynamicTableEditor
              value={tableData}
              onChange={setTableData}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


