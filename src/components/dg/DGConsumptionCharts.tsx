import React from 'react';
import { Card, Row, Col, Statistic, Table, Progress, Tag, Space, Divider, Typography } from 'antd';
import { 
  DollarOutlined, 
  ClockCircleOutlined, 
  PhoneOutlined,
  LineChartOutlined,
  RiseOutlined,
  FallOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { DGConsumptionRecord } from '../../types/dgConsumption';
import ProfitabilityAnalysisChart from './ProfitabilityAnalysisChart';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

interface DGConsumptionChartsProps {
  records: DGConsumptionRecord[];
  loading?: boolean;
}

const DGConsumptionCharts: React.FC<DGConsumptionChartsProps> = ({ records, loading = false }) => {
  if (!records || records.length === 0) {
    return (
      <Card>
        <Paragraph>暂无DG消费数据可分析。请先导入数据。</Paragraph>
      </Card>
    );
  }

  // 计算汇总统计
  const totalTokensM = records.reduce((sum, r) => sum + (r.tokenConsumptionM || 0), 0);
  const totalMinutes = records.reduce((sum, r) => sum + (r.consumedMinutes || 0), 0);
  const totalCallsWan = records.reduce((sum, r) => sum + (r.callCountWan || 0), 0);
  const totalTalkHours = records.reduce((sum, r) => sum + (r.totalTalkHours || 0), 0);
  const avgProfitMargin = records.length > 0 ? 
    records.reduce((sum, r) => sum + (r.profitMarginPercent || 0), 0) / records.length : 0;

  // 效率指标
  const avgTokensPerMinute = totalMinutes > 0 ? (totalTokensM * 1000) / totalMinutes : 0;
  const avgTalkTimePerCall = totalCallsWan > 0 ? (totalTalkHours * 3600) / (totalCallsWan * 10000) : 0;

  // 趋势分析 - 按时间排序
  const sortedRecords = [...records].sort((a, b) => String(a.time).localeCompare(String(b.time)));

  // 格式化数值
  const formatNumber = (num: number, decimals = 2): string => {
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  return (
    <div>
      {/* 盈利能力分析 - 多Y轴折线图 */}
      <ProfitabilityAnalysisChart records={sortedRecords} loading={loading} />
      
      {/* 概览统计 */}
      <Card title="📊 DG消费数据概览" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总代币消耗"
              value={totalTokensM}
              precision={2}
              suffix="M"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总消耗分钟"
              value={totalMinutes}
              suffix="分钟"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总通话数量"
              value={totalCallsWan}
              precision={2}
              suffix="万次"
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均利润率"
              value={avgProfitMargin}
              precision={2}
              suffix="%"
              prefix={avgProfitMargin >= 50 ? <RiseOutlined /> : <FallOutlined />}
              valueStyle={{ color: avgProfitMargin >= 50 ? '#3f8600' : '#cf1322' }}
            />
          </Col>
        </Row>

        <Divider />

        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="总通话时长"
              value={totalTalkHours}
              precision={1}
              suffix="小时"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="平均代币效率"
              value={avgTokensPerMinute}
              precision={3}
              suffix="K/分钟"
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="平均通话时长"
              value={avgTalkTimePerCall}
              precision={1}
              suffix="秒/次"
            />
          </Col>
        </Row>
      </Card>

      {/* 利润率分布 */}
      <Card title="💰 利润率分布分析" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                {records.filter(r => (r.profitMarginPercent || 0) >= 70).length}
              </div>
              <div>高利润率 (≥70%)</div>
              <Progress 
                percent={Math.round((records.filter(r => (r.profitMarginPercent || 0) >= 70).length / records.length) * 100)} 
                size="small" 
                strokeColor="#52c41a"
              />
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                {records.filter(r => (r.profitMarginPercent || 0) >= 50 && (r.profitMarginPercent || 0) < 70).length}
              </div>
              <div>中等利润率 (50-70%)</div>
              <Progress 
                percent={Math.round((records.filter(r => (r.profitMarginPercent || 0) >= 50 && (r.profitMarginPercent || 0) < 70).length / records.length) * 100)} 
                size="small" 
                strokeColor="#faad14"
              />
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                {records.filter(r => (r.profitMarginPercent || 0) < 50).length}
              </div>
              <div>低利润率 (&lt;50%)</div>
              <Progress 
                percent={Math.round((records.filter(r => (r.profitMarginPercent || 0) < 50).length / records.length) * 100)} 
                size="small" 
                strokeColor="#ff4d4f"
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* 效率指标 */}
      <Card title="⚡ 效率指标分析">
        <Row gutter={16}>
          <Col span={12}>
            <Title level={5}>代币效率排行 TOP 5</Title>
            <Table
              dataSource={[...records].sort((a, b) => (b.tokensPerMinuteK || 0) - (a.tokensPerMinuteK || 0)).slice(0, 5)}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '时间', dataIndex: 'time', key: 'time', width: 100 },
                { 
                  title: '效率(K/分钟)', 
                  dataIndex: 'tokensPerMinuteK', 
                  key: 'tokensPerMinuteK', 
                  render: (val) => <Tag color="blue">{formatNumber(val, 3)}</Tag>
                },
                { 
                  title: '利润率(%)', 
                  dataIndex: 'profitMarginPercent', 
                  key: 'profitMarginPercent', 
                  render: (val) => `${formatNumber(val, 2)}%`
                },
              ]}
            />
          </Col>
          <Col span={12}>
            <Title level={5}>最佳利润率 TOP 5</Title>
            <Table
              dataSource={[...records].sort((a, b) => (b.profitMarginPercent || 0) - (a.profitMarginPercent || 0)).slice(0, 5)}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '时间', dataIndex: 'time', key: 'time', width: 100 },
                { 
                  title: '利润率(%)', 
                  dataIndex: 'profitMarginPercent', 
                  key: 'profitMarginPercent', 
                  render: (val) => <Tag color="green">{formatNumber(val, 2)}%</Tag>
                },
                { 
                  title: '代币消耗(M)', 
                  dataIndex: 'tokenConsumptionM', 
                  key: 'tokenConsumptionM', 
                  render: (val) => formatNumber(val, 2)
                },
              ]}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default DGConsumptionCharts;
