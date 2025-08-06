import React, { useState, useEffect } from 'react';
import {
  Modal,
  Checkbox,
  Row,
  Col,
  Card,
  Button,
  Space,
  Divider,
  Select,
  Input,
  message,
  Collapse,
  Tooltip,
  Badge
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
  CheckSquareOutlined,
  BorderOutlined,
  CopyOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { BillExportFieldConfig, BillExportPreset, BillExportFieldGroup } from '../../types/bill';

const { Panel } = Collapse;
const { Option } = Select;

interface ExportFieldSelectorProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (config: BillExportFieldConfig) => void;
  initialConfig?: BillExportFieldConfig;
}

// 字段分组定义
const fieldGroups: BillExportFieldGroup[] = [
  // 基础信息组
  { key: 'id', label: 'ID', group: '基础信息' },
  { key: 'customerId', label: '客户ID', group: '基础信息' },
  { key: 'tenantId', label: '租户ID', group: '基础信息' },
  { key: 'customerName', label: '客户名称', group: '基础信息' },
  { key: 'tenantName', label: '租户名称', group: '基础信息' },
  { key: 'agentFlowName', label: '代理流程名称', group: '基础信息' },

  // 通话信息组
  { key: 'callDirection', label: '呼叫方向', group: '通话信息' },
  { key: 'caller', label: '主叫号码', group: '通话信息' },
  { key: 'callee', label: '被叫号码', group: '通话信息' },
  { key: 'callId', label: '通话ID', group: '通话信息' },
  { key: 'callStartTime', label: '通话开始时间', group: '通话信息' },
  { key: 'callEndTime', label: '通话结束时间', group: '通话信息' },
  { key: 'callAnswerTime', label: '通话接听时间', group: '通话信息' },

  // 时长计费组
  { key: 'callDurationSec', label: '通话时长(秒)', group: '时长计费' },
  { key: 'feeDurationSec', label: 'AI计费时长(秒)', group: '时长计费' },
  { key: 'sipFeeDuration', label: '线路计费时长(秒)', group: '时长计费' },
  { key: 'billingCycle', label: '计费周期', group: '时长计费' },
  { key: 'size', label: '计费量', group: '时长计费' },
  { key: 'feeTime', label: '计费时间', group: '时长计费' },

  // 成本利润组
  { key: 'customerPrice', label: '客户单价', group: '成本利润' },
  { key: 'customerTotalPrice', label: '客户总价', group: '成本利润' },
  { key: 'customerTotalPriceUSD', label: 'AI消费(USD)', group: '成本利润' },
  { key: 'customerCurrency', label: '客户货币', group: '成本利润' },
  { key: 'allCustomerPriceUSD', label: '所有客户价格(USD)', group: '成本利润' },
  { key: 'asrCost', label: 'ASR成本', group: '成本利润' },
  { key: 'ttsCost', label: 'TTS成本', group: '成本利润' },
  { key: 'llmCost', label: 'LLM成本', group: '成本利润' },
  { key: 'totalCost', label: '总成本', group: '成本利润' },
  { key: 'totalProfit', label: '总利润', group: '成本利润' },

  // 线路相关组
  { key: 'sipCurrency', label: '线路货币', group: '线路相关' },
  { key: 'sipPriceType', label: '线路价格类型', group: '线路相关' },
  { key: 'sipTotalCustomerOriginalPrice', label: '线路原始总价', group: '线路相关' },
  { key: 'sipTotalCustomerOriginalPriceUSD', label: '线路消费(USD)', group: '线路相关' },
  { key: 'sipTotalCustomerPrice', label: '线路客户总价', group: '线路相关' },

  // 计算字段组
  { key: 'originalLineUnitPrice', label: '原线路单价', group: '计算字段' },
  { key: 'newLineBillingCycle', label: '新线路计费周期', group: '计算字段' },
  { key: 'newLineUnitPrice', label: '新线路单价', group: '计算字段' },
  { key: 'newLineBillingQuantity', label: '新线路计费量', group: '计算字段' },
  { key: 'newLineConsumption', label: '新线路消费', group: '计算字段' }
];

// 预设配置
const defaultPresets: BillExportPreset[] = [
  {
    id: 'basic',
    name: '基础字段',
    description: '包含基本的通话和计费信息',
    config: {
      // 基础信息
      id: true,
      customerId: false,
      tenantId: false,
      customerName: true,
      tenantName: true,
      agentFlowName: true,
      // 通话信息
      callDirection: true,
      caller: true,
      callee: true,
      callId: true,
      callStartTime: true,
      callEndTime: true,
      callAnswerTime: false,
      // 时长计费
      callDurationSec: true,
      feeDurationSec: true,
      sipFeeDuration: false,
      billingCycle: true,
      size: true,
      customerPrice: true,
      customerTotalPrice: true,
      customerTotalPriceUSD: true,
      customerCurrency: false,
      feeTime: false,
      // 线路相关
      sipCurrency: false,
      sipPriceType: false,
      sipTotalCustomerOriginalPrice: false,
      sipTotalCustomerOriginalPriceUSD: false,
      sipTotalCustomerPrice: false,
      // 成本利润
      allCustomerPriceUSD: false,
      asrCost: false,
      ttsCost: false,
      llmCost: false,
      totalCost: false,
      totalProfit: false,
      // 计算字段
      originalLineUnitPrice: false,
      newLineBillingCycle: false,
      newLineUnitPrice: false,
      newLineBillingQuantity: false,
      newLineConsumption: false
    }
  },
  {
    id: 'financial',
    name: '财务分析',
    description: '专注于成本、利润和财务分析的字段',
    config: {
      // 基础信息
      id: true,
      customerId: true,
      tenantId: true,
      customerName: true,
      tenantName: true,
      agentFlowName: true,
      // 通话信息
      callDirection: false,
      caller: false,
      callee: false,
      callId: true,
      callStartTime: true,
      callEndTime: false,
      callAnswerTime: false,
      // 时长计费
      callDurationSec: true,
      feeDurationSec: true,
      sipFeeDuration: true,
      billingCycle: true,
      size: true,
      customerPrice: true,
      customerTotalPrice: true,
      customerTotalPriceUSD: true,
      customerCurrency: true,
      feeTime: true,
      // 线路相关
      sipCurrency: true,
      sipPriceType: true,
      sipTotalCustomerOriginalPrice: true,
      sipTotalCustomerOriginalPriceUSD: true,
      sipTotalCustomerPrice: true,
      // 成本利润
      allCustomerPriceUSD: true,
      asrCost: true,
      ttsCost: true,
      llmCost: true,
      totalCost: true,
      totalProfit: true,
      // 计算字段
      originalLineUnitPrice: true,
      newLineBillingCycle: true,
      newLineUnitPrice: true,
      newLineBillingQuantity: true,
      newLineConsumption: true
    }
  },
  {
    id: 'complete',
    name: '完整字段',
    description: '包含所有可用字段',
    config: Object.fromEntries(
      fieldGroups.map(field => [field.key, true])
    ) as BillExportFieldConfig
  }
];

const EXPORT_CONFIG_STORAGE_KEY = 'billExportFieldConfig';
const CUSTOM_PRESETS_STORAGE_KEY = 'billExportCustomPresets';

const ExportFieldSelector: React.FC<ExportFieldSelectorProps> = ({
  visible,
  onCancel,
  onConfirm,
  initialConfig
}) => {
  const [config, setConfig] = useState<BillExportFieldConfig>(() => {
    if (initialConfig) return initialConfig;
    
    // 尝试从localStorage加载保存的配置
    try {
      const saved = localStorage.getItem(EXPORT_CONFIG_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('加载导出配置失败:', error);
    }
    
    // 默认返回基础字段配置
    return defaultPresets[0].config;
  });

  const [customPresets, setCustomPresets] = useState<BillExportPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  // 加载自定义预设
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
      if (saved) {
        setCustomPresets(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('加载自定义预设失败:', error);
    }
  }, []);

  // 保存自定义预设到localStorage
  const saveCustomPresets = (presets: BillExportPreset[]) => {
    try {
      localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(presets));
      setCustomPresets(presets);
    } catch (error) {
      console.error('保存自定义预设失败:', error);
      message.error('保存预设失败');
    }
  };

  // 按分组聚合字段
  const groupedFields = fieldGroups.reduce((groups, field) => {
    if (!groups[field.group]) {
      groups[field.group] = [];
    }
    groups[field.group].push(field);
    return groups;
  }, {} as Record<string, BillExportFieldGroup[]>);

  // 处理字段选择变化
  const handleFieldChange = (fieldKey: keyof BillExportFieldConfig, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      [fieldKey]: checked
    }));
  };

  // 处理分组全选/取消全选
  const handleGroupSelectAll = (groupName: string, selectAll: boolean) => {
    const groupFields = groupedFields[groupName];
    const updates: Partial<BillExportFieldConfig> = {};
    
    groupFields.forEach(field => {
      updates[field.key] = selectAll;
    });

    setConfig(prev => ({
      ...prev,
      ...updates
    }));
  };

  // 检查分组是否全选
  const isGroupFullySelected = (groupName: string): boolean => {
    const groupFields = groupedFields[groupName];
    return groupFields.every(field => config[field.key]);
  };

  // 检查分组是否部分选中
  const isGroupPartiallySelected = (groupName: string): boolean => {
    const groupFields = groupedFields[groupName];
    const selectedCount = groupFields.filter(field => config[field.key]).length;
    return selectedCount > 0 && selectedCount < groupFields.length;
  };

  // 获取选中字段数量
  const getSelectedCount = (): number => {
    return Object.values(config).filter(Boolean).length;
  };

  // 全选/取消全选
  const handleSelectAll = (selectAll: boolean) => {
    const updates: BillExportFieldConfig = {} as BillExportFieldConfig;
    fieldGroups.forEach(field => {
      updates[field.key] = selectAll;
    });
    setConfig(updates);
  };

  // 应用预设配置
  const applyPreset = (preset: BillExportPreset) => {
    setConfig(preset.config);
    message.success(`已应用预设：${preset.name}`);
  };

  // 保存为自定义预设
  const saveAsPreset = () => {
    if (!newPresetName.trim()) {
      message.error('请输入预设名称');
      return;
    }

    const newPreset: BillExportPreset = {
      id: `custom_${Date.now()}`,
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || '自定义预设',
      config: { ...config }
    };

    const updatedPresets = [...customPresets, newPreset];
    saveCustomPresets(updatedPresets);
    
    setNewPresetName('');
    setNewPresetDescription('');
    message.success('预设保存成功');
  };

  // 删除自定义预设
  const deletePreset = (presetId: string) => {
    const updatedPresets = customPresets.filter(p => p.id !== presetId);
    saveCustomPresets(updatedPresets);
    message.success('预设删除成功');
  };

  // 确认导出
  const handleConfirm = () => {
    const selectedCount = getSelectedCount();
    if (selectedCount === 0) {
      message.error('请至少选择一个字段');
      return;
    }

    // 保存当前配置到localStorage
    try {
      localStorage.setItem(EXPORT_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('保存导出配置失败:', error);
    }

    onConfirm(config);
  };

  const selectedCount = getSelectedCount();
  const totalCount = fieldGroups.length;

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>自定义导出字段</span>
          <Badge count={selectedCount} style={{ backgroundColor: '#52c41a' }} />
          <span style={{ fontSize: '12px', color: '#666' }}>
            已选择 {selectedCount}/{totalCount} 个字段
          </span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleConfirm}
      okText="确认导出"
      cancelText="取消"
      width={900}
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
    >
      {/* 快速操作区 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={12}>
            <Space>
              <Button 
                size="small" 
                icon={<CheckSquareOutlined />}
                onClick={() => handleSelectAll(true)}
              >
                全选
              </Button>
              <Button 
                size="small" 
                icon={<BorderOutlined />}
                onClick={() => handleSelectAll(false)}
              >
                全不选
              </Button>
              <Divider type="vertical" />
              <span style={{ fontSize: '12px', color: '#666' }}>
                预设配置：
              </span>
              {defaultPresets.map(preset => (
                <Button
                  key={preset.id}
                  size="small"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.name}
                </Button>
              ))}
            </Space>
          </Col>
          <Col span={12}>
            <Row gutter={8}>
              <Col span={8}>
                <Input
                  size="small"
                  placeholder="预设名称"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                />
              </Col>
              <Col span={10}>
                <Input
                  size="small"
                  placeholder="预设描述（可选）"
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                />
              </Col>
              <Col span={6}>
                <Button
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={saveAsPreset}
                  disabled={!newPresetName.trim()}
                >
                  保存预设
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
        
        {/* 自定义预设列表 */}
        {customPresets.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: '12px', color: '#666' }}>自定义预设：</span>
            <Space wrap>
              {customPresets.map(preset => (
                <Space key={preset.id} size="small">
                  <Button
                    size="small"
                    onClick={() => applyPreset(preset)}
                    title={preset.description}
                  >
                    {preset.name}
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => deletePreset(preset.id)}
                    title="删除预设"
                  />
                </Space>
              ))}
            </Space>
          </div>
        )}
      </Card>

      {/* 字段选择区 */}
      <Collapse defaultActiveKey={Object.keys(groupedFields)} ghost>
        {Object.entries(groupedFields).map(([groupName, fields]) => {
          const isFullySelected = isGroupFullySelected(groupName);
          const isPartiallySelected = isGroupPartiallySelected(groupName);
          const selectedInGroup = fields.filter(field => config[field.key]).length;

          return (
            <Panel
              key={groupName}
              header={
                <Space>
                  <Checkbox
                    checked={isFullySelected}
                    indeterminate={isPartiallySelected}
                    onChange={(e) => handleGroupSelectAll(groupName, e.target.checked)}
                  >
                    <strong>{groupName}</strong>
                  </Checkbox>
                  <Badge count={selectedInGroup} style={{ backgroundColor: '#1890ff' }} />
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {selectedInGroup}/{fields.length}
                  </span>
                </Space>
              }
            >
              <Row gutter={[16, 8]}>
                {fields.map(field => (
                  <Col span={8} key={field.key}>
                    <Checkbox
                      checked={config[field.key]}
                      onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                    >
                      <Tooltip title={field.description} placement="top">
                        {field.label}
                      </Tooltip>
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Panel>
          );
        })}
      </Collapse>
    </Modal>
  );
};

export default ExportFieldSelector;