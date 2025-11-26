import { useState, useRef, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { Button, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface ExternalAppFrameProps {
  src: string;
  title?: string;
  minHeight?: number;
  showReloadButton?: boolean;
  /** 传递给 iframe 的认证令牌，iframe 加载后会通过 postMessage 发送 */
  authToken?: string;
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
  authToken,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleReload = () => {
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  // 向 iframe 发送认证令牌
  const sendAuthToken = useCallback(() => {
    if (iframeRef.current?.contentWindow && authToken) {
      try {
        // 获取 iframe 的 origin
        const iframeSrc = new URL(src, window.location.origin);
        const targetOrigin = iframeSrc.origin;
        
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'NXLINK_AUTH_TOKEN',
            token: authToken,
            timestamp: Date.now(),
          },
          targetOrigin
        );
        console.log('[ExternalAppFrame] 已向 iframe 发送认证令牌');
      } catch (error) {
        console.error('[ExternalAppFrame] 发送认证令牌失败:', error);
      }
    }
  }, [src, authToken]);

  // iframe 加载完成后发送令牌
  const handleIframeLoad = () => {
    setIsLoading(false);
    // 延迟一点发送，确保 iframe 内的 JS 已经初始化
    setTimeout(sendAuthToken, 500);
  };

  // 监听来自 iframe 的消息（如请求令牌）
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 验证消息来源
      try {
        const iframeSrc = new URL(src, window.location.origin);
        if (event.origin !== iframeSrc.origin) {
          return;
        }
      } catch {
        return;
      }

      // 处理 iframe 请求令牌的消息
      if (event.data?.type === 'NXLINK_REQUEST_AUTH_TOKEN') {
        console.log('[ExternalAppFrame] iframe 请求认证令牌');
        sendAuthToken();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [src, sendAuthToken]);

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
          ref={iframeRef}
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
          onLoad={handleIframeLoad}
          allow="clipboard-write; clipboard-read"
        />
      </div>
    </div>
  );
};

export default ExternalAppFrame;

