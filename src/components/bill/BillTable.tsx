import React from 'react';
import { Table, Typography, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BillRecord, CALL_DIRECTION_TEXT, PaginationInfo } from '../../types/bill';

const { Text } = Typography;

interface BillTableProps {
  data: BillRecord[];
  loading?: boolean;
  pagination: PaginationInfo;
  onPageChange?: (page: number, pageSize: number) => void;
}

const BillTable: React.FC<BillTableProps> = ({
  data,
  loading = false,
  pagination,
  onPageChange
}) => {
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
      title: '用户号码',
      dataIndex: 'callee',
      key: 'callee',
      width: 120,
      render: (callee: string) => (
        <Text style={{ fontSize: '12px' }}>{callee || '-'}</Text>
      )
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
      title: '线路消费',
      dataIndex: 'sipTotalCustomerOriginalPriceUSD',
      key: 'sipTotalCustomerOriginalPriceUSD',
      width: 100,
      align: 'right' as const,
      render: (amount: number) => (
        <Text style={{ fontSize: '11px' }}>{formatCurrency(amount)}</Text>
      )
    },
    {
      title: 'AI消费',
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
    <Table<BillRecord>
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="id"
      scroll={{ x: 1800, y: 600 }}
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
        pageSizeOptions: ['10', '20', '50', '100'],
        style: { marginTop: 16 }
      }}
      locale={{
        emptyText: '暂无账单数据'
      }}
    />
  );
};

export default BillTable; 