import React, { useState, useEffect, useMemo } from 'react';
import { Table, Typography, Tag, Button, Tooltip, Card, Row, Col, Statistic } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { BillRecord, CALL_DIRECTION_TEXT, PaginationInfo } from '../../types/bill';

const { Text } = Typography;

interface BillTableProps {
  data: BillRecord[];
  loading?: boolean;
  pagination: PaginationInfo;
  onPageChange?: (page: number, pageSize: number) => void;
  onDesensitizeChange?: (isDesensitized: boolean) => void;
  initialDesensitized?: boolean;
  companyName?: string;
  dateRange?: { start: string | null; end: string | null };
  timeRange?: { start: string | null; end: string | null };
}

const BillTable: React.FC<BillTableProps> = ({
  data,
  loading = false,
  pagination,
  onPageChange,
  onDesensitizeChange,
  initialDesensitized = false,
  companyName,
  dateRange,
  timeRange
}) => {
  const [isDesensitized, setIsDesensitized] = useState<boolean>(initialDesensitized);

  // 当父组件传入的初始脱敏状态变化时，同步更新本地状态
  useEffect(() => {
    setIsDesensitized(initialDesensitized);
  }, [initialDesensitized]);

  // 计算汇总统计信息
  const summaryStats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        recordCount: 0,
        totalSipCost: 0,
        totalAICost: 0,
        totalCost: 0,
        totalASRCost: 0,
        totalTTSCost: 0,
        totalLLMCost: 0,
        totalCallDuration: 0,
        totalSipFeeDuration: 0,
        totalAIFeeDuration: 0,
        avgCallDuration: 0,
        avgCostPerCall: 0
      };
    }

    const recordCount = data.length;
    const totalSipCost = data.reduce((sum, record) => sum + (record.sipTotalCustomerOriginalPriceUSD || 0), 0);
    const totalAICost = data.reduce((sum, record) => sum + (record.customerTotalPriceUSD || 0), 0);
    const totalCost = data.reduce((sum, record) => sum + (record.totalCost || 0), 0);
    const totalASRCost = data.reduce((sum, record) => sum + (record.asrCost || 0), 0);
    const totalTTSCost = data.reduce((sum, record) => sum + (record.ttsCost || 0), 0);
    const totalLLMCost = data.reduce((sum, record) => sum + (record.llmCost || 0), 0);
    const totalCallDuration = data.reduce((sum, record) => sum + (record.callDurationSec || 0), 0);
    const totalSipFeeDuration = data.reduce((sum, record) => sum + (record.sipFeeDuration || 0), 0);
    const totalAIFeeDuration = data.reduce((sum, record) => sum + (record.feeDurationSec || 0), 0);

    return {
      recordCount,
      totalSipCost,
      totalAICost,
      totalCost,
      totalASRCost,
      totalTTSCost,
      totalLLMCost,
      totalCallDuration,
      totalSipFeeDuration,
      totalAIFeeDuration,
      avgCallDuration: recordCount > 0 ? Math.round(totalCallDuration / recordCount) : 0,
      avgCostPerCall: recordCount > 0 ? totalCost / recordCount : 0
    };
  }, [data]);

  // 脱敏处理函数
  const desensitizePhone = (phone: string): string => {
    if (!phone || phone.length < 6) {
      return phone; // 号码太短，不脱敏
    }
    const firstTwo = phone.substring(0, 2);
    const lastFour = phone.substring(phone.length - 4);
    const middleStars = '*'.repeat(Math.max(1, phone.length - 6));
    return `${firstTwo}${middleStars}${lastFour}`;
  };

  // 切换脱敏状态
  const toggleDesensitize = () => {
    const newState = !isDesensitized;
    setIsDesensitized(newState);
    onDesensitizeChange?.(newState);
  };

  // 格式化金额显示
  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) {
      return 'USD 0.00';
    }
    return `USD ${amount.toFixed(8)}`;
  };

  // 格式化时间显示
  const formatTime = (timeStr: string): string => {
    if (!timeStr) return '-';
    try {
      const date = new Date(timeStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timeStr;
    }
  };

  // 格式化时间范围显示
  const formatDateTimeRange = () => {
    if (!dateRange || !timeRange || 
        !dateRange.start || !dateRange.end || 
        !timeRange.start || !timeRange.end) return '';
    
    const startDateTime = `${dateRange.start} ${timeRange.start}`;
    const endDateTime = `${dateRange.end} ${timeRange.end}`;
    
    // 如果是同一天
    if (dateRange.start === dateRange.end) {
      return `${dateRange.start} ${timeRange.start}-${timeRange.end}`;
    }
    
    return `${startDateTime} ~ ${endDateTime}`;
  };

  // 获取币种信息（从第一条记录中获取）
  const sipCurrency = data.length > 0 ? (data[0].sipCurrency || 'USD') : 'USD';
  const customerCurrency = data.length > 0 ? (data[0].customerCurrency || 'USD') : 'USD';

  // 表格列配置
  const columns: ColumnsType<BillRecord> = [
    {
      title: '消费时间',
      dataIndex: 'feeTime',
      key: 'feeTime',
      width: 160,
      fixed: 'left',
      render: (time: string) => (
        <Text style={{ fontSize: '12px' }}>{formatTime(time)}</Text>
      )
    },
    {
      title: 'Agent流程名称',
      dataIndex: 'agentFlowName',
      key: 'agentFlowName',
      width: 150,
      ellipsis: true,
      render: (name: string) => (
        <Text title={name} style={{ fontSize: '12px' }}>{name || '-'}</Text>
      )
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>用户号码</span>
          <Tooltip title={isDesensitized ? '点击显示完整号码' : '点击脱敏显示'}>
            <Button
              type="text"
              size="small"
              icon={isDesensitized ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={toggleDesensitize}
              style={{ padding: '0 4px', minWidth: 'auto', height: 'auto' }}
            />
          </Tooltip>
        </div>
      ),
      dataIndex: 'callee',
      key: 'callee',
      width: 140,
      render: (callee: string) => {
        const displayValue = callee && isDesensitized ? desensitizePhone(callee) : (callee || '-');
        return (
          <Text style={{ fontSize: '12px' }} title={isDesensitized ? '已脱敏显示' : callee}>
            {displayValue}
          </Text>
        );
      }
    },
    {
      title: '线路号码',
      dataIndex: 'caller',
      key: 'caller',
      width: 120,
      render: (caller: string) => (
        <Text style={{ fontSize: '12px' }}>{caller || '-'}</Text>
      )
    },
    {
      title: '呼叫方向',
      dataIndex: 'callDirection',
      key: 'callDirection',
      width: 80,
      render: (direction: number) => {
        const text = CALL_DIRECTION_TEXT[direction] || '未知';
        const color = direction === 1 ? 'green' : direction === 2 ? 'blue' : 'default';
        return <Tag color={color} style={{ fontSize: '11px' }}>{text}</Tag>;
      }
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>线路消费</span>
          <Tooltip title="如果客户币种不是USD时，USD实际费用可能会有转换的精度缺失，请以实际Nxcloud账单为准">
            <QuestionCircleOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          </Tooltip>
        </div>
      ),
      dataIndex: 'sipTotalCustomerOriginalPriceUSD',
      key: 'sipTotalCustomerOriginalPriceUSD',
      width: 100,
      align: 'right' as const,
      render: (amount: number) => (
        <Text style={{ fontSize: '11px' }}>{formatCurrency(amount)}</Text>
      )
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>AI消费</span>
          <Tooltip title="如果客户币种不是USD时，USD实际费用可能会有转换的精度缺失，请以实际Nxcloud账单为准">
            <QuestionCircleOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          </Tooltip>
        </div>
      ),
      dataIndex: 'customerTotalPriceUSD',
      key: 'customerTotalPriceUSD',
      width: 100,
      align: 'right' as const,
      render: (amount: number) => (
        <Text style={{ fontSize: '11px' }}>{formatCurrency(amount)}</Text>
      )
    },
    {
      title: 'AI总成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 100,
      align: 'right' as const,
      render: (amount: number) => (
        <Text style={{ fontSize: '11px', fontWeight: 'bold' }}>{formatCurrency(amount)}</Text>
      )
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{`线路消费(${sipCurrency})`}</span>
          <Tooltip title="如果客户币种不是USD时，USD实际费用可能会有转换的精度缺失，请以实际Nxcloud账单为准">
            <QuestionCircleOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          </Tooltip>
        </div>
      ),
      dataIndex: 'sipTotalCustomerOriginalPrice',
      key: 'sipTotalCustomerOriginalPrice',
      width: 120,
      align: 'right' as const,
      render: (amount: number, record: BillRecord) => {
        const currency = record.sipCurrency || 'USD';
        return (
          <Text style={{ fontSize: '11px' }}>
            {currency} {(amount || 0).toFixed(8)}
          </Text>
        );
      }
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{`AI消费(${customerCurrency})`}</span>
          <Tooltip title="如果客户币种不是USD时，USD实际费用可能会有转换的精度缺失，请以实际Nxcloud账单为准">
            <QuestionCircleOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          </Tooltip>
        </div>
      ),
      dataIndex: 'customerTotalPrice',
      key: 'customerTotalPrice',
      width: 120,
      align: 'right' as const,
      render: (amount: number, record: BillRecord) => {
        const currency = record.customerCurrency || 'USD';
        return (
          <Text style={{ fontSize: '11px' }}>
            {currency} {(amount || 0).toFixed(8)}
          </Text>
        );
      }
    },
    {
      title: '通话时长(秒)',
      dataIndex: 'callDurationSec',
      key: 'callDurationSec',
      width: 90,
      align: 'center' as const,
      render: (duration: number) => (
        <Text style={{ fontSize: '12px' }}>{duration || 0}</Text>
      )
    },
    {
      title: '线路计费时长(秒)',
      dataIndex: 'sipFeeDuration',
      key: 'sipFeeDuration',
      width: 120,
      align: 'center' as const,
      render: (duration: number) => (
        <Text style={{ fontSize: '12px' }}>{duration || 0}</Text>
      )
    },
    {
      title: 'AI计费时长(秒)',
      dataIndex: 'feeDurationSec',
      key: 'feeDurationSec',
      width: 110,
      align: 'center' as const,
      render: (duration: number) => (
        <Text style={{ fontSize: '12px' }}>{duration || 0}</Text>
      )
    },
    {
      title: 'ASR成本',
      dataIndex: 'asrCost',
      key: 'asrCost',
      width: 100,
      align: 'right' as const,
      render: (amount: number) => (
        <Text style={{ fontSize: '11px' }}>{formatCurrency(amount)}</Text>
      )
    },
    {
      title: 'TTS成本',
      dataIndex: 'ttsCost',
      key: 'ttsCost',
      width: 100,
      align: 'right' as const,
      render: (amount: number | null) => (
        <Text style={{ fontSize: '11px' }}>{formatCurrency(amount)}</Text>
      )
    },
    {
      title: 'LLM成本',
      dataIndex: 'llmCost',
      key: 'llmCost',
      width: 100,
      align: 'right' as const,
      render: (amount: number | null) => (
        <Text style={{ fontSize: '11px' }}>{formatCurrency(amount)}</Text>
      )
    },
    {
      title: '线路计费规则',
      dataIndex: 'billingCycle',
      key: 'billingCycle',
      width: 110,
      render: (cycle: string) => (
        <Text style={{ fontSize: '11px' }}>{cycle || '-'}</Text>
      )
    },
    {
      title: 'AI计费规则',
      dataIndex: 'sipPriceType',
      key: 'sipPriceType',
      width: 100,
      render: (type: string) => (
        <Text style={{ fontSize: '11px' }}>{type || '-'}</Text>
      )
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 180,
      ellipsis: true,
      render: (name: string) => (
        <Text title={name} style={{ fontSize: '12px' }}>{name || '-'}</Text>
      )
    },
    {
      title: '团队名称',
      dataIndex: 'tenantName',
      key: 'tenantName',
      width: 120,
      fixed: 'right',
      render: (name: string) => (
        <Text style={{ fontSize: '12px' }}>{name || '-'}</Text>
      )
    }
  ];

  return (
    <div>
      {/* 汇总统计区域 */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                账单汇总统计
              </span>
              {companyName && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {companyName}
                </Tag>
              )}
            </div>
            {(dateRange && timeRange && 
              dateRange.start && dateRange.end && 
              timeRange.start && timeRange.end) && (
              <Tag color="green" style={{ fontSize: '12px' }}>
                📅 {formatDateTimeRange()}
              </Tag>
            )}
          </div>
        } 
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Tooltip title="计算公式：当前查询结果的记录条数">
              <Statistic 
                title="总记录数" 
                value={summaryStats.recordCount} 
                valueStyle={{ color: '#1890ff' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={5}>
            <Tooltip title="计算公式：∑(线路消费) = 所有记录的sipTotalCustomerOriginalPriceUSD字段求和">
              <Statistic 
                title="线路消费总计(USD)" 
                value={summaryStats.totalSipCost.toFixed(8)} 
                valueStyle={{ color: '#52c41a' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={5}>
            <Tooltip title="计算公式：∑(AI消费) = 所有记录的customerTotalPriceUSD字段求和">
              <Statistic 
                title="AI消费总计(USD)" 
                value={summaryStats.totalAICost.toFixed(8)} 
                valueStyle={{ color: '#722ed1' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={5}>
            <Tooltip title="计算公式：∑(AI总成本) = 所有记录的totalCost字段求和">
              <Statistic 
                title="AI总成本(USD)" 
                value={summaryStats.totalCost.toFixed(8)} 
                valueStyle={{ color: '#f5222d', fontWeight: 'bold' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={5}>
            <Tooltip title="计算公式：利润 = AI消费总计 - AI总成本">
              <Statistic 
                title="利润(USD)" 
                value={(summaryStats.totalAICost - summaryStats.totalCost).toFixed(8)} 
                valueStyle={{ 
                  color: (summaryStats.totalAICost - summaryStats.totalCost) >= 0 ? '#52c41a' : '#f5222d',
                  fontWeight: 'bold' 
                }}
              />
            </Tooltip>
          </Col>
        </Row>
        
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Tooltip title="计算公式：∑(ASR成本) = 所有记录的asrCost字段求和">
              <Statistic 
                title="ASR成本(USD)" 
                value={summaryStats.totalASRCost.toFixed(8)} 
                valueStyle={{ color: '#fa8c16' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Tooltip title="计算公式：∑(TTS成本) = 所有记录的ttsCost字段求和">
              <Statistic 
                title="TTS成本(USD)" 
                value={summaryStats.totalTTSCost.toFixed(8)} 
                valueStyle={{ color: '#13c2c2' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Tooltip title="计算公式：∑(LLM成本) = 所有记录的llmCost字段求和">
              <Statistic 
                title="LLM成本(USD)" 
                value={summaryStats.totalLLMCost.toFixed(8)} 
                valueStyle={{ color: '#eb2f96' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Tooltip title="计算公式：总通话时长 = ∑(callDurationSec) ÷ 60，单位转换为分钟">
              <Statistic 
                title="总通话时长" 
                value={Math.round(summaryStats.totalCallDuration / 60)} 
                suffix="分钟"
                valueStyle={{ color: '#1890ff' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Tooltip title="计算公式：平均通话时长 = ∑(callDurationSec) ÷ 记录数，四舍五入取整">
              <Statistic 
                title="平均通话时长" 
                value={summaryStats.avgCallDuration} 
                suffix="秒"
                valueStyle={{ color: '#52c41a' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Tooltip title="计算公式：平均每通成本 = AI总成本 ÷ 记录数">
              <Statistic 
                title="平均每通成本(USD)" 
                value={summaryStats.avgCostPerCall.toFixed(8)} 
                valueStyle={{ color: '#722ed1' }}
              />
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* 数据表格 */}
      <Table<BillRecord>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        scroll={{ x: 2040, y: 600 }}
        size="small"
        pagination={{
          current: pagination.currentPage,
          pageSize: pagination.pageSize,
          total: pagination.totalRecords,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          onChange: onPageChange,
          onShowSizeChange: onPageChange,
          pageSizeOptions: ['10', '20', '50', '100', '500', '1000'],
          style: { marginTop: 16 }
        }}
        locale={{
          emptyText: '暂无账单数据'
        }}
      />
    </div>
  );
};

export default BillTable; 