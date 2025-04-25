import React, { useState } from 'react';
import { Upload, Button, message, Card, Space, Progress, Modal, Typography, List, Spin, Empty, Tag } from 'antd';
import { UploadOutlined, FileExcelOutlined, DownloadOutlined } from '@ant-design/icons';
import { RcFile } from 'antd/es/upload';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { batchImportTags } from '../services/api';
import { useUserContext } from '../context/UserContext';

const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;

interface ImportedTag {
  name: string;
  describes: string | null;
  groupName: string;
}

interface ImportResult {
  success: number;
  failed: number;
  groupsCreated: string[];
}

interface TagImportProps {
  onImportComplete?: () => void;
}

const TagImport: React.FC<TagImportProps> = ({ onImportComplete }) => {
  const { userParams } = useUserContext();
  const [importedTags, setImportedTags] = useState<ImportedTag[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  // 解析Excel/CSV文件
  const parseFile = (file: RcFile): Promise<ImportedTag[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<any>(worksheet);

          // 验证和转换数据
          const tags: ImportedTag[] = json.map((row: any) => {
            // 检查必要的字段
            if (!row['标签名称'] || !row['分组名称']) {
              throw new Error('文件中必须包含"标签名称"和"分组名称"两列');
            }

            return {
              name: row['标签名称'],
              describes: row['描述'] || null,
              groupName: row['分组名称'],
            };
          });

          resolve(tags);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  // 处理文件上传
  const handleFileUpload = async (file: RcFile) => {
    // 检查文件类型
    const isExcelOrCSV = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                          file.type === 'application/vnd.ms-excel' ||
                          file.type === 'text/csv';
    
    if (!isExcelOrCSV) {
      message.error('只支持上传Excel或CSV文件!');
      return Upload.LIST_IGNORE;
    }

    setUploading(true);
    try {
      const tags = await parseFile(file);
      setImportedTags(tags);
      message.success(`成功解析 ${tags.length} 条标签数据`);
      setPreviewModalVisible(true);
    } catch (error) {
      console.error('解析文件失败', error);
      message.error('解析文件失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setUploading(false);
    }

    return Upload.LIST_IGNORE;
  };

  // 导入标签
  const handleImport = async () => {
    if (!userParams || !importedTags.length) {
      message.error('参数不完整或没有导入数据');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setResultModalVisible(true);

    try {
      const result = await batchImportTags(
        importedTags,
        userParams.nxCloudUserID,
        userParams.sourceTenantID
      );

      setImportResult(result);
      setImportProgress(100);
      message.success(`成功导入 ${result.success} 个标签`);
      
      // 导入完成后通知父组件刷新数据
      if (onImportComplete && result.success > 0) {
        onImportComplete();
      }
    } catch (error) {
      console.error('导入标签失败', error);
      message.error('导入过程中发生错误');
      setImportResult({
        success: 0,
        failed: importedTags.length,
        groupsCreated: []
      });
    } finally {
      setImporting(false);
    }
  };

  // 下载模板
  const downloadTemplate = () => {
    // 创建示例数据
    const exampleData = [
      { '标签名称': '示例标签1', '描述': '这是示例标签1的描述', '分组名称': '示例分组1' },
      { '标签名称': '示例标签2', '描述': '这是示例标签2的描述', '分组名称': '示例分组1' },
      { '标签名称': '示例标签3', '描述': '这是示例标签3的描述', '分组名称': '示例分组2' }
    ];

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exampleData);
    XLSX.utils.book_append_sheet(workbook, worksheet, '标签导入模板');

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, '标签导入模板.xlsx');
  };

  // 清空数据
  const handleClear = () => {
    setImportedTags([]);
    setImportResult(null);
  };

  // 关闭结果模态框
  const handleCloseResultModal = () => {
    setResultModalVisible(false);
    if (importResult && importResult.success > 0) {
      handleClear();
    }
  };

  return (
    <Card 
      title="标签批量导入" 
      extra={
        <Space>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={downloadTemplate}
          >
            下载模板
          </Button>
          <Button
            type="primary"
            onClick={handleImport}
            disabled={importedTags.length === 0 || importing || !userParams}
            loading={importing}
          >
            开始导入
          </Button>
        </Space>
      }
    >
      {!importedTags.length ? (
        <Dragger
          name="file"
          multiple={false}
          beforeUpload={handleFileUpload}
          showUploadList={false}
          disabled={uploading || !userParams}
        >
          <p className="ant-upload-drag-icon">
            <FileExcelOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽Excel/CSV文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持Excel(.xlsx/.xls)或CSV文件，文件必须包含"标签名称"和"分组名称"两列
          </p>
        </Dragger>
      ) : (
        <div>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>已解析 {importedTags.length} 个标签</Text>
              <Space>
                <Button onClick={() => setPreviewModalVisible(true)}>预览数据</Button>
                <Button danger onClick={handleClear}>清空</Button>
              </Space>
            </div>
            <Paragraph>
              <ul>
                <li>如果分组不存在，将会自动创建</li>
                <li>标签名称在同一分组内不能重复</li>
                <li>点击右上角"开始导入"按钮开始导入数据</li>
              </ul>
            </Paragraph>
          </Space>
        </div>
      )}

      {/* 预览模态框 */}
      <Modal
        title="导入数据预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="import" 
            type="primary" 
            onClick={() => {
              setPreviewModalVisible(false);
              handleImport();
            }}
            disabled={importing || !userParams}
            loading={importing}
          >
            开始导入
          </Button>
        ]}
        width={800}
        className="preview-modal"
      >
        <List
          className="import-preview-list"
          dataSource={importedTags.slice(0, 100)}
          renderItem={(item, index) => (
            <List.Item>
              <Space style={{ width: '100%' }}>
                <Text strong>{index + 1}.</Text>
                <Text style={{ minWidth: 150 }}>{item.name}</Text>
                <Text type="secondary" ellipsis style={{ maxWidth: 300 }}>
                  {item.describes || '无描述'}
                </Text>
                <Text style={{ marginLeft: 'auto' }}>
                  分组: <Tag color="blue">{item.groupName}</Tag>
                </Text>
              </Space>
            </List.Item>
          )}
          bordered
          pagination={importedTags.length > 100 ? { pageSize: 10 } : false}
          locale={{ emptyText: <Empty description="没有标签数据" /> }}
        />
        {importedTags.length > 100 && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Text type="secondary">仅显示前100条数据</Text>
          </div>
        )}
      </Modal>

      {/* 导入结果模态框 */}
      <Modal
        title="导入结果"
        open={resultModalVisible}
        onCancel={handleCloseResultModal}
        footer={[
          <Button key="close" onClick={handleCloseResultModal}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {importing ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <Spin spinning={true} />
            <Progress percent={importProgress} status="active" className="import-progress" />
            <Text>正在导入标签数据，请稍候...</Text>
          </div>
        ) : (
          importResult && (
            <div>
              <Title level={5}>导入完成:</Title>
              <Paragraph>
                <ul>
                  <li>成功导入: <span className="import-result-success">{importResult.success}</span> 个标签</li>
                  <li>导入失败: <span className="import-result-failed">{importResult.failed}</span> 个标签</li>
                </ul>
              </Paragraph>

              {importResult.groupsCreated.length > 0 && (
                <div>
                  <Title level={5}>新创建的标签分组:</Title>
                  <List
                    dataSource={importResult.groupsCreated}
                    renderItem={(name) => (
                      <List.Item>
                        <Tag color="green">{name}</Tag>
                      </List.Item>
                    )}
                    bordered
                    locale={{ emptyText: '没有新建分组' }}
                  />
                </div>
              )}
            </div>
          )
        )}
      </Modal>
    </Card>
  );
};

export default TagImport; 