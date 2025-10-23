import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Space,
  Table,
  message,
  Divider,
  Alert,
  Row,
  Col,
  Empty,
  Tag,
  Tooltip,
  Drawer,
  Modal,
  Checkbox,
} from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  ClearOutlined,
  ArrowRightOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  parseJsonInput,
  convertVoiceList,
  generateJsonOutput,
  downloadJsonFile,
  VendorEleven11LabsParams,
  ElevenLabsVoice,
} from '../utils/elevenLabsConverter';
import { createSceneVendorAppForDataCenter } from '../services/vendorAppApi';
import { DATA_CENTERS } from '../config/apiConfig';

const { TextArea } = Input;

const ElevenLabsParamsConverter: React.FC = () => {
  const [inputJson, setInputJson] = useState<string>('');
  const [convertedParams, setConvertedParams] = useState<VendorEleven11LabsParams[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sourceData, setSourceData] = useState<ElevenLabsVoice[]>([]);
  const [showSourceDrawer, setShowSourceDrawer] = useState<boolean>(false);
  const [showBatchCreateModal, setShowBatchCreateModal] = useState<boolean>(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedDataCenters, setSelectedDataCenters] = useState<string[]>([]);
  const [creating, setCreating] = useState<boolean>(false);
  const [progressLogs, setProgressLogs] = useState<Array<{
    time: string;
    dataCenter: string;
    voiceName: string;
    status: 'pending' | 'success' | 'error';
    message: string;
  }>>([]);
  const [totalTasks, setTotalTasks] = useState<number>(0);
  const [completedTasks, setCompletedTasks] = useState<number>(0);

  // 处理转换
  const handleConvert = async () => {
    if (!inputJson.trim()) {
      message.error('请输入JSON文本');
      return;
    }

    setLoading(true);
    try {
      const voices = parseJsonInput(inputJson);
      setSourceData(voices);
      const params = convertVoiceList(voices);
      setConvertedParams(params);
      message.success(`成功转换 ${params.length} 条数据`);
    } catch (error) {
      message.error(
        `转换失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    } finally {
      setLoading(false);
    }
  };

  // 处理下载
  const handleDownload = () => {
    if (convertedParams.length === 0) {
      message.error('没有可下载的数据');
      return;
    }

    try {
      const jsonContent = generateJsonOutput(convertedParams);
      downloadJsonFile(jsonContent);
      message.success('文件下载成功');
    } catch (error) {
      message.error('下载失败');
    }
  };

  // 复制到剪贴板
  const handleCopyToClipboard = async () => {
    if (convertedParams.length === 0) {
      message.error('没有可复制的数据');
      return;
    }

    try {
      const jsonContent = generateJsonOutput(convertedParams);
      await navigator.clipboard.writeText(jsonContent);
      message.success('已复制到剪贴板');
    } catch (error) {
      message.error('复制失败');
    }
  };

  // 清空
  const handleClear = () => {
    setInputJson('');
    setConvertedParams([]);
    setSourceData([]);
  };

  // 转换后数据表格列
  const convertedColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 150,
      ellipsis: true,
      render: (text: string) => <Tooltip title={text}><span>{text}</span></Tooltip>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '标签',
      dataIndex: 'labels',
      key: 'labels',
      width: 400,
      render: (labels: any) => (
        <div style={{ fontSize: '12px' }}>
          {labels.descriptive && (
            <div>
              <Tag color="blue">风格: {labels.descriptive}</Tag>
            </div>
          )}
          {labels.gender && (
            <div>
              <Tag color="purple">性别: {labels.gender}</Tag>
            </div>
          )}
          {labels.age && (
            <div>
              <Tag color="cyan">年龄: {labels.age}</Tag>
            </div>
          )}
          {labels.accent && (
            <div>
              <Tag color="green">口音: {labels.accent}</Tag>
            </div>
          )}
          {labels.use_case && (
            <div>
              <Tag color="orange">用途: {labels.use_case}</Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '语言列表',
      dataIndex: 'labels',
      key: 'languages',
      width: 150,
      render: (labels: any) => (
        <div>
          {labels.languages && labels.languages.length > 0 ? (
            labels.languages.map((lang: string) => (
              <Tag key={lang} color="geekblue">
                {lang}
              </Tag>
            ))
          ) : (
            <span style={{ color: '#999' }}>-</span>
          )}
        </div>
      ),
    },
    {
      title: '模型列表',
      dataIndex: 'model_list',
      key: 'model_list',
      width: 200,
      render: (models: string[]) => (
        <div>
          {models && models.length > 0 ? (
            models.map((model) => (
              <Tag key={model} color="volcano">
                {model}
              </Tag>
            ))
          ) : (
            <span style={{ color: '#999' }}>-</span>
          )}
        </div>
      ),
    },
  ];

  // 源数据表格列
  const sourceColumns = [
    {
      title: 'Voice ID',
      dataIndex: 'voice_id',
      key: 'voice_id',
      width: 150,
      ellipsis: true,
      render: (text: string) => <Tooltip title={text}><span>{text}</span></Tooltip>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      ellipsis: true,
      render: (text: string) => <Tooltip title={text}><span>{text}</span></Tooltip>,
    },
  ];

  // 判断是否为multilingual模型
  const isMultilingualModel = (name: string): boolean => {
    return name.includes(' - multilingual');
  };

  // 获取模型代号
  const getModelCode = (name: string): string => {
    return isMultilingualModel(name) ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5';
  };

  // 处理行选择
  const handleRowSelect = (index: number, checked: boolean) => {
    const newSet = new Set(selectedRows);
    if (checked) {
      newSet.add(index);
    } else {
      newSet.delete(index);
    }
    setSelectedRows(newSet);
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(convertedParams.map((_, i) => i)));
    } else {
      setSelectedRows(new Set());
    }
  };

  // 批量创建TTS
  const handleBatchCreate = async () => {
    if (selectedRows.size === 0) {
      message.error('请至少选择一条数据');
      return;
    }

    if (selectedDataCenters.length === 0) {
      message.error('请选择至少一个数据中心');
      return;
    }

    setCreating(true);
    setProgressLogs([]); // 清空日志
    const logs: typeof progressLogs = [];
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    
    // 计算总任务数：选中行数 × 数据中心数
    const totalTasks = selectedRows.size * selectedDataCenters.length;
    setTotalTasks(totalTasks);
    setCompletedTasks(0);
    
    const addLog = (dataCenter: string, voiceName: string, status: 'pending' | 'success' | 'error', message: string) => {
      const log = {
        time: new Date().toLocaleTimeString('zh-CN'),
        dataCenter,
        voiceName,
        status,
        message
      };
      logs.push(log);
      setProgressLogs([...logs]);
    };
    
    try {
      // 遍历选中的行
      for (const index of Array.from(selectedRows).sort((a, b) => a - b)) {
        const param = convertedParams[index];
        const isMultilingual = isMultilingualModel(param.name);
        
        // 为每个选中的数据中心创建TTS
        for (const dataCenterId of selectedDataCenters) {
          try {
            // 根据数据中心ID找到对应的数据中心配置
            const targetDataCenter = DATA_CENTERS.find(dc => dc.id === dataCenterId);
            if (!targetDataCenter) {
              throw new Error(`找不到数据中心: ${dataCenterId}`);
            }
            
            // 记录开始日志
            addLog(targetDataCenter.name, param.name, 'pending', '创建中...');
            
            // 构建创建请求数据
            // 评级和vendor_app_id根据是否multilingual模型而不同
            const createData = {
              type: 2, // TTS类型
              code: 'Tau', // 11labs的代号
              vendor: '13', // 11labs的vendor值
              vendor_app_id: isMultilingual ? 53 : 32, // multilingual: 53, 普通: 32
              language: '*', // 支持所有国家/地区
              timbre: param.name, // 使用转换后的名称
              model: getModelCode(param.name), // 根据是否multilingual选择模型
              rating: isMultilingual ? 'Pro' : 'Standard', // multilingual: Pro, 普通: Standard
              vendor_params: JSON.stringify(param), // 厂商参数为完整的转换JSON
              status: 1, // 启用状态
            };

            // 调用创建API - 实际创建TTS供应商应用
            console.log(`[${targetDataCenter.name}] 开始创建: ${param.name}`, createData);
            
            const result = await createSceneVendorAppForDataCenter(createData as any, targetDataCenter.baseURL);
            
            successCount++;
            setCompletedTasks(prev => prev + 1);
            
            // 记录成功日志
            addLog(targetDataCenter.name, param.name, 'success', `成功 (ID: ${result?.id})`);
            console.log(`[${targetDataCenter.name}] 成功创建: ${param.name}`, result);
          } catch (error: any) {
            failCount++;
            setCompletedTasks(prev => prev + 1);
            
            const dataCenterName = DATA_CENTERS.find(dc => dc.id === dataCenterId)?.name || dataCenterId;
            const errorMsg = error.message || error;
            
            // 记录失败日志
            addLog(dataCenterName, param.name, 'error', `失败: ${errorMsg}`);
            
            errors.push(`[${dataCenterName}] 创建 "${param.name}" 失败: ${errorMsg}`);
            console.error(`[${dataCenterName}] 创建失败:`, error);
          }
        }
      }

      // 显示结果
      if (failCount === 0) {
        message.success(`成功创建 ${successCount} 条TTS供应商应用`);
      } else {
        message.warning(`创建完成: ${successCount} 成功, ${failCount} 失败`);
        if (errors.length > 0 && errors.length <= 5) {
          message.error(`错误详情:\n${errors.join('\n')}`);
        }
      }

      setShowBatchCreateModal(false);
      setSelectedRows(new Set());
      setSelectedDataCenters([]);
    } catch (error: any) {
      message.error(`批量创建失败: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 输入区域 */}
      <Card title="第一步：导入11Labs JSON数据" bordered={false}>
        <Alert
          message="支持格式"
          description="✅ 完整的 voices 对象格式 (包含 { voices: [...] })
          ✅ Voice 数组格式 ([{...}, {...}])  
          ✅ 单个 Voice 对象格式 ({...})"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <TextArea
          placeholder="请粘贴11Labs导出的JSON数据...
例如：
{
  &quot;voices&quot;: [
    {
      &quot;voice_id&quot;: &quot;xxx&quot;,
      &quot;name&quot;: &quot;xxx&quot;,
      ...
    }
  ]
}"
          value={inputJson}
          onChange={(e) => setInputJson(e.target.value)}
          rows={8}
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
        />
        <Space style={{ marginTop: 16 }}>
          <Button
            type="primary"
            onClick={handleConvert}
            loading={loading}
            size="large"
          >
            <ArrowRightOutlined /> 转换
          </Button>
          <Button onClick={handleClear} size="large">
            <ClearOutlined /> 清空
          </Button>
        </Space>
      </Card>

      {/* 转换结果区域 */}
      {convertedParams.length > 0 && (
        <>
          <Card title={`第二步：转换结果（共 ${convertedParams.length} 条数据）`} bordered={false}>
            <Alert
              message="转换完成"
              description={`已成功将 ${convertedParams.length} 条11Labs音色参数转换为供应商格式`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col>
                <Button
                  type="primary"
                  onClick={handleDownload}
                  icon={<DownloadOutlined />}
                  size="large"
                >
                  下载JSON文件
                </Button>
              </Col>
              <Col>
                <Button
                  onClick={handleCopyToClipboard}
                  icon={<CopyOutlined />}
                  size="large"
                >
                  复制到剪贴板
                </Button>
              </Col>
              <Col>
                <Button
                  onClick={() => setShowSourceDrawer(true)}
                  size="large"
                >
                  查看源数据
                </Button>
              </Col>
              <Col>
                <Button
                  type="primary"
                  onClick={() => setShowBatchCreateModal(true)}
                  icon={<PlusOutlined />}
                  size="large"
                >
                  批量创建TTS
                </Button>
              </Col>
            </Row>

            <Divider>转换后的参数列表</Divider>
            <Table
              columns={convertedColumns}
              dataSource={convertedParams.map((item, index) => ({
                ...item,
                key: `${item.id}-${index}`,
              }))}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `总计 ${total} 条`,
              }}
              scroll={{ x: 1200 }}
              size="small"
            />
          </Card>

          {/* JSON预览卡片 */}
          <Card title="JSON预览" bordered={false}>
            <TextArea
              value={generateJsonOutput(convertedParams)}
              readOnly
              rows={12}
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
          </Card>
        </>
      )}

      {/* 空状态 */}
      {convertedParams.length === 0 && inputJson.trim() && !loading && (
        <Card>
          <Empty description="转换失败或数据为空" />
        </Card>
      )}

      {/* 源数据抽屉 */}
      <Drawer
        title={`源数据详情（共 ${sourceData.length} 条）`}
        onClose={() => setShowSourceDrawer(false)}
        open={showSourceDrawer}
        width={1000}
      >
        <Table
          columns={sourceColumns}
          dataSource={sourceData.map((item, index) => ({
            ...item,
            key: `${item.voice_id}-${index}`,
          }))}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          scroll={{ x: 800 }}
          size="small"
        />
      </Drawer>

      {/* 批量创建TTS Modal */}
      <Modal
        title="批量创建TTS供应商应用"
        open={showBatchCreateModal}
        onCancel={() => {
          if (!creating) {
            setShowBatchCreateModal(false);
            setSelectedRows(new Set());
            setSelectedDataCenters([]);
          }
        }}
        width={1000}
        okText="确认创建"
        cancelText="取消"
        onOk={handleBatchCreate}
        confirmLoading={creating}
        okButtonProps={{ disabled: selectedRows.size === 0 || selectedDataCenters.length === 0 || creating }}
        cancelButtonProps={{ disabled: creating }}
      >
        {/* 创建过程中显示进度页面 */}
        {creating && totalTasks > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 进度统计 */}
            <div style={{
              padding: '16px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              border: '1px solid #e8e8e8'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  <span>创建进度</span>
                  <span style={{ color: '#1890ff' }}>{completedTasks} / {totalTasks}</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '28px',
                  backgroundColor: '#e8e8e8',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(completedTasks / totalTasks) * 100}%`,
                    height: '100%',
                    backgroundColor: completedTasks === totalTasks ? '#52c41a' : '#1890ff',
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}>
                    {totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%'}
                  </div>
                </div>
              </div>
            </div>

            {/* 创建日志列表 */}
            <div>
              <div style={{
                fontWeight: 'bold',
                marginBottom: '12px',
                fontSize: '14px'
              }}>
                创建日志
              </div>
              <div style={{
                height: '400px',
                overflowY: 'auto',
                backgroundColor: '#fafafa',
                border: '1px solid #e8e8e8',
                borderRadius: '4px',
                padding: '12px'
              }}>
                {progressLogs.length === 0 ? (
                  <div style={{ color: '#999', textAlign: 'center', padding: '40px 20px' }}>
                    准备开始创建...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {progressLogs.map((log, index) => (
                      <div key={index} style={{
                        padding: '10px 12px',
                        backgroundColor: 'white',
                        border: '1px solid #f0f0f0',
                        borderRadius: '3px',
                        fontSize: '12px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center'
                      }}>
                        <span style={{ color: '#999', minWidth: '75px', fontFamily: 'monospace' }}>
                          {log.time}
                        </span>
                        <span style={{
                          minWidth: '65px',
                          padding: '4px 10px',
                          borderRadius: '3px',
                          backgroundColor: log.dataCenter === '香港' ? '#bae7ff' : 
                                          log.dataCenter === 'CHL' ? '#d3f8d3' : '#ffd89b',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          color: log.dataCenter === '香港' ? '#0050b3' :
                                 log.dataCenter === 'CHL' ? '#274a13' : '#873800'
                        }}>
                          {log.dataCenter}
                        </span>
                        <span style={{ 
                          flex: 1, 
                          wordBreak: 'break-all',
                          color: '#262626'
                        }}>
                          {log.voiceName}
                        </span>
                        <span style={{
                          minWidth: '70px',
                          padding: '4px 10px',
                          borderRadius: '3px',
                          backgroundColor: log.status === 'success' ? '#f6ffed' : 
                                          log.status === 'error' ? '#fff1f0' : '#fafafa',
                          color: log.status === 'success' ? '#52c41a' : 
                                 log.status === 'error' ? '#ff4d4f' : '#8c8c8c',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          fontSize: '11px',
                          border: log.status === 'pending' ? '1px solid #d9d9d9' : 'none'
                        }}>
                          {log.status === 'success' ? '✓ 成功' : 
                           log.status === 'error' ? '✗ 失败' : '⋯ 进行中'}
                        </span>
                        <span style={{ 
                          flex: 1, 
                          color: log.status === 'error' ? '#ff4d4f' : '#595959',
                          fontSize: '11px',
                          wordBreak: 'break-all'
                        }}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 进度统计摘要 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px'
            }}>
              <div style={{
                padding: '12px',
                backgroundColor: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                  {progressLogs.filter(l => l.status === 'success').length}
                </div>
                <div style={{ fontSize: '12px', color: '#595959', marginTop: '4px' }}>
                  成功
                </div>
              </div>
              <div style={{
                padding: '12px',
                backgroundColor: '#fff1f0',
                border: '1px solid #ffccc7',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff4d4f' }}>
                  {progressLogs.filter(l => l.status === 'error').length}
                </div>
                <div style={{ fontSize: '12px', color: '#595959', marginTop: '4px' }}>
                  失败
                </div>
              </div>
              <div style={{
                padding: '12px',
                backgroundColor: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                  {progressLogs.filter(l => l.status === 'pending').length}
                </div>
                <div style={{ fontSize: '12px', color: '#595959', marginTop: '4px' }}>
                  进行中
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 未创建时显示配置界面 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 数据中心选择 */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                选择数据中心（每条创建的TTS都会同步到这些数据中心）:
              </label>
              <Checkbox.Group
                value={selectedDataCenters}
                onChange={setSelectedDataCenters}
                style={{ display: 'flex', gap: '20px' }}
                disabled={creating}
              >
                <Checkbox value="hk">香港</Checkbox>
                <Checkbox value="chl">CHL</Checkbox>
                <Checkbox value="idn">IDN</Checkbox>
              </Checkbox.Group>
            </div>

            {/* 参数预览 */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                创建参数预览:
              </label>
              <Alert
                message="创建说明"
                description={`
                • 名称: 使用转换后的音色名称
                • 厂商: 11Labs
                • 代号: Tau
                • 国家/地区: * (所有国家)
                • 模型: 根据是否multilingual自动选择
                  - Multilingual: eleven_multilingual_v2
                  - 普通: eleven_turbo_v2_5
                • 评级: 根据模型自动选择
                  - Multilingual: Pro
                  - 普通: Standard
                • 供应商应用: 根据模型自动选择
                  - Multilingual: ID 53
                  - 普通: ID 32
                • 厂商参数: 完整的转换后JSON参数
                `}
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            </div>

            {/* 数据选择表格 */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                选择要创建的数据（共 {convertedParams.length} 条，已选 {selectedRows.size} 条）:
              </label>
              <Table
                columns={[
                  {
                    title: (
                      <Checkbox
                        checked={selectedRows.size === convertedParams.length}
                        indeterminate={
                          selectedRows.size > 0 &&
                          selectedRows.size < convertedParams.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    ),
                    key: 'select',
                    width: 50,
                    render: (_, __, index) => (
                      <Checkbox
                        checked={selectedRows.has(index)}
                        onChange={(e) => handleRowSelect(index, e.target.checked)}
                      />
                    ),
                  },
                  {
                    title: '名称',
                    dataIndex: 'name',
                    key: 'name',
                    width: 200,
                    ellipsis: true,
                  },
                  {
                    title: '模型类型',
                    key: 'modelType',
                    width: 150,
                    render: (_, record: VendorEleven11LabsParams) => (
                      <Tag color={isMultilingualModel(record.name) ? 'purple' : 'blue'}>
                        {isMultilingualModel(record.name) ? 'Multilingual' : 'Standard'}
                      </Tag>
                    ),
                  },
                  {
                    title: '将使用的模型',
                    key: 'selectedModel',
                    width: 180,
                    render: (_, record: VendorEleven11LabsParams) => (
                      <code>{getModelCode(record.name)}</code>
                    ),
                  },
                ]}
                dataSource={convertedParams.map((item, index) => ({
                  ...item,
                  key: `${item.id}-${index}`,
                }))}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                }}
                scroll={{ x: 800 }}
                size="small"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ElevenLabsParamsConverter;
