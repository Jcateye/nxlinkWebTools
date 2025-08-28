import React, { useState } from 'react';
import { Card, Row, Col, Input, InputNumber, Select, Button, Space, Collapse, Modal, message, Dropdown } from 'antd';
import { FilterOutlined, ClearOutlined, SaveOutlined, HistoryOutlined, DownOutlined } from '@ant-design/icons';
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
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');

  // 保存的筛选条件键名
  const SAVED_FILTERS_KEY = 'billSavedFilters';

  // 获取保存的筛选条件
  const getSavedFilters = (): Record<string, BillFilters> => {
    try {
      const saved = localStorage.getItem(SAVED_FILTERS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('获取保存的筛选条件失败:', error);
      return {};
    }
  };

  // 保存筛选条件
  const saveFilters = (name: string, filters: BillFilters) => {
    try {
      const savedFilters = getSavedFilters();
      savedFilters[name] = filters;
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(savedFilters));
      message.success(`筛选条件 "${name}" 保存成功`);
    } catch (error) {
      console.error('保存筛选条件失败:', error);
      message.error('保存筛选条件失败');
    }
  };

  // 删除保存的筛选条件
  const deleteSavedFilter = (name: string) => {
    try {
      const savedFilters = getSavedFilters();
      delete savedFilters[name];
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(savedFilters));
      message.success(`筛选条件 "${name}" 删除成功`);
    } catch (error) {
      console.error('删除筛选条件失败:', error);
      message.error('删除筛选条件失败');
    }
  };

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
        // AI相关字段筛选
        customerTotalPriceUSDRange: { min: null, max: null },
        sipTotalCustomerOriginalPriceUSDRange: { min: null, max: null },
        sipFeeDurationRange: { min: null, max: null },
        // 原有字段保持兼容
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

  // 处理保存筛选条件
  const handleSaveFilters = () => {
    if (!saveFilterName.trim()) {
      message.error('请输入筛选条件名称');
      return;
    }
    saveFilters(saveFilterName.trim(), filters);
    setSaveModalVisible(false);
    setSaveFilterName('');
  };

  // 处理加载筛选条件
  const handleLoadFilters = (name: string) => {
    const savedFilters = getSavedFilters();
    const savedFilter = savedFilters[name];
    if (savedFilter) {
      onFiltersChange(savedFilter);
      message.success(`筛选条件 "${name}" 加载成功`);
    }
  };

  // 生成保存的筛选条件菜单
  const getSavedFiltersMenu = () => {
    const savedFilters = getSavedFilters();
    const menuItems = Object.keys(savedFilters).map(name => ({
      key: name,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 150 }}>
          <span
            onClick={() => handleLoadFilters(name)}
            style={{ flex: 1, cursor: 'pointer' }}
          >
            {name}
          </span>
          <Button
            type="text"
            size="small"
            danger
            onClick={(e) => {
              e.stopPropagation();
              Modal.confirm({
                title: '确认删除',
                content: `确定要删除筛选条件 "${name}" 吗？`,
                onOk: () => deleteSavedFilter(name)
              });
            }}
          >
            删除
          </Button>
        </div>
      )
    }));

    if (menuItems.length === 0) {
      menuItems.push({
        key: 'empty',
        label: <span style={{ color: '#999' }}>暂无保存的筛选条件</span>
      });
    }

    return { items: menuItems };
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
        <Space size="small">
          <Button 
            size="small" 
            icon={<SaveOutlined />} 
            onClick={() => setSaveModalVisible(true)}
            disabled={!hasActiveFilters()}
          >
            保存筛选
          </Button>
          <Dropdown menu={getSavedFiltersMenu()}>
            <Button size="small" icon={<HistoryOutlined />}>
              加载筛选 <DownOutlined />
            </Button>
          </Dropdown>
          <Button 
            size="small" 
            icon={<ClearOutlined />} 
            onClick={clearAdvancedFilters}
            disabled={!hasActiveFilters()}
          >
            清空筛选
          </Button>
        </Space>
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
          <div style={{ marginBottom: 16 }}>
            <Space size="small" wrap>
              <span style={{ fontSize: '12px', color: '#666' }}>快速金额筛选：</span>
              <Button 
                size="small" 
                onClick={() => onFiltersChange({
                  ...filters,
                  advancedFilters: {
                    ...filters.advancedFilters,
                    customerTotalPriceUSDRange: { min: 0, max: 1 }
                  }
                })}
              >
                AI消费 ≤$1
              </Button>
              <Button 
                size="small" 
                onClick={() => onFiltersChange({
                  ...filters,
                  advancedFilters: {
                    ...filters.advancedFilters,
                    customerTotalPriceUSDRange: { min: 1, max: 10 }
                  }
                })}
              >
                AI消费 $1-$10
              </Button>
              <Button 
                size="small" 
                onClick={() => onFiltersChange({
                  ...filters,
                  advancedFilters: {
                    ...filters.advancedFilters,
                    sipTotalCustomerOriginalPriceUSDRange: { min: 0, max: 1 }
                  }
                })}
              >
                线路消费 ≤$1
              </Button>
              <Button 
                size="small" 
                onClick={() => onFiltersChange({
                  ...filters,
                  advancedFilters: {
                    ...filters.advancedFilters,
                    sipTotalCustomerOriginalPriceUSDRange: { min: 1, max: 10 }
                  }
                })}
              >
                线路消费 $1-$10
              </Button>
            </Space>
          </div>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>AI通话时长(秒)</div>
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
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>AI计费时长(秒)</div>
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
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>线路计费时长(秒)</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.sipFeeDurationRange.min}
                  onChange={handleRangeFilterChange('sipFeeDurationRange', 'min')}
                  placeholder="最小值"
                  min={0}
                />
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.sipFeeDurationRange.max}
                  onChange={handleRangeFilterChange('sipFeeDurationRange', 'max')}
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
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>AI消费(USD)</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.customerTotalPriceUSDRange.min}
                  onChange={handleRangeFilterChange('customerTotalPriceUSDRange', 'min')}
                  placeholder="最小值"
                  min={0}
                  step={0.01}
                />
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.customerTotalPriceUSDRange.max}
                  onChange={handleRangeFilterChange('customerTotalPriceUSDRange', 'max')}
                  placeholder="最大值"
                  min={0}
                  step={0.01}
                />
              </Space.Compact>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>线路消费(USD)</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.sipTotalCustomerOriginalPriceUSDRange.min}
                  onChange={handleRangeFilterChange('sipTotalCustomerOriginalPriceUSDRange', 'min')}
                  placeholder="最小值"
                  min={0}
                  step={0.01}
                />
                <InputNumber
                  size="small"
                  style={{ width: '50%' }}
                  value={filters.advancedFilters.sipTotalCustomerOriginalPriceUSDRange.max}
                  onChange={handleRangeFilterChange('sipTotalCustomerOriginalPriceUSDRange', 'max')}
                  placeholder="最大值"
                  min={0}
                  step={0.01}
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

      {/* 保存筛选条件Modal */}
      <Modal
        title="保存筛选条件"
        open={saveModalVisible}
        onOk={handleSaveFilters}
        onCancel={() => {
          setSaveModalVisible(false);
          setSaveFilterName('');
        }}
        okText="保存"
        cancelText="取消"
      >
        <Input
          placeholder="请输入筛选条件名称"
          value={saveFilterName}
          onChange={(e) => setSaveFilterName(e.target.value)}
          onPressEnter={handleSaveFilters}
          maxLength={50}
        />
        <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
          保存当前所有筛选条件（包括基础筛选和高级筛选）
        </div>
      </Modal>
    </Card>
  );
};

export default AdvancedFilters; 