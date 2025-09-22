import React, { useState } from 'react';
import { Upload, Button, message, Card, List, Progress, Spin, Alert, Space, Tag, Tooltip } from 'antd';
import { InboxOutlined, DeleteOutlined, FileExcelOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { BillRecord } from '../../types/bill';
import { parseCSVFile, parseExcelFile, mergeAnalysisData } from '../../services/billAnalysisService';

const { Dragger } = Upload;

export interface FileImportStatus {
  file: File;
  status: 'pending' | 'parsing' | 'success' | 'error';
  progress: number;
  data?: BillRecord[];
  recordCount?: number;
  error?: string;
}

interface BillFileImporterProps {
  onDataImported: (data: BillRecord[]) => void;
  onImportStatusChange?: (importing: boolean) => void;
}

const BillFileImporter: React.FC<BillFileImporterProps> = ({
  onDataImported,
  onImportStatusChange
}) => {
  const [fileList, setFileList] = useState<FileImportStatus[]>([]);
  const [importing, setImporting] = useState<boolean>(false);

  // 获取文件图标
  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (['xlsx', 'xls'].includes(ext || '')) {
      return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    } else if (['csv', 'txt'].includes(ext || '')) {
      return <FileTextOutlined style={{ color: '#1890ff' }} />;
    }
    return <FileTextOutlined />;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // 验证文件格式
  const validateFile = (file: File): string | null => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExt = '.' + file.name.toLowerCase().split('.').pop();
    
    if (!validExtensions.includes(fileExt)) {
      return `不支持的文件格式，请上传 ${validExtensions.join(', ')} 格式的文件`;
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB
      return '文件大小不能超过 100MB';
    }
    
    return null;
  };

  // 解析单个文件
  const parseFile = async (fileStatus: FileImportStatus): Promise<FileImportStatus> => {
    try {
      const { file } = fileStatus;
      
      // 更新状态为解析中
      const updatedStatus: FileImportStatus = {
        ...fileStatus,
        status: 'parsing',
        progress: 10
      };
      
      let data: BillRecord[];
      
      // 根据文件类型选择解析方法
      if (file.name.toLowerCase().endsWith('.csv')) {
        data = await parseCSVFile(file);
      } else {
        data = await parseExcelFile(file);
      }
      
      if (data.length === 0) {
        return {
          ...updatedStatus,
          status: 'error',
          error: '文件中没有找到有效的账单数据'
        };
      }
      
      return {
        ...updatedStatus,
        status: 'success',
        progress: 100,
        data,
        recordCount: data.length
      };
      
    } catch (error) {
      return {
        ...fileStatus,
        status: 'error',
        error: error instanceof Error ? error.message : '解析文件时出现未知错误'
      };
    }
  };

  // 上传文件配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      const validationError = validateFile(file);
      if (validationError) {
        message.error(validationError);
        return false;
      }

      // 检查文件是否已经存在
      if (fileList.some(f => f.file.name === file.name && f.file.size === file.size)) {
        message.warning(`文件 "${file.name}" 已经存在`);
        return false;
      }

      // 添加到文件列表
      const newFileStatus: FileImportStatus = {
        file,
        status: 'pending',
        progress: 0
      };

      setFileList(prev => [...prev, newFileStatus]);
      return false; // 阻止默认上传
    },
    onDrop(e) {
      console.log('拖拽文件:', e.dataTransfer.files);
    },
  };

  // 移除文件
  const removeFile = (index: number) => {
    setFileList(prev => prev.filter((_, i) => i !== index));
  };

  // 清空所有文件
  const clearAllFiles = () => {
    setFileList([]);
  };

  // 开始解析所有文件
  const startParsing = async () => {
    if (fileList.length === 0) {
      message.warning('请先上传文件');
      return;
    }

    const pendingFiles = fileList.filter(f => f.status === 'pending' || f.status === 'error');
    if (pendingFiles.length === 0) {
      // 如果都解析完了，直接导入数据
      importParsedData();
      return;
    }

    setImporting(true);
    onImportStatusChange?.(true);

    try {
      // 逐一解析文件
      for (let i = 0; i < fileList.length; i++) {
        const fileStatus = fileList[i];
        if (fileStatus.status === 'success') continue;

        console.log(`解析文件: ${fileStatus.file.name}`);
        
        // 更新状态为解析中
        setFileList(prev => prev.map((item, index) => 
          index === i ? { ...item, status: 'parsing', progress: 10 } : item
        ));

        const result = await parseFile(fileStatus);
        
        // 更新解析结果
        setFileList(prev => prev.map((item, index) => 
          index === i ? result : item
        ));

        // 解析间隔，避免界面卡顿
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      message.success('所有文件解析完成');
      
      // 自动导入解析成功的数据
      setTimeout(() => {
        importParsedData();
      }, 500);

    } catch (error) {
      console.error('批量解析文件失败:', error);
      message.error('批量解析文件失败，请检查文件格式');
    } finally {
      setImporting(false);
      onImportStatusChange?.(false);
    }
  };

  // 导入解析后的数据
  const importParsedData = () => {
    const successfulFiles = fileList.filter(f => f.status === 'success' && f.data);
    
    if (successfulFiles.length === 0) {
      message.warning('没有成功解析的文件数据');
      return;
    }

    const allData = successfulFiles.map(f => f.data!);
    const mergedData = mergeAnalysisData(allData);
    
    onDataImported(mergedData);
    
    const totalOriginalRecords = successfulFiles.reduce((sum, f) => sum + (f.recordCount || 0), 0);
    const mergedRecords = mergedData.length;
    const duplicateRecords = totalOriginalRecords - mergedRecords;
    
    message.success(
      `成功导入 ${mergedRecords} 条账单记录` + 
      (duplicateRecords > 0 ? ` (去重 ${duplicateRecords} 条)` : '')
    );
  };

  // 获取统计信息
  const getStats = () => {
    const total = fileList.length;
    const success = fileList.filter(f => f.status === 'success').length;
    const error = fileList.filter(f => f.status === 'error').length;
    const pending = fileList.filter(f => f.status === 'pending').length;
    const parsing = fileList.filter(f => f.status === 'parsing').length;
    const totalRecords = fileList
      .filter(f => f.status === 'success')
      .reduce((sum, f) => sum + (f.recordCount || 0), 0);
    
    return { total, success, error, pending, parsing, totalRecords };
  };

  const stats = getStats();

  return (
    <Card title="账单数据文件导入" style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="导入说明"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>支持 CSV 和 Excel (.xlsx, .xls) 格式文件</li>
              <li>支持批量上传多个文件，系统会自动合并和去重</li>
              <li>文件大小限制：单个文件不超过 100MB</li>
              <li>支持的字段：消费时间、客户名称、AI消费、线路消费、通话时长等</li>
              <li>CSV文件请确保使用UTF-8编码以正确显示中文</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持单个或批量上传CSV、Excel格式的账单数据文件
          </p>
        </Dragger>

        {fileList.length > 0 && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Space size="middle">
                <Tag color="blue">总计: {stats.total}</Tag>
                <Tag color="green">成功: {stats.success}</Tag>
                <Tag color="red">失败: {stats.error}</Tag>
                <Tag color="orange">待处理: {stats.pending}</Tag>
                {stats.parsing > 0 && <Tag color="purple">解析中: {stats.parsing}</Tag>}
                {stats.totalRecords > 0 && (
                  <Tag color="cyan">记录数: {stats.totalRecords.toLocaleString()}</Tag>
                )}
              </Space>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Space>
                <Button 
                  type="primary" 
                  onClick={startParsing}
                  loading={importing}
                  disabled={stats.pending === 0 && stats.error === 0}
                >
                  {importing ? '解析中...' : '开始解析'}
                </Button>
                <Button 
                  onClick={importParsedData}
                  disabled={stats.success === 0}
                >
                  导入数据 ({stats.success}个文件)
                </Button>
                <Button 
                  onClick={clearAllFiles}
                  disabled={importing}
                >
                  清空列表
                </Button>
              </Space>
            </div>

            <List
              dataSource={fileList}
              renderItem={(item, index) => (
                <List.Item
                  actions={[
                    <Tooltip title="移除文件">
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => removeFile(index)}
                        disabled={importing}
                        danger
                      />
                    </Tooltip>
                  ]}
                >
                  <List.Item.Meta
                    avatar={getFileIcon(item.file.name)}
                    title={
                      <Space>
                        <span>{item.file.name}</span>
                        {item.status === 'success' && (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        )}
                        {item.status === 'parsing' && <Spin size="small" />}
                      </Space>
                    }
                    description={
                      <div>
                        <div>
                          大小: {formatFileSize(item.file.size)}
                          {item.recordCount && (
                            <span style={{ marginLeft: 16 }}>
                              记录数: {item.recordCount.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {item.status === 'parsing' && (
                          <Progress percent={item.progress} size="small" style={{ marginTop: 4 }} />
                        )}
                        {item.status === 'error' && (
                          <div style={{ color: '#ff4d4f', marginTop: 4 }}>
                            错误: {item.error}
                          </div>
                        )}
                        {item.status === 'success' && (
                          <div style={{ color: '#52c41a', marginTop: 4 }}>
                            解析成功
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </div>
    </Card>
  );
};

export default BillFileImporter;
