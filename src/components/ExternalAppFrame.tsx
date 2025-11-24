import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface ExternalAppFrameProps {
  src: string;
  title?: string;
  minHeight?: number;
  showReloadButton?: boolean;
}

const overlayStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255, 255, 255, 0.9)',
  zIndex: 1,
};

const ExternalAppFrame: React.FC<ExternalAppFrameProps> = ({
  src,
  title,
  minHeight = 900,
  showReloadButton = true,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const handleReload = () => {
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {showReloadButton && (
        <div style={{ textAlign: 'right' }}>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleReload}
          >
            重新加载
          </Button>
        </div>
      )}
      <div style={{ position: 'relative', minHeight }}>
        {isLoading && (
          <div style={overlayStyle}>
            <Spin tip="正在加载提示词验证应用..." />
          </div>
        )}
        <iframe
          key={`${src}-${reloadKey}`}
          src={src}
          title={title ?? 'external-app'}
          style={{
            width: '100%',
            minHeight,
            border: '1px solid #e8e8e8',
            borderRadius: 8,
            background: '#fff',
          }}
          onLoad={() => setIsLoading(false)}
          allow="clipboard-write; clipboard-read"
        />
      </div>
    </div>
  );
};

export default ExternalAppFrame;

