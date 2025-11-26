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
      // ========== 提示词验证项目 (3000) 代理配置 ==========
      // 3000 项目已配置 base: '/llmproxy'，所有路径都带此前缀
      // 
      // 访问方式：
      //   - 主入口: http://localhost:3010/llmproxy?auth_token=xxx
      //   - 其他页面: http://localhost:3010/llmproxy/charts.html
      //   - API 请求: http://localhost:3010/llmproxy/api/xxx
      
      '/llmproxy': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // 不需要 rewrite，因为 3000 项目已经配置了 /llmproxy 前缀
        ws: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[llmproxy] 代理请求:', req.method, req.url);
          });
          proxy.on('error', (err, req, res) => {
            console.error('[llmproxy] 代理错误:', err.message);
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(`
                <html>
                  <head><title>服务不可用</title></head>
                  <body style="font-family: sans-serif; padding: 40px; text-align: center;">
                    <h1>😔 提示词验证服务未启动</h1>
                    <p>请先启动提示词验证项目（端口 3000）</p>
                    <p><a href="/">返回主页</a></p>
                  </body>
                </html>
              `);
            }
          });
        },
        bypass: (req, res, options) => {
          const url = req.url || '';
          
          // 解析 URL 参数
          let authToken = '';
          try {
            const urlObj = new URL(url, 'http://localhost');
            authToken = req.headers['x-auth-token'] as string || 
                        req.headers['authorization'] as string ||
                        urlObj.searchParams.get('auth_token') || '';
          } catch (e) {
            authToken = req.headers['x-auth-token'] as string || 
                        req.headers['authorization'] as string || '';
          }
          
          // 静态资源直接放行
          const isStaticResource = /\.(js|mjs|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json)(\?.*)?$/i.test(url);
          if (isStaticResource) {
            return;
          }
          
          // 检查 Referer - 来自 /llmproxy 的内部请求放行
          const referer = req.headers['referer'] || '';
          const isFromLlmproxy = referer.includes('/llmproxy');
          
          // 检查 Cookie 中是否有令牌
          const cookies = req.headers['cookie'] || '';
          const hasCookieToken = cookies.includes('plat_token=') ||
                                 cookies.includes('admin_api_token=');
          
          // 有令牌、来自 llmproxy、或有 Cookie 令牌，允许访问
          if (authToken || isFromLlmproxy || hasCookieToken) {
            return;
          }
          
          // 无令牌，重定向到主页
          console.log('[llmproxy] 无令牌访问被拦截:', url);
          res.writeHead(302, {
            'Location': '/?error=unauthorized&message=' + encodeURIComponent('请先配置运营后台令牌') + '&redirect=llmproxy',
            'Content-Type': 'text/html'
          });
          res.end();
          return false;
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