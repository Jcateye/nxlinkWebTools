import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Space, message, DatePicker, Select, Tag, Breadcrumb, Row, Col, Statistic, Result } from 'antd';
import { SearchOutlined, ReloadOutlined, HomeOutlined, PhoneOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

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

interface ApiKeyItem {
  apiKey: string;
  alias: string;
  description: string;
  hasOpenApiConfig: boolean;
  openApiBaseUrl: string;
  bizType: string;
}

export default function OpenApiActivityPage() {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<CallTaskInfoVO[]>([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [page, setPage] = useState({ pageNumber: 1, pageSize: 10 });

  // 权限验证
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // API Key 配置相关
  const [availableApiKeys, setAvailableApiKeys] = useState<ApiKeyItem[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);

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

  // 加载可用的 API Key 列表
  const loadApiKeys = async () => {
    setApiKeyLoading(true);
    try {
      const response = await fetch('/internal-api/keys/list');
      const result = await response.json();
      
      if (result.code === 200) {
        const validKeys = result.data.keys.filter((key: ApiKeyItem) => key.hasOpenApiConfig);
        setAvailableApiKeys(validKeys);
        
        // 检查URL参数中的apiKey
        const urlParams = new URLSearchParams(window.location.search);
        const apiKeyParam = urlParams.get('apiKey');
        
        if (apiKeyParam && validKeys.some(key => key.apiKey === apiKeyParam)) {
          // 如果URL参数中的API Key存在且有效，使用它
          setSelectedApiKey(apiKeyParam);
        } else if (validKeys.length > 0 && !selectedApiKey) {
          // 否则自动选择第一个可用的 API Key
          setSelectedApiKey(validKeys[0].apiKey);
        }
      } else {
        message.error(`加载API Key列表失败: ${result.message}`);
      }
    } catch (error: any) {
      message.error(`加载API Key列表失败: ${error.message}`);
    } finally {
      setApiKeyLoading(false);
    }
  };

  const loadTasks = async () => {
    // 如果没有选择API Key，不加载数据
    if (!selectedApiKey) {
      return;
    }

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
      
      const data = await getCallTaskList(params, selectedApiKey);
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

  // 权限验证
  useEffect(() => {
    const checkAuthorization = () => {
      const authToken = sessionStorage.getItem('openapi_activity_auth');
      if (authToken) {
        try {
          const authData = JSON.parse(authToken);
          const now = new Date().getTime();
          // 检查令牌是否在30分钟内有效
          if (authData.timestamp && now - authData.timestamp < 30 * 60 * 1000) {
            setIsAuthorized(true);
          } else {
            // 令牌已过期
            sessionStorage.removeItem('openapi_activity_auth');
            setIsAuthorized(false);
          }
        } catch {
          setIsAuthorized(false);
        }
      } else {
        setIsAuthorized(false);
      }
      setAuthChecking(false);
    };

    checkAuthorization();
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      loadApiKeys();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (selectedApiKey && isAuthorized) {
      loadTasks();
    }
  }, [page.pageNumber, page.pageSize, selectedApiKey, isAuthorized]);

  // 当API Key改变时，重置页面并重新加载数据
  const handleApiKeyChange = (apiKey: string) => {
    setSelectedApiKey(apiKey);
    setPage({ pageNumber: 1, pageSize: 10 });
    setTasks([]);
    setTaskTotal(0);
  };

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
      
      const data = await getCallRecords(params, selectedApiKey);
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

          const resp = await appendNumbers(cmd, selectedApiKey);
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
        const resp = await deleteNumber({ taskId: currentTask.taskId, contactId: record.contactId }, selectedApiKey);
        if (resp?.code === 0 || resp?.code === 200) {
          message.success('删除成功');
          await loadRecords(currentTask, recordsPage.pageNumber, recordsPage.pageSize);
        } else { message.error(resp?.message || '删除失败'); }
      }
    });
  };

  // 权限检查中
  if (authChecking) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Card loading>
          正在验证访问权限...
        </Card>
      </div>
    );
  }

  // 未授权访问
  if (!isAuthorized) {
    return (
      <div style={{ padding: '50px' }}>
        <Result
          status="403"
          title="403"
          subTitle="抱歉，您没有权限访问此页面"
          icon={<LockOutlined style={{ color: '#ff4d4f' }} />}
          extra={
            <Space direction="vertical" size="large">
              <div>请通过 API Key 管理页面的"查看活动"功能访问</div>
              <Button 
                type="primary" 
                onClick={() => {
                  // 跳转到API Key管理页面
                  const url = new URL(window.location.href);
                  url.searchParams.delete('apiKey');
                  url.searchParams.set('menu', 'apikey-management');
                  window.history.pushState({}, '', url.toString());
                  window.dispatchEvent(new CustomEvent('navigate-menu', { 
                    detail: { key: 'apikey-management' } 
                  }));
                }}
              >
                前往 API Key 管理
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {!detailVisible ? (
        <Card title="OpenAPI 活动管理">
          {/* API Key 数据源配置 */}
          <Card 
            title="数据源配置" 
            size="small" 
            style={{ marginBottom: 16, backgroundColor: '#f8f9fa' }}
            extra={
              <Button 
                type="link" 
                size="small" 
                onClick={() => {
                  // 跳转到当前项目内的 API Key 管理页面
                  const url = new URL(window.location.href);
                  url.searchParams.delete('collaboration');
                  // 模拟左侧菜单切换：追加查询参数 key=apikey-management
                  window.history.pushState({}, '', `${url.pathname}?menu=apikey-management`);
                  // 触发一个自定义事件让 App.tsx 切换菜单（保持解耦）
                  window.dispatchEvent(new CustomEvent('navigate-menu', { detail: { key: 'apikey-management' } }));
                }}
              >
                管理API Key
              </Button>
            }
          >
            <Space align="center" style={{ width: '100%' }}>
              <span style={{ fontWeight: 'bold', color: '#1890ff' }}>选择数据源:</span>
              <Select
                value={selectedApiKey}
                onChange={handleApiKeyChange}
                loading={apiKeyLoading}
                placeholder="请选择API Key数据源"
                style={{ minWidth: 250 }}
                allowClear={false}
              >
                {availableApiKeys.map(key => (
                  <Option key={key.apiKey} value={key.apiKey}>
                    <Space>
                      <Tag color="blue">{key.alias}</Tag>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {key.description || '无描述'}
                      </span>
                      <span style={{ fontSize: '10px', color: '#999' }}>
                        ({key.openApiBaseUrl})
                      </span>
                    </Space>
                  </Option>
                ))}
              </Select>
              {selectedApiKey && (
                <Tag color="success">
                  已连接: {availableApiKeys.find(k => k.apiKey === selectedApiKey)?.alias || '未知'}
                </Tag>
              )}
              {!selectedApiKey && availableApiKeys.length === 0 && (
                <Tag color="warning">无可用的API Key配置</Tag>
              )}
            </Space>
          </Card>

          {/* 旧的手动鉴权表单已移除，统一使用上方"数据源配置"的API Key */}
          
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


