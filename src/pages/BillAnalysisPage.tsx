import React, { useState, useEffect } from 'react';
import { Layout, Typography, Alert, Button, Space, message, Card, Spin, Empty, Modal, Progress } from 'antd';
import { 
  FileTextOutlined, 
  BarChartOutlined, 
  DownloadOutlined, 
  DeleteOutlined,
  ReloadOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { BillRecord } from '../types/bill';
import { 
  ComprehensiveAnalysis, 
  performComprehensiveAnalysis,
  mergeAnalysisData 
} from '../services/billAnalysisService';
import BillFileImporter from '../components/bill/BillFileImporter';
import BillAnalysisCharts from '../components/bill/BillAnalysisCharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

interface DataSummary {
  totalRecords: number;
  dateRange: {
    start: string;
    end: string;
  };
  customerCount: number;
  fileCount: number;
}

const BillAnalysisPage: React.FC = () => {
  const [billData, setBillData] = useState<BillRecord[]>([]);
  const [analysis, setAnalysis] = useState<ComprehensiveAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);

  // 数据汇总信息
  const dataSummary: DataSummary = {
    totalRecords: billData.length,
    dateRange: {
      start: billData.length > 0 ? 
        billData.reduce((earliest, record) => 
          !earliest || (record.feeTime && record.feeTime < earliest) ? record.feeTime || earliest : earliest, 
          '' as string
        ) : '',
      end: billData.length > 0 ? 
        billData.reduce((latest, record) => 
          !latest || (record.feeTime && record.feeTime > latest) ? record.feeTime || latest : latest, 
          '' as string
        ) : ''
    },
    customerCount: new Set(billData.map(record => record.customerName).filter(Boolean)).size,
    fileCount: 0 // 这个值由文件导入组件管理，这里仅作展示
  };

  // 处理数据导入
  const handleDataImported = async (data: BillRecord[]) => {
    if (data.length === 0) {
      message.warning('没有有效的数据');
      return;
    }

    setLoading(true);
    try {
      // 合并新数据和现有数据
      const mergedData = billData.length > 0 ? mergeAnalysisData([billData, data]) : data;
      setBillData(mergedData);
      
      // 自动执行分析
      const analysisResult = performComprehensiveAnalysis(mergedData);
      setAnalysis(analysisResult);
      
      message.success(`数据导入成功！共 ${mergedData.length} 条记录已完成分析`);
    } catch (error) {
      console.error('数据分析失败:', error);
      message.error('数据分析失败，请检查数据格式');
    } finally {
      setLoading(false);
    }
  };

  // 重新分析数据
  const handleReanalyze = async () => {
    if (billData.length === 0) {
      message.warning('没有数据可分析');
      return;
    }

    setLoading(true);
    try {
      const analysisResult = performComprehensiveAnalysis(billData);
      setAnalysis(analysisResult);
      message.success('重新分析完成');
    } catch (error) {
      console.error('重新分析失败:', error);
      message.error('重新分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 清空所有数据
  const handleClearData = () => {
    Modal.confirm({
      title: '确认清空数据',
      content: '此操作将清空所有导入的数据和分析结果，不可恢复。',
      okType: 'danger',
      onOk: () => {
        setBillData([]);
        setAnalysis(null);
        message.success('数据已清空');
      }
    });
  };

  // 导出分析报告
  const handleExportReport = async () => {
    if (!analysis) {
      message.warning('没有分析结果可导出');
      return;
    }

    setExportLoading(true);
    try {
      // 创建Excel工作簿
      const workbook = XLSX.utils.book_new();

      // 1. 数据概览工作表
      const summaryData = [
        ['项目', '值'],
        ['总记录数', analysis.summary.totalRecords],
        ['数据开始时间', analysis.summary.dateRange.start],
        ['数据结束时间', analysis.summary.dateRange.end],
        ['最大消费客户', analysis.summary.topCustomer],
        ['最常用流程', analysis.summary.mostUsedFlow],
        ['通话高峰时段', `${analysis.summary.peakHour}:00`],
        ['整体利润率', `${analysis.summary.overallProfitMargin.toFixed(2)}%`]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, '数据概览');

      // 2. 用量分析工作表
      const usageData = [
        ['指标', '数值'],
        ['总通话次数', `${analysis.usage.totalCalls}次`],
        ['AI通话总时长', `${Math.round(analysis.usage.totalDuration)}秒`],
        ['线路通话总时长', `${Math.round(analysis.usage.totalLineDuration)}秒`],
        ['平均AI通话时长', `${Math.round(analysis.usage.avgCallDuration)}秒`],
        ['平均线路通话时长', `${Math.round(analysis.usage.avgLineDuration)}秒`],
        ['呼出通话数', analysis.usage.callsByDirection.outbound],
        ['呼入通话数', analysis.usage.callsByDirection.inbound],
        [],
        ['热门流程排行'],
        ['排名', '流程名称', '使用次数', '总时长(秒)'],
        ...analysis.usage.topFlows.map((flow, index) => [
          index + 1, flow.flowName, flow.count, Math.round(flow.duration)
        ])
      ];
      const usageSheet = XLSX.utils.aoa_to_sheet(usageData);
      XLSX.utils.book_append_sheet(workbook, usageSheet, '用量分析');

      // 3. 消费分析工作表
      const consumptionData = [
        ['指标', '金额(USD)'],
        ['AI消费总额', analysis.consumption.totalAIConsumption.toFixed(2)],
        ['线路消费总额', analysis.consumption.totalLineConsumption.toFixed(2)],
        ['总消费', analysis.consumption.totalConsumption.toFixed(2)],
        ['平均每次通话消费', analysis.consumption.avgConsumptionPerCall.toFixed(2)],
        [],
        ['客户消费排行榜'],
        ['排名', '客户名称', 'AI消费', '线路消费', '总消费', '通话数', '平均单价'],
        ...analysis.consumption.topSpenders.map((customer, index) => [
          index + 1,
          customer.customerName,
          customer.aiConsumption.toFixed(2),
          customer.lineConsumption.toFixed(2),
          customer.totalConsumption.toFixed(2),
          customer.callCount,
          customer.avgPerCall.toFixed(2)
        ])
      ];
      const consumptionSheet = XLSX.utils.aoa_to_sheet(consumptionData);
      XLSX.utils.book_append_sheet(workbook, consumptionSheet, '消费分析');

      // 4. 成本分析工作表
      const costData = [
        ['指标', '金额(USD)'],
        ['AI总成本', analysis.cost.totalCost.toFixed(2)],
        ['ASR成本', analysis.cost.costBreakdown.asrCost.toFixed(2)],
        ['TTS成本', analysis.cost.costBreakdown.ttsCost.toFixed(2)],
        ['LLM成本', analysis.cost.costBreakdown.llmCost.toFixed(2)],
        ['平均每次通话成本', analysis.cost.avgCostPerCall.toFixed(2)],
        ['成本效率比', analysis.cost.costEfficiency.toFixed(2)],
        [],
        ['客户盈利能力分析'],
        ['排名', '客户名称', '收入', '成本', '利润', '利润率(%)'],
        ...analysis.cost.profitability.map((customer, index) => [
          index + 1,
          customer.customerName,
          customer.revenue.toFixed(2),
          customer.cost.toFixed(2),
          customer.profit.toFixed(2),
          customer.margin.toFixed(2)
        ])
      ];
      const costSheet = XLSX.utils.aoa_to_sheet(costData);
      XLSX.utils.book_append_sheet(workbook, costSheet, '成本分析');

      // 5. 时段分析工作表
      const hourlyData = [
        ['时段', '通话次数'],
        ...analysis.usage.callsByTimeRange.map(item => [
          `${item.hour}:00-${item.hour + 1}:00`,
          item.count
        ])
      ];
      const hourlySheet = XLSX.utils.aoa_to_sheet(hourlyData);
      XLSX.utils.book_append_sheet(workbook, hourlySheet, '时段分析');

      // 6. 消费趋势工作表（如果有多天数据）
      if (analysis.consumption.consumptionTrend.length > 1) {
        const trendData = [
          ['日期', 'AI消费', '线路消费', '总消费'],
          ...analysis.consumption.consumptionTrend.map(trend => [
            trend.date,
            trend.aiConsumption.toFixed(2),
            trend.lineConsumption.toFixed(2),
            trend.totalConsumption.toFixed(2)
          ])
        ];
        const trendSheet = XLSX.utils.aoa_to_sheet(trendData);
        XLSX.utils.book_append_sheet(workbook, trendSheet, '消费趋势');
      }

      // 生成文件名
      const startDate = analysis.summary.dateRange.start ? 
        dayjs(analysis.summary.dateRange.start).format('YYYY-MM-DD') : 
        dayjs().format('YYYY-MM-DD');
      const endDate = analysis.summary.dateRange.end ? 
        dayjs(analysis.summary.dateRange.end).format('YYYY-MM-DD') : 
        dayjs().format('YYYY-MM-DD');
      
      const fileName = `账单数据分析报告_${startDate}_${endDate}.xlsx`;

      // 下载文件
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, fileName);

      message.success('分析报告导出成功');
    } catch (error) {
      console.error('导出报告失败:', error);
      message.error('导出报告失败');
    } finally {
      setExportLoading(false);
    }
  };

  // 渲染数据概览卡片
  const renderDataSummary = () => (
    <Card 
      title="📊 数据概览" 
      extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleReanalyze}
            disabled={billData.length === 0 || loading}
            size="small"
          >
            重新分析
          </Button>
          <Button 
            icon={<ExportOutlined />} 
            type="primary"
            onClick={handleExportReport}
            loading={exportLoading}
            disabled={!analysis}
            size="small"
          >
            导出报告
          </Button>
          <Button 
            icon={<DeleteOutlined />} 
            danger
            onClick={handleClearData}
            disabled={billData.length === 0 || loading}
            size="small"
          >
            清空数据
          </Button>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      {billData.length > 0 ? (
        <div>
          <Space size="large">
            <div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                {dataSummary.totalRecords.toLocaleString()}
              </div>
              <div style={{ color: '#666' }}>总记录数</div>
            </div>
            
            <div>
              <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                {dataSummary.customerCount}
              </div>
              <div style={{ color: '#666' }}>客户数量</div>
            </div>
            
            <div>
              <div style={{ fontSize: 14 }}>
                {dataSummary.dateRange.start ? 
                  dayjs(dataSummary.dateRange.start).format('YYYY-MM-DD') : '-'
                }
              </div>
              <div style={{ color: '#666', fontSize: 12 }}>开始时间</div>
            </div>
            
            <div>
              <div style={{ fontSize: 14 }}>
                {dataSummary.dateRange.end ? 
                  dayjs(dataSummary.dateRange.end).format('YYYY-MM-DD') : '-'
                }
              </div>
              <div style={{ color: '#666', fontSize: 12 }}>结束时间</div>
            </div>
          </Space>
        </div>
      ) : (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无数据，请先导入账单文件"
        />
      )}
    </Card>
  );

  return (
    <Layout style={{ minHeight: '100vh', padding: '24px' }}>
      <Content>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
          <div style={{ marginBottom: 24 }}>
            <Title level={2} style={{ marginBottom: 8 }}>
              <BarChartOutlined style={{ marginRight: 8 }} />
              账单数据分析系统
            </Title>
            <Paragraph type="secondary">
              上传CSV或Excel格式的账单文件，系统将自动分析客户用量、消费和成本数据，
              提供多维度的数据洞察和可视化报表。
            </Paragraph>
          </div>

          <Alert
            message="功能说明"
            description={
              <div>
                <p><strong>支持的分析维度：</strong></p>
                <ul style={{ marginBottom: 0 }}>
                  <li><strong>用量分析：</strong>通话次数、时长分布、呼叫方向、高峰时段、热门流程</li>
                  <li><strong>消费分析：</strong>AI/线路消费、客户消费排名、消费趋势、平均单价</li>
                  <li><strong>成本分析：</strong>ASR/TTS/LLM成本分解、盈利能力、成本效率</li>
                  <li><strong>综合报告：</strong>多维度数据汇总、Excel格式导出</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <BillFileImporter 
            onDataImported={handleDataImported}
            onImportStatusChange={setImporting}
          />

          {renderDataSummary()}

          {loading && (
            <Card style={{ textAlign: 'center', marginBottom: 24 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>正在分析数据...</div>
            </Card>
          )}

          {analysis && !loading && (
            <BillAnalysisCharts 
              analysis={analysis} 
              loading={loading}
            />
          )}

          {billData.length === 0 && !importing && !loading && (
            <Card style={{ textAlign: 'center', marginTop: 40 }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <div style={{ marginBottom: 16 }}>还没有数据，开始分析之旅吧！</div>
                    <div style={{ color: '#666', fontSize: 14 }}>
                      上传您的账单文件，我们将为您提供详细的数据分析
                    </div>
                  </div>
                }
              />
            </Card>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default BillAnalysisPage;
