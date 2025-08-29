module.exports = {
  apps: [
    {
      // 后端服务配置
      name: 'nxlink-backend',
      script: './server/dist/index.js',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 8450
      },
      instances: 2,              // 启动2个实例（根据CPU核心数调整）
      exec_mode: 'cluster',      // 集群模式
      watch: false,              // 生产环境不监听文件变化
      max_memory_restart: '1G',  // 内存超过1G自动重启
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,                // 日志添加时间戳
      merge_logs: true,          // 合并集群的日志
      autorestart: true,         // 自动重启
      max_restarts: 10,          // 最大重启次数
      min_uptime: '10s',         // 最小运行时间
      env_production: {
        NODE_ENV: 'production',
        PORT: 8450
      }
    },
    {
      // 网关服务配置
      name: 'nxlink-gateway',
      script: './server.js',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 8350,
        BACKEND_PORT: 8450
      },
      instances: 1,              // 网关只需要一个实例
      exec_mode: 'fork',         // 单进程模式
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/gateway-error.log',
      out_file: './logs/gateway-out.log',
      log_file: './logs/gateway-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env_production: {
        NODE_ENV: 'production',
        PORT: 8350,
        BACKEND_PORT: 8450
      }
    }
  ],

  // 部署配置（可选）
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/nxlinkWebTools.git',
      path: '/opt/nxlinkWebTools',
      'pre-deploy': 'git pull',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
