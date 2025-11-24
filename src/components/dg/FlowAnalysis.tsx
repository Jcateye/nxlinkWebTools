import React from 'react';
import { Card, Row, Col, Statistic, Table, Progress, Tag, Space, Divider, Typography, Select, Tabs } from 'antd';
import {
  DollarOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  LineChartOutlined,
  RiseOutlined,
  FallOutlined,
  TrophyOutlined,
  BarChartOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import { DGConsumptionRecord } from '../../types/dgConsumption';
import { Line, Bar, Pie } from '@ant-design/charts';

const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

interface FlowAnalysisProps {
  records: DGConsumptionRecord[];
  loading?: boolean;
}

const FlowAnalysis: React.FC<FlowAnalysisProps> = ({ records, loading = false }) => {
  if (!records || records.length === 0) {
    return (
      <Card>
        <Paragraph>暂无DG消费数据可按流程分析。请先导入包含流程名称的数据。</Paragraph>
      </Card>
    );
  }

  // 获取所有流程名称
  const flowNames = Array.from(new Set(records.map(r => r.flowName).filter(name => name && name.trim())));

  if (flowNames.length === 0) {
    return (
      <Card>
        <Paragraph>暂无流程数据可分析。请确保导入的数据包含流程名称字段。</Paragraph>
      </Card>
    );
  }

  // 按流程分组数据
  const flowData = flowNames.map(flowName => {
    const flowRecords = records.filter(r => r.flowName === flowName);
    const totalTokensM = flowRecords.reduce((sum, r) => sum + (r.tokenConsumptionM || 0), 0);
    const totalMinutes = flowRecords.reduce((sum, r) => sum + (r.consumedMinutes || 0), 0);
    const totalCallsWan = flowRecords.reduce((sum, r) => sum + (r.callCountWan || 0), 0);
    const totalTalkHours = flowRecords.reduce((sum, r) => sum + (r.totalTalkHours || 0), 0);
    const avgProfitMargin = flowRecords.length > 0 ?
      flowRecords.reduce((sum, r) => sum + (r.profitMarginPercent || 0), 0) / flowRecords.length : 0;

    // 计算成本（假设代币消耗可以转换为成本，这里简化处理）
    const estimatedCost = totalTokensM * 0.1; // 假设每M代币成本0.1美元
    const revenue = estimatedCost / (1 - avgProfitMargin / 100);

    return {
      flowName,
      recordCount: flowRecords.length,
      totalTokensM,
      totalMinutes,
      totalCallsWan,
      totalTalkHours,
      avgProfitMargin,
      estimatedCost,
      revenue,
      profit: revenue - estimatedCost
    };
  });

  // 排序：按总代币消耗降序
  flowData.sort((a, b) => b.totalTokensM - a.totalTokensM);

  // 格式化数值
  const formatNumber = (num: number, decimals = 2): string => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  // 用量对比数据
  const usageComparisonData = flowData.map(flow => ({
    flowName: flow.flowName,
    totalTokensM: flow.totalTokensM,
    totalMinutes: flow.totalMinutes,
    totalCallsWan: flow.totalCallsWan,
    totalTalkHours: flow.totalTalkHours
  }));

  // 消费对比数据
  const costComparisonData = flowData.map(flow => ({
    flowName: flow.flowName,
    estimatedCost: flow.estimatedCost,
    revenue: flow.revenue,
    profit: flow.profit
  }));

  // 利润率对比数据
  const profitMarginData = flowData.map(flow => ({
    flowName: flow.flowName,
    avgProfitMargin: flow.avgProfitMargin
  }));

  // 流程效率分析
  const efficiencyData = flowData.map(flow => ({
    flowName: flow.flowName,
    tokensPerMinute: flow.totalMinutes > 0 ? (flow.totalTokensM * 1000) / flow.totalMinutes : 0,
    callsPerHour: flow.totalTalkHours > 0 ? (flow.totalCallsWan * 10000) / flow.totalTalkHours : 0,
    avgTalkSeconds: records.filter(r => r.flowName === flow.flowName).reduce((sum, r) => sum + (r.avgTalkSeconds || 0), 0) /
                   records.filter(r => r.flowName === flow.flowName).length || 0
  }));

  return (
    <div>
      <Card title="🔄 流程分析总览" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="流程数量"
              value={flowNames.length}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="数据记录总数"
              value={records.length}
              prefix={<LineChartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均利润率"
              value={flowData.reduce((sum, f) => sum + f.avgProfitMargin, 0) / flowData.length}
              precision={2}
              suffix="%"
              prefix={flowData.reduce((sum, f) => sum + f.avgProfitMargin, 0) / flowData.length >= 50 ? <RiseOutlined /> : <FallOutlined />}
              valueStyle={{ color: flowData.reduce((sum, f) => sum + f.avgProfitMargin, 0) / flowData.length >= 50 ? '#3f8600' : '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总代币消耗"
              value={flowData.reduce((sum, f) => sum + f.totalTokensM, 0)}
              precision={2}
              suffix="M"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="comparison" type="card">
        <TabPane tab="📊 流程对比分析" key="comparison">
          <Row gutter={24}>
            <Col span={24}>
              <Card title="各流程汇总对比" style={{ marginBottom: 24 }}>
                <Table
                  dataSource={flowData}
                  rowKey="flowName"
                  size="small"
                  scroll={{ x: 1200 }}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    {
                      title: '流程名称',
                      dataIndex: 'flowName',
                      key: 'flowName',
                      fixed: 'left',
                      width: 150,
                      render: (val) => <Tag color="blue">{val}</Tag>
                    },
                    {
                      title: '记录数',
                      dataIndex: 'recordCount',
                      key: 'recordCount',
                      width: 80,
                      sorter: (a, b) => a.recordCount - b.recordCount,
                    },
                    {
                      title: '总代币消耗(M)',
                      dataIndex: 'totalTokensM',
                      key: 'totalTokensM',
                      width: 120,
                      render: (val) => formatNumber(val, 2),
                      sorter: (a, b) => a.totalTokensM - b.totalTokensM,
                    },
                    {
                      title: '总消耗分钟',
                      dataIndex: 'totalMinutes',
                      key: 'totalMinutes',
                      width: 110,
                      render: (val) => formatNumber(val, 0),
                      sorter: (a, b) => a.totalMinutes - b.totalMinutes,
                    },
                    {
                      title: '总通话数量(万)',
                      dataIndex: 'totalCallsWan',
                      key: 'totalCallsWan',
                      width: 130,
                      render: (val) => formatNumber(val, 2),
                      sorter: (a, b) => a.totalCallsWan - b.totalCallsWan,
                    },
                    {
                      title: '总通话时长(小时)',
                      dataIndex: 'totalTalkHours',
                      key: 'totalTalkHours',
                      width: 140,
                      render: (val) => formatNumber(val, 1),
                      sorter: (a, b) => a.totalTalkHours - b.totalTalkHours,
                    },
                    {
                      title: '平均利润率(%)',
                      dataIndex: 'avgProfitMargin',
                      key: 'avgProfitMargin',
                      width: 130,
                      render: (val) => {
                        const color = val >= 70 ? '#52c41a' : val >= 50 ? '#faad14' : '#ff4d4f';
                        return <span style={{ color, fontWeight: 'bold' }}>{formatNumber(val, 2)}%</span>;
                      },
                      sorter: (a, b) => a.avgProfitMargin - b.avgProfitMargin,
                    },
                    {
                      title: '预估成本($)',
                      dataIndex: 'estimatedCost',
                      key: 'estimatedCost',
                      width: 110,
                      render: (val) => formatNumber(val, 2),
                      sorter: (a, b) => a.estimatedCost - b.estimatedCost,
                    },
                    {
                      title: '预估收益($)',
                      dataIndex: 'revenue',
                      key: 'revenue',
                      width: 110,
                      render: (val) => formatNumber(val, 2),
                      sorter: (a, b) => a.revenue - b.revenue,
                    },
                    {
                      title: '预估利润($)',
                      dataIndex: 'profit',
                      key: 'profit',
                      width: 110,
                      render: (val) => {
                        const color = val >= 0 ? '#52c41a' : '#ff4d4f';
                        return <span style={{ color, fontWeight: 'bold' }}>{formatNumber(val, 2)}</span>;
                      },
                      sorter: (a, b) => a.profit - b.profit,
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="📈 用量分析" key="usage">
          <Row gutter={24}>
            <Col span={12}>
              <Card title="代币消耗对比" style={{ marginBottom: 24 }}>
                <Bar
                  data={usageComparisonData}
                  xField="flowName"
                  yField="totalTokensM"
                  seriesField="flowName"
                  color="#1890ff"
                  label={{
                    position: 'middle',
                    style: {
                      fill: '#fff',
                      fontSize: 12,
                    },
                  }}
                  xAxis={{
                    label: {
                      autoRotate: true,
                      autoHide: false,
                    },
                  }}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="通话时长对比" style={{ marginBottom: 24 }}>
                <Bar
                  data={usageComparisonData}
                  xField="flowName"
                  yField="totalTalkHours"
                  seriesField="flowName"
                  color="#52c41a"
                  label={{
                    position: 'middle',
                    style: {
                      fill: '#fff',
                      fontSize: 12,
                    },
                  }}
                  xAxis={{
                    label: {
                      autoRotate: true,
                      autoHide: false,
                    },
                  }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="💰 成本分析" key="cost">
          <Row gutter={24}>
            <Col span={12}>
              <Card title="成本收益对比" style={{ marginBottom: 24 }}>
                <Bar
                  data={costComparisonData}
                  xField="flowName"
                  yField="estimatedCost"
                  seriesField="flowName"
                  color="#ff4d4f"
                  label={{
                    position: 'middle',
                    style: {
                      fill: '#fff',
                      fontSize: 12,
                    },
                  }}
                  xAxis={{
                    label: {
                      autoRotate: true,
                      autoHide: false,
                    },
                  }}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="利润对比" style={{ marginBottom: 24 }}>
                <Bar
                  data={costComparisonData}
                  xField="flowName"
                  yField="profit"
                  seriesField="flowName"
                  color="#52c41a"
                  label={{
                    position: 'middle',
                    style: {
                      fill: '#fff',
                      fontSize: 12,
                    },
                  }}
                  xAxis={{
                    label: {
                      autoRotate: true,
                      autoHide: false,
                    },
                  }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="⚡ 效率分析" key="efficiency">
          <Row gutter={24}>
            <Col span={12}>
              <Card title="代币效率对比 (K/分钟)" style={{ marginBottom: 24 }}>
                <Bar
                  data={efficiencyData}
                  xField="flowName"
                  yField="tokensPerMinute"
                  seriesField="flowName"
                  color="#722ed1"
                  label={{
                    position: 'middle',
                    style: {
                      fill: '#fff',
                      fontSize: 12,
                    },
                  }}
                  xAxis={{
                    label: {
                      autoRotate: true,
                      autoHide: false,
                    },
                  }}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="平均通话时长对比 (秒)" style={{ marginBottom: 24 }}>
                <Bar
                  data={efficiencyData}
                  xField="flowName"
                  yField="avgTalkSeconds"
                  seriesField="flowName"
                  color="#faad14"
                  label={{
                    position: 'middle',
                    style: {
                      fill: '#fff',
                      fontSize: 12,
                    },
                  }}
                  xAxis={{
                    label: {
                      autoRotate: true,
                      autoHide: false,
                    },
                  }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="🏆 排行榜" key="ranking">
          <Row gutter={24}>
            <Col span={12}>
              <Card title="代币消耗TOP流程" style={{ marginBottom: 24 }}>
                <Table
                  dataSource={flowData.slice(0, 5)}
                  rowKey="flowName"
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: '排名',
                      key: 'rank',
                      width: 60,
                      render: (_, __, index) => <Tag color="gold">{index + 1}</Tag>
                    },
                    { title: '流程名称', dataIndex: 'flowName', key: 'flowName' },
                    {
                      title: '代币消耗(M)',
                      dataIndex: 'totalTokensM',
                      key: 'totalTokensM',
                      render: (val) => formatNumber(val, 2)
                    }
                  ]}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="利润率TOP流程" style={{ marginBottom: 24 }}>
                <Table
                  dataSource={[...flowData].sort((a, b) => b.avgProfitMargin - a.avgProfitMargin).slice(0, 5)}
                  rowKey="flowName"
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: '排名',
                      key: 'rank',
                      width: 60,
                      render: (_, __, index) => <Tag color="gold">{index + 1}</Tag>
                    },
                    { title: '流程名称', dataIndex: 'flowName', key: 'flowName' },
                    {
                      title: '平均利润率(%)',
                      dataIndex: 'avgProfitMargin',
                      key: 'avgProfitMargin',
                      render: (val) => `${formatNumber(val, 2)}%`
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default FlowAnalysis;










