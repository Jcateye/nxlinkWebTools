import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Checkbox, Button, Alert, Progress, message, Typography, Divider } from 'antd';
import { DATA_CENTERS, getCurrentDataCenter, DataCenter } from '../../config/apiConfig';
import { 
  getSceneVendorAppListForDataCenter, 
  createSceneVendorAppForDataCenter, 
  updateSceneVendorAppForDataCenter 
} from '../../services/vendorAppApi';
import { SceneVendorApp, SceneVendorAppFormData } from '../../types/vendorApp';

const { Text } = Typography;
const { Option } = Select;

interface VendorSyncModalProps {
  visible: boolean;
  onCancel: () => void;
  selectedRows: SceneVendorApp[];
  activeTab: string; // 'TTS', 'ASR', 'LLM'
  serviceType: number; // 1, 2, 3
}

interface SyncResult {
  total: number;
  success: number;
  failed: number;
  details: string[];
}

const VendorSyncModal: React.FC<VendorSyncModalProps> = ({ 
  visible, 
  onCancel, 
  selectedRows, 
  activeTab,
  serviceType 
}) => {
  const [form] = Form.useForm();
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});
  const [currentDataCenter, setCurrentDataCenter] = useState<DataCenter>(getCurrentDataCenter());

  // 可选的唯一标识字段
  const uniqueFieldOptions = [
    { label: '厂商 (Vendor)', value: 'vendor' },
    { label: '语言 (Language)', value: 'language' },
    { label: '音色 (Timbre)', value: 'timbre' },
    { label: '模型 (Model)', value: 'model' },
    { label: '厂商参数 (Vendor Params)', value: 'vendor_params' },
  ];

  // 默认选中的唯一标识字段
  const defaultUniqueFields = ['vendor', 'language', 'timbre', 'model'];

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setSyncResults({});
      setProgress(0);
      setIsSyncing(false);
      setCurrentDataCenter(getCurrentDataCenter());
      
      // 设置默认值
      form.setFieldsValue({
        uniqueFields: defaultUniqueFields,
        targetDataCenters: []
      });
    }
  }, [visible]);

  // 生成唯一键
  const generateUniqueKey = (item: any, fields: string[]) => {
    return fields.map(field => {
      const val = item[field];
      return val === undefined || val === null ? '' : String(val).trim();
    }).join('|');
  };

  const handleSync = async () => {
    try {
      const values = await form.validateFields();
      const { targetDataCenters, uniqueFields } = values;

      if (targetDataCenters.length === 0) {
        message.warning('请选择至少一个目标环境');
        return;
      }

      if (uniqueFields.length === 0) {
        message.warning('请选择至少一个唯一标识字段');
        return;
      }

      setIsSyncing(true);
      setProgress(0);
      
      const totalOperations = targetDataCenters.length * selectedRows.length;
      let completedOperations = 0;
      const newSyncResults: Record<string, SyncResult> = {};

      // 初始化结果对象
      targetDataCenters.forEach((dcId: string) => {
        newSyncResults[dcId] = {
          total: selectedRows.length,
          success: 0,
          failed: 0,
          details: []
        };
      });
      setSyncResults(newSyncResults);

      // 遍历每个目标数据中心
      for (const dcId of targetDataCenters) {
        const targetDC = DATA_CENTERS.find(dc => dc.id === dcId);
        if (!targetDC) continue;

        try {
          // 1. 获取目标环境的所有数据（用于比对）
          // 假设最大10000条，如果数据量更大可能需要分页获取
          const response = await getSceneVendorAppListForDataCenter({
            type: serviceType,
            page_number: 1,
            page_size: 10000,
            tenantId: 255 // 默认租户
          }, targetDC.baseURL);

          const targetList = response.list || [];
          
          // 建立目标环境的映射 Map<UniqueKey, ExistingItem>
          const targetMap = new Map<string, SceneVendorApp>();
          targetList.forEach(item => {
            const key = generateUniqueKey(item, uniqueFields);
            targetMap.set(key, item);
          });

          // 2. 遍历选中行进行同步
          for (const sourceItem of selectedRows) {
            const key = generateUniqueKey(sourceItem, uniqueFields);
            const existingItem = targetMap.get(key);
            
            try {
              // 准备数据
              const formData: SceneVendorAppFormData = {
                type: sourceItem.type,
                language: sourceItem.language,
                vendor: sourceItem.vendor,
                vendor_params: sourceItem.vendor_params,
                code: sourceItem.code,
                timbre: sourceItem.timbre,
                model: sourceItem.model,
                vendor_app_id: String(sourceItem.vendor_app_id),
                status: sourceItem.status,
                rating: sourceItem.rating,
                remark: sourceItem.remark
              };

              if (existingItem) {
                // 更新
                await updateSceneVendorAppForDataCenter(
                  existingItem.id, 
                  formData, 
                  targetDC.baseURL,
                  existingItem // 传递原始记录以保持create_ts等字段
                );
                newSyncResults[dcId].details.push(`ID ${sourceItem.id} -> 目标ID ${existingItem.id}: 更新成功`);
              } else {
                // 创建
                await createSceneVendorAppForDataCenter(formData, targetDC.baseURL);
                newSyncResults[dcId].details.push(`ID ${sourceItem.id}: 创建成功`);
              }
              
              newSyncResults[dcId].success++;
            } catch (error: any) {
              console.error(`Sync error for item ${sourceItem.id} to ${targetDC.name}:`, error);
              newSyncResults[dcId].failed++;
              newSyncResults[dcId].details.push(`ID ${sourceItem.id}: 失败 - ${error.message}`);
            }

            // 更新进度
            completedOperations++;
            setProgress(Math.round((completedOperations / totalOperations) * 100));
            setSyncResults({ ...newSyncResults }); // 触发UI更新
          }

        } catch (error: any) {
          console.error(`Failed to fetch list from ${targetDC.name}:`, error);
          newSyncResults[dcId].details.push(`无法连接到环境或获取列表失败: ${error.message}`);
          // 标记该环境下所有操作失败
          newSyncResults[dcId].failed = selectedRows.length;
          completedOperations += selectedRows.length;
          setProgress(Math.round((completedOperations / totalOperations) * 100));
          setSyncResults({ ...newSyncResults });
        }
      }

      message.success('批量同步完成');
    } catch (error) {
      console.error('Sync process error:', error);
      message.error('同步过程中发生错误');
    } finally {
      setIsSyncing(false);
    }
  };

  const getTargetDCOptions = () => {
    return DATA_CENTERS
      .filter(dc => dc.id !== currentDataCenter.id)
      .map(dc => ({ label: dc.name, value: dc.id }));
  };

  return (
    <Modal
      title={`批量同步数据 (${selectedRows.length} 条记录)`}
      open={visible}
      onCancel={!isSyncing ? onCancel : undefined}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={isSyncing}>
          关闭
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={isSyncing} 
          onClick={handleSync}
        >
          开始同步
        </Button>
      ]}
      width={700}
      maskClosable={!isSyncing}
    >
      <Alert
        message="功能说明"
        description="将选中的数据同步到其他环境。如果目标环境存在相同唯一标识的数据，则更新；如果不存在，则创建。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          label="选择目标环境"
          name="targetDataCenters"
          rules={[{ required: true, message: '请选择目标环境' }]}
        >
          <Select
            mode="multiple"
            placeholder="请选择要同步到的环境"
            options={getTargetDCOptions()}
          />
        </Form.Item>

        <Form.Item
          label="唯一标识字段组合"
          name="uniqueFields"
          tooltip="用于判断数据是否已存在的字段组合"
          rules={[{ required: true, message: '请选择唯一标识字段' }]}
        >
          <Checkbox.Group options={uniqueFieldOptions} />
        </Form.Item>
      </Form>

      {isSyncing || Object.keys(syncResults).length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <Divider orientation="left">同步进度与结果</Divider>
          <Progress percent={progress} status={isSyncing ? 'active' : 'normal'} />
          
          <div style={{ marginTop: 16, maxHeight: '300px', overflowY: 'auto' }}>
            {Object.entries(syncResults).map(([dcId, result]) => {
              const dcName = DATA_CENTERS.find(dc => dc.id === dcId)?.name || dcId;
              return (
                <div key={dcId} style={{ marginBottom: 12, padding: 8, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                    {dcName}: 
                    <Text type="success" style={{ marginLeft: 8 }}>成功 {result.success}</Text>
                    <Text type="danger" style={{ marginLeft: 8 }}>失败 {result.failed}</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>/ 总计 {result.total}</Text>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {result.details.slice(0, 5).map((detail, idx) => (
                      <div key={idx}>{detail}</div>
                    ))}
                    {result.details.length > 5 && (
                      <div>...还有 {result.details.length - 5} 条详情</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default VendorSyncModal;

