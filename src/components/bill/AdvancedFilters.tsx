import React, { useState } from 'react';
import { Card, Row, Col, Input, InputNumber, Select, Button, Space, Collapse } from 'antd';
import { FilterOutlined, ClearOutlined } from '@ant-design/icons';
import { BillFilters, CALL_DIRECTION_TEXT } from '../../types/bill';

const { Panel } = Collapse;
const { Option } = Select;

interface AdvancedFiltersProps {
  filters: BillFilters;
  onFiltersChange: (filters: BillFilters) => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange
}) => {
  const [activeKey, setActiveKey] = useState<string | string[]>([]);

  // 处理字符串筛选条件变化
  const handleStringFilterChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      advancedFilters: {
        ...filters.advancedFilters,
        [field]: e.target.value
      }
    });
  };

  // 处理数字范围筛选条件变化
  const handleRangeFilterChange = (field: string, type: 'min' | 'max') => (value: number | null) => {
    const currentRange = filters.advancedFilters[field as keyof typeof filters.advancedFilters];
    
    // 确保currentRange是一个范围对象
    if (typeof currentRange === 'object' && currentRange !== null && 'min' in currentRange && 'max' in currentRange) {
      onFiltersChange({
        ...filters,
        advancedFilters: {
          ...filters.advancedFilters,
          [field]: {
            ...currentRange,
            [type]: value
          }
        }
      });
    }
  };

  // 处理呼叫方向变化
  const handleCallDirectionChange = (value: number | null) => {
    onFiltersChange({
      ...filters,
      advancedFilters: {
        ...filters.advancedFilters,
        callDirection: value
      }
    });
  };

  // 清空所有高级筛选条件
  const clearAdvancedFilters = () => {
    onFiltersChange({
      ...filters,
      advancedFilters: {
        customerName: '',
        tenantName: '',
        userNumber: '',
        caller: '',
        callId: '',
        billingCycle: '',
        customerCurrency: '',
        callDurationRange: { min: null, max: null },
        feeDurationRange: { min: null, max: null },
        customerPriceRange: { min: null, max: null },
        customerTotalPriceRange: { min: null, max: null },
        asrCostRange: { min: null, max: null },
        ttsCostRange: { min: null, max: null },
        llmCostRange: { min: null, max: null },
        totalCostRange: { min: null, max: null },
        totalProfitRange: { min: null, max: null },
        sizeRange: { min: null, max: null },
        callDirection: null
      },
      customLineUnitPrice: null
    });
  };

  // 检查是否有活跃的筛选条件
  const hasActiveFilters = () => {
    const { advancedFilters } = filters;
    return (
      advancedFilters.customerName ||
      advancedFilters.tenantName ||
      advancedFilters.userNumber ||
      advancedFilters.caller ||
      advancedFilters.callId ||
      advancedFilters.billingCycle ||
      advancedFilters.customerCurrency ||
      advancedFilters.callDirection !== null ||
      Object.values(advancedFilters).some(filter => 
        typeof filter === 'object' && filter !== null && (filter.min !== null || filter.max !== null)
      )
    );
  };

  return (
    <Card 
      size="small"
      style={{ marginBottom: 16 }}
      title={
        <Space>
          <FilterOutlined />
          高级筛选
          {hasActiveFilters() && (
            <span style={{ color: '#1890ff', fontSize: '12px' }}>
              (已启用)
            </span>
          )}
        </Space>
      }
      extra={
        <Button 
          size="small" 
          icon={<ClearOutlined />} 
          onClick={clearAdvancedFilters}
          disabled={!hasActiveFilters()}
        >
          清空筛选
        </Button>
      }
    >
      <Collapse 
        size="small"
        activeKey={activeKey}
        onChange={setActiveKey}
        ghost
      >
        <Panel header="字符串模糊筛选" key="string">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>客户名称</div>
              <Input
                size="small"
                value={filters.advancedFilters.customerName}
                onChange={handleStringFilterChange('customerName')}
                placeholder="支持模糊匹配"
                allowClear
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>租户名称</div>
              <Input
                size="small"
                value={filters.advancedFilters.tenantName}
                onChange={handleStringFilterChange('tenantName')}
                placeholder="支持模糊匹配"
                allowClear
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>用户号码</div>
              <Input
                size="small"
                value={filters.advancedFilters.userNumber}
                onChange={handleStringFilterChange('userNumber')}
                placeholder="支持模糊匹配"
                allowClear
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>主叫号码</div>
              <Input
                size="small"
                value={filters.advancedFilters.caller}
                onChange={handleStringFilterChange('caller')}
                placeholder="支持模糊匹配"
                allowClear
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>呼叫ID</div>
              <Input
                size="small"
                value={filters.advancedFilters.callId}
                onChange={handleStringFilterChange('callId')}
                placeholder="支持模糊匹配"
                allowClear
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>计费周期</div>
              <Input
                size="small"
                value={filters.advancedFilters.billingCycle}
                onChange={handleStringFilterChange('billingCycle')}
                placeholder="支持模糊匹配"
                allowClear
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>客户货币</div>
              <Input
                size="small"
                value={filters.advancedFilters.customerCurrency}
                onChange={handleStringFilterChange('customerCurrency')}
                placeholder="支持模糊匹配"
                allowClear
              />
            </Col>
          </Row>
        </Panel>

        <Panel header="数字范围筛选" key="range">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>通话时长(秒)</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.callDurationRange.min}
                  onChange={handleRangeFilterChange('callDurationRange', 'min')}
                  placeholder="最小值"
                  min={0}
                />
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.callDurationRange.max}
                  onChange={handleRangeFilterChange('callDurationRange', 'max')}
                  placeholder="最大值"
                  min={0}
                />
              </Space.Compact>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>计费时长(秒)</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.feeDurationRange.min}
                  onChange={handleRangeFilterChange('feeDurationRange', 'min')}
                  placeholder="最小值"
                  min={0}
                />
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.feeDurationRange.max}
                  onChange={handleRangeFilterChange('feeDurationRange', 'max')}
                  placeholder="最大值"
                  min={0}
                />
              </Space.Compact>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>计费量</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.sizeRange.min}
                  onChange={handleRangeFilterChange('sizeRange', 'min')}
                  placeholder="最小值"
                  min={0}
                  precision={0}
                />
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.sizeRange.max}
                  onChange={handleRangeFilterChange('sizeRange', 'max')}
                  placeholder="最大值"
                  min={0}
                  precision={0}
                />
              </Space.Compact>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>客户价格</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.customerPriceRange.min}
                  onChange={handleRangeFilterChange('customerPriceRange', 'min')}
                  placeholder="最小值"
                  min={0}
                  step={0.01}
                />
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.customerPriceRange.max}
                  onChange={handleRangeFilterChange('customerPriceRange', 'max')}
                  placeholder="最大值"
                  min={0}
                  step={0.01}
                />
              </Space.Compact>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>客户总价</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.customerTotalPriceRange.min}
                  onChange={handleRangeFilterChange('customerTotalPriceRange', 'min')}
                  placeholder="最小值"
                  min={0}
                  step={0.01}
                />
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.customerTotalPriceRange.max}
                  onChange={handleRangeFilterChange('customerTotalPriceRange', 'max')}
                  placeholder="最大值"
                  min={0}
                  step={0.01}
                />
              </Space.Compact>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>ASR成本</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.asrCostRange.min}
                  onChange={handleRangeFilterChange('asrCostRange', 'min')}
                  placeholder="最小值"
                  min={0}
                  step={0.01}
                />
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.asrCostRange.max}
                  onChange={handleRangeFilterChange('asrCostRange', 'max')}
                  placeholder="最大值"
                  min={0}
                  step={0.01}
                />
              </Space.Compact>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>TTS成本</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.ttsCostRange.min}
                  onChange={handleRangeFilterChange('ttsCostRange', 'min')}
                  placeholder="最小值"
                  min={0}
                  step={0.01}
                />
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.ttsCostRange.max}
                  onChange={handleRangeFilterChange('ttsCostRange', 'max')}
                  placeholder="最大值"
                  min={0}
                  step={0.01}
                />
              </Space.Compact>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>LLM成本</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.llmCostRange.min}
                  onChange={handleRangeFilterChange('llmCostRange', 'min')}
                  placeholder="最小值"
                  min={0}
                  step={0.01}
                />
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.llmCostRange.max}
                  onChange={handleRangeFilterChange('llmCostRange', 'max')}
                  placeholder="最大值"
                  min={0}
                  step={0.01}
                />
              </Space.Compact>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>总成本</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.totalCostRange.min}
                  onChange={handleRangeFilterChange('totalCostRange', 'min')}
                  placeholder="最小值"
                  min={0}
                  step={0.01}
                />
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.totalCostRange.max}
                  onChange={handleRangeFilterChange('totalCostRange', 'max')}
                  placeholder="最大值"
                  min={0}
                  step={0.01}
                />
              </Space.Compact>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>总利润</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.totalProfitRange.min}
                  onChange={handleRangeFilterChange('totalProfitRange', 'min')}
                  placeholder="最小值"
                  step={0.01}
                />
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.totalProfitRange.max}
                  onChange={handleRangeFilterChange('totalProfitRange', 'max')}
                  placeholder="最大值"
                  step={0.01}
                />
              </Space.Compact>
            </Col>
          </Row>
        </Panel>

        <Panel header="其他筛选" key="other">
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>呼叫方向</div>
              <Select
                size="small"
                style={{ width: '100%' }}
                value={filters.advancedFilters.callDirection}
                onChange={handleCallDirectionChange}
                placeholder="请选择呼叫方向"
                allowClear
              >
                {Object.entries(CALL_DIRECTION_TEXT).map(([key, value]) => (
                  <Option key={key} value={Number(key)}>
                    {value}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Panel>
      </Collapse>
    </Card>
  );
};

export default AdvancedFilters; 