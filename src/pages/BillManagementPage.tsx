import React, { useState, useEffect } from 'react';
import { Layout, Typography, Alert, Spin } from 'antd';
import dayjs from 'dayjs';
import { BillFilters, BillRecord, PaginationInfo } from '../types/bill';
import { queryBillList, hasValidBillToken } from '../services/billApi';
import BillFiltersComponent from '../components/bill/BillFilters';
import BillTable from '../components/bill/BillTable';

const { Content } = Layout;
const { Title } = Typography;

const BillManagementPage: React.FC = () => {
  // 状态管理
  const [filters, setFilters] = useState<BillFilters>({
    companyNameQuery: '',
    selectedCompany: null,
    selectedTeam: null,
    dateRange: {
      start: dayjs().format('YYYY-MM-DD'), // 默认今天
      end: dayjs().format('YYYY-MM-DD')
    },
    timeRange: {
      start: '00:00:00',
      end: '23:59:59'
    },
    agentFlowName: '',
    userNumber: ''
  });

  const [billRecords, setBillRecords] = useState<BillRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 0
  });

  // 检查是否有有效的API令牌
  const [hasToken, setHasToken] = useState<boolean>(false);

  useEffect(() => {
    setHasToken(hasValidBillToken());
  }, []);

  // 构建查询参数
  const buildQueryParams = (page: number = pagination.currentPage, size: number = pagination.pageSize) => {
    if (!filters.selectedCompany || !filters.selectedTeam) {
      throw new Error('请先选择公司和团队');
    }

    // 构建开始和结束时间
    const startDate = filters.dateRange.start || dayjs().format('YYYY-MM-DD');
    const endDate = filters.dateRange.end || dayjs().format('YYYY-MM-DD');
    const startTime = filters.timeRange.start || '00:00:00';
    const endTime = filters.timeRange.end || '23:59:59';

    return {
      pageNum: page,
      pageSize: size,
      customerId: filters.selectedCompany.customerId,
      tenantId: filters.selectedTeam.id,
      agentFlowName: filters.agentFlowName.trim(),
      callee: filters.userNumber.trim(),
      startTime: `${startDate} ${startTime}`,
      endTime: `${endDate} ${endTime}`
    };
  };

  // 执行搜索
  const handleSearch = async (page: number = 1, size: number = pagination.pageSize) => {
    if (!hasToken) {
      return;
    }

    try {
      setLoading(true);
      const params = buildQueryParams(page, size);
      const result = await queryBillList(params);

      setBillRecords(result.items);
      setPagination({
        currentPage: page,
        pageSize: size,
        totalRecords: result.total,
        totalPages: Math.ceil(result.total / size)
      });
    } catch (error) {
      console.error('查询账单失败:', error);
      setBillRecords([]);
      setPagination({
        currentPage: page,
        pageSize: size,
        totalRecords: 0,
        totalPages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // 处理筛选条件变化
  const handleFiltersChange = (newFilters: BillFilters) => {
    setFilters(newFilters);
  };

  // 处理重置
  const handleReset = () => {
    const defaultFilters: BillFilters = {
      companyNameQuery: '',
      selectedCompany: null,
      selectedTeam: null,
      dateRange: {
        start: dayjs().format('YYYY-MM-DD'),
        end: dayjs().format('YYYY-MM-DD')
      },
      timeRange: {
        start: '00:00:00',
        end: '23:59:59'
      },
      agentFlowName: '',
      userNumber: ''
    };
    setFilters(defaultFilters);
    setBillRecords([]);
    setPagination({
      currentPage: 1,
      pageSize: 10,
      totalRecords: 0,
      totalPages: 0
    });
  };

  // 处理分页变化
  const handlePageChange = (page: number, pageSize: number) => {
    handleSearch(page, pageSize);
  };

  // 如果没有有效的API令牌，显示提示
  if (!hasToken) {
    return (
      <Layout style={{ minHeight: '100vh', padding: '24px' }}>
        <Content>
          <Alert
            message="缺少API令牌"
            description="账单查询功能需要与标签迁移工具共享API令牌。请先使用标签迁移工具进行登录授权。"
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', padding: '24px' }}>
      <Content>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
          <Title level={2} style={{ marginBottom: 24 }}>
            账单查询管理
          </Title>

          <BillFiltersComponent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onSearch={() => handleSearch(1, pagination.pageSize)}
            onReset={handleReset}
            loading={loading}
          />

          <BillTable
            data={billRecords}
            loading={loading}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </div>
      </Content>
    </Layout>
  );
};

export default BillManagementPage; 