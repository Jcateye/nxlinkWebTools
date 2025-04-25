import React from 'react';
import { Spin } from 'antd';

interface LoadingProps {
  tip?: string;
}

const Loading: React.FC<LoadingProps> = ({ tip = '加载中...' }) => {
  return (
    <div style={{ textAlign: 'center', padding: '30px 0' }}>
      <Spin tip={tip} size="large" />
    </div>
  );
};

export default Loading; 