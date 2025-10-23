import React, { useState, useMemo } from 'react';
import { 
  Card, Row, Col, Statistic, Empty, Tooltip, Space, Button, DatePicker, Select, Drawer
} from 'antd';
import { 
  ArrowUpOutlined,
  ArrowDownOutlined,
  FilterOutlined,
  ClearOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Brush
} from 'recharts';
import { DGConsumptionRecord } from '../../types/dgConsumption';
import dayjs, { Dayjs } from 'dayjs';

interface ProfitabilityAnalysisChartProps {
  records: DGConsumptionRecord[];
  loading?: boolean;
}

// 计算相关性系数 (Pearson correlation coefficient)
const calculateCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  return numerator / denominator;
};

// 解释相关性系数
const getCorrelationInterpretation = (correlation: number): { text: string; color: string; icon: React.ReactNode } => {
  const absCorr = Math.abs(correlation);
  
  if (absCorr >= 0.7) {
    return {
      text: correlation > 0 ? '强正相关' : '强负相关',
      color: correlation > 0 ? '#52c41a' : '#ff4d4f',
      icon: correlation > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />
    };
  } else if (absCorr >= 0.4) {
    return {
      text: correlation > 0 ? '中等正相关' : '中等负相关',
      color: correlation > 0 ? '#faad14' : '#faad14',
      icon: correlation > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />
    };
  } else if (absCorr >= 0.2) {
    return {
      text: correlation > 0 ? '弱正相关' : '弱负相关',
      color: '#1890ff',
      icon: correlation > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />
    };
  } else {
    return {
      text: '无明显相关性',
      color: '#999',
      icon: '→'
    };
  }
};

// 自定义Tooltip
const CustomTooltip = (props: any) => {
  const { active, payload, label } = props;
  
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '8px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold', marginBottom: 4 }}>
          {label}
        </p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} style={{ margin: 0, color: entry.color, fontSize: 12 }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  
  return null;
};

const ProfitabilityAnalysisChart: React.FC<ProfitabilityAnalysisChartProps> = ({ 
  records, 
  loading = false 
}) => {
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  if (!records || records.length === 0) {
    return (
      <Card title="📈 盈利能力分析" style={{ marginBottom: 24 }}>
        <Empty description="暂无数据可分析" />
      </Card>
    );
  }

  // 排序并准备数据
  const sortedRecords = [...records].sort((a, b) => String(a.time).localeCompare(String(b.time)));

  // 转换为图表数据格式
  const chartData = sortedRecords.map((r) => ({
    time: r.time,
    avgTalkSeconds: parseFloat((r.avgTalkSeconds || 0).toFixed(2)),
    profitMarginPercent: parseFloat((r.profitMarginPercent || 0).toFixed(2)),
    fullData: r
  }));

  // 应用时间筛选
  const filteredData = useMemo(() => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return chartData;

    return chartData.filter(d => {
      try {
        const dataTime = dayjs(d.time);
        if (!dataTime.isValid()) return true;
        
        return dataTime.isAfter(dateRange[0]) && dataTime.isBefore(dateRange[1]);
      } catch {
        return true;
      }
    });
  }, [chartData, dateRange]);

  // 计算统计数据
  const avgTalkSecondsArray = filteredData.map(d => d.avgTalkSeconds);
  const profitMarginArray = filteredData.map(d => d.profitMarginPercent);
  
  const correlation = calculateCorrelation(avgTalkSecondsArray, profitMarginArray);
  const correlationInfo = getCorrelationInterpretation(correlation);
  
  const avgTalkSeconds = avgTalkSecondsArray.reduce((a, b) => a + b, 0) / (avgTalkSecondsArray.length || 1);
  const avgProfitMargin = profitMarginArray.reduce((a, b) => a + b, 0) / (profitMarginArray.length || 1);
  const maxTalkSeconds = Math.max(...avgTalkSecondsArray, 0);
  const minTalkSeconds = Math.min(...avgTalkSecondsArray, 0);
  const maxProfitMargin = Math.max(...profitMarginArray, 0);
  const minProfitMargin = Math.min(...profitMarginArray, 0);

  // 导出功能
  const handleExport = () => {
    const csvContent = [
      ['时间', '平均通话时长(秒)', '利润率(%)'],
      ...filteredData.map(d => [d.time, d.avgTalkSeconds, d.profitMarginPercent])
    ]
      .map(row => row.join(','))
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `盈利能力分析_${dayjs().format('YYYY-MM-DD_HH:mm:ss')}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Card 
      title="📈 盈利能力分析" 
      style={{ marginBottom: 24 }}
      extra={
        <Space>
          <Button 
            type="text" 
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            导出数据
          </Button>
          <Button 
            type="text" 
            icon={<FilterOutlined />}
            onClick={() => setDrawerVisible(true)}
          >
            时间筛选
          </Button>
          {dateRange && (
            <Button 
              type="text" 
              danger
              icon={<ClearOutlined />}
              onClick={() => setDateRange(null)}
            >
              清除筛选
            </Button>
          )}
        </Space>
      }
    >
      {/* 核心洞察指标卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <div style={{ 
            padding: '16px', 
            border: '1px solid #f0f0f0', 
            borderRadius: '4px',
            textAlign: 'center',
            background: '#fafafa'
          }}>
            <Tooltip title="平均通话时长与利润率的线性关系强度（Pearson相关系数）">
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>相关性系数</div>
            </Tooltip>
            <div style={{ 
              fontSize: 28, 
              fontWeight: 'bold', 
              color: correlationInfo.color,
              marginBottom: 8
            }}>
              {correlation.toFixed(3)}
            </div>
            <div style={{ fontSize: 12, color: correlationInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {correlationInfo.icon} {correlationInfo.text}
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="平均通话时长"
            value={avgTalkSeconds}
            precision={2}
            suffix="秒"
            valueStyle={{ color: '#1890ff', fontSize: 24 }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="平均利润率"
            value={avgProfitMargin}
            precision={2}
            suffix="%"
            valueStyle={{ color: '#52c41a', fontSize: 24 }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div style={{ 
            padding: '16px', 
            border: '1px solid #f0f0f0', 
            borderRadius: '4px',
            background: '#fafafa'
          }}>
            <Tooltip title="根据分析结果提供的优化建议">
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>运营建议</div>
            </Tooltip>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#333' }}>
              {correlation > 0.5 && '✓ 长通话=高利润'}
              {correlation < -0.5 && '✓ 短通话=高利润'}
              {Math.abs(correlation) <= 0.5 && '• 需多维度分析'}
            </div>
          </div>
        </Col>
      </Row>

      {/* 数据统计摘要 */}
      {dateRange && (
        <Row gutter={16} style={{ marginBottom: 16, padding: '12px', background: '#e6f7ff', borderRadius: '4px' }}>
          <Col span={24}>
            <span style={{ color: '#0050b3', fontSize: 12 }}>
              ✓ 已筛选: {dateRange[0]?.format('YYYY-MM-DD')} 至 {dateRange[1]?.format('YYYY-MM-DD')} 
              （共{filteredData.length}条数据）
            </span>
          </Col>
        </Row>
      )}

      {/* 多Y轴折线图 */}
      <div style={{ 
        height: 400, 
        marginBottom: 24,
        border: '1px solid #f0f0f0',
        borderRadius: '4px',
        padding: '16px',
        background: '#fafafa'
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={filteredData}
            margin={{ top: 20, right: 80, bottom: 60, left: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
            <XAxis 
              dataKey="time" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={Math.floor((filteredData.length - 1) / 8)}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              yAxisId="left"
              label={{ value: '平均通话时长 (秒)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
              stroke="#1890ff"
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              label={{ value: '利润率 (%)', angle: 90, position: 'insideRight' }}
              tick={{ fontSize: 12 }}
              stroke="#52c41a"
            />
            <RechartsTooltip 
              content={<CustomTooltip />}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '8px'
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            
            {/* 通话时长线 */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avgTalkSeconds"
              stroke="#1890ff"
              strokeWidth={2.5}
              dot={{ fill: '#1890ff', r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={true}
              name="平均通话时长 (秒)"
              label={{ position: 'top', offset: 10, fontSize: 11 }}
            />
            
            {/* 利润率线 */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="profitMarginPercent"
              stroke="#52c41a"
              strokeWidth={2.5}
              dot={{ fill: '#52c41a', r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={true}
              name="利润率 (%)"
              label={{ position: 'top', offset: 10, fontSize: 11 }}
            />
            
            {/* 缩放刷子 - 允许本地时间选择 */}
            <Brush 
              dataKey="time" 
              height={30}
              stroke="#8884d8"
              fill="rgba(136, 132, 216, 0.1)"
              travellerWidth={8}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 图例说明 */}
      <Row gutter={24} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 3, backgroundColor: '#1890ff', borderRadius: 2 }} />
            <span style={{ fontSize: 12 }}>平均通话时长 (左Y轴，单位：秒)</span>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 3, backgroundColor: '#52c41a', borderRadius: 2 }} />
            <span style={{ fontSize: 12 }}>利润率 (右Y轴，单位：%)</span>
          </div>
        </Col>
      </Row>

      {/* 时间筛选抽屉 */}
      <Drawer
        title="时间范围筛选"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={400}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ marginBottom: 12, fontWeight: 500 }}>选择时间范围：</p>
          <DatePicker.RangePicker
            style={{ width: '100%' }}
            value={dateRange}
            onChange={(dates) => {
              setDateRange(dates as [Dayjs | null, Dayjs | null]);
              if (dates && dates[0] && dates[1]) {
                setDrawerVisible(false);
              }
            }}
            format="YYYY-MM-DD"
          />
        </div>

        <div style={{ marginTop: 24, padding: '12px', background: '#f0f2f5', borderRadius: '4px' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
            💡 提示：在图表下方的浅色区域拖动可快速调整时间范围，或使用上面的日期选择器进行精确筛选。
          </p>
        </div>

        {dateRange && (
          <div style={{ marginTop: 16 }}>
            <Button 
              block 
              danger 
              onClick={() => {
                setDateRange(null);
                setDrawerVisible(false);
              }}
            >
              清除筛选
            </Button>
          </div>
        )}
      </Drawer>
    </Card>
  );
};

export default ProfitabilityAnalysisChart;
