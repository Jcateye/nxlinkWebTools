import React, { useState, useEffect, useMemo } from 'react';
import { Table, Typography, Tag, Button, Tooltip, Card, Row, Col, Statistic } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { BillRecord, CALL_DIRECTION_TEXT, PaginationInfo, BillFieldConfig } from '../../types/bill';
import { calculateNewLineBilling, calculateBillingQuantity, parseBillingRule } from '../../utils/billingCalculator';

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
  customLineUnitPrice?: number | null;
  fieldConfig?: BillFieldConfig | null; // 字段显示配置
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
  timeRange,
  customLineUnitPrice,
  fieldConfig
}) => {
  const [isDesensitized, setIsDesensitized] = useState<boolean>(initialDesensitized);

  // 当父组件传入的初始脱敏状态变化时，同步更新本地状态
  useEffect(() => {
    setIsDesensitized(initialDesensitized);
  }, [initialDesensitized]);

  // 直接使用传入的数据（已经在页面级别计算过增强字段）
  const enhancedData = data;

  // 计算汇总统计信息
  const summaryStats = useMemo(() => {
    if (!enhancedData || enhancedData.length === 0) {
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
        totalBillingSize: 0,
        totalNewLineBillingQuantity: 0,
        totalNewLineConsumption: 0,
        avgCallDuration: 0,
        avgCostPerCall: 0,
        avgOriginalLineUnitPrice: 0,
        avgNewLineUnitPrice: 0
      };
    }

    const recordCount = enhancedData.length;
    const totalSipCost = enhancedData.reduce((sum, record) => sum + (record.sipTotalCustomerOriginalPriceUSD || 0), 0);
    const totalAICost = enhancedData.reduce((sum, record) => sum + (record.customerTotalPriceUSD || 0), 0);
    const totalCost = enhancedData.reduce((sum, record) => sum + (record.totalCost || 0), 0);
    const totalASRCost = enhancedData.reduce((sum, record) => sum + (record.asrCost || 0), 0);
    const totalTTSCost = enhancedData.reduce((sum, record) => sum + (record.ttsCost || 0), 0);
    const totalLLMCost = enhancedData.reduce((sum, record) => sum + (record.llmCost || 0), 0);
    const totalCallDuration = enhancedData.reduce((sum, record) => sum + (record.callDurationSec || 0), 0);
    const totalSipFeeDuration = enhancedData.reduce((sum, record) => sum + (record.sipFeeDuration || 0), 0);
    const totalAIFeeDuration = enhancedData.reduce((sum, record) => sum + (record.feeDurationSec || 0), 0);
    const totalBillingSize = enhancedData.reduce((sum, record) => sum + (record.size || 0), 0);
    const totalNewLineBillingQuantity = enhancedData.reduce((sum, record) => sum + (record.newLineBillingQuantity || 0), 0);
    const totalNewLineConsumption = enhancedData.reduce((sum, record) => sum + (record.newLineConsumption || 0), 0);
    const totalOriginalLineUnitPrice = enhancedData.reduce((sum, record) => sum + (record.originalLineUnitPrice || 0), 0);
    const totalNewLineUnitPrice = enhancedData.reduce((sum, record) => sum + (record.newLineUnitPrice || 0), 0);

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
      totalBillingSize,
      totalNewLineBillingQuantity,
      totalNewLineConsumption,
      avgCallDuration: recordCount > 0 ? Math.round(totalCallDuration / recordCount) : 0,
      avgCostPerCall: recordCount > 0 ? totalCost / recordCount : 0,
      avgOriginalLineUnitPrice: recordCount > 0 ? totalOriginalLineUnitPrice / recordCount : 0,
      avgNewLineUnitPrice: recordCount > 0 ? totalNewLineUnitPrice / recordCount : 0
    };
  }, [enhancedData]);

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

  // 所有可能的表格列配置
  const allColumns: ColumnsType<BillRecord> = [
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
      title: '线路通话时长(秒)',
      dataIndex: 'sipCallDurationSec',
      key: 'sipCallDurationSec',
      width: 120,
      align: 'center' as const,
      render: (duration: number | undefined) => (
        <Text style={{ fontSize: '12px' }}>{duration || 0}</Text>
      )
    },
    {
      title: 'AI通话时长(秒)',
      dataIndex: 'callDurationSec',
      key: 'callDurationSec',
      width: 110,
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
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>计费量</span>
          <Tooltip title="根据计费规则计算的计费周期数量。例如：通话61秒按60+60规则计费，计费量为2">
            <QuestionCircleOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          </Tooltip>
        </div>
      ),
      dataIndex: 'size',
      key: 'size',
      width: 80,
      align: 'center' as const,
      render: (size: number) => (
        <Text style={{ fontSize: '12px', fontWeight: 'bold', color: '#1890ff' }}>{size || 0}</Text>
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
      dataIndex: 'sipPriceType',
      key: 'sipPriceType',
      width: 110,
      render: (type: string) => (
        <Text style={{ fontSize: '11px' }}>{type || '-'}</Text>
      )
    },
    {
      title: 'AI计费规则',
      dataIndex: 'billingCycle',
      key: 'billingCycle',
      width: 100,
      render: (cycle: string) => (
        <Text style={{ fontSize: '11px' }}>{cycle || '-'}</Text>
      )
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>原线路单价</span>
          <Tooltip title="原线路消费 ÷ 原线路计费量">
            <QuestionCircleOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          </Tooltip>
        </div>
      ),
      dataIndex: 'originalLineUnitPrice',
      key: 'originalLineUnitPrice',
      width: 120,
      align: 'right' as const,
      render: (price: number) => (
        <Text style={{ fontSize: '11px' }}>{formatCurrency(price)}</Text>
      )
    },
    {
      title: '新线路计费周期',
      dataIndex: 'newLineBillingCycle',
      key: 'newLineBillingCycle',
      width: 120,
      align: 'center' as const,
      render: (cycle: string) => (
        <Text style={{ fontSize: '11px', color: '#52c41a', fontWeight: 'bold' }}>{cycle || '20+20'}</Text>
      )
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>新线路单价</span>
          <Tooltip title="原线路单价 ÷ 3">
            <QuestionCircleOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          </Tooltip>
        </div>
      ),
      dataIndex: 'newLineUnitPrice',
      key: 'newLineUnitPrice',
      width: 120,
      align: 'right' as const,
      render: (price: number) => (
        <Text style={{ fontSize: '11px', color: '#52c41a' }}>{formatCurrency(price)}</Text>
      )
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>新线路计费量</span>
          <Tooltip title="按20+20规则计算的计费周期数量">
            <QuestionCircleOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          </Tooltip>
        </div>
      ),
      dataIndex: 'newLineBillingQuantity',
      key: 'newLineBillingQuantity',
      width: 120,
      align: 'center' as const,
      render: (quantity: number) => (
        <Text style={{ fontSize: '12px', color: '#52c41a', fontWeight: 'bold' }}>{quantity || 0}</Text>
      )
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>新线路消费</span>
          <Tooltip title={customLineUnitPrice ? "自定义单价 × 新线路计费量" : "新线路单价 × 新线路计费量"}>
            <QuestionCircleOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          </Tooltip>
        </div>
      ),
      dataIndex: 'newLineConsumption',
      key: 'newLineConsumption',
      width: 120,
      align: 'right' as const,
      render: (consumption: number, record: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: '11px', color: '#52c41a', fontWeight: 'bold' }}>
            {formatCurrency(consumption)}
          </Text>
          {record.isUsingCustomPrice && (
            <Text style={{ fontSize: '10px', color: '#faad14' }}>自定义单价</Text>
          )}
        </div>
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

  // 根据字段配置筛选显示的列
  const columns: ColumnsType<BillRecord> = useMemo(() => {
    if (!fieldConfig) {
      // 如果没有字段配置，显示所有列
      return allColumns;
    }
    
    // 根据字段配置筛选列
    return allColumns.filter(column => {
      const key = column.key as keyof BillFieldConfig;
      return fieldConfig[key] === true;
    });
  }, [allColumns, fieldConfig]);

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
            {customLineUnitPrice && (
              <Tag color="orange" style={{ fontSize: '12px' }}>
                💰 自定义单价: USD {customLineUnitPrice.toFixed(8)}
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
            <Tooltip title="计算公式：∑(计费量) = 所有记录的size字段求和，表示总计费周期数">
              <Statistic 
                title="总计费量" 
                value={summaryStats.totalBillingSize} 
                valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Tooltip title="计算公式：总通话时长 = ∑(callDurationSec) ÷ 60，单位转换为分钟">
              <Statistic 
                title="总通话时长" 
                value={Math.round(summaryStats.totalCallDuration / 60)} 
                suffix="分钟"
                valueStyle={{ color: '#52c41a' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Tooltip title="计算公式：平均通话时长 = ∑(callDurationSec) ÷ 记录数，四舍五入取整">
              <Statistic 
                title="平均通话时长" 
                value={summaryStats.avgCallDuration} 
                suffix="秒"
                valueStyle={{ color: '#722ed1' }}
              />
            </Tooltip>
          </Col>
        </Row>
        
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Tooltip title="计算公式：平均每通成本 = AI总成本 ÷ 记录数">
              <Statistic 
                title="平均每通成本(USD)" 
                value={summaryStats.avgCostPerCall.toFixed(8)} 
                valueStyle={{ color: '#722ed1' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Tooltip title="计算公式：平均计费量 = 总计费量 ÷ 记录数，表示平均每通话的计费周期数">
              <Statistic 
                title="平均计费量" 
                value={summaryStats.recordCount > 0 ? (summaryStats.totalBillingSize / summaryStats.recordCount).toFixed(2) : '0.00'} 
                valueStyle={{ color: '#1890ff' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={5}>
            <Tooltip title="计算公式：∑(新线路消费) = 所有记录的新线路消费求和">
              <Statistic 
                title="新线路消费总计(USD)" 
                value={summaryStats.totalNewLineConsumption.toFixed(8)} 
                valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Tooltip title="计算公式：∑(新线路计费量) = 所有记录的新线路计费量求和">
              <Statistic 
                title="新线路计费量总计" 
                value={summaryStats.totalNewLineBillingQuantity} 
                valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={5}>
            <Tooltip title="计算公式：平均原线路单价 = ∑(原线路单价) ÷ 记录数">
              <Statistic 
                title="平均原线路单价(USD)" 
                value={summaryStats.avgOriginalLineUnitPrice.toFixed(8)} 
                valueStyle={{ color: '#fa8c16' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={5}>
            <Tooltip title="计算公式：平均新线路单价 = ∑(新线路单价) ÷ 记录数">
              <Statistic 
                title="平均新线路单价(USD)" 
                value={summaryStats.avgNewLineUnitPrice.toFixed(8)} 
                valueStyle={{ color: '#52c41a' }}
              />
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={6} lg={5}>
            <Tooltip title="计算公式：线路费用节省 = 原线路消费总计 - 新线路消费总计">
              <Statistic 
                title="线路费用节省(USD)" 
                value={(summaryStats.totalSipCost - summaryStats.totalNewLineConsumption).toFixed(8)} 
                valueStyle={{ 
                  color: (summaryStats.totalSipCost - summaryStats.totalNewLineConsumption) >= 0 ? '#52c41a' : '#f5222d',
                  fontWeight: 'bold' 
                }}
              />
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* 数据表格 */}
      <Table<BillRecord>
        columns={columns}
        dataSource={enhancedData}
        loading={loading}
        rowKey="id"
        scroll={{ x: 2720, y: 600 }}
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