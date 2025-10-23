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