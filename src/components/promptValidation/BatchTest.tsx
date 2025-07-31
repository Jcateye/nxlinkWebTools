import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  Button,
  Progress,
  Table,
  Tag,
  Space,
  Modal,
  message,
  Row,
  Col,
  InputNumber,
  Divider,
  Typography,
  List,
  Badge,
  Spin,
  Alert
} from 'antd';
import { PlayCircleOutlined, StopOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { LLMProvider, Prompt, TestRun, TestResult } from '../../types/promptValidation';
import PromptValidationApiService from '../../services/promptValidationApi';

const { Option } = Select;
const { Title, Text } = Typography;

// 日志条目接口
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

// 当前执行状态接口
interface ExecutionStatus {
  currentProvider?: string;
  currentModel?: string;
  currentPrompt?: string;
  currentIteration?: number;
  totalIterations?: number;
  startTime?: number;
  estimatedTimeRemaining?: number;
}

const BatchTest: React.FC = () => {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const apiService = PromptValidationApiService.getInstance();
  
  // 新增状态
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>({});
  const [showLogs, setShowLogs] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // 发送日志到服务器
  const sendLogToServer = async (level: LogEntry['level'], message: string, details?: any) => {
    try {
      await fetch('/batch-test-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level,
          message,
          details,
          sessionId
        }),
      });
    } catch (error) {
      console.error('发送日志到服务器失败:', error);
    }
  };

  // 添加日志的函数
  const addLog = (level: LogEntry['level'], message: string, details?: any) => {
    const logEntry: LogEntry = {
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      details
    };
    
    setLogs(prev => {
      const newLogs = [...prev, logEntry];
      // 保持最多500条日志
      if (newLogs.length > 500) {
        return newLogs.slice(-500);
      }
      return newLogs;
    });

    // 同时输出到控制台
    const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[${logEntry.timestamp}] ${message}`, details || '');

    // 发送到服务器
    sendLogToServer(level, message, details);
  };

  // 清空日志
  const clearLogs = () => {
    setLogs([]);
    addLog('info', '日志已清空');
  };

  // 创建演示数据
  const createDemoData = () => {
    // 创建演示厂商
    const demoProviders: LLMProvider[] = [
      {
        id: 'openai',
        name: 'OpenAI',
        apiKey: 'demo-key',
        models: [
          { id: 'gpt-4', providerId: 'openai', name: 'GPT-4', maxTokens: 4096 },
          { id: 'gpt-3.5-turbo', providerId: 'openai', name: 'GPT-3.5 Turbo', maxTokens: 4096 }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        apiKey: 'demo-key',
        models: [
          { id: 'claude-3', providerId: 'anthropic', name: 'Claude 3', maxTokens: 4096 },
          { id: 'claude-2', providerId: 'anthropic', name: 'Claude 2', maxTokens: 4096 }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 创建演示提示词
    const demoPrompts: Prompt[] = [
      {
        id: 'demo-1',
        name: '创意写作助手',
        systemPrompt: '你是一个富有创意的写作助手，能够帮助用户创作各种类型的内容。',
        userPrompt: '请写一个关于人工智能的短故事，不超过200字。',
        content: '请写一个关于人工智能的短故事，不超过200字。',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'demo-2',
        name: '代码解释器',
        systemPrompt: '你是一个专业的代码解释器，能够清晰地解释各种编程概念。',
        userPrompt: '请解释什么是递归，并给出一个简单的Python示例。',
        content: '请解释什么是递归，并给出一个简单的Python示例。',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 保存到localStorage
    localStorage.setItem('llm_providers', JSON.stringify(demoProviders));
    localStorage.setItem('prompts', JSON.stringify(demoPrompts));

    // 重新加载数据
    loadData();
    
    addLog('success', '✅ 演示数据已创建', {
      providers: demoProviders.length,
      prompts: demoPrompts.length
    });
    
    message.success('演示数据已创建！现在可以开始批量测试了。');
  };

  // 计算预估剩余时间
  const calculateEstimatedTime = (completedTests: number, totalTests: number, startTime: number): number => {
    if (completedTests === 0) return 0;
    const elapsed = Date.now() - startTime;
    const avgTimePerTest = elapsed / completedTests;
    const remainingTests = totalTests - completedTests;
    return Math.round((remainingTests * avgTimePerTest) / 1000); // 转换为秒
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  useEffect(() => {
    loadData();
    addLog('info', '批量测试组件已加载');
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      addLog('info', '开始加载数据...');

      // 并行加载所有数据
      const [providersResponse, promptsResponse, testRunsResponse] = await Promise.all([
        apiService.getProviders().catch(error => ({ success: false, error: error.message })),
        apiService.getPrompts().catch(error => ({ success: false, error: error.message })),
        apiService.getTestRuns().catch(error => ({ success: false, error: error.message }))
      ]);

      // 加载LLM配置
      if (providersResponse.success && 'data' in providersResponse && providersResponse.data) {
        setProviders(providersResponse.data);
        addLog('success', `✅ 已加载 ${providersResponse.data.length} 个LLM厂商配置`);
      } else {
        addLog('warning', '⚠️ 从API加载LLM厂商配置失败，尝试从本地存储加载');
        // 降级到localStorage
        const savedProviders = localStorage.getItem('llm_providers');
        if (savedProviders) {
          const parsedProviders = JSON.parse(savedProviders);
          setProviders(parsedProviders);
          addLog('success', `📦 从本地存储加载 ${parsedProviders.length} 个LLM厂商配置`);
        } else {
          addLog('warning', '❌ 未找到LLM厂商配置，请先配置LLM厂商');
        }
      }

      // 加载提示词
      if (promptsResponse.success && 'data' in promptsResponse && promptsResponse.data) {
        setPrompts(promptsResponse.data);
        addLog('success', `✅ 已加载 ${promptsResponse.data.length} 个提示词`);
      } else {
        addLog('warning', '⚠️ 从API加载提示词失败，尝试从本地存储加载');
        // 降级到localStorage
        const savedPrompts = localStorage.getItem('prompts');
        if (savedPrompts) {
          const parsedPrompts = JSON.parse(savedPrompts);
          setPrompts(parsedPrompts);
          addLog('success', `📦 从本地存储加载 ${parsedPrompts.length} 个提示词`);
        } else {
          addLog('warning', '❌ 未找到提示词配置，请先创建提示词');
        }
      }

      // 加载测试记录
      if (testRunsResponse.success && 'data' in testRunsResponse && testRunsResponse.data) {
        setTestRuns(testRunsResponse.data);
        addLog('success', `✅ 已加载 ${testRunsResponse.data.length} 个测试记录`);
      } else {
        addLog('warning', '⚠️ 从API加载测试记录失败，尝试从本地存储加载');
        // 降级到localStorage
        const savedTestRuns = localStorage.getItem('test_runs');
        if (savedTestRuns) {
          const parsedTestRuns = JSON.parse(savedTestRuns);
          setTestRuns(parsedTestRuns);
          addLog('success', `📦 从本地存储加载 ${parsedTestRuns.length} 个测试记录`);
        }
      }

      addLog('success', '🎉 数据加载完成');
    } catch (error) {
      addLog('error', '❌ 加载数据失败', error);
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTestRun = (testRun: TestRun) => {
    const updatedRuns = [...testRuns, testRun];
    localStorage.setItem('test_runs', JSON.stringify(updatedRuns));
    setTestRuns(updatedRuns);
    addLog('success', `测试记录已保存: ${testRun.name}`);
  };

  const callLLMAPI = async (
    prompt: string | Prompt, 
    modelId: string,
    provider: LLMProvider,
    temperature?: number,
    maxTokens?: number
  ): Promise<{output: string, duration: number, tokens: any}> => {
    const startTime = Date.now();
    
    try {
      addLog('info', `🚀 开始调用API: ${provider.name} - ${modelId}`, {
        provider: provider.name,
        model: modelId,
        temperature,
        maxTokens
      });
      
      const model = provider.models.find(m => m.id === modelId);
      if (!model) {
        throw new Error(`模型 ${modelId} 在提供商 ${provider.name} 中未找到`);
      }

      // 当前版本使用模拟响应进行演示

      // 简化的API调用实现 - 目前使用模拟响应
      addLog('info', `📡 开始模拟API调用...`);
      
      // 模拟网络延迟
      const simulationTime = Math.random() * 2000 + 1000; // 1-3秒
      await new Promise(resolve => setTimeout(resolve, simulationTime));
      
      const responseTime = Date.now() - startTime;
      
      // 构建模拟响应
      const promptText = typeof prompt === 'string' 
        ? prompt 
        : (prompt.systemPrompt || '') + ' ' + (prompt.userPrompt || prompt.content || '');
      
      const promptTokens = Math.floor(promptText.length / 4);
      const completionTokens = Math.floor(Math.random() * 500) + 100;
      
      const output = `这是来自 ${provider.name} - ${model.name} 的模拟响应。\n\n基于您的提示词："${promptText.substring(0, 100)}${promptText.length > 100 ? '...' : ''}"，我生成了这个示例回复。\n\n实际使用时，这里将显示真实的LLM响应内容。当前为演示模式。`;
      
      const tokens = {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens
      };

      addLog('success', `🎉 模拟API调用完成 (${responseTime}ms)`, {
        provider: provider.name,
        model: modelId,
        responseTime,
        outputLength: output.length,
        tokens: tokens,
        tokensPerSecond: tokens.total ? Math.round((tokens.total / responseTime) * 1000) : 0
      });

      return {
        output,
        duration: responseTime,
        tokens,
      };

    } catch (error: any) {
      const errorTime = Date.now() - startTime;
      addLog('error', `API调用失败 (${errorTime}ms): ${error.message}`, {
        provider: provider.name,
        model: modelId,
        error: error.message,
        stack: error.stack
      });
      
      return {
        output: `错误: ${error.message}`,
        duration: errorTime,
        tokens: { prompt: 0, completion: 0, total: 0 },
      };
    }
  };

  const handleStartTest = async () => {
    try {
      const values = await form.validateFields();
      const { selectedProviders, selectedPrompts, temperature, maxTokens, iterations } = values;

      if (!selectedProviders?.length || !selectedPrompts?.length) {
        message.error('请选择至少一个LLM厂商和一个提示词');
        return;
      }

      // 清空之前的日志
      setLogs([]);
      setIsRunning(true);
      setCurrentProgress(0);

      const testStartTime = Date.now();
      addLog('info', '🚀 开始批量测试', {
        providers: selectedProviders.length,
        prompts: selectedPrompts.length,
        iterations,
        temperature,
        maxTokens
      });

      const testRun: TestRun = {
        id: Date.now().toString(),
        name: `批量测试 - ${new Date().toLocaleString()}`,
        createdAt: new Date().toISOString(),
        config: {
          providers: selectedProviders,
          prompts: selectedPrompts,
          temperature: temperature || 0.7,
          maxTokens: maxTokens || 2048,
          iterations: iterations || 1,
        },
        results: [],
        status: 'running',
        totalTests: selectedProviders.length * selectedPrompts.length * (iterations || 1),
        completedTests: 0,
      };

      let completedTests = 0;
      const totalTests = testRun.totalTests;

      // 更新执行状态
      setExecutionStatus({
        totalIterations: iterations || 1,
        startTime: testStartTime
      });

      addLog('info', `总计需要执行 ${totalTests} 个测试`);

      for (let iteration = 0; iteration < (iterations || 1); iteration++) {
        if (!isRunning) {
          addLog('warning', '测试被用户停止');
          break;
        }

        addLog('info', `📋 开始第 ${iteration + 1}/${iterations || 1} 轮测试`);
        
        setExecutionStatus(prev => ({
          ...prev,
          currentIteration: iteration + 1
        }));

        for (const providerId of selectedProviders) {
          const provider = providers.find(p => p.id === providerId);
          if (!provider) {
            addLog('warning', `未找到厂商: ${providerId}`);
            continue;
          }

          if (!isRunning) {
            addLog('warning', '⏹️ 用户停止测试，跳出厂商循环');
            break;
          }

          addLog('info', `🏢 开始测试厂商: ${provider.name}`);
          setExecutionStatus(prev => ({
            ...prev,
            currentProvider: provider.name
          }));

          for (const promptId of selectedPrompts) {
            const prompt = prompts.find(p => p.id === promptId);
            if (!prompt) {
              addLog('warning', `未找到提示词: ${promptId}`);
              continue;
            }

            if (!isRunning) {
              addLog('warning', '⏹️ 用户停止测试，跳出提示词循环');
              break;
            }

            addLog('info', `📝 开始测试提示词: ${prompt.name}`);
            setExecutionStatus(prev => ({
              ...prev,
              currentPrompt: prompt.name
            }));

            try {
              // 为每个模型运行测试
              for (const model of provider.models) {
                if (!isRunning) {
                  addLog('warning', '⏹️ 用户停止测试，跳出模型循环');
                  break;
                }

                addLog('info', `🤖 开始测试模型: ${model.name}`, {
                  modelId: model.id,
                  maxTokens: model.maxTokens,
                  description: model.description
                });
                
                setExecutionStatus(prev => ({
                  ...prev,
                  currentModel: model.name
                }));

                const modelStartTime = Date.now();
                const result = await callLLMAPI(
                  prompt,
                  model.id,
                  provider,
                  temperature,
                  maxTokens
                );
                const modelEndTime = Date.now();

                const testResult: TestResult = {
                  id: `${Date.now()}-${Math.random()}`,
                  providerId: provider.id,
                  providerName: provider.name,
                  modelId: model.id,
                  modelName: model.name,
                  promptId: prompt.id,
                  promptName: prompt.name,
                  promptContent: typeof prompt === 'string' ? prompt : prompt.content,
                  systemPrompt: typeof prompt === 'object' ? prompt.systemPrompt : '',
                  userPrompt: typeof prompt === 'object' ? prompt.userPrompt || prompt.content : prompt,
                  output: result.output,
                  duration: result.duration,
                  tokens: result.tokens,
                  timestamp: new Date().toISOString(),
                  iteration: iteration + 1,
                  temperature: temperature || 0.7,
                  maxTokens: maxTokens || 2048,
                };

                testRun.results.push(testResult);
                
                const isSuccess = !result.output.startsWith('错误:');
                const logLevel = isSuccess ? 'success' : 'warning';
                const logIcon = isSuccess ? '✅' : '⚠️';
                
                addLog(logLevel, `${logIcon} 模型测试完成: ${model.name} (${result.duration}ms)`, {
                  success: isSuccess,
                  tokens: result.tokens,
                  outputLength: result.output.length,
                  tokensPerSecond: result.tokens.total ? Math.round((result.tokens.total / result.duration) * 1000) : 0,
                  costEstimate: result.tokens.total ? `~${(result.tokens.total * 0.00002).toFixed(4)}$` : '未知'
                });
              }

              completedTests++;
              const progressPercent = (completedTests / totalTests) * 100;
              setCurrentProgress(progressPercent);
              testRun.completedTests = completedTests;

              // 更新预估时间
              const estimatedTime = calculateEstimatedTime(completedTests, totalTests, testStartTime);
              setExecutionStatus(prev => ({
                ...prev,
                estimatedTimeRemaining: estimatedTime
              }));

              addLog('info', `📊 进度更新: ${completedTests}/${totalTests} (${Math.round(progressPercent)}%)`, {
                estimatedTimeRemaining: estimatedTime > 0 ? formatTime(estimatedTime) : '计算中...',
                elapsedTime: formatTime(Math.round((Date.now() - testStartTime) / 1000)),
                averageTimePerTest: completedTests > 0 ? Math.round((Date.now() - testStartTime) / completedTests) + 'ms' : '计算中...'
              });

            } catch (error: any) {
              addLog('error', `💥 测试执行失败: ${error.message}`, {
                error: error.message,
                stack: error.stack,
                provider: provider.name,
                prompt: prompt.name
              });
              message.error(`测试执行失败: ${error.message}`);
            }
          }
        }
      }

      const totalDuration = Date.now() - testStartTime;
      testRun.status = isRunning ? 'completed' : 'stopped';
      testRun.completedAt = new Date().toISOString();
      
      saveTestRun(testRun);
      setIsRunning(false);
      setCurrentProgress(100);
      
      addLog('success', `🎉 批量测试完成！`, {
        completedTests,
        totalTests,
        duration: formatTime(Math.round(totalDuration / 1000)),
        successRate: `${Math.round((completedTests / totalTests) * 100)}%`
      });
      
      message.success(`批量测试完成！共执行 ${completedTests} 个测试，耗时 ${formatTime(Math.round(totalDuration / 1000))}`);

      // 清空执行状态
      setExecutionStatus({});

    } catch (error: any) {
      addLog('error', `批量测试失败: ${error.message}`, error);
      message.error(`批量测试失败: ${error.message}`);
      setIsRunning(false);
      setExecutionStatus({});
    }
  };

  const handleStopTest = () => {
    setIsRunning(false);
    addLog('warning', '⏹️ 用户请求停止测试');
    message.info('正在停止测试...');
  };

  const deleteTestRun = (runId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个测试记录吗？',
      onOk: () => {
        const updatedRuns = testRuns.filter(run => run.id !== runId);
        localStorage.setItem('test_runs', JSON.stringify(updatedRuns));
        setTestRuns(updatedRuns);
        message.success('测试记录已删除');
      },
    });
  };

  const viewTestResults = (run: TestRun) => {
    Modal.info({
      title: `测试结果详情 - ${run.name}`,
      width: 800,
      content: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <p><strong>测试配置:</strong></p>
            <ul>
              <li>厂商数量: {run.config.providers.length}</li>
              <li>提示词数量: {run.config.prompts.length}</li>
              <li>测试轮数: {run.config.iterations}</li>
              <li>Temperature: {run.config.temperature}</li>
              <li>Max Tokens: {run.config.maxTokens}</li>
            </ul>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <p><strong>执行结果:</strong></p>
            <ul>
              <li>总测试数: {run.totalTests}</li>
              <li>已完成: {run.completedTests}</li>
              <li>成功率: {Math.round((run.completedTests / run.totalTests) * 100)}%</li>
              <li>状态: {run.status === 'completed' ? '已完成' : run.status === 'stopped' ? '已停止' : '其他'}</li>
            </ul>
          </div>

          {run.results.length > 0 && (
            <div>
              <p><strong>测试结果预览 (前5条):</strong></p>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {run.results.slice(0, 5).map((result, index) => (
                  <div key={result.id} style={{ 
                    padding: 8, 
                    border: '1px solid #f0f0f0', 
                    borderRadius: 4, 
                    marginBottom: 8,
                    fontSize: '12px'
                  }}>
                    <div><strong>{result.providerName} - {result.modelName}</strong></div>
                    <div>提示词: {result.promptName}</div>
                    <div>响应时间: {result.duration}ms</div>
                    <div>Token: {result.tokens.total}</div>
                    <div style={{ marginTop: 4, maxHeight: 60, overflow: 'hidden' }}>
                      输出: {result.output.substring(0, 100)}...
                    </div>
                  </div>
                ))}
              </div>
              {run.results.length > 5 && (
                <p style={{ color: '#666', fontSize: '12px' }}>
                  还有 {run.results.length - 5} 条结果未显示...
                </p>
              )}
            </div>
          )}
        </div>
      ),
    });
  };

  // 日志级别对应的颜色和图标
  const getLogStyle = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return { color: '#52c41a', backgroundColor: '#f6ffed', borderColor: '#b7eb8f' };
      case 'warning':
        return { color: '#faad14', backgroundColor: '#fffbe6', borderColor: '#ffe58f' };
      case 'error':
        return { color: '#ff4d4f', backgroundColor: '#fff2f0', borderColor: '#ffccc7' };
      default:
        return { color: '#1890ff', backgroundColor: '#f0f9ff', borderColor: '#91d5ff' };
    }
  };

  return (
    <div>
      <Card title="批量测试记录" style={{ marginBottom: 24 }}>
        {/* 演示数据提示 */}
        {providers.length === 0 || prompts.length === 0 ? (
          <Alert
            message="开始使用批量测试"
            description={
              <div>
                <p>您还没有配置LLM厂商或提示词。可以：</p>
                <ol>
                  <li>前往"LLM配置"和"提示词管理"页面手动配置</li>
                  <li>或者点击下面的按钮创建演示数据进行快速体验</li>
                </ol>
                <Button 
                  type="primary" 
                  onClick={createDemoData}
                  style={{ marginTop: 8 }}
                >
                  🚀 创建演示数据
                </Button>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="选择LLM厂商"
                name="selectedProviders"
                rules={[{ required: true, message: '请选择至少一个LLM厂商' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="选择要测试的LLM厂商"
                  disabled={isRunning}
                >
                  {providers.map(provider => (
                    <Option key={provider.id} value={provider.id}>
                      {provider.name} ({provider.models.length} 个模型)
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="选择提示词"
                name="selectedPrompts"
                rules={[{ required: true, message: '请选择至少一个提示词' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="选择要测试的提示词"
                  disabled={isRunning}
                >
                  {prompts.map(prompt => (
                    <Option key={prompt.id} value={prompt.id}>
                      {prompt.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Temperature" name="temperature">
                <InputNumber
                  min={0}
                  max={2}
                  step={0.1}
                  placeholder="0.7"
                  disabled={isRunning}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Max Tokens" name="maxTokens">
                <InputNumber
                  min={1}
                  max={8192}
                  placeholder="2048"
                  disabled={isRunning}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="测试轮数" name="iterations">
                <InputNumber
                  min={1}
                  max={10}
                  placeholder="1"
                  disabled={isRunning}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="操作">
                <Space>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStartTest}
                    loading={isRunning}
                    disabled={isRunning}
                  >
                    开始批量测试
                  </Button>
                  {isRunning && (
                    <Button
                      danger
                      icon={<StopOutlined />}
                      onClick={handleStopTest}
                    >
                      停止测试
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {/* 实时进度显示 */}
        {isRunning && (
          <Card size="small" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <div>
                  <Text strong>执行进度</Text>
                  <Progress 
                    percent={currentProgress} 
                    status="active" 
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <Text strong>当前状态</Text>
                  <div style={{ marginTop: 8 }}>
                    {executionStatus.currentProvider && (
                      <div><Badge status="processing" text={`厂商: ${executionStatus.currentProvider}`} /></div>
                    )}
                    {executionStatus.currentModel && (
                      <div><Badge status="processing" text={`模型: ${executionStatus.currentModel}`} /></div>
                    )}
                    {executionStatus.currentPrompt && (
                      <div><Badge status="processing" text={`提示词: ${executionStatus.currentPrompt}`} /></div>
                    )}
                    {executionStatus.currentIteration && executionStatus.totalIterations && (
                      <div><Badge status="processing" text={`轮次: ${executionStatus.currentIteration}/${executionStatus.totalIterations}`} /></div>
                    )}
                    {executionStatus.estimatedTimeRemaining && executionStatus.estimatedTimeRemaining > 0 && (
                      <div><Badge status="default" text={`预计剩余: ${formatTime(executionStatus.estimatedTimeRemaining)}`} /></div>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        )}

        {/* 执行日志 */}
        <Card 
          size="small" 
          style={{ marginTop: 16 }}
          title={
            <Space>
              <span>执行日志</span>
              <Badge count={logs.length} style={{ backgroundColor: isRunning ? '#52c41a' : '#1890ff' }} />
              {isRunning && <Spin size="small" />}
            </Space>
          }
          extra={
            <Space>
              <Select
                size="small"
                value="all"
                style={{ width: 80 }}
                onChange={() => {}}
              >
                <Option value="all">全部</Option>
                <Option value="info">信息</Option>
                <Option value="success">成功</Option>
                <Option value="warning">警告</Option>
                <Option value="error">错误</Option>
              </Select>
              <Button size="small" onClick={() => setShowLogs(!showLogs)}>
                {showLogs ? '隐藏日志' : '显示日志'}
              </Button>
              <Button size="small" onClick={clearLogs}>
                清空日志
              </Button>
              <Button 
                size="small" 
                type={autoScroll ? 'primary' : 'default'}
                onClick={() => setAutoScroll(!autoScroll)}
              >
                {autoScroll ? '🔄 自动滚动' : '⏸️ 手动滚动'}
              </Button>
            </Space>
          }
        >
          {showLogs && (
            <div 
              id="log-container"
              style={{ 
                height: 350, 
                overflow: 'auto',
                border: '1px solid #f0f0f0',
                borderRadius: 4,
                padding: 8,
                backgroundColor: '#fafafa'
              }}
              ref={(el) => {
                if (el && autoScroll && logs.length > 0) {
                  setTimeout(() => {
                    el.scrollTop = el.scrollHeight;
                  }, 50);
                }
              }}
            >
              {logs.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#999', 
                  padding: 40,
                  background: 'white',
                  borderRadius: 4,
                  border: '2px dashed #d9d9d9'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: 8 }}>📋</div>
                  <div>暂无日志</div>
                  <div style={{ fontSize: '12px', marginTop: 4 }}>开始批量测试后，执行日志将在这里显示</div>
                </div>
              ) : (
                <div>
                  {logs.map((log, index) => (
                    <div 
                      key={log.id}
                      style={{
                        marginBottom: 6,
                        padding: '6px 10px',
                        borderRadius: 4,
                        fontSize: '12px',
                        fontFamily: 'Consolas, "Courier New", monospace',
                        lineHeight: '1.4',
                        ...getLogStyle(log.level),
                        transition: 'all 0.3s ease-in',
                        transform: index === logs.length - 1 ? 'translateY(0)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <span style={{ 
                          marginRight: 8, 
                          fontWeight: 'bold',
                          fontSize: '11px',
                          opacity: 0.7,
                          minWidth: '60px'
                        }}>
                          {log.timestamp}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500' }}>{log.message}</div>
                          {log.details && (
                            <details style={{ marginTop: 4 }}>
                              <summary style={{ 
                                cursor: 'pointer', 
                                fontSize: '11px', 
                                opacity: 0.8,
                                userSelect: 'none'
                              }}>
                                📊 详细信息 (点击展开)
                              </summary>
                              <pre style={{ 
                                marginTop: 4, 
                                fontSize: '10px', 
                                opacity: 0.8,
                                background: 'rgba(0,0,0,0.05)',
                                padding: '4px 6px',
                                borderRadius: 2,
                                overflow: 'auto',
                                maxHeight: '100px'
                              }}>
                                {typeof log.details === 'string' 
                                  ? log.details 
                                  : JSON.stringify(log.details, null, 2)
                                }
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* 添加一个隐藏的锚点用于自动滚动 */}
                  <div id="log-bottom" />
                </div>
              )}
            </div>
          )}
          
          {/* 日志统计 */}
          {logs.length > 0 && (
            <div style={{ 
              marginTop: 8, 
              padding: '8px 12px', 
              background: '#f0f9ff', 
              borderRadius: 4,
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Space size={16}>
                <span>📊 统计:</span>
                <span style={{ color: '#1890ff' }}>
                  信息: {logs.filter(l => l.level === 'info').length}
                </span>
                <span style={{ color: '#52c41a' }}>
                  成功: {logs.filter(l => l.level === 'success').length}
                </span>
                <span style={{ color: '#faad14' }}>
                  警告: {logs.filter(l => l.level === 'warning').length}
                </span>
                <span style={{ color: '#ff4d4f' }}>
                  错误: {logs.filter(l => l.level === 'error').length}
                </span>
              </Space>
              <span style={{ color: '#666' }}>
                会话ID: {sessionId.substring(8, 16)}...
              </span>
            </div>
          )}
        </Card>


      </Card>

      {/* 测试记录表格 */}
      <Card title="测试记录" extra={
        <Button icon={<ReloadOutlined />} onClick={loadData}>
          刷新
        </Button>
      }>
        <Table
          columns={[
            {
              title: '测试名称',
              dataIndex: 'name',
              key: 'name',
              ellipsis: true,
            },
            {
              title: '状态',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => {
                const statusConfig = {
                  running: { color: 'blue', text: '运行中' },
                  completed: { color: 'green', text: '已完成' },
                  stopped: { color: 'orange', text: '已停止' },
                  failed: { color: 'red', text: '失败' },
                };
                const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
                return <Tag color={config.color}>{config.text}</Tag>;
              },
            },
            {
              title: '进度',
              key: 'progress',
              render: (_: any, record: TestRun) => (
                <div>
                  <Progress 
                    percent={Math.round((record.completedTests / record.totalTests) * 100)} 
                    size="small" 
                    status={record.status === 'running' ? 'active' : 'normal'}
                  />
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {record.completedTests}/{record.totalTests}
                  </span>
                </div>
              ),
            },
            {
              title: '创建时间',
              dataIndex: 'createdAt',
              key: 'createdAt',
              render: (time: string) => new Date(time).toLocaleString(),
            },
            {
              title: '完成时间',
              dataIndex: 'completedAt',
              key: 'completedAt',
              render: (time: string) => time ? new Date(time).toLocaleString() : '-',
            },
            {
              title: '操作',
              key: 'actions',
              render: (_: any, record: TestRun) => (
                <Space>
                  <Button size="small" icon={<EyeOutlined />} onClick={() => viewTestResults(record)}>
                    查看结果
                  </Button>
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteTestRun(record.id)}>
                    删除
                  </Button>
                </Space>
              ),
            },
          ]}
          dataSource={testRuns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default BatchTest; 