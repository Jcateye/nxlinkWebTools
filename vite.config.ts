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