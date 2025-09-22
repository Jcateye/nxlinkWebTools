import React from 'react';
import { Card, Row, Col, Statistic, Table, Progress, Tag, Space, Divider, Typography } from 'antd';
import { 
  PhoneOutlined, 
  ClockCircleOutlined, 
  DollarOutlined, 
  PieChartOutlined,
  TrophyOutlined,
  LineChartOutlined,
  UserOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons';
import { ComprehensiveAnalysis, UsageAnalysis, ConsumptionAnalysis, CostAnalysis } from '../../services/billAnalysisService';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

interface BillAnalysisChartsProps {
  analysis: ComprehensiveAnalysis;
  loading?: boolean;
}

const BillAnalysisCharts: React.FC<BillAnalysisChartsProps> = ({ analysis, loading = false }) => {
  const { usage, consumption, cost, summary } = analysis;

  // 格式化数值
  const formatNumber = (num: number, decimals = 2): string => {
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  // 格式化时长（秒转换为小时分钟）
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分${remainingSeconds}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    } else {
      return `${remainingSeconds}秒`;
    }
  };

  // 用量分析组件
  const UsageAnalysisCard: React.FC<{ data: UsageAnalysis }> = ({ data }) => (
    <Card title="📞 用量分析" style={{ height: '100%' }}>
      <Row gutter={16}>
        <Col span={12}>
          <Statistic
            title="总通话次数"
            value={data.totalCalls}
            prefix={<PhoneOutlined />}
            suffix="次"
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="AI通话总时长"
            value={formatDuration(data.totalDuration)}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
      </Row>
      
      <Divider />
      
      <Row gutter={16}>
        <Col span={12}>
          <Statistic
            title="平均AI通话时长"
            value={formatDuration(Math.round(data.avgCallDuration))}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="平均线路通话时长"
            value={formatDuration(Math.round(data.avgLineDuration))}
          />
        </Col>
      </Row>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Title level={5}>呼叫方向分布</Title>
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                {data.callsByDirection.outbound}
              </div>
              <div>呼出</div>
              <Progress 
                percent={Math.round((data.callsByDirection.outbound / data.totalCalls) * 100)} 
                size="small" 
                showInfo={false}
                strokeColor="#1890ff"
              />
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                {data.callsByDirection.inbound}
              </div>
              <div>呼入</div>
              <Progress 
                percent={Math.round((data.callsByDirection.inbound / data.totalCalls) * 100)} 
                size="small" 
                showInfo={false}
                strokeColor="#52c41a"
              />
            </div>
          </Col>
        </Row>
      </div>

      <div>
        <Title level={5}>热门流程 TOP 5</Title>
        <Table
          dataSource={data.topFlows.slice(0, 5)}
          columns={[
            {
              title: '流程名称',
              dataIndex: 'flowName',
              key: 'flowName',
              ellipsis: true,
            },
            {
              title: '使用次数',
              dataIndex: 'count',
              key: 'count',
              width: 100,
              render: (count) => <Tag color="blue">{count}</Tag>
            },
            {
              title: '总时长',
              dataIndex: 'duration',
              key: 'duration',
              width: 120,
              render: (duration) => formatDuration(duration)
            }
          ]}
          pagination={false}
          size="small"
        />
      </div>
    </Card>
  );

  // 消费分析组件
  const ConsumptionAnalysisCard: React.FC<{ data: ConsumptionAnalysis }> = ({ data }) => (
    <Card title="💰 消费分析" style={{ height: '100%' }}>
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="AI消费总额"
            value={data.totalAIConsumption}
            precision={2}
            prefix={<DollarOutlined />}
            suffix="USD"
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="线路消费总额"
            value={data.totalLineConsumption}
            precision={2}
            prefix={<DollarOutlined />}
            suffix="USD"
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="总消费"
            value={data.totalConsumption}
            precision={2}
            prefix={<DollarOutlined />}
            suffix="USD"
            valueStyle={{ color: '#3f8600' }}
          />
        </Col>
      </Row>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Title level={5}>消费构成</Title>
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={Math.round((data.totalAIConsumption / data.totalConsumption) * 100)}
                format={() => 'AI消费'}
                size={80}
                strokeColor="#1890ff"
              />
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={Math.round((data.totalLineConsumption / data.totalConsumption) * 100)}
                format={() => '线路消费'}
                size={80}
                strokeColor="#52c41a"
              />
            </div>
          </Col>
        </Row>
      </div>

      <div>
        <Title level={5}>消费排行榜 TOP 5</Title>
        <Table
          dataSource={data.topSpenders.slice(0, 5)}
          columns={[
            {
              title: '客户名称',
              dataIndex: 'customerName',
              key: 'customerName',
              ellipsis: true,
            },
            {
              title: '总消费',
              dataIndex: 'totalConsumption',
              key: 'totalConsumption',
              width: 100,
              render: (amount) => `$${formatNumber(amount)}`
            },
            {
              title: '通话数',
              dataIndex: 'callCount',
              key: 'callCount',
              width: 80,
              render: (count) => <Tag>{count}</Tag>
            },
            {
              title: '平均单价',
              dataIndex: 'avgPerCall',
              key: 'avgPerCall',
              width: 100,
              render: (avg) => `$${formatNumber(avg)}`
            }
          ]}
          pagination={false}
          size="small"
        />
      </div>
    </Card>
  );

  // 成本分析组件
  const CostAnalysisCard: React.FC<{ data: CostAnalysis }> = ({ data }) => (
    <Card title="📊 成本分析" style={{ height: '100%' }}>
      <Row gutter={16}>
        <Col span={12}>
          <Statistic
            title="AI总成本"
            value={data.totalCost}
            precision={2}
            prefix={<DollarOutlined />}
            suffix="USD"
            valueStyle={{ color: '#cf1322' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="成本效率比"
            value={data.costEfficiency}
            precision={2}
            prefix={data.costEfficiency > 1 ? <RiseOutlined /> : <FallOutlined />}
            valueStyle={{ color: data.costEfficiency > 1 ? '#3f8600' : '#cf1322' }}
          />
        </Col>
      </Row>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Title level={5}>成本构成分解</Title>
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
                ${formatNumber(data.costBreakdown.asrCost)}
              </div>
              <div>ASR成本</div>
              <Progress
                percent={Math.round((data.costBreakdown.asrCost / data.totalCost) * 100)}
                size="small"
                strokeColor="#1890ff"
              />
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a' }}>
                ${formatNumber(data.costBreakdown.ttsCost)}
              </div>
              <div>TTS成本</div>
              <Progress
                percent={Math.round((data.costBreakdown.ttsCost / data.totalCost) * 100)}
                size="small"
                strokeColor="#52c41a"
              />
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#faad14' }}>
                ${formatNumber(data.costBreakdown.llmCost)}
              </div>
              <div>LLM成本</div>
              <Progress
                percent={Math.round((data.costBreakdown.llmCost / data.totalCost) * 100)}
                size="small"
                strokeColor="#faad14"
              />
            </div>
          </Col>
        </Row>
      </div>

      <div>
        <Title level={5}>盈利能力分析 TOP 5</Title>
        <Table
          dataSource={data.profitability.slice(0, 5)}
          columns={[
            {
              title: '客户名称',
              dataIndex: 'customerName',
              key: 'customerName',
              ellipsis: true,
            },
            {
              title: '收入',
              dataIndex: 'revenue',
              key: 'revenue',
              width: 90,
              render: (revenue) => `$${formatNumber(revenue)}`
            },
            {
              title: '成本',
              dataIndex: 'cost',
              key: 'cost',
              width: 90,
              render: (cost) => `$${formatNumber(cost)}`
            },
            {
              title: '利润',
              dataIndex: 'profit',
              key: 'profit',
              width: 90,
              render: (profit) => (
                <span style={{ color: profit >= 0 ? '#3f8600' : '#cf1322' }}>
                  ${formatNumber(profit)}
                </span>
              )
            },
            {
              title: '利润率',
              dataIndex: 'margin',
              key: 'margin',
              width: 80,
              render: (margin) => (
                <Tag color={margin >= 0 ? 'green' : 'red'}>
                  {formatNumber(margin)}%
                </Tag>
              )
            }
          ]}
          pagination={false}
          size="small"
        />
      </div>
    </Card>
  );

  // 综合概览卡片
  const SummaryCard: React.FC = () => (
    <Card title="📋 数据概览" style={{ marginBottom: 24 }}>
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="总记录数"
            value={summary.totalRecords}
            prefix={<UserOutlined />}
            suffix="条"
          />
        </Col>
        <Col span={6}>
          <div>
            <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>数据时间范围</div>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>
              {summary.dateRange.start ? dayjs(summary.dateRange.start).format('YYYY-MM-DD') : '-'}
            </div>
            <div style={{ fontSize: 14, color: '#666' }}>至</div>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>
              {summary.dateRange.end ? dayjs(summary.dateRange.end).format('YYYY-MM-DD') : '-'}
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div>
            <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>最大消费客户</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
              {summary.topCustomer || '-'}
            </div>
            <div style={{ color: '#666', fontSize: 14, marginTop: 8 }}>最常用流程</div>
            <div style={{ fontSize: 14 }}>
              {summary.mostUsedFlow || '-'}
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div>
            <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>通话高峰时段</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
              {summary.peakHour}:00
            </div>
            <div style={{ color: '#666', fontSize: 14, marginTop: 8 }}>整体利润率</div>
            <div style={{ 
              fontSize: 16, 
              fontWeight: 'bold',
              color: summary.overallProfitMargin >= 0 ? '#3f8600' : '#cf1322'
            }}>
              {formatNumber(summary.overallProfitMargin)}%
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );

  return (
    <div>
      <SummaryCard />
      
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <UsageAnalysisCard data={usage} />
        </Col>
        <Col span={8}>
          <ConsumptionAnalysisCard data={consumption} />
        </Col>
        <Col span={8}>
          <CostAnalysisCard data={cost} />
        </Col>
      </Row>

      {/* 时段分布图表 */}
      <Card title="📈 通话时段分布" style={{ marginBottom: 24 }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ width: '100%', minWidth: 800 }}>
            {usage.callsByTimeRange.map((item) => (
              <div 
                key={item.hour} 
                style={{ 
                  display: 'inline-block', 
                  width: '4%', 
                  textAlign: 'center',
                  margin: '0 0.2%'
                }}
              >
                <div style={{ height: 100, display: 'flex', alignItems: 'end', justifyContent: 'center' }}>
                  <div
                    style={{
                      width: 20,
                      height: `${Math.max(5, (item.count / Math.max(...usage.callsByTimeRange.map(h => h.count))) * 80)}px`,
                      backgroundColor: '#1890ff',
                      borderRadius: '2px 2px 0 0'
                    }}
                    title={`${item.hour}:00 - ${item.count}次通话`}
                  />
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {item.hour}:00
                </div>
                <div style={{ fontSize: 10, color: '#666' }}>
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 消费趋势 */}
      {consumption.consumptionTrend.length > 1 && (
        <Card title="📊 消费趋势分析" style={{ marginBottom: 24 }}>
          <Table
            dataSource={consumption.consumptionTrend}
            columns={[
              {
                title: '日期',
                dataIndex: 'date',
                key: 'date',
                width: 120,
              },
              {
                title: 'AI消费 (USD)',
                dataIndex: 'aiConsumption',
                key: 'aiConsumption',
                width: 130,
                render: (amount) => `$${formatNumber(amount)}`
              },
              {
                title: '线路消费 (USD)',
                dataIndex: 'lineConsumption',
                key: 'lineConsumption',
                width: 130,
                render: (amount) => `$${formatNumber(amount)}`
              },
              {
                title: '总消费 (USD)',
                dataIndex: 'totalConsumption',
                key: 'totalConsumption',
                width: 130,
                render: (amount) => (
                  <span style={{ fontWeight: 'bold' }}>${formatNumber(amount)}</span>
                )
              }
            ]}
            pagination={{ pageSize: 10, showQuickJumper: true }}
            size="small"
            scroll={{ x: 600 }}
          />
        </Card>
      )}
    </div>
  );
};

export default BillAnalysisCharts;
