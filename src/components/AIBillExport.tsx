import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Card, 
  message, 
  Tooltip,
  Tag,
  Spin,
  Alert
} from 'antd';
import { 
  DownloadOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  ExportOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ColumnsType } from 'antd/es/table';
import { AIBillItem } from '../utils/excelExport';
import { 
  queryAIBill, 
  queryCompanyByName, 
  queryTenantByCompanyId,
  exportAIBillData,
  CompanyInfo,
  TenantInfo
} from '../services/aiBillApi';
import { exportAIBillByQuery } from '../utils/excelExport';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 表格列定义
const columns: ColumnsType<AIBillItem> = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    fixed: 'left'
  },
  {
    title: '客户名称',
    dataIndex: 'customerName',
    key: 'customerName',
    width: 200,
    ellipsis: {
      showTitle: false,
    },
    render: (text) => (
      <Tooltip placement="topLeft" title={text}>
        {text}
      </Tooltip>
    ),
  },
  {
    title: '租户名称',
    dataIndex: 'tenantName',
    key: 'tenantName',
    width: 120,
  },
  {
    title: 'AI流程名称',
    dataIndex: 'agentFlowName',
    key: 'agentFlowName',
    width: 180,
    ellipsis: {
      showTitle: false,
    },
    render: (text) => (
      <Tooltip placement="topLeft" title={text}>
        {text}
      </Tooltip>
    ),
  },
  {
    title: '呼叫方向',
    dataIndex: 'callDirection',
    key: 'callDirection',
    width: 100,
    render: (value: number) => (
      <Tag color={value === 1 ? 'green' : 'blue'}>
        {value === 1 ? '呼出' : '呼入'}
      </Tag>
    ),
  },
  {
    title: '主叫号码',
    dataIndex: 'caller',
    key: 'caller',
    width: 130,
  },
  {
    title: '被叫号码',
    dataIndex: 'callee',
    key: 'callee',
    width: 130,
  },
  {
    title: '通话时长(秒)',
    dataIndex: 'callDurationSec',
    key: 'callDurationSec',
    width: 120,
    render: (value: number) => value || 0,
  },
  {
    title: '计费时长(秒)',
    dataIndex: 'feeDurationSec',
    key: 'feeDurationSec',
    width: 120,
    render: (value: number) => value || 0,
  },
  {
    title: '计费周期',
    dataIndex: 'billingCycle',
    key: 'billingCycle',
    width: 100,
  },
  {
    title: '开始时间',
    dataIndex: 'callStartTime',
    key: 'callStartTime',
    width: 180,
    render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    title: '结束时间',
    dataIndex: 'callEndTime',
    key: 'callEndTime',
    width: 180,
    render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    title: '客户总价(USD)',
    dataIndex: 'customerTotalPriceUSD',
    key: 'customerTotalPriceUSD',
    width: 140,
    render: (value: number) => `$${value.toFixed(8)}`,
  },
  {
    title: 'ASR成本',
    dataIndex: 'asrCost',
    key: 'asrCost',
    width: 120,
    render: (value: number) => `$${value.toFixed(8)}`,
  },
  {
    title: 'TTS成本',
    dataIndex: 'ttsCost',
    key: 'ttsCost',
    width: 120,
    render: (value: number | null) => `$${(value || 0).toFixed(8)}`,
  },
  {
    title: 'LLM成本',
    dataIndex: 'llmCost',
    key: 'llmCost',
    width: 120,
    render: (value: number | null) => `$${(value || 0).toFixed(8)}`,
  },
  {
    title: '总成本',
    dataIndex: 'totalCost',
    key: 'totalCost',
    width: 120,
    render: (value: number) => `$${value.toFixed(8)}`,
  },
  {
    title: '总利润',
    dataIndex: 'totalProfit',
    key: 'totalProfit',
    width: 120,
    render: (value: number) => (
      <span style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f' }}>
        ${value.toFixed(8)}
      </span>
    ),
  },
];

export const AIBillExport: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<AIBillItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<number | undefined>();

  // 加载公司列表
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const companyList = await queryCompanyByName();
      setCompanies(companyList);
    } catch (error) {
      console.error('加载公司列表失败:', error);
      message.error('加载公司列表失败');
    }
  };

  // 根据公司ID加载租户列表
  const loadTenants = async (companyId: number) => {
    try {
      const tenantList = await queryTenantByCompanyId(companyId);
      setTenants(tenantList);
    } catch (error) {
      console.error('加载租户列表失败:', error);
      message.error('加载租户列表失败');
    }
  };

  // 处理公司选择变化
  const handleCompanyChange = (companyId: number) => {
    setSelectedCompany(companyId);
    form.setFieldsValue({ tenantId: undefined });
    setTenants([]);
    if (companyId) {
      loadTenants(companyId);
    }
  };

  // 查询数据
  const handleSearch = async (page = 1, size = pageSize) => {
    setLoading(true);
    try {
      const formValues = await form.validateFields();
      const timeRange = formValues.timeRange;
      
      const params = {
        pageNum: page,
        pageSize: size,
        customerId: selectedCompany,
        tenantId: formValues.tenantId,
        agentFlowName: formValues.agentFlowName,
        callee: formValues.callee,
        startTime: timeRange?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
        endTime: timeRange?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
      };

      const response = await queryAIBill(params);
      setData(response.data.items);
      setTotal(response.data.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('查询失败:', error);
      message.error('查询失败，请检查参数');
    } finally {
      setLoading(false);
    }
  };

  // 导出Excel
  const handleExport = async () => {
    setExporting(true);
    try {
      const formValues = await form.validateFields();
      const timeRange = formValues.timeRange;
      
      const queryParams = {
        customerId: selectedCompany,
        tenantId: formValues.tenantId,
        agentFlowName: formValues.agentFlowName,
        callee: formValues.callee,
        startTime: timeRange?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
        endTime: timeRange?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
      };

      // 获取当前公司名称用于文件名
      const selectedCompanyInfo = companies.find(c => c.customerId === selectedCompany);
      const companyName = selectedCompanyInfo?.companyName?.replace(/[^\w\s-]/g, '') || 'ALL';
      const filename = `AI账单导出_${companyName}_${dayjs().format('YYYY-MM-DD')}`;

      await exportAIBillByQuery(exportAIBillData, queryParams, filename);
      message.success('Excel文件导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  // 重置表单
  const handleReset = () => {
    form.resetFields();
    setSelectedCompany(undefined);
    setTenants([]);
    setData([]);
    setTotal(0);
    setCurrentPage(1);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title="AI账单查询与导出" style={{ marginBottom: '16px' }}>
        <Alert
          message="功能说明"
          description="此功能可以查询AI账单数据并导出为Excel文件。导出的Excel列和数据完全与当前列表一致，支持大数据量分页导出。"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        
        <Form
          form={form}
          layout="inline"
          style={{ marginBottom: '16px' }}
          onFinish={() => handleSearch(1)}
        >
          <Form.Item
            label="客户公司"
            name="customerId"
          >
            <Select
              placeholder="请选择客户公司"
              style={{ width: 300 }}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
              onChange={handleCompanyChange}
              allowClear
              options={companies.map(company => ({
                value: company.customerId,
                label: company.companyName
              }))}
            />
          </Form.Item>

          <Form.Item
            label="租户"
            name="tenantId"
          >
            <Select
              placeholder="请选择租户"
              style={{ width: 200 }}
              disabled={!selectedCompany}
              allowClear
              options={tenants.map(tenant => ({
                value: tenant.id,
                label: tenant.name
              }))}
            />
          </Form.Item>

          <Form.Item
            label="AI流程名称"
            name="agentFlowName"
          >
            <Input placeholder="AI流程名称" style={{ width: 200 }} />
          </Form.Item>

          <Form.Item
            label="被叫号码"
            name="callee"
          >
            <Input placeholder="被叫号码" style={{ width: 150 }} />
          </Form.Item>

          <Form.Item
            label="时间范围"
            name="timeRange"
          >
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              placeholder={['开始时间', '结束时间']}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                icon={<SearchOutlined />} 
                htmlType="submit"
                loading={loading}
              >
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
              <Button 
                type="primary" 
                icon={<ExportOutlined />} 
                onClick={handleExport}
                loading={exporting}
                disabled={total === 0}
              >
                导出Excel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title={`查询结果 (共 ${total} 条记录)`}>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 2000 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `显示 ${range[0]}-${range[1]} 条记录，共 ${total} 条`,
            onChange: (page, size) => {
              setPageSize(size || 10);
              handleSearch(page, size);
            }
          }}
          rowKey="id"
          size="small"
        />
      </Card>
    </div>
  );
}; 