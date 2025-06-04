import React from 'react';
import { Card, Row, Col, Form, DatePicker, TimePicker, Input, Button, Space } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { BillFilters, Company, Team } from '../../types/bill';
import CompanySelector from './CompanySelector';
import TeamSelector from './TeamSelector';

const { RangePicker } = DatePicker;

interface BillFiltersProps {
  filters: BillFilters;
  onFiltersChange: (filters: BillFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
}

const BillFiltersComponent: React.FC<BillFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  loading = false
}) => {
  const [form] = Form.useForm();

  // 处理公司选择变化
  const handleCompanyChange = (company: Company | null) => {
    onFiltersChange({
      ...filters,
      selectedCompany: company,
      selectedTeam: null // 清空团队选择
    });
  };

  // 处理团队选择变化
  const handleTeamChange = (team: Team | null) => {
    onFiltersChange({
      ...filters,
      selectedTeam: team
    });
  };

  // 处理日期范围变化
  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        start: dates?.[0]?.format('YYYY-MM-DD') || null,
        end: dates?.[1]?.format('YYYY-MM-DD') || null
      }
    });
  };

  // 处理时间范围变化
  const handleTimeRangeChange = (times: [Dayjs | null, Dayjs | null] | null) => {
    onFiltersChange({
      ...filters,
      timeRange: {
        start: times?.[0]?.format('HH:mm:ss') || null,
        end: times?.[1]?.format('HH:mm:ss') || null
      }
    });
  };

  // 处理Agent流程名称变化
  const handleAgentFlowNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      agentFlowName: e.target.value
    });
  };

  // 处理用户号码变化
  const handleUserNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      userNumber: e.target.value
    });
  };

  // 处理重置
  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  // 验证是否可以搜索
  const canSearch = filters.selectedCompany && filters.selectedTeam;

  // 获取默认的日期和时间值
  const getDefaultDateRange = (): [Dayjs, Dayjs] | null => {
    if (filters.dateRange.start && filters.dateRange.end) {
      return [dayjs(filters.dateRange.start), dayjs(filters.dateRange.end)];
    }
    return null;
  };

  const getDefaultTimeRange = (): [Dayjs, Dayjs] | null => {
    if (filters.timeRange.start && filters.timeRange.end) {
      return [
        dayjs(`2000-01-01 ${filters.timeRange.start}`),
        dayjs(`2000-01-01 ${filters.timeRange.end}`)
      ];
    }
    return null;
  };

  return (
    <Card title="筛选条件" style={{ marginBottom: 16 }}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="公司名称" required>
              <CompanySelector
                value={filters.selectedCompany}
                onChange={handleCompanyChange}
                placeholder="请输入公司名称进行搜索"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="团队名称" required>
              <TeamSelector
                value={filters.selectedTeam}
                onChange={handleTeamChange}
                selectedCompany={filters.selectedCompany}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="日期范围">
              <RangePicker
                style={{ width: '100%' }}
                value={getDefaultDateRange()}
                onChange={handleDateRangeChange}
                placeholder={['开始日期', '结束日期']}
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="时间范围">
              <TimePicker.RangePicker
                style={{ width: '100%' }}
                value={getDefaultTimeRange()}
                onChange={handleTimeRangeChange}
                placeholder={['开始时间', '结束时间']}
                format="HH:mm:ss"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Agent流程名称">
              <Input
                value={filters.agentFlowName}
                onChange={handleAgentFlowNameChange}
                placeholder="请输入Agent流程名称"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="用户号码">
              <Input
                value={filters.userNumber}
                onChange={handleUserNumberChange}
                placeholder="请输入用户号码"
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>

        <Row>
          <Col span={24}>
            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={onSearch}
                  loading={loading}
                  disabled={!canSearch}
                >
                  搜索
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  disabled={loading}
                >
                  重置
                </Button>
              </Space>
              {!canSearch && (
                <div style={{ marginTop: 8, color: '#ff7875', fontSize: '12px' }}>
                  ⚠️ 请先选择公司和团队后再进行搜索
                </div>
              )}
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default BillFiltersComponent; 