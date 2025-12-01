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
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon, color, percent }) => (
  <Card 
    size="small" 
    style={{ 
      background: `linear-gradient(135deg, ${color}08 0%, ${color}15 100%)`,
      borderColor: `${color}30`,
      borderRadius: 12,
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
        <Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <Text strong style={{ fontSize: 20, color }}>{value}</Text>
          {percent && <Tag color={color} style={{ margin: 0 }}>{percent}</Tag>}
        </div>
        {subtitle && <Text type="secondary" style={{ fontSize: 11 }}>{subtitle}</Text>}
      </div>
    </div>
  </Card>
);

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
}) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const vendorOptions = useMemo(() => getAllVendorOptions(), [vendorOptionsVersion]);

  const handleScenarioClick = (scenario: typeof SCENARIO_PRESETS[0]) => {
    onBehaviorChange({
      T: scenario.T,
      r_b: scenario.r_b,
      r_u: scenario.r_u,
      q: scenario.q,
      ttsCacheHitRate: scenario.ttsCacheHitRate ?? 0.3,
      vadAccuracy: scenario.vadAccuracy ?? 1.0,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 供应商组合选择 */}
      <Card 
        title={<><SettingOutlined /> 供应商组合</>} 
        size="small"
        style={{ borderRadius: 12 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text type="secondary">使用预设组合</Text>
              <Switch 
                checked={!useCustomConfig} 
                onChange={(checked) => onUseCustomConfigChange(!checked)}
                checkedChildren="预设"
                unCheckedChildren="自定义"
              />
            </div>
            
            {!useCustomConfig ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <Select
                  value={selectedBundle}
                  onChange={onBundleChange}
                  style={{ flex: 1 }}
                  options={vendorOptions.bundles}
                  optionRender={(option) => (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div>{option.label}</div>
                        <Text type="secondary" style={{ fontSize: 11 }}>{option.data.description}</Text>
                      </div>
                      {option.data.isCustom && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>自定义</Tag>
                      )}
                    </div>
                  )}
                />
                {isCustomBundle(selectedBundle) && (
                  <Popconfirm
                    title="删除预设组合"
                    description="确定要删除这个自定义预设组合吗？"
                    onConfirm={() => onDeleteBundle(selectedBundle)}
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
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
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SCENARIO_PRESETS.map((scenario) => (
            <Tooltip key={scenario.id} title={scenario.description}>
              <Button
                size="small"
                onClick={() => handleScenarioClick(scenario)}
                style={{ borderRadius: 16 }}
              >
                {scenario.name}
              </Button>
            </Tooltip>
          ))}
        </div>
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
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={sensitivityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="T" />
            <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend content={renderLegend} />
            <Area type="monotone" dataKey="asr" stackId="1" stroke={COST_COLORS.asr} fill={COST_COLORS.asr} name="ASR" />
            <Area type="monotone" dataKey="llm" stackId="1" stroke={COST_COLORS.llm} fill={COST_COLORS.llm} name="LLM" />
            <Area type="monotone" dataKey="tts" stackId="1" stroke={COST_COLORS.tts} fill={COST_COLORS.tts} name="TTS" />
            <Area type="monotone" dataKey="tel" stackId="1" stroke={COST_COLORS.tel} fill={COST_COLORS.tel} name="线路" />
          </AreaChart>
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
}

const VendorComparison: React.FC<VendorComparisonProps> = ({
  behavior,
  selectedBundles,
  onSelectedBundlesChange,
}) => {
  const vendorOptions = getVendorOptions();
  
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

  // 计算所有选中组合的成本
  const comparisonData = useMemo(() => {
    return selectedBundles.map((bundleId) => {
      const bundle = VENDOR_BUNDLES.find((b) => b.id === bundleId);
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
  }, [behavior, selectedBundles]);

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
          options={vendorOptions.bundles}
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
        <div style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 2 }}>
          <Paragraph>
            <Text strong>总成本公式：</Text>
            <br />
            <Text code>C_total = C_tel + C_ASR + C_TTS + C_LLM + C_fixed</Text>
          </Paragraph>
          <Paragraph>
            <Text strong>线路成本：</Text>
            <br />
            <Text code>C_tel = CEILING(T, b_tel) / 60 × p_tel_min</Text>
          </Paragraph>
          <Paragraph>
            <Text strong>ASR成本：</Text>
            <br />
            <Text code>C_ASR = CEILING(T × r_u, b_asr) / 60 × p_asr_min</Text>
          </Paragraph>
          <Paragraph>
            <Text strong>TTS成本：</Text>
            <br />
            <Text code>C_TTS = T × r_b × v_char/s × k_vendor × p_tts_char / 1000</Text>
          </Paragraph>
          <Paragraph>
            <Text strong>LLM成本：</Text>
            <br />
            <Text code>C_LLM = (p_in × N_in + p_out × N_out + p_reason × N_reason) / 1000</Text>
          </Paragraph>
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
    telecom: 'us-local',
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
      // 从所有预设组合中查找（包括自定义预设）
      config = getBundleById(selectedBundle) || VENDOR_BUNDLES[0];
    }
    // 覆盖固定成本为用户设置的值
    return { ...config, fixedCostPerCall: fixedCost };
  }, [useCustomConfig, customConfig, selectedBundle, vendorOptionsVersion, fixedCost]);

  // 计算成本
  const cost = useMemo(() => {
    return computeCost(behavior, currentVendorConfig);
  }, [behavior, currentVendorConfig]);

  // 计算场景加权平均成本
  const weightedCost = useMemo(() => {
    return computeWeightedAverageCost(SCENARIO_PRESETS, currentVendorConfig);
  }, [currentVendorConfig]);

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
                    subtitle="基于6种典型场景"
                    icon={<BarChartOutlined />}
                    color="#eb2f96"
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
      </Content>
    </Layout>
  );
};

export default AICostSimulatorPage;

