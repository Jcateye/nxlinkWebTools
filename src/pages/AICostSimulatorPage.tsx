/**
 * AI Agent 成本模拟器页面
 * 
 * 功能：
 * 1. 供应商组合选择（ASR/TTS/LLM）
 * 2. 通话行为参数调节
 * 3. 场景预设快速切换
 * 4. 成本拆分可视化
 * 5. 多组合对比分析
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Select,
  Slider,
  Button,
  Typography,
  Space,
  Statistic,
  Divider,
  Tag,
  Tooltip,
  Collapse,
  InputNumber,
  Table,
  Switch,
  Alert,
  Modal,
  Form,
  Input,
  Tabs,
  message,
  Popconfirm,
} from 'antd';
import {
  DollarOutlined,
  SoundOutlined,
  AudioOutlined,
  RobotOutlined,
  PhoneOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  DeleteOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
  EditOutlined,
  DatabaseOutlined,
  ExportOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  ComposedChart,
  LabelList,
  ReferenceDot,
} from 'recharts';
import {
  computeCost,
  computeWeightedAverageCost,
  formatCurrency,
  formatPercent,
  CostBreakdown,
  CallBehavior,
  VendorConfig,
} from '../utils/costCalculator';
import {
  VENDOR_BUNDLES,
  SCENARIO_PRESETS,
  ASR_VENDORS,
  TTS_VENDORS,
  LLM_MODELS,
  TELECOM_RATES,
  buildVendorConfig,
  getVendorOptions,
  getAllVendorOptions,
  getAllVendors,
  getAllBundles,
  getBundleById,
  loadCustomVendors,
  saveCustomVendors,
  addCustomBundle,
  removeCustomBundle,
  isCustomBundle,
  ASRVendorConfig,
  TTSVendorConfig,
  LLMModelConfig,
  TelecomRateConfig,
  getMergedScenarioPresets,
  updateScenarioPreset,
  deleteScenarioPreset,
  addCustomScenario,
  resetScenarioPresets,
  isCustomScenario,
  exportScenariosAsCode,
  ScenarioPreset,
  getMergedBundles,
  updateBundlePreset,
  deleteBundlePreset,
  resetBundlePresets,
  hasBundleOverride,
  exportBundlesAsCode,
} from '../config/vendorPresets';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// ============ 颜色配置 ============
const COST_COLORS = {
  tel: '#722ed1',     // 紫色 - 线路
  asr: '#13c2c2',     // 青色 - ASR
  tts: '#fa8c16',     // 橙色 - TTS
  llm: '#1890ff',     // 蓝色 - LLM
  fixed: '#8c8c8c',   // 灰色 - 固定
  total: '#52c41a',   // 绿色 - 总计
};

const PIE_COLORS = ['#722ed1', '#13c2c2', '#fa8c16', '#1890ff', '#8c8c8c'];

// ============ 组件：KPI卡片 ============
interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  percent?: string;
  tooltip?: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon, color, percent, tooltip }) => {
  const cardContent = (
    <Card 
      size="small" 
      style={{ 
        background: `linear-gradient(135deg, ${color}08 0%, ${color}15 100%)`,
        borderColor: `${color}30`,
        borderRadius: 12,
        cursor: tooltip ? 'help' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ 
          width: 48, 
          height: 48, 
          borderRadius: 12, 
          background: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          fontSize: 20,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {title}
            {tooltip && <InfoCircleOutlined style={{ marginLeft: 4, fontSize: 11 }} />}
          </Text>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <Text strong style={{ fontSize: 20, color }}>{value}</Text>
            {percent && <Tag color={color} style={{ margin: 0 }}>{percent}</Tag>}
          </div>
          {subtitle && <Text type="secondary" style={{ fontSize: 11 }}>{subtitle}</Text>}
        </div>
      </div>
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} overlayStyle={{ maxWidth: 450 }}>
        {cardContent}
      </Tooltip>
    );
  }

  return cardContent;
};

// ============ 组件：控制面板 ============
interface ControlPanelProps {
  behavior: CallBehavior;
  onBehaviorChange: (behavior: CallBehavior) => void;
  selectedBundle: string;
  onBundleChange: (bundleId: string) => void;
  customConfig: {
    asr: string;
    tts: string;
    llm: string;
    telecom: string;
    fixedCost: number;
  };
  onCustomConfigChange: (config: { asr: string; tts: string; llm: string; telecom: string; fixedCost: number }) => void;
  useCustomConfig: boolean;
  onUseCustomConfigChange: (use: boolean) => void;
  fixedCost: number;
  onFixedCostChange: (cost: number) => void;
  onSaveAsBundle: () => void;
  onDeleteBundle: (id: string) => void;
  vendorOptionsVersion: number;
  scenarioVersion: number;
  onScenarioChange: () => void;
  bundleVersion: number;
  onBundleVersionChange: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  behavior,
  onBehaviorChange,
  selectedBundle,
  onBundleChange,
  customConfig,
  onCustomConfigChange,
  useCustomConfig,
  onUseCustomConfigChange,
  fixedCost,
  onFixedCostChange,
  onSaveAsBundle,
  onDeleteBundle,
  vendorOptionsVersion,
  scenarioVersion,
  onScenarioChange,
  bundleVersion,
  onBundleVersionChange,
}) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const vendorOptions = useMemo(() => getAllVendorOptions(), [vendorOptionsVersion]);
  
  // 供应商组合编辑模式
  const [bundleEditMode, setBundleEditMode] = useState(false);
  const [editingBundle, setEditingBundle] = useState<{
    id: string;
    name: string;
    description: string;
    asr: string;
    tts: string;
    llm: string;
    telecom: string;
  } | null>(null);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mergedBundles = useMemo(() => getMergedBundles(), [bundleVersion, vendorOptionsVersion]);
  
  // 场景预设编辑模式
  const [scenarioEditMode, setScenarioEditMode] = useState(false);
  const [editingScenario, setEditingScenario] = useState<{ id: string; name: string; weight: number } | null>(null);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scenarios = useMemo(() => getMergedScenarioPresets(), [scenarioVersion]);
  
  // 根据供应商名称查找ID
  const findVendorIdByName = (type: 'asr' | 'tts' | 'llm' | 'telecom', name: string): string => {
    const allVendors = getAllVendors();
    const vendors = allVendors[type];
    for (const [id, vendor] of Object.entries(vendors)) {
      if (type === 'telecom') {
        // telecom 使用 pricePerMin 作为标识
        continue;
      }
      if ((vendor as any).name === name) {
        return id;
      }
    }
    // 返回第一个作为默认
    return Object.keys(vendors)[0] || '';
  };
  
  // 根据线路价格查找ID
  const findTelecomIdByPrice = (pricePerMin: number): string => {
    const allVendors = getAllVendors();
    for (const [id, telecom] of Object.entries(allVendors.telecom)) {
      if (telecom.pricePerMin === pricePerMin) {
        return id;
      }
    }
    return Object.keys(allVendors.telecom)[0] || 'free';
  };
  
  // 供应商组合编辑处理
  const handleBundleEdit = (bundle: VendorConfig) => {
    // 根据供应商名称查找对应的ID
    const asrId = findVendorIdByName('asr', bundle.asrVendor);
    const ttsId = findVendorIdByName('tts', bundle.ttsVendor);
    const llmId = findVendorIdByName('llm', bundle.llmModel);
    const telecomId = findTelecomIdByPrice(bundle.telPricePerMin);
    
    setEditingBundle({
      id: bundle.id,
      name: bundle.name,
      description: bundle.description,
      asr: asrId,
      tts: ttsId,
      llm: llmId,
      telecom: telecomId,
    });
  };
  
  const handleBundleSave = () => {
    if (editingBundle) {
      // 根据选择的供应商ID构建新的配置
      const newConfig = buildVendorConfig(
        editingBundle.asr,
        editingBundle.tts,
        editingBundle.llm,
        editingBundle.telecom,
        0
      );
      
      updateBundlePreset(editingBundle.id, {
        name: editingBundle.name,
        description: editingBundle.description,
        // 更新供应商相关配置
        asrPricePerMin: newConfig.asrPricePerMin,
        asrBillingStep: newConfig.asrBillingStep,
        asrVendor: newConfig.asrVendor,
        ttsPricePer1kChar: newConfig.ttsPricePer1kChar,
        ttsVendorCharRatio: newConfig.ttsVendorCharRatio,
        ttsCharPerSec: newConfig.ttsCharPerSec,
        ttsBillingStep: newConfig.ttsBillingStep,
        ttsVendor: newConfig.ttsVendor,
        llmInputPricePer1k: newConfig.llmInputPricePer1k,
        llmOutputPricePer1k: newConfig.llmOutputPricePer1k,
        llmReasonPricePer1k: newConfig.llmReasonPricePer1k,
        llmSysPromptTokens: newConfig.llmSysPromptTokens,
        llmContextTokens: newConfig.llmContextTokens,
        llmToolTokens: newConfig.llmToolTokens,
        llmCharsPerToken: newConfig.llmCharsPerToken,
        llmModel: newConfig.llmModel,
        telPricePerMin: newConfig.telPricePerMin,
        telBillingStep: newConfig.telBillingStep,
      });
      setEditingBundle(null);
      onBundleVersionChange();
    }
  };
  
  const handleBundleDelete = (id: string) => {
    deleteBundlePreset(id);
    setEditingBundle(null);
    // 如果删除的是当前选中的组合，切换到默认组合
    if (selectedBundle === id) {
      const remaining = getMergedBundles();
      if (remaining.length > 0) {
        onBundleChange(remaining[0].id);
      }
    }
    onBundleVersionChange();
  };
  
  const handleExportBundles = () => {
    const code = exportBundlesAsCode();
    navigator.clipboard.writeText(code).then(() => {
      message.success('供应商组合代码已复制到剪贴板，可粘贴到 vendorPresets.ts 中');
    }).catch(() => {
      Modal.info({
        title: '供应商组合代码',
        width: 900,
        content: (
          <pre style={{ maxHeight: 400, overflow: 'auto', fontSize: 10, background: '#f5f5f5', padding: 12, borderRadius: 8 }}>
            {code}
          </pre>
        ),
      });
    });
  };
  
  const handleResetBundles = () => {
    Modal.confirm({
      title: '重置供应商组合',
      content: '确定要重置所有供应商组合到默认状态吗？这将删除所有自定义修改和自定义组合。',
      okText: '重置',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        resetBundlePresets();
        onBundleVersionChange();
        // 切换到默认组合
        onBundleChange('balanced-gpt4mini');
        message.success('供应商组合已重置');
      },
    });
  };

  const handleScenarioClick = (scenario: ScenarioPreset) => {
    if (scenarioEditMode) {
      // 编辑模式下点击进入编辑
      setEditingScenario({ id: scenario.id, name: scenario.name, weight: scenario.weight ?? 1 });
    } else {
      onBehaviorChange({
        T: scenario.T,
        r_b: scenario.r_b,
        r_u: scenario.r_u,
        q: scenario.q,
        ttsCacheHitRate: scenario.ttsCacheHitRate ?? 0.3,
        vadAccuracy: scenario.vadAccuracy ?? 1.0,
      });
    }
  };
  
  const handleScenarioSave = () => {
    if (editingScenario) {
      updateScenarioPreset(editingScenario.id, {
        name: editingScenario.name,
        weight: editingScenario.weight,
      });
      setEditingScenario(null);
      onScenarioChange();
    }
  };
  
  const handleScenarioDelete = (id: string) => {
    deleteScenarioPreset(id);
    setEditingScenario(null);
    onScenarioChange();
  };
  
  const handleExportScenarios = () => {
    const code = exportScenariosAsCode();
    navigator.clipboard.writeText(code).then(() => {
      message.success('场景配置代码已复制到剪贴板，可粘贴到 vendorPresets.ts 中');
    }).catch(() => {
      // 如果复制失败，显示代码
      Modal.info({
        title: '场景配置代码',
        width: 800,
        content: (
          <pre style={{ maxHeight: 400, overflow: 'auto', fontSize: 11, background: '#f5f5f5', padding: 12, borderRadius: 8 }}>
            {code}
          </pre>
        ),
      });
    });
  };
  
  const handleResetScenarios = () => {
    Modal.confirm({
      title: '重置场景预设',
      content: '确定要重置所有场景预设到默认状态吗？这将删除所有自定义修改。',
      okText: '重置',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        resetScenarioPresets();
        onScenarioChange();
        message.success('场景预设已重置');
      },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 供应商组合选择 */}
      <Card 
        title={<><SettingOutlined /> 供应商组合</>} 
        size="small"
        style={{ borderRadius: 12 }}
        extra={
          !useCustomConfig && (
            <Tooltip title={bundleEditMode ? '退出编辑模式' : '编辑供应商组合'}>
              <Button
                type={bundleEditMode ? 'primary' : 'text'}
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setBundleEditMode(!bundleEditMode);
                  setEditingBundle(null);
                }}
              />
            </Tooltip>
          )
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text type="secondary">使用预设组合</Text>
              <Switch 
                checked={!useCustomConfig} 
                onChange={(checked) => {
                  onUseCustomConfigChange(!checked);
                  if (!checked) {
                    setBundleEditMode(false);
                    setEditingBundle(null);
                  }
                }}
                checkedChildren="预设"
                unCheckedChildren="自定义"
              />
            </div>
            
            {!useCustomConfig ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Select
                    value={selectedBundle}
                    onChange={(v) => {
                      onBundleChange(v);
                      if (bundleEditMode) {
                        const bundle = mergedBundles.find(b => b.id === v);
                        if (bundle) {
                          handleBundleEdit(bundle);
                        }
                      }
                    }}
                    style={{ flex: 1 }}
                    options={mergedBundles.map(b => ({
                      value: b.id,
                      label: b.name,
                      description: b.description,
                      isCustom: isCustomBundle(b.id),
                      hasOverride: hasBundleOverride(b.id),
                    }))}
                    optionRender={(option) => (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div>{option.label}</div>
                          <Text type="secondary" style={{ fontSize: 11 }}>{option.data.description}</Text>
                        </div>
                        <Space size={4}>
                          {option.data.hasOverride && !option.data.isCustom && (
                            <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>已修改</Tag>
                          )}
                          {option.data.isCustom && (
                            <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>自定义</Tag>
                          )}
                        </Space>
                      </div>
                    )}
                  />
                  {bundleEditMode && (
                    <Tooltip title="编辑当前组合">
                      <Button 
                        icon={<EditOutlined />}
                        onClick={() => {
                          const bundle = mergedBundles.find(b => b.id === selectedBundle);
                          if (bundle) {
                            handleBundleEdit(bundle);
                          }
                        }}
                      />
                    </Tooltip>
                  )}
                </div>
                
                {/* 编辑模式下显示编辑表单 */}
                {bundleEditMode && editingBundle && (
                  <div style={{ 
                    padding: 12, 
                    background: '#fff7e6', 
                    borderRadius: 8,
                    border: '1px solid #ffd591',
                  }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text type="secondary" style={{ width: 50 }}>名称:</Text>
                        <Input
                          size="small"
                          value={editingBundle.name}
                          onChange={(e) => setEditingBundle({ ...editingBundle, name: e.target.value })}
                          style={{ flex: 1 }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text type="secondary" style={{ width: 50 }}>描述:</Text>
                        <Input
                          size="small"
                          value={editingBundle.description}
                          onChange={(e) => setEditingBundle({ ...editingBundle, description: e.target.value })}
                          style={{ flex: 1 }}
                        />
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>ASR 供应商</Text>
                        <Select
                          size="small"
                          value={editingBundle.asr}
                          onChange={(v) => setEditingBundle({ ...editingBundle, asr: v })}
                          style={{ width: '100%' }}
                          options={vendorOptions.asr}
                          showSearch
                          optionFilterProp="label"
                        />
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>TTS 供应商</Text>
                        <Select
                          size="small"
                          value={editingBundle.tts}
                          onChange={(v) => setEditingBundle({ ...editingBundle, tts: v })}
                          style={{ width: '100%' }}
                          options={vendorOptions.tts}
                          showSearch
                          optionFilterProp="label"
                        />
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>LLM 模型</Text>
                        <Select
                          size="small"
                          value={editingBundle.llm}
                          onChange={(v) => setEditingBundle({ ...editingBundle, llm: v })}
                          style={{ width: '100%' }}
                          options={vendorOptions.llm}
                          showSearch
                          optionFilterProp="label"
                        />
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>线路区域</Text>
                        <Select
                          size="small"
                          value={editingBundle.telecom}
                          onChange={(v) => setEditingBundle({ ...editingBundle, telecom: v })}
                          style={{ width: '100%' }}
                          options={vendorOptions.telecom}
                          showSearch
                          optionFilterProp="label"
                        />
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button size="small" type="primary" onClick={handleBundleSave}>
                          保存
                        </Button>
                        <Button size="small" onClick={() => setEditingBundle(null)}>
                          取消
                        </Button>
                        <Popconfirm
                          title="删除供应商组合"
                          description="确定要删除这个供应商组合吗？"
                          onConfirm={() => handleBundleDelete(editingBundle.id)}
                          okText="删除"
                          cancelText="取消"
                          okButtonProps={{ danger: true }}
                        >
                          <Button size="small" danger>
                            删除
                          </Button>
                        </Popconfirm>
                      </div>
                    </Space>
                  </div>
                )}
                
                {/* 编辑模式下显示操作按钮 */}
                {bundleEditMode && !editingBundle && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Tooltip title="导出当前配置为代码">
                      <Button size="small" icon={<ExportOutlined />} onClick={handleExportBundles}>
                        导出代码
                      </Button>
                    </Tooltip>
                    <Tooltip title="重置所有组合到默认状态">
                      <Button size="small" icon={<ReloadOutlined />} onClick={handleResetBundles}>
                        重置
                      </Button>
                    </Tooltip>
                  </div>
                )}
                
                {/* 显示预设组合详情 */}
                {!bundleEditMode && (() => {
                  const bundle = mergedBundles.find(b => b.id === selectedBundle);
                  if (!bundle) return null;
                  return (
                    <div style={{ 
                      background: '#f5f5f5', 
                      padding: '8px 12px', 
                      borderRadius: 8,
                      fontSize: 12,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text type="secondary">ASR</Text>
                        <Text>{bundle.asrVendor}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text type="secondary">TTS</Text>
                        <Text>{bundle.ttsVendor}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text type="secondary">LLM</Text>
                        <Text>{bundle.llmModel}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">线路</Text>
                        <Text>${bundle.telPricePerMin}/min</Text>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>ASR 供应商</Text>
                  <Select
                    key={`asr-${vendorOptionsVersion}`}
                    value={customConfig.asr}
                    onChange={(v) => onCustomConfigChange({ ...customConfig, asr: v })}
                    style={{ width: '100%' }}
                    options={vendorOptions.asr}
                    showSearch
                    optionFilterProp="label"
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>TTS 供应商</Text>
                  <Select
                    key={`tts-${vendorOptionsVersion}`}
                    value={customConfig.tts}
                    onChange={(v) => onCustomConfigChange({ ...customConfig, tts: v })}
                    style={{ width: '100%' }}
                    options={vendorOptions.tts}
                    showSearch
                    optionFilterProp="label"
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>LLM 模型</Text>
                  <Select
                    key={`llm-${vendorOptionsVersion}`}
                    value={customConfig.llm}
                    onChange={(v) => onCustomConfigChange({ ...customConfig, llm: v })}
                    style={{ width: '100%' }}
                    options={vendorOptions.llm}
                    showSearch
                    optionFilterProp="label"
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>线路区域</Text>
                  <Select
                    key={`telecom-${vendorOptionsVersion}`}
                    value={customConfig.telecom}
                    onChange={(v) => onCustomConfigChange({ ...customConfig, telecom: v })}
                    style={{ width: '100%' }}
                    options={vendorOptions.telecom}
                    showSearch
                    optionFilterProp="label"
                  />
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <Button 
                  type="dashed" 
                  icon={<PlusOutlined />}
                  onClick={onSaveAsBundle}
                  block
                >
                  保存为预设组合
                </Button>
              </div>
            )}
          </div>
        </Space>
      </Card>

      {/* 通话行为参数 */}
      <Card 
        title={<><PhoneOutlined /> 通话行为参数</>} 
        size="small"
        style={{ borderRadius: 12 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text type="secondary">通话时长 T</Text>
              <Text strong>{behavior.T} 秒</Text>
            </div>
            <Slider
              min={5}
              max={300}
              value={behavior.T}
              onChange={(v) => onBehaviorChange({ ...behavior, T: v })}
              marks={{ 5: '5s', 60: '1min', 120: '2min', 180: '3min', 300: '5min' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text type="secondary">
                机器人说话占比 r_b
                <Tooltip title="TTS播报占整个通话的比例">
                  <InfoCircleOutlined style={{ marginLeft: 4 }} />
                </Tooltip>
              </Text>
              <Text strong>{(behavior.r_b * 100).toFixed(0)}%</Text>
            </div>
            <Slider
              min={0}
              max={0.8}
              step={0.01}
              value={behavior.r_b}
              onChange={(v) => onBehaviorChange({ ...behavior, r_b: v })}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text type="secondary">
                用户说话占比 r_u
                <Tooltip title="ASR听用户占整个通话的比例">
                  <InfoCircleOutlined style={{ marginLeft: 4 }} />
                </Tooltip>
              </Text>
              <Text strong>{(behavior.r_u * 100).toFixed(0)}%</Text>
            </div>
            <Slider
              min={0}
              max={0.8}
              step={0.01}
              value={behavior.r_u}
              onChange={(v) => onBehaviorChange({ ...behavior, r_u: v })}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text type="secondary">
                复杂度系数 q
                <Tooltip title="对话越复杂，LLM token消耗越多">
                  <InfoCircleOutlined style={{ marginLeft: 4 }} />
                </Tooltip>
              </Text>
              <Text strong>{(behavior.q * 100).toFixed(0)}%</Text>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={behavior.q}
              onChange={(v) => onBehaviorChange({ ...behavior, q: v })}
            />
          </div>

          <Divider style={{ margin: '8px 0' }} />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text type="secondary">
                TTS缓存命中率
                <Tooltip title="相同TTS内容可缓存，命中缓存不调用TTS接口。如固定开场白、常见回复等">
                  <InfoCircleOutlined style={{ marginLeft: 4 }} />
                </Tooltip>
              </Text>
              <Text strong style={{ color: '#52c41a' }}>{(behavior.ttsCacheHitRate * 100).toFixed(0)}%</Text>
            </div>
            <Slider
              min={0}
              max={0.95}
              step={0.01}
              value={behavior.ttsCacheHitRate}
              onChange={(v) => onBehaviorChange({ ...behavior, ttsCacheHitRate: v })}
              marks={{ 0: '0%', 0.3: '30%', 0.6: '60%', 0.95: '95%' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text type="secondary">
                VAD准确率
                <Tooltip title="VAD(语音活动检测)影响实际送入ASR的时长。<100%=漏识别，>100%=误触发（噪音等误认为语音）">
                  <InfoCircleOutlined style={{ marginLeft: 4 }} />
                </Tooltip>
              </Text>
              <Text strong style={{ color: behavior.vadAccuracy === 1 ? '#1890ff' : '#fa8c16' }}>
                {(behavior.vadAccuracy * 100).toFixed(0)}%
              </Text>
            </div>
            <Slider
              min={0.8}
              max={1.2}
              step={0.01}
              value={behavior.vadAccuracy}
              onChange={(v) => onBehaviorChange({ ...behavior, vadAccuracy: v })}
              marks={{ 0.8: '80%', 1.0: '100%', 1.2: '120%' }}
            />
          </div>

          <Alert
            type="info"
            showIcon={false}
            style={{ padding: '8px 12px', borderRadius: 8 }}
            message={
              <Text type="secondary" style={{ fontSize: 12 }}>
                静音/振铃占比: {((1 - behavior.r_b - behavior.r_u) * 100).toFixed(0)}%
              </Text>
            }
          />

          <Divider style={{ margin: '8px 0' }} />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">
                固定成本/通
                <Tooltip title="每通电话的固定开销，如平台费用、基础设施成本等">
                  <InfoCircleOutlined style={{ marginLeft: 4 }} />
                </Tooltip>
              </Text>
              <InputNumber
                value={fixedCost}
                onChange={(v) => onFixedCostChange(v ?? 0)}
                min={0}
                max={1}
                step={0.001}
                precision={4}
                prefix="$"
                size="small"
                style={{ width: 100 }}
              />
            </div>
          </div>
        </Space>
      </Card>

      {/* 场景预设 */}
      <Card 
        title={<><ThunderboltOutlined /> 场景预设</>} 
        size="small"
        style={{ borderRadius: 12 }}
        extra={
          <Tooltip title={scenarioEditMode ? '退出编辑模式' : '编辑场景预设'}>
            <Button
              type={scenarioEditMode ? 'primary' : 'text'}
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setScenarioEditMode(!scenarioEditMode);
                setEditingScenario(null);
              }}
            />
          </Tooltip>
        }
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {scenarios.map((scenario) => (
            <Tooltip 
              key={scenario.id} 
              title={scenarioEditMode ? '点击编辑' : scenario.description}
            >
              <Button
                size="small"
                onClick={() => handleScenarioClick(scenario)}
                style={{ 
                  borderRadius: 16,
                  borderStyle: isCustomScenario(scenario.id) ? 'dashed' : 'solid',
                }}
                danger={scenarioEditMode}
              >
                {scenario.name}
              </Button>
            </Tooltip>
          ))}
        </div>
        
        {/* 编辑模式下显示编辑表单 */}
        {scenarioEditMode && editingScenario && (
          <div style={{ 
            marginTop: 12, 
            padding: 12, 
            background: '#fafafa', 
            borderRadius: 8,
            border: '1px solid #d9d9d9',
          }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text type="secondary" style={{ width: 60 }}>名称:</Text>
                <Input
                  size="small"
                  value={editingScenario.name}
                  onChange={(e) => setEditingScenario({ ...editingScenario, name: e.target.value })}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text type="secondary" style={{ width: 60 }}>权重:</Text>
                <InputNumber
                  size="small"
                  min={1}
                  max={100}
                  value={editingScenario.weight}
                  onChange={(v) => setEditingScenario({ ...editingScenario, weight: v ?? 1 })}
                  style={{ width: 80 }}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  (占比: {((editingScenario.weight / scenarios.reduce((sum, s) => sum + (s.weight ?? 1), 0)) * 100).toFixed(1)}%)
                </Text>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Button size="small" type="primary" onClick={handleScenarioSave}>
                  保存
                </Button>
                <Button size="small" onClick={() => setEditingScenario(null)}>
                  取消
                </Button>
                <Popconfirm
                  title="删除场景"
                  description="确定要删除这个场景吗？"
                  onConfirm={() => handleScenarioDelete(editingScenario.id)}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </div>
            </Space>
          </div>
        )}
        
        {/* 编辑模式下显示操作按钮 */}
        {scenarioEditMode && !editingScenario && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Tooltip title="导出当前配置为代码，可粘贴到源码中永久保存">
              <Button size="small" icon={<ExportOutlined />} onClick={handleExportScenarios}>
                导出代码
              </Button>
            </Tooltip>
            <Tooltip title="重置所有场景到默认状态">
              <Button size="small" icon={<ReloadOutlined />} onClick={handleResetScenarios}>
                重置
              </Button>
            </Tooltip>
          </div>
        )}
      </Card>
    </div>
  );
};

// ============ 组件：成本拆分图表 ============
interface CostChartsProps {
  cost: CostBreakdown;
  vendorConfig: VendorConfig;
  behavior: CallBehavior;
}

const CostCharts: React.FC<CostChartsProps> = ({ cost, vendorConfig, behavior }) => {
  // 图例隐藏状态
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // 切换图例显示/隐藏
  const handleLegendClick = (dataKey: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  };

  // 饼图数据（过滤隐藏项）
  const pieData = [
    { name: '线路', value: cost.tel, color: COST_COLORS.tel, dataKey: 'tel' },
    { name: 'ASR', value: cost.asr, color: COST_COLORS.asr, dataKey: 'asr' },
    { name: 'TTS', value: cost.tts, color: COST_COLORS.tts, dataKey: 'tts' },
    { name: 'LLM', value: cost.llm, color: COST_COLORS.llm, dataKey: 'llm' },
    { name: '固定', value: cost.fixed, color: COST_COLORS.fixed, dataKey: 'fixed' },
  ].filter(d => d.value > 0 && !hiddenSeries.has(d.dataKey));

  // 堆叠柱状图数据
  const barData = [
    {
      name: '当前配置',
      tel: hiddenSeries.has('tel') ? 0 : cost.tel,
      asr: hiddenSeries.has('asr') ? 0 : cost.asr,
      tts: hiddenSeries.has('tts') ? 0 : cost.tts,
      llm: hiddenSeries.has('llm') ? 0 : cost.llm,
      fixed: hiddenSeries.has('fixed') ? 0 : cost.fixed,
    },
  ];

  // 时长敏感性分析数据
  const sensitivityData = [30, 60, 90, 120, 150, 180, 240, 300].map((T) => {
    const c = computeCost({ ...behavior, T }, vendorConfig);
    return {
      T: `${T}s`,
      total: c.total,
      tel: hiddenSeries.has('tel') ? 0 : c.tel,
      asr: hiddenSeries.has('asr') ? 0 : c.asr,
      tts: hiddenSeries.has('tts') ? 0 : c.tts,
      llm: hiddenSeries.has('llm') ? 0 : c.llm,
    };
  });

  // 自定义图例渲染（支持点击切换）
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
        {payload.map((entry: any, index: number) => {
          const isHidden = hiddenSeries.has(entry.dataKey);
          return (
            <div
              key={`legend-${index}`}
              onClick={() => handleLegendClick(entry.dataKey)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                opacity: isHidden ? 0.3 : 1,
                textDecoration: isHidden ? 'line-through' : 'none',
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: entry.color,
                  borderRadius: 2,
                }}
              />
              <span style={{ fontSize: 12 }}>{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Row gutter={16}>
        {/* 成本占比饼图 */}
        <Col span={12}>
          <Card title="成本占比分布" size="small" style={{ borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  labelLine={{ stroke: '#8884d8', strokeWidth: 1 }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 成本堆叠柱状图 */}
        <Col span={12}>
          <Card title="成本组成结构" size="small" style={{ borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `$${v.toFixed(3)}`} />
                <YAxis type="category" dataKey="name" width={80} />
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend content={renderLegend} />
                <Bar dataKey="asr" stackId="a" fill={COST_COLORS.asr} name="ASR" />
                <Bar dataKey="llm" stackId="a" fill={COST_COLORS.llm} name="LLM" />
                <Bar dataKey="tts" stackId="a" fill={COST_COLORS.tts} name="TTS" />
                <Bar dataKey="fixed" stackId="a" fill={COST_COLORS.fixed} name="固定" />
                <Bar dataKey="tel" stackId="a" fill={COST_COLORS.tel} name="线路" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 时长敏感性分析 */}
      <Card title="时长敏感性分析" size="small" style={{ borderRadius: 12 }}>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={sensitivityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="T" />
            <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} />
            <RechartsTooltip 
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
              labelFormatter={(label) => `通话时长: ${label}`}
            />
            <Legend content={renderLegend} />
            <Area type="monotone" dataKey="asr" stackId="1" stroke={COST_COLORS.asr} fill={COST_COLORS.asr} name="ASR" />
            <Area type="monotone" dataKey="llm" stackId="1" stroke={COST_COLORS.llm} fill={COST_COLORS.llm} name="LLM" />
            <Area type="monotone" dataKey="tts" stackId="1" stroke={COST_COLORS.tts} fill={COST_COLORS.tts} name="TTS" />
            <Area type="monotone" dataKey="tel" stackId="1" stroke={COST_COLORS.tel} fill={COST_COLORS.tel} name="线路" />
            {/* 总成本线 + 标签 */}
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#333" 
              strokeWidth={2}
              dot={{ fill: '#333', r: 4 }}
              name="总计"
            >
              <LabelList 
                dataKey="total" 
                position="top" 
                formatter={(value: number) => `$${value.toFixed(3)}`}
                style={{ fontSize: 11, fontWeight: 500, fill: '#333' }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

// ============ 组件：供应商对比 ============
interface VendorComparisonProps {
  behavior: CallBehavior;
  selectedBundles: string[];
  onSelectedBundlesChange: (bundles: string[]) => void;
  bundleVersion: number;
}

const VendorComparison: React.FC<VendorComparisonProps> = ({
  behavior,
  selectedBundles,
  onSelectedBundlesChange,
  bundleVersion,
}) => {
  // 图例隐藏状态
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // 切换图例显示/隐藏
  const handleLegendClick = (dataKey: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  };

  // 自定义图例渲染
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
        {payload.map((entry: any, index: number) => {
          const isHidden = hiddenSeries.has(entry.dataKey);
          return (
            <div
              key={`legend-${index}`}
              onClick={() => handleLegendClick(entry.dataKey)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                opacity: isHidden ? 0.3 : 1,
                textDecoration: isHidden ? 'line-through' : 'none',
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: entry.color,
                  borderRadius: 2,
                }}
              />
              <span style={{ fontSize: 12 }}>{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // 获取合并后的组合列表（依赖 bundleVersion 以响应更新）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allBundles = useMemo(() => getMergedBundles(), [bundleVersion]);
  
  // 计算所有选中组合的成本
  const comparisonData = useMemo(() => {
    return selectedBundles.map((bundleId) => {
      const bundle = allBundles.find((b) => b.id === bundleId);
      if (!bundle) return null;
      const cost = computeCost(behavior, bundle);
      return {
        id: bundleId,
        name: bundle.name,
        ...cost,
        config: bundle,
      };
    }).filter(Boolean) as Array<{
      id: string;
      name: string;
      config: VendorConfig;
    } & CostBreakdown>;
  }, [behavior, selectedBundles, allBundles]);

  // 对比柱状图数据（考虑隐藏项）
  const barChartData = comparisonData.map((d) => ({
    name: d.name.replace(/[（(].*[）)]/, '').trim(),
    tel: hiddenSeries.has('tel') ? 0 : d.tel,
    asr: hiddenSeries.has('asr') ? 0 : d.asr,
    tts: hiddenSeries.has('tts') ? 0 : d.tts,
    llm: hiddenSeries.has('llm') ? 0 : d.llm,
    fixed: hiddenSeries.has('fixed') ? 0 : d.fixed,
    total: d.total,
  }));

  // 表格列定义
  const columns = [
    {
      title: '供应商组合',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '线路',
      dataIndex: 'tel',
      key: 'tel',
      render: (v: number) => <Text style={{ color: COST_COLORS.tel }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'ASR',
      dataIndex: 'asr',
      key: 'asr',
      render: (v: number) => <Text style={{ color: COST_COLORS.asr }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'TTS',
      dataIndex: 'tts',
      key: 'tts',
      render: (v: number) => <Text style={{ color: COST_COLORS.tts }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'LLM',
      dataIndex: 'llm',
      key: 'llm',
      render: (v: number) => <Text style={{ color: COST_COLORS.llm }}>{formatCurrency(v)}</Text>,
    },
    {
      title: '总计',
      dataIndex: 'total',
      key: 'total',
      render: (v: number) => <Text strong style={{ color: COST_COLORS.total }}>{formatCurrency(v)}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 60,
      render: (_: any, record: any) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onSelectedBundlesChange(selectedBundles.filter((id) => id !== record.id))}
        />
      ),
    },
  ];

  // 构建选择器选项
  const bundleOptions = allBundles.map(b => ({
    value: b.id,
    label: b.name,
  }));
  
  return (
    <Card 
      title={<><BarChartOutlined /> 供应商组合对比</>}
      size="small"
      style={{ borderRadius: 12 }}
      extra={
        <Select
          mode="multiple"
          value={selectedBundles}
          onChange={onSelectedBundlesChange}
          style={{ width: 300 }}
          placeholder="添加对比组合"
          options={bundleOptions}
          maxTagCount={2}
        />
      }
    >
      {comparisonData.length > 0 ? (
        <>
          <Table
            dataSource={comparisonData}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={false}
            style={{ marginBottom: 16 }}
          />

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" height={60} />
              <YAxis tickFormatter={(v) => `$${v.toFixed(3)}`} />
              <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend content={renderLegend} />
              <Bar dataKey="asr" stackId="a" fill={COST_COLORS.asr} name="ASR" />
              <Bar dataKey="llm" stackId="a" fill={COST_COLORS.llm} name="LLM" />
              <Bar dataKey="tts" stackId="a" fill={COST_COLORS.tts} name="TTS" />
              <Bar dataKey="fixed" stackId="a" fill={COST_COLORS.fixed} name="固定" />
              <Bar dataKey="tel" stackId="a" fill={COST_COLORS.tel} name="线路" />
            </BarChart>
          </ResponsiveContainer>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          请选择要对比的供应商组合
        </div>
      )}
    </Card>
  );
};

// ============ 组件：计算详情 ============
interface CostDetailsProps {
  cost: CostBreakdown;
  vendorConfig: VendorConfig;
  behavior: CallBehavior;
}

const CostDetails: React.FC<CostDetailsProps> = ({ cost, vendorConfig, behavior }) => {
  return (
    <Collapse defaultActiveKey={[]} style={{ borderRadius: 12 }}>
      <Panel header="📊 计算详情" key="details">
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card size="small" title="通话行为" style={{ borderRadius: 8 }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">通话总时长 T</Text>
                  <Text>{behavior.T} 秒</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">机器人说话时长 T_b</Text>
                  <Text>{cost.details.T_b.toFixed(1)} 秒</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">用户说话时长 T_u</Text>
                  <Text>{cost.details.T_u.toFixed(1)} 秒</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">实际ASR时长</Text>
                  <Text style={{ color: cost.details.vadAccuracy !== 1 ? '#fa8c16' : undefined }}>
                    {cost.details.T_u_actual.toFixed(1)} 秒 ({(cost.details.vadAccuracy * 100).toFixed(0)}% VAD)
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">LLM 调用次数</Text>
                  <Text>{cost.details.n_llm} 次</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="TTS 计算" style={{ borderRadius: 8 }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">系统字符数</Text>
                  <Text>{cost.details.charSelf.toFixed(0)} chars</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">厂商计费字符(全量)</Text>
                  <Text>{cost.details.charVendor.toFixed(0)} chars</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">实际调用TTS</Text>
                  <Text style={{ color: cost.details.ttsCacheHitRate > 0 ? '#52c41a' : undefined }}>
                    {cost.details.charVendorActual.toFixed(0)} chars ({(cost.details.ttsCacheHitRate * 100).toFixed(0)}% 缓存)
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">单价</Text>
                  <Text>${vendorConfig.ttsPricePer1kChar}/1k</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">TTS 成本</Text>
                  <Text strong style={{ color: COST_COLORS.tts }}>{formatCurrency(cost.tts)}</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="LLM 计算" style={{ borderRadius: 8 }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">输入 Token</Text>
                  <Text>{cost.details.N_in.toFixed(0)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">输出 Token</Text>
                  <Text>{cost.details.N_out.toFixed(0)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Reasoning Token</Text>
                  <Text>{cost.details.N_reason.toFixed(0)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">LLM 成本</Text>
                  <Text strong style={{ color: COST_COLORS.llm }}>{formatCurrency(cost.llm)}</Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Panel>
      
      <Panel header="📋 供应商配置" key="config">
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card size="small" title={<><PhoneOutlined /> 线路</>} style={{ borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">单价</Text>
                <Text>${vendorConfig.telPricePerMin}/min</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">计费步长</Text>
                <Text>{vendorConfig.telBillingStep}s</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" title={<><AudioOutlined /> ASR</>} style={{ borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">供应商</Text>
                <Text>{vendorConfig.asrVendor}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">单价</Text>
                <Text>${vendorConfig.asrPricePerMin}/min</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" title={<><SoundOutlined /> TTS</>} style={{ borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">供应商</Text>
                <Text>{vendorConfig.ttsVendor}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">单价</Text>
                <Text>${vendorConfig.ttsPricePer1kChar}/1k</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">语速</Text>
                <Text>{vendorConfig.ttsCharPerSec} char/s</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" title={<><RobotOutlined /> LLM</>} style={{ borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">模型</Text>
                <Text>{vendorConfig.llmModel}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">输入</Text>
                <Text>${vendorConfig.llmInputPricePer1k}/1k</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">输出</Text>
                <Text>${vendorConfig.llmOutputPricePer1k}/1k</Text>
              </div>
            </Card>
          </Col>
        </Row>
      </Panel>

      <Panel header="📐 成本公式说明" key="formula">
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          {/* 总成本公式 */}
          <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
            <Text strong style={{ color: '#52c41a' }}>📊 总成本公式</Text>
            <div style={{ marginTop: 8, fontFamily: 'monospace', background: '#fff', padding: 8, borderRadius: 4 }}>
              总成本 = 线路成本 + ASR成本 + TTS成本 + LLM成本 + 固定成本
            </div>
          </div>

          {/* 线路成本 */}
          <div style={{ marginBottom: 16, padding: 12, background: '#f9f0ff', borderRadius: 8, border: '1px solid #d3adf7' }}>
            <Text strong style={{ color: '#722ed1' }}>📞 线路成本（电话通话费用）</Text>
            <div style={{ marginTop: 8, fontFamily: 'monospace', background: '#fff', padding: 8, borderRadius: 4 }}>
              线路成本 = 向上取整(通话时长, 计费步长) ÷ 60 × 每分钟单价
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              <Text type="secondary">💡 说明：通话时长按计费步长（如6秒）向上取整后，按分钟计费</Text>
            </div>
          </div>

          {/* ASR成本 */}
          <div style={{ marginBottom: 16, padding: 12, background: '#e6fffb', borderRadius: 8, border: '1px solid #87e8de' }}>
            <Text strong style={{ color: '#13c2c2' }}>🎤 ASR成本（语音识别费用）</Text>
            <div style={{ marginTop: 8, fontFamily: 'monospace', background: '#fff', padding: 8, borderRadius: 4 }}>
              ASR成本 = 向上取整(通话时长 × 用户说话占比 × VAD准确率, 计费步长) ÷ 60 × 每分钟单价
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              <Text type="secondary">💡 说明：只对用户说话部分计费，VAD准确率影响实际识别时长</Text>
            </div>
          </div>

          {/* TTS成本 */}
          <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 8, border: '1px solid #ffd591' }}>
            <Text strong style={{ color: '#fa8c16' }}>🔊 TTS成本（语音合成费用）</Text>
            <div style={{ marginTop: 8, fontFamily: 'monospace', background: '#fff', padding: 8, borderRadius: 4 }}>
              TTS成本 = 通话时长 × 机器人说话占比 × 每秒字符数 × 供应商字符比例 × (1 - 缓存命中率) × 每千字符单价 ÷ 1000
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              <Text type="secondary">💡 说明：缓存命中的内容不需要重新合成，可节省费用</Text>
            </div>
          </div>

          {/* LLM成本 */}
          <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 8, border: '1px solid #91d5ff' }}>
            <Text strong style={{ color: '#1890ff' }}>🤖 LLM成本（大模型推理费用）</Text>
            <div style={{ marginTop: 8, fontFamily: 'monospace', background: '#fff', padding: 8, borderRadius: 4 }}>
              LLM成本 = (输入单价 × 输入Token数 + 输出单价 × 输出Token数 + 推理单价 × 推理Token数) ÷ 1000
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              <Text type="secondary">💡 说明：Token数 = 系统提示词 + 上下文 + 工具定义 + 用户输入/模型输出</Text>
            </div>
          </div>

          {/* 参数说明 */}
          <div style={{ padding: 12, background: '#fafafa', borderRadius: 8, border: '1px solid #d9d9d9' }}>
            <Text strong>📋 关键参数说明</Text>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12 }}>
              <div><Text type="secondary">通话时长：</Text>单次通话总秒数</div>
              <div><Text type="secondary">用户说话占比：</Text>用户说话时间 / 总时长</div>
              <div><Text type="secondary">机器人说话占比：</Text>机器人说话时间 / 总时长</div>
              <div><Text type="secondary">VAD准确率：</Text>语音活动检测准确度</div>
              <div><Text type="secondary">缓存命中率：</Text>TTS内容命中缓存的比例</div>
              <div><Text type="secondary">计费步长：</Text>最小计费单位（如6秒）</div>
              <div><Text type="secondary">供应商字符比例：</Text>实际调用供应商的字符占比</div>
              <div><Text type="secondary">每秒字符数：</Text>语音合成的平均字符速度</div>
            </div>
          </div>
        </div>
      </Panel>
    </Collapse>
  );
};

// ============ 组件：供应商管理模态框 ============
interface VendorManagerModalProps {
  visible: boolean;
  onClose: () => void;
  onVendorsChange: () => void;
}

const VendorManagerModal: React.FC<VendorManagerModalProps> = ({ visible, onClose, onVendorsChange }) => {
  const [activeTab, setActiveTab] = useState('asr');
  const [asrForm] = Form.useForm();
  const [ttsForm] = Form.useForm();
  const [llmForm] = Form.useForm();
  const [telecomForm] = Form.useForm();
  const [customVendors, setCustomVendors] = useState(loadCustomVendors());

  const refreshCustomVendors = () => {
    setCustomVendors(loadCustomVendors());
    onVendorsChange();
  };

  const handleAddASR = (values: any) => {
    const id = `custom-asr-${Date.now()}`;
    const config: ASRVendorConfig = {
      name: values.name,
      pricePerMin: values.pricePerMin,
      pricePerCycle: values.pricePerMin / 60,
      billingCycle: values.billingCycle || '1+1',
      billingStep: values.billingStep || 1,
      description: values.description,
      remark: values.remark,
    };
    const customs = loadCustomVendors();
    customs.asr[id] = config;
    saveCustomVendors(customs);
    refreshCustomVendors();
    asrForm.resetFields();
    message.success('ASR 供应商添加成功');
  };

  const handleAddTTS = (values: any) => {
    const id = `custom-tts-${Date.now()}`;
    const config: TTSVendorConfig = {
      name: values.name,
      pricePerSpeakMin: values.pricePerSpeakMin,
      pricePerCycle: values.pricePerCycle,
      billingCycleChars: values.billingCycleChars || 1,
      pricePer1kChar: values.pricePerCycle / (values.billingCycleChars || 1),
      vendorCharRatio: values.vendorCharRatio || 1.0,
      charPerSec: values.charPerSec || 12.8,
      billingStep: 1,
      description: values.description,
    };
    const customs = loadCustomVendors();
    customs.tts[id] = config;
    saveCustomVendors(customs);
    refreshCustomVendors();
    ttsForm.resetFields();
    message.success('TTS 供应商添加成功');
  };

  const handleAddLLM = (values: any) => {
    const id = `custom-llm-${Date.now()}`;
    const inputPricePer1M = values.inputPricePer1M;
    const outputPricePer1M = values.outputPricePer1M;
    // 按 8.5:1.5 计算综合成本
    const combinedPricePer1K = (inputPricePer1M * 0.85 + outputPricePer1M * 0.15) / 1000;
    const config: LLMModelConfig = {
      name: values.name,
      inputPricePer1M,
      outputPricePer1M,
      combinedPricePer1K,
      inputPricePer1k: inputPricePer1M / 1000,
      outputPricePer1k: outputPricePer1M / 1000,
      reasonPricePer1k: (values.reasonPricePer1M || 0) / 1000,
      sysPromptTokens: values.sysPromptTokens || 500,
      contextTokens: values.contextTokens || 200,
      toolTokens: values.toolTokens || 100,
      charsPerToken: values.charsPerToken || 3.5,
      description: values.description,
    };
    const customs = loadCustomVendors();
    customs.llm[id] = config;
    saveCustomVendors(customs);
    refreshCustomVendors();
    llmForm.resetFields();
    message.success('LLM 模型添加成功');
  };

  const handleAddTelecom = (values: any) => {
    const id = `custom-telecom-${Date.now()}`;
    const config: TelecomRateConfig = {
      name: values.name,
      pricePerMin: values.pricePerMin,
      billingStep: values.billingStep || 60,
      description: values.description,
    };
    const customs = loadCustomVendors();
    customs.telecom[id] = config;
    saveCustomVendors(customs);
    refreshCustomVendors();
    telecomForm.resetFields();
    message.success('线路添加成功');
  };

  const handleDeleteVendor = (type: 'asr' | 'tts' | 'llm' | 'telecom', id: string) => {
    const customs = loadCustomVendors();
    delete customs[type][id];
    saveCustomVendors(customs);
    refreshCustomVendors();
    message.success('删除成功');
  };

  const renderASRTable = () => {
    const allVendors = getAllVendors();
    const data = Object.entries(allVendors.asr).map(([id, v]) => ({
      key: id,
      id,
      ...v,
      isCustom: !ASR_VENDORS[id],
    }));

    return (
      <Table
        dataSource={data}
        size="small"
        scroll={{ y: 300 }}
        pagination={false}
        columns={[
          { title: '名称', dataIndex: 'name', width: 180 },
          { title: '$/分钟', dataIndex: 'pricePerMin', width: 80, render: (v: number) => `$${v.toFixed(4)}` },
          { title: '计费周期', dataIndex: 'billingCycle', width: 80 },
          { title: '说明', dataIndex: 'description', ellipsis: true },
          {
            title: '操作',
            width: 60,
            render: (_: any, record: any) => record.isCustom ? (
              <Popconfirm title="确定删除?" onConfirm={() => handleDeleteVendor('asr', record.id)}>
                <Button type="text" danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            ) : <Tag color="blue">内置</Tag>,
          },
        ]}
      />
    );
  };

  const renderTTSTable = () => {
    const allVendors = getAllVendors();
    const data = Object.entries(allVendors.tts).map(([id, v]) => ({
      key: id,
      id,
      ...v,
      isCustom: !TTS_VENDORS[id],
    }));

    return (
      <Table
        dataSource={data}
        size="small"
        scroll={{ y: 300 }}
        pagination={false}
        columns={[
          { title: '名称', dataIndex: 'name', width: 200 },
          { title: '$/说话分钟', dataIndex: 'pricePerSpeakMin', width: 100, render: (v: number) => `$${v.toFixed(4)}` },
          { title: '$/1K字符', dataIndex: 'pricePer1kChar', width: 90, render: (v: number) => `$${v.toFixed(4)}` },
          { title: '语速', dataIndex: 'charPerSec', width: 70, render: (v: number) => `${v}/s` },
          {
            title: '操作',
            width: 60,
            render: (_: any, record: any) => record.isCustom ? (
              <Popconfirm title="确定删除?" onConfirm={() => handleDeleteVendor('tts', record.id)}>
                <Button type="text" danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            ) : <Tag color="blue">内置</Tag>,
          },
        ]}
      />
    );
  };

  const renderLLMTable = () => {
    const allVendors = getAllVendors();
    const data = Object.entries(allVendors.llm).map(([id, v]) => ({
      key: id,
      id,
      ...v,
      isCustom: !LLM_MODELS[id],
    }));

    return (
      <Table
        dataSource={data}
        size="small"
        scroll={{ y: 300 }}
        pagination={false}
        columns={[
          { title: '模型名称', dataIndex: 'name', width: 220 },
          { title: '输入$/M', dataIndex: 'inputPricePer1M', width: 80, render: (v: number) => `$${v}` },
          { title: '输出$/M', dataIndex: 'outputPricePer1M', width: 80, render: (v: number) => `$${v}` },
          { title: '综合$/K', dataIndex: 'combinedPricePer1K', width: 90, render: (v: number) => `$${v.toFixed(6)}` },
          {
            title: '操作',
            width: 60,
            render: (_: any, record: any) => record.isCustom ? (
              <Popconfirm title="确定删除?" onConfirm={() => handleDeleteVendor('llm', record.id)}>
                <Button type="text" danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            ) : <Tag color="blue">内置</Tag>,
          },
        ]}
      />
    );
  };

  const renderTelecomTable = () => {
    const allVendors = getAllVendors();
    const data = Object.entries(allVendors.telecom).map(([id, v]) => ({
      key: id,
      id,
      ...v,
      isCustom: !TELECOM_RATES[id],
    }));

    return (
      <Table
        dataSource={data}
        size="small"
        scroll={{ y: 300 }}
        pagination={false}
        columns={[
          { title: '线路名称', dataIndex: 'name', width: 180 },
          { title: '$/分钟', dataIndex: 'pricePerMin', width: 100, render: (v: number) => v === 0 ? '免费' : `$${v.toFixed(4)}` },
          { title: '计费步长', dataIndex: 'billingStep', width: 100, render: (v: number) => `${v}秒` },
          { title: '说明', dataIndex: 'description', ellipsis: true },
          {
            title: '操作',
            width: 60,
            render: (_: any, record: any) => record.isCustom ? (
              <Popconfirm title="确定删除?" onConfirm={() => handleDeleteVendor('telecom', record.id)}>
                <Button type="text" danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            ) : <Tag color="blue">内置</Tag>,
          },
        ]}
      />
    );
  };

  const tabItems = [
    {
      key: 'asr',
      label: `ASR (${Object.keys(getAllVendors().asr).length})`,
      children: (
        <div>
          <Card title="添加 ASR 供应商" size="small" style={{ marginBottom: 16 }}>
            <Form form={asrForm} layout="inline" onFinish={handleAddASR}>
              <Form.Item name="name" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="供应商名称" style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name="pricePerMin" rules={[{ required: true, message: '请输入价格' }]}>
                <InputNumber placeholder="$/分钟" min={0} step={0.001} style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="billingCycle">
                <Input placeholder="计费周期" style={{ width: 80 }} />
              </Form.Item>
              <Form.Item name="description">
                <Input placeholder="说明" style={{ width: 150 }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>添加</Button>
              </Form.Item>
            </Form>
          </Card>
          {renderASRTable()}
        </div>
      ),
    },
    {
      key: 'tts',
      label: `TTS (${Object.keys(getAllVendors().tts).length})`,
      children: (
        <div>
          <Card title="添加 TTS 供应商" size="small" style={{ marginBottom: 16 }}>
            <Form form={ttsForm} layout="inline" onFinish={handleAddTTS}>
              <Form.Item name="name" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="供应商名称" style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name="pricePerSpeakMin" rules={[{ required: true, message: '请输入价格' }]}>
                <InputNumber placeholder="$/说话分钟" min={0} step={0.001} style={{ width: 110 }} />
              </Form.Item>
              <Form.Item name="pricePerCycle" rules={[{ required: true }]}>
                <InputNumber placeholder="$/成本周期" min={0} step={0.1} style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="billingCycleChars">
                <InputNumber placeholder="周期M字符" min={1} style={{ width: 90 }} />
              </Form.Item>
              <Form.Item name="charPerSec">
                <InputNumber placeholder="语速" min={1} style={{ width: 70 }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>添加</Button>
              </Form.Item>
            </Form>
          </Card>
          {renderTTSTable()}
        </div>
      ),
    },
    {
      key: 'llm',
      label: `LLM (${Object.keys(getAllVendors().llm).length})`,
      children: (
        <div>
          <Card title="添加 LLM 模型" size="small" style={{ marginBottom: 16 }}>
            <Form form={llmForm} layout="inline" onFinish={handleAddLLM}>
              <Form.Item name="name" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="模型名称" style={{ width: 180 }} />
              </Form.Item>
              <Form.Item name="inputPricePer1M" rules={[{ required: true, message: '请输入输入价格' }]}>
                <InputNumber placeholder="输入$/M" min={0} step={0.01} style={{ width: 90 }} />
              </Form.Item>
              <Form.Item name="outputPricePer1M" rules={[{ required: true, message: '请输入输出价格' }]}>
                <InputNumber placeholder="输出$/M" min={0} step={0.01} style={{ width: 90 }} />
              </Form.Item>
              <Form.Item name="charsPerToken">
                <InputNumber placeholder="字符/token" min={1} max={10} step={0.5} style={{ width: 100 }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>添加</Button>
              </Form.Item>
            </Form>
          </Card>
          {renderLLMTable()}
        </div>
      ),
    },
    {
      key: 'telecom',
      label: `线路 (${Object.keys(getAllVendors().telecom).length})`,
      children: (
        <div>
          <Card title="添加线路" size="small" style={{ marginBottom: 16 }}>
            <Form form={telecomForm} layout="inline" onFinish={handleAddTelecom}>
              <Form.Item name="name" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="线路名称（如：美国本地）" style={{ width: 180 }} />
              </Form.Item>
              <Form.Item name="pricePerMin" rules={[{ required: true, message: '请输入价格' }]}>
                <InputNumber placeholder="$/分钟" min={0} step={0.001} style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="billingStep">
                <InputNumber placeholder="计费步长(秒)" min={1} max={60} style={{ width: 120 }} />
              </Form.Item>
              <Form.Item name="description">
                <Input placeholder="说明（可选）" style={{ width: 150 }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>添加</Button>
              </Form.Item>
            </Form>
          </Card>
          {renderTelecomTable()}
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={<><DatabaseOutlined /> 供应商配置管理</>}
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>,
      ]}
    >
      <Alert
        message="在这里可以查看所有内置供应商配置，并添加自定义供应商。自定义供应商会保存在浏览器本地存储中。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </Modal>
  );
};

// ============ 主页面组件 ============
const AICostSimulatorPage: React.FC = () => {
  // 通话行为状态
  const [behavior, setBehavior] = useState<CallBehavior>({
    T: 60,
    r_b: 0.4,
    r_u: 0.35,
    q: 0.3,
    ttsCacheHitRate: 0.3,  // 默认30%缓存命中
    vadAccuracy: 1.0,       // 默认VAD准确率100%
  });

  // 供应商选择状态
  const [selectedBundle, setSelectedBundle] = useState<string>('balanced-gpt4mini');
  const [useCustomConfig, setUseCustomConfig] = useState(false);
  const [customConfig, setCustomConfig] = useState({
    asr: 'google-standard-nolog',
    tts: 'cartesia',
    llm: 'gpt4o-mini-0718',
    telecom: 'free',
    fixedCost: 0,
  });

  // 固定成本状态（全局，适用于预设和自定义模式）
  const [fixedCost, setFixedCost] = useState(0);

  // 对比组合状态
  const [comparisonBundles, setComparisonBundles] = useState<string[]>([
    'ultra-budget',
    'balanced-gpt4mini',
    'premium-11labs',
  ]);

  // 供应商管理模态框
  const [vendorManagerVisible, setVendorManagerVisible] = useState(false);
  const [vendorOptionsVersion, setVendorOptionsVersion] = useState(0);
  
  // 场景预设版本（用于触发重新渲染）
  const [scenarioVersion, setScenarioVersion] = useState(0);
  
  // 供应商组合版本（用于触发重新渲染）
  const [bundleVersion, setBundleVersion] = useState(0);

  // 保存预设组合模态框
  const [saveBundleModalVisible, setSaveBundleModalVisible] = useState(false);
  const [saveBundleForm] = Form.useForm();

  // 保存自定义组合为预设
  const handleSaveAsBundle = () => {
    setSaveBundleModalVisible(true);
  };

  const handleSaveBundleConfirm = (values: { name: string; description: string }) => {
    const config = buildVendorConfig(
      customConfig.asr,
      customConfig.tts,
      customConfig.llm,
      customConfig.telecom,
      fixedCost
    );
    const bundleId = `custom-${Date.now()}`;
    const bundleConfig: VendorConfig = {
      ...config,
      id: bundleId,
      name: values.name,
      description: values.description || '自定义预设组合',
    };
    addCustomBundle(bundleId, bundleConfig);
    setVendorOptionsVersion(v => v + 1);
    setSaveBundleModalVisible(false);
    saveBundleForm.resetFields();
    message.success('预设组合保存成功！');
    // 切换到预设模式并选中新保存的组合
    setUseCustomConfig(false);
    setSelectedBundle(bundleId);
  };

  // 删除自定义预设组合
  const handleDeleteBundle = (id: string) => {
    removeCustomBundle(id);
    setVendorOptionsVersion(v => v + 1);
    // 如果删除的是当前选中的组合，切换到默认组合
    if (selectedBundle === id) {
      setSelectedBundle('balanced-gpt4mini');
    }
    message.success('预设组合已删除');
  };

  // 获取合并后的供应商组合
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mergedBundlesList = useMemo(() => getMergedBundles(), [bundleVersion, vendorOptionsVersion]);
  
  // 计算当前供应商配置
  const currentVendorConfig = useMemo(() => {
    let config: VendorConfig;
    if (useCustomConfig) {
      config = buildVendorConfig(
        customConfig.asr,
        customConfig.tts,
        customConfig.llm,
        customConfig.telecom,
        fixedCost  // 使用用户设置的固定成本
      );
    } else {
      // 从合并后的预设组合中查找
      config = mergedBundlesList.find(b => b.id === selectedBundle) || VENDOR_BUNDLES[0];
    }
    // 覆盖固定成本为用户设置的值
    return { ...config, fixedCostPerCall: fixedCost };
  }, [useCustomConfig, customConfig, selectedBundle, mergedBundlesList, fixedCost]);

  // 计算成本
  const cost = useMemo(() => {
    return computeCost(behavior, currentVendorConfig);
  }, [behavior, currentVendorConfig]);

  // 获取合并后的场景预设
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mergedScenarios = useMemo(() => getMergedScenarioPresets(), [scenarioVersion]);
  
  // 计算场景加权平均成本
  const weightedCost = useMemo(() => {
    return computeWeightedAverageCost(mergedScenarios, currentVendorConfig);
  }, [mergedScenarios, currentVendorConfig]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: 24 }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={3} style={{ marginBottom: 8 }}>
              <DollarOutlined style={{ marginRight: 8, color: '#52c41a' }} />
              AI Agent 成本模拟器
            </Title>
            <Paragraph type="secondary">
              模拟不同供应商组合（ASR/TTS/LLM）在各种通话场景下的成本，支持参数调节和多组合对比分析。
            </Paragraph>
          </div>
          <Button 
            type="primary" 
            size="large"
            icon={<DatabaseOutlined />}
            onClick={() => setVendorManagerVisible(true)}
          >
            供应商配置管理
          </Button>
        </div>

        <Row gutter={24}>
          {/* 左侧控制面板 */}
          <Col xs={24} lg={8} xl={7}>
            <ControlPanel
              behavior={behavior}
              onBehaviorChange={setBehavior}
              selectedBundle={selectedBundle}
              onBundleChange={setSelectedBundle}
              customConfig={customConfig}
              onCustomConfigChange={setCustomConfig}
              useCustomConfig={useCustomConfig}
              onUseCustomConfigChange={setUseCustomConfig}
              fixedCost={fixedCost}
              onFixedCostChange={setFixedCost}
              onSaveAsBundle={handleSaveAsBundle}
              onDeleteBundle={handleDeleteBundle}
              vendorOptionsVersion={vendorOptionsVersion}
              scenarioVersion={scenarioVersion}
              onScenarioChange={() => setScenarioVersion(v => v + 1)}
              bundleVersion={bundleVersion}
              onBundleVersionChange={() => setBundleVersion(v => v + 1)}
            />
          </Col>

          {/* 右侧结果展示 */}
          <Col xs={24} lg={16} xl={17}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* KPI 卡片 */}
              <Row gutter={12}>
                <Col span={8}>
                  <KpiCard
                    title="单次通话总成本"
                    value={formatCurrency(cost.total)}
                    subtitle={`${(cost.total / behavior.T * 60).toFixed(4)} $/min`}
                    icon={<DollarOutlined />}
                    color={COST_COLORS.total}
                  />
                </Col>
                <Col span={8}>
                  <KpiCard
                    title="TTS 成本"
                    value={formatCurrency(cost.tts)}
                    icon={<SoundOutlined />}
                    color={COST_COLORS.tts}
                    percent={formatPercent(cost.tts, cost.total)}
                  />
                </Col>
                <Col span={8}>
                  <KpiCard
                    title="LLM 成本"
                    value={formatCurrency(cost.llm)}
                    icon={<RobotOutlined />}
                    color={COST_COLORS.llm}
                    percent={formatPercent(cost.llm, cost.total)}
                  />
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={8}>
                  <KpiCard
                    title="ASR 成本"
                    value={formatCurrency(cost.asr)}
                    icon={<AudioOutlined />}
                    color={COST_COLORS.asr}
                    percent={formatPercent(cost.asr, cost.total)}
                  />
                </Col>
                <Col span={8}>
                  <KpiCard
                    title="线路成本"
                    value={formatCurrency(cost.tel)}
                    icon={<PhoneOutlined />}
                    color={COST_COLORS.tel}
                    percent={formatPercent(cost.tel, cost.total)}
                  />
                </Col>
                <Col span={8}>
                  <KpiCard
                    title="场景加权平均成本"
                    value={formatCurrency(weightedCost.avgCost.total)}
                    subtitle={`基于${mergedScenarios.length}种典型场景`}
                    icon={<BarChartOutlined />}
                    color="#eb2f96"
                    tooltip={
                      <div style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>📐 计算公式</div>
                        <div style={{ marginBottom: 8, fontFamily: 'monospace', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 4 }}>
                          加权平均成本 = Σ(场景成本 × 权重) / Σ权重
                        </div>
                        <div style={{ fontWeight: 600, marginBottom: 4, marginTop: 12 }}>📊 场景权重分布</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
                          {mergedScenarios.map(s => {
                            const totalWeight = mergedScenarios.reduce((sum, p) => sum + (p.weight ?? 1), 0);
                            const pct = ((s.weight ?? 1) / totalWeight * 100).toFixed(0);
                            return (
                              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{s.name}:</span>
                                <span style={{ fontWeight: 500 }}>{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 11 }}>
                          💡 权重反映该场景在实际业务中的出现频率（点击编辑按钮可修改）
                        </div>
                      </div>
                    }
                  />
                </Col>
              </Row>

              {/* 成本图表 */}
              <CostCharts cost={cost} vendorConfig={currentVendorConfig} behavior={behavior} />

              {/* 供应商对比 */}
              <VendorComparison
                behavior={behavior}
                selectedBundles={comparisonBundles}
                onSelectedBundlesChange={setComparisonBundles}
                bundleVersion={bundleVersion}
              />

              {/* 计算详情 */}
              <CostDetails cost={cost} vendorConfig={currentVendorConfig} behavior={behavior} />
            </div>
          </Col>
        </Row>

        {/* 供应商管理模态框 */}
        <VendorManagerModal
          visible={vendorManagerVisible}
          onClose={() => setVendorManagerVisible(false)}
          onVendorsChange={() => setVendorOptionsVersion(v => v + 1)}
        />

        {/* 保存预设组合模态框 */}
        <Modal
          title="保存为预设组合"
          open={saveBundleModalVisible}
          onCancel={() => {
            setSaveBundleModalVisible(false);
            saveBundleForm.resetFields();
          }}
          footer={null}
          width={480}
        >
          <Form
            form={saveBundleForm}
            layout="vertical"
            onFinish={handleSaveBundleConfirm}
          >
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="当前配置"
              description={
                <div style={{ fontSize: 12 }}>
                  <div>ASR: {getAllVendors().asr[customConfig.asr]?.name || customConfig.asr}</div>
                  <div>TTS: {getAllVendors().tts[customConfig.tts]?.name || customConfig.tts}</div>
                  <div>LLM: {getAllVendors().llm[customConfig.llm]?.name || customConfig.llm}</div>
                  <div>线路: {getAllVendors().telecom[customConfig.telecom]?.name || customConfig.telecom}</div>
                </div>
              }
            />
            <Form.Item
              name="name"
              label="预设名称"
              rules={[{ required: true, message: '请输入预设名称' }]}
            >
              <Input placeholder="例如：高性价比组合、企业版配置" maxLength={50} />
            </Form.Item>
            <Form.Item
              name="description"
              label="描述（可选）"
            >
              <Input.TextArea 
                placeholder="简要描述这个预设组合的特点" 
                rows={2}
                maxLength={100}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setSaveBundleModalVisible(false);
                  saveBundleForm.resetFields();
                }}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  保存预设
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};

export default AICostSimulatorPage;

