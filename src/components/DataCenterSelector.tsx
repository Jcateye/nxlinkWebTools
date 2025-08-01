import React, { useState, useEffect } from 'react';
import { Select, Space, Typography, Tooltip, Tag } from 'antd';
import { GlobalOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { 
  DATA_CENTERS, 
  DataCenter, 
  getCurrentDataCenter, 
  setCurrentDataCenter 
} from '../config/apiConfig';

const { Option } = Select;
const { Text } = Typography;

interface DataCenterSelectorProps {
  onChange?: (dataCenter: DataCenter) => void;
  style?: React.CSSProperties;
  size?: 'small' | 'middle' | 'large';
}

const DataCenterSelector: React.FC<DataCenterSelectorProps> = ({
  onChange,
  style,
  size = 'middle'
}) => {
  const [selectedDataCenter, setSelectedDataCenter] = useState<DataCenter>(getCurrentDataCenter());

  useEffect(() => {
    // 组件加载时确保使用当前选择的数据中心
    const current = getCurrentDataCenter();
    setSelectedDataCenter(current);
  }, []);

  const handleDataCenterChange = (dataCenterId: string) => {
    const dataCenter = DATA_CENTERS.find(dc => dc.id === dataCenterId);
    if (dataCenter) {
      setSelectedDataCenter(dataCenter);
      setCurrentDataCenter(dataCenter);
      onChange?.(dataCenter);
      
      console.log('[DataCenterSelector] 数据中心切换:', {
        from: selectedDataCenter.name,
        to: dataCenter.name,
        baseURL: dataCenter.baseURL
      });
    }
  };

  return (
    <Space style={style}>
      <Text strong>
        <EnvironmentOutlined style={{ marginRight: 4 }} />
        数据中心:
      </Text>
      <Select
        value={selectedDataCenter.id}
        onChange={handleDataCenterChange}
        style={{ minWidth: 120 }}
        size={size}
      >
        {DATA_CENTERS.map(dataCenter => (
          <Option key={dataCenter.id} value={dataCenter.id}>
            <Space>
              <GlobalOutlined />
              <span>{dataCenter.name}</span>
              {dataCenter.description && (
                <Tooltip title={dataCenter.description}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    ({dataCenter.id === 'hk' ? 'nxlink.nxcloud.com' : 'nxlink.nxcloud.com/chl'})
                  </Text>
                </Tooltip>
              )}
            </Space>
          </Option>
        ))}
      </Select>
      <Tag color={selectedDataCenter.id === 'hk' ? 'blue' : 'green'}>
        {selectedDataCenter.name}
      </Tag>
    </Space>
  );
};

export default DataCenterSelector;