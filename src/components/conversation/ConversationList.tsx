import React, { useState, useEffect } from 'react';
import { Table, Spin, Alert, Tooltip, Input, Button, Row, Col, DatePicker } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { getConversationList } from '../../services/api';
import { Conversation, ConversationListResponse } from '../../types';
import { useUserContext } from '../../context/UserContext';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ onSelectConversation }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchCallId, setSearchCallId] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const { faqUserParams } = useUserContext();

  const fetchConversations = async (page: number, pageSize: number, callId?: string, startTime?: string, endTime?: string) => {
    // 检查是否有源租户的token
    if (!faqUserParams?.sourceAuthorization) {
      setError('请先完成身份认证');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const filters: any = {};
      if (callId) filters.callId = callId;
      if (startTime) filters.start_time = startTime;
      if (endTime) filters.end_time = endTime;
      
      const response: ConversationListResponse = await getConversationList(page, pageSize, filters);
      if (response.code === 0 && response.data) {
        setConversations(response.data.list);
        setPagination({
          current: response.data.page_number,
          pageSize: response.data.page_size,
          total: response.data.total,
        });
      } else {
        throw new Error(response.message || 'Failed to fetch conversations');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (faqUserParams?.sourceAuthorization) {
      fetchConversations(pagination.current, pagination.pageSize);
    }
  }, [faqUserParams?.sourceAuthorization]);

  const handleTableChange = (pagination: any) => {
    const startTime = dateRange?.[0]?.format('YYYY-MM-DD HH:mm:ss');
    const endTime = dateRange?.[1]?.format('YYYY-MM-DD HH:mm:ss');
    fetchConversations(pagination.current, pagination.pageSize, searchCallId, startTime, endTime);
  };

  const handleSearch = () => {
    const startTime = dateRange?.[0]?.format('YYYY-MM-DD HH:mm:ss');
    const endTime = dateRange?.[1]?.format('YYYY-MM-DD HH:mm:ss');
    fetchConversations(1, pagination.pageSize, searchCallId, startTime, endTime);
  };

  const handleReset = () => {
    setSearchCallId('');
    setDateRange(null);
    fetchConversations(1, pagination.pageSize);
  };

  const columns: ColumnsType<Conversation> = [
    {
      title: '客户号码',
      dataIndex: 'customer_phone',
      key: 'customer_phone',
    },
    {
      title: '会话ID',
      dataIndex: 'relate_session_id',
      key: 'relate_session_id',
      ellipsis: true,
      render: (text) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
        title: '总结',
        dataIndex: 'conv_summary',
        key: 'conv_summary',
        ellipsis: true,
        render: (text) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (ts) => new Date(ts * 1000).toLocaleString(),
    },
  ];

  if (loading) {
    return <Spin />;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input
            placeholder="按会话ID (callId) 搜索"
            value={searchCallId}
            onChange={(e) => setSearchCallId(e.target.value)}
            onPressEnter={handleSearch}
          />
        </Col>
        <Col span={10}>
          <RangePicker
            showTime
            value={dateRange}
            onChange={setDateRange}
            placeholder={['开始时间', '结束时间']}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={3}>
          <Button type="primary" onClick={handleSearch} style={{ width: '100%' }}>搜索</Button>
        </Col>
        <Col span={3}>
          <Button onClick={handleReset} style={{ width: '100%' }}>重置</Button>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={conversations}
        rowKey="id"
        pagination={pagination}
        onChange={handleTableChange}
        onRow={(record) => ({
          onClick: () => onSelectConversation(record),
        })}
        rowClassName="cursor-pointer"
      />
    </>
  );
};

export default ConversationList;
