import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3010,
    host: true,
    proxy: {
      // 提示词验证项目代理 - 需要令牌才能访问
      '/prompt-lab': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/prompt-lab/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 检查是否有认证令牌
            const authToken = req.headers['x-auth-token'] || 
                              req.headers['authorization'] ||
                              (req.url && new URL(req.url, 'http://localhost').searchParams.get('auth_token'));
            
            // 对于静态资源（js, css, 图片等），允许通过
            const isStaticResource = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)(\?.*)?$/i.test(req.url || '');
            
            // 对于 HTML 页面请求，检查 Referer 是否来自本站
            const referer = req.headers['referer'] || '';
            const isFromLocalhost = referer.includes('localhost:3010') || referer.includes('127.0.0.1:3010');
            
            // 如果是静态资源或者来自本站的请求，允许通过
            if (isStaticResource || isFromLocalhost) {
              console.log('[prompt-lab proxy] 允许请求:', req.url);
              return;
            }
            
            // 对于直接访问的 HTML 页面，检查令牌
            if (!authToken) {
              console.log('[prompt-lab proxy] 拒绝无令牌请求:', req.url);
              // 不能在这里直接返回响应，需要在 bypass 中处理
            }
          });
        },
        bypass: (req, res, options) => {
          // 检查是否有认证令牌
          const url = req.url || '';
          const urlObj = new URL(url, 'http://localhost');
          const authToken = req.headers['x-auth-token'] || 
                            req.headers['authorization'] ||
                            urlObj.searchParams.get('auth_token');
          
          // 静态资源直接放行
          const isStaticResource = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)(\?.*)?$/i.test(url);
          if (isStaticResource) {
            return; // undefined 表示继续代理
          }
          
          // 检查 Referer
          const referer = req.headers['referer'] || '';
          const isFromLocalhost = referer.includes('localhost:3010') || referer.includes('127.0.0.1:3010');
          
          // 如果有令牌或者来自本站，允许访问
          if (authToken || isFromLocalhost) {
            return; // 继续代理
          }
          
          // 无令牌且不是来自本站，返回 401 页面
          console.log('[prompt-lab proxy] 无令牌访问，重定向到主页');
          res.writeHead(302, {
            'Location': '/?error=unauthorized&redirect=prompt-lab',
            'Content-Type': 'text/html'
          });
          res.end();
          return false; // 阻止代理
        }
      },
      '/api/backend': {
        target: 'http://localhost:8400',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/backend/, '/api'),
      },
      '/api/tests': {
        target: 'http://localhost:8400',
        changeOrigin: true,
      },
      '/api/providers': {
        target: 'http://localhost:8400',
        changeOrigin: true,
      },
      '/api/prompts': {
        target: 'http://localhost:8400',
        changeOrigin: true,
      },
      '/api/analytics': {
        target: 'http://localhost:8400',
        changeOrigin: true,
      },
      '/api/auth': {
        target: 'http://localhost:8400',
        changeOrigin: true,
      },
      '/batch-test-log': {
        target: 'http://localhost:8400',
        changeOrigin: true,
        rewrite: (path) => '/api/tests/logs',
      },
      '/batch-test-logs': {
        target: 'http://localhost:8400',
        changeOrigin: true,
        rewrite: (path) => '/api/tests/logs',
      },
      '/api/sessions': {
        target: 'http://localhost:3020',
        changeOrigin: true,
      },
      '/api/admin/saas_plat/user/is_login': {
        target: 'https://nxlink.nxcloud.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        bypass: (req, res, options) => {
          delete req.headers['content-type'];
          delete req.headers['Content-Type'];
          req.headers["user-agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";
          req.headers["accept"] = "application/json, text/plain, */*";
        },
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.removeHeader('Content-Type');
            proxyReq.removeHeader('content-type');
            console.log('is_login代理请求:', req.url);
            console.log('is_login请求方法:', req.method);
            console.log('is_login请求头:', req.headers);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('is_login代理响应状态码:', proxyRes.statusCode);
            console.log('is_login代理响应头:', proxyRes.headers);
            if (proxyRes.statusCode !== 200) {
              let body = '';
              proxyRes.on('data', function(chunk) {
                body += chunk;
              });
              proxyRes.on('end', function() {
                console.log('is_login代理响应体:', body.toString());
              });
            }
          });
          proxy.on('error', (err, req, res) => {
            console.error('is_login代理错误:', err);
          });
        }
      },
      '/api/hk': {
        target: 'https://nxlink.nxcloud.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/hk/, ''),  // 移除 /api/hk 前缀，直接访问
      },
      '/api/chl': {
        target: 'https://nxlink.nxcloud.com/chl',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/chl/, ''),
      },
      '/api/public_idn': {
        target: 'https://nxlink.nxcloud.com/public_idn',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/public_idn/, ''),
      },
      '/api/sit': {
        target: 'https://sit2025.nxlink.ai',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/sit/, ''),
      },
      '/api/openapi': {
        target: 'http://localhost:8400',
        changeOrigin: true,
      },
      '/internal-api': {
        target: 'http://localhost:8400',
        changeOrigin: true,
      },
      '/local': {
        target: 'http://localhost:8350',
        changeOrigin: true,
        rewrite: (path) => path, // 不重写路径
        ws: true,
      },
      '/api': {
        target: 'https://nxlink.nxcloud.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {}
      }
    }
  },
}); 