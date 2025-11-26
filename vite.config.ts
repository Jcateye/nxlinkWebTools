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
      // 所有 3000 项目的请求都需要通过令牌校验
      // 
      // 访问方式：
      //   - 主入口: http://localhost:3010/prompt-lab?auth_token=xxx
      //   - 其他页面: http://localhost:3010/prompt-lab/capabilities.html
      //   - API 请求: http://localhost:3010/prompt-lab/api/xxx
      //
      // 注意：3000 项目内部如果使用绝对路径（如 /capabilities.html），
      // 需要在 3000 项目中配置 base 路径，或者使用相对路径。
      // 如果无法修改 3000 项目，可以用 Nginx 在生产环境做路径重写。
      
      '/prompt-lab': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // 移除 /prompt-lab 前缀后转发到 3000
        rewrite: (path) => path.replace(/^\/prompt-lab/, ''),
        // WebSocket 支持（如果 3000 项目有热更新等功能）
        ws: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[prompt-lab proxy] 代理请求:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // 如果是 HTML 响应，可以在这里注入脚本来修复绝对路径问题
            // 但这比较复杂，建议在生产环境用 Nginx 处理
          });
          proxy.on('error', (err, req, res) => {
            console.error('[prompt-lab proxy] 代理错误:', err.message);
            // 3000 服务未启动时返回友好提示
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(`
                <html>
                  <head><title>服务不可用</title></head>
                  <body style="font-family: sans-serif; padding: 40px; text-align: center;">
                    <h1>😔 提示词验证服务未启动</h1>
                    <p>请先启动提示词验证项目（端口 3000）</p>
                    <p><code>cd prompt-lab && npm start</code></p>
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
            // URL 解析失败，继续检查其他来源
            authToken = req.headers['x-auth-token'] as string || 
                        req.headers['authorization'] as string || '';
          }
          
          // 静态资源直接放行（js, css, 图片, 字体等）
          const isStaticResource = /\.(js|mjs|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json)(\?.*)?$/i.test(url);
          if (isStaticResource) {
            return; // 继续代理
          }
          
          // 检查 Referer - 来自本站的请求放行
          const referer = req.headers['referer'] || '';
          const isFromLocalhost = referer.includes('localhost:3010') || 
                                  referer.includes('127.0.0.1:3010') ||
                                  referer.includes('localhost:3000'); // 3000 内部跳转也放行
          
          // 检查 Cookie 中是否有令牌
          const cookies = req.headers['cookie'] || '';
          const hasCookieToken = cookies.includes('nxlink_auth_token=') || 
                                 cookies.includes('plat_token=') ||
                                 cookies.includes('admin_api_token=');
          
          // 有令牌、来自本站、或有 Cookie 令牌，允许访问
          if (authToken || isFromLocalhost || hasCookieToken) {
            return; // 继续代理
          }
          
          // 无令牌且不是来自本站，返回 401 并重定向
          console.log('[prompt-lab proxy] 无令牌访问被拦截:', url);
          res.writeHead(302, {
            'Location': '/?error=unauthorized&message=' + encodeURIComponent('请先配置运营后台令牌') + '&redirect=prompt-lab',
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