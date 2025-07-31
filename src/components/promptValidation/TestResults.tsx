import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Space, Input, Select, Row, Col, Collapse, Typography, Divider, message } from 'antd';
import { SearchOutlined, CopyOutlined } from '@ant-design/icons';
import type { TestRun, TestResult, LLMProvider, Prompt } from '../../types/promptValidation';

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;

const TestResults: React.FC = () => {
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    model: 'all',
    prompt: 'all',
    status: 'all',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [testRuns, filters]);

  const loadData = () => {
    // 加载测试记录
    const savedTestRuns = localStorage.getItem('test_runs');
    if (savedTestRuns) {
      const runs = JSON.parse(savedTestRuns);
      setTestRuns(runs);
      setFilteredRuns(runs);
    }

    // 加载LLM配置
    const savedProviders = localStorage.getItem('llm_providers');
    if (savedProviders) {
      setProviders(JSON.parse(savedProviders));
    }

    // 加载提示词
    const savedPrompts = localStorage.getItem('prompts');
    if (savedPrompts) {
      setPrompts(JSON.parse(savedPrompts));
    }
  };

  const applyFilters = () => {
    let filtered = [...testRuns];

    // 搜索过滤
    if (filters.search) {
      filtered = filtered.filter(run => 
        run.id.includes(filters.search) ||
        new Date(run.startTime).toLocaleString().includes(filters.search)
      );
    }

    // 状态过滤
    if (filters.status !== 'all') {
      filtered = filtered.filter(run => run.status === filters.status);
    }

    setFilteredRuns(filtered);
  };

  const getModelName = (modelId: string) => {
    const [providerId, modelIdPart] = modelId.split('::');
    const provider = providers.find(p => p.id === providerId);
    const model = provider?.models.find(m => m.id === modelIdPart);
    return model ? `${provider?.name} - ${model.name}` : modelId;
  };

  const getPromptName = (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    return prompt?.name || promptId;
  };

  const handleCopyOutput = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const renderComparisonView = (results: TestResult[]) => {
    // 按提示词分组
    const groupedByPrompt = results.reduce((acc, result) => {
      const promptId = result.promptId;
      if (!acc[promptId]) {
        acc[promptId] = [];
      }
      acc[promptId].push(result);
      return acc;
    }, {} as Record<string, TestResult[]>);

    return (
      <div>
        {Object.entries(groupedByPrompt).map(([promptId, promptResults]) => (
          <Card 
            key={promptId} 
            title={`提示词: ${getPromptName(promptId)}`}
            style={{ marginBottom: 16 }}
            size="small"
          >
            <Collapse>
              <Panel header="查看提示词内容" key="prompt">
                <Paragraph>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>
                    {prompts.find(p => p.id === promptId)?.content || '未找到提示词内容'}
                  </pre>
                </Paragraph>
              </Panel>
            </Collapse>
            
            <Divider />
            
            <Row gutter={16}>
              {promptResults.map((result, index) => (
                <Col span={12} key={result.id}>
                  <Card
                    title={
                      <Space>
                        <Tag color="blue">{getModelName(result.modelId)}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {result.duration}ms
                        </Text>
                      </Space>
                    }
                    extra={
                      <CopyOutlined 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleCopyOutput(result.output)}
                      />
                    }
                    style={{ marginBottom: 16 }}
                  >
                    <Paragraph ellipsis={{ rows: 6, expandable: true }}>
                      {result.output}
                    </Paragraph>
                    
                    <Divider style={{ margin: '12px 0' }} />
                    
                    <Space size="large" style={{ fontSize: 12 }}>
                      <Text type="secondary">
                        Tokens: {result.tokens.total}
                      </Text>
                      <Text type="secondary">
                        提示词: {result.tokens.prompt}
                      </Text>
                      <Text type="secondary">
                        生成: {result.tokens.completion}
                      </Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        ))}
      </div>
    );
  };

  const columns = [
    {
      title: '测试ID',
      dataIndex: 'id',
      key: 'id',
      width: 150,
      ellipsis: true,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          pending: 'default',
          running: 'processing',
          completed: 'success',
          failed: 'error',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: '测试数量',
      dataIndex: ['summary', 'totalRuns'],
      key: 'totalRuns',
    },
    {
      title: '成功率',
      key: 'successRate',
      render: (_: any, record: TestRun) => {
        const rate = record.summary.totalRuns > 0
          ? (record.summary.successfulRuns / record.summary.totalRuns * 100).toFixed(1)
          : 0;
        return (
          <Tag color={Number(rate) >= 80 ? 'green' : Number(rate) >= 50 ? 'orange' : 'red'}>
            {rate}%
          </Tag>
        );
      },
    },
    {
      title: '平均响应时间',
      dataIndex: ['summary', 'averageDuration'],
      key: 'averageDuration',
      render: (duration: number) => `${duration.toFixed(0)}ms`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: TestRun) => (
        <a onClick={() => setSelectedRun(record)}>查看详情</a>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 筛选器 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Search
              placeholder="搜索测试ID或时间"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={(value) => setFilters({ ...filters, search: value })}
            />
          </Col>
          <Col span={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择状态"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Option value="all">全部状态</Option>
              <Option value="completed">已完成</Option>
              <Option value="failed">失败</Option>
              <Option value="running">运行中</Option>
              <Option value="pending">待处理</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 测试运行列表 */}
      {!selectedRun ? (
        <Card title="测试运行历史">
          <Table
            columns={columns}
            dataSource={filteredRuns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </Card>
      ) : (
        /* 测试详情视图 */
        <Card 
          title={`测试详情 - ${selectedRun.id}`}
          extra={<a onClick={() => setSelectedRun(null)}>返回列表</a>}
        >
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Text type="secondary">开始时间</Text>
              <br />
              <Text>{new Date(selectedRun.startTime).toLocaleString()}</Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">结束时间</Text>
              <br />
              <Text>{selectedRun.endTime ? new Date(selectedRun.endTime).toLocaleString() : '-'}</Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">总测试数</Text>
              <br />
              <Text>{selectedRun.summary.totalRuns}</Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">成功率</Text>
              <br />
              <Text>
                {selectedRun.summary.totalRuns > 0
                  ? (selectedRun.summary.successfulRuns / selectedRun.summary.totalRuns * 100).toFixed(1)
                  : 0}%
              </Text>
            </Col>
          </Row>

          <Divider />

          <h3>测试结果对比</h3>
          {renderComparisonView(selectedRun.results)}
        </Card>
      )}
    </div>
  );
};

export default TestResults; 