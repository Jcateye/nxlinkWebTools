#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, prefix, message) {
  console.log(`${colors[color]}[${prefix}]${colors.reset} ${message}`);
}

// 环境配置
const environments = {
  dev: {
    name: '开发环境',
    frontend: {
      command: 'npm',
      args: ['run', 'start'],
      cwd: process.cwd(),
      port: 3010,
      color: 'cyan'
    },
    backend: {
      command: 'npm',
      args: ['run', 'dev'],
      cwd: path.join(process.cwd(), 'server'),
      port: 8400,
      color: 'green'
    }
  },
  prod: {
    name: '生产环境',
    frontend: {
      command: 'npm',
      args: ['run', 'build'],
      cwd: process.cwd(),
      buildOnly: true,
      color: 'cyan'
    },
    backend: {
      command: 'npm',
      args: ['run', 'start:prod'],
      cwd: path.join(process.cwd(), 'server'),
      port: 8450,
      color: 'green'
    },
    server: {
      command: 'node',
      args: ['server.js'],
      cwd: process.cwd(),
      port: 8350,
      color: 'yellow'
    }
  },
  test: {
    name: '测试环境',
    frontend: {
      command: 'npm',
      args: ['run', 'test'],
      cwd: process.cwd(),
      port: 3010,
      color: 'cyan'
    },
    backend: {
      command: 'npm',
      args: ['run', 'test'],
      cwd: path.join(process.cwd(), 'server'),
      port: 8400,
      color: 'green'
    }
  }
};

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  
  // 过滤掉选项参数
  const filteredArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
  
  const env = filteredArgs[0] || 'dev';
  const services = filteredArgs.slice(1);
  
  if (!environments[env]) {
    colorLog('red', 'ERROR', `不支持的环境: ${env}`);
    showHelp();
    process.exit(1);
  }
  
  return { env, services };
}

// 显示帮助信息
function showHelp() {
  console.log(`
${colors.bright}nxlinkWebTools 服务启动脚本${colors.reset}

${colors.yellow}用法:${colors.reset}
  node start.js [选项] [环境] [服务...]

${colors.yellow}选项:${colors.reset}
  --clean, -c    启动前清理所有相关端口 (3010, 8400, 8300)
  --help, -h     显示帮助信息

${colors.yellow}环境:${colors.reset}
  dev     开发环境 (默认)
  prod    生产环境
  test    测试环境

${colors.yellow}服务 (可选):${colors.reset}
  frontend    前端服务
  backend     后端服务
  server      生产服务器 (仅生产环境)
  
  如果不指定服务，将启动该环境的所有服务

${colors.yellow}示例:${colors.reset}
  node start.js                        # 启动开发环境所有服务
  node start.js --clean dev            # 清理端口后启动开发环境
  node start.js prod                   # 启动生产环境所有服务
  node start.js dev frontend           # 只启动开发环境前端服务
  node start.js -c prod backend server # 清理端口后启动生产环境后端和服务器

${colors.yellow}端口分配:${colors.reset}
  前端开发服务器: 3010
  后端API服务器:  8400
  生产服务器:     8300
`);
}

// 检查端口是否被占用
function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    
    server.on('error', () => resolve(false));
  });
}

// 杀死占用端口的进程（增强版）
async function killPort(port) {
  try {
    const { execSync } = require('child_process');
    
    // 获取占用端口的进程PID
    const command = `lsof -ti :${port}`;
    const pids = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
      .trim()
      .split('\n')
      .filter(pid => pid);
    
    if (pids.length > 0) {
      colorLog('yellow', 'PORT', `发现端口 ${port} 被进程占用: ${pids.join(', ')}`);
      
      for (const pid of pids) {
        try {
          // 先尝试优雅关闭
          execSync(`kill ${pid}`, { stdio: 'pipe' });
          colorLog('blue', 'PORT', `发送 SIGTERM 信号到进程 ${pid}`);
          
          // 等待2秒
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 检查进程是否还存在
          try {
            execSync(`kill -0 ${pid}`, { stdio: 'pipe' });
            // 如果还存在，强制杀死
            execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
            colorLog('red', 'PORT', `强制杀死进程 ${pid}`);
          } catch {
            // 进程已经被优雅关闭
            colorLog('green', 'PORT', `进程 ${pid} 已优雅关闭`);
          }
        } catch (error) {
          colorLog('yellow', 'PORT', `无法杀死进程 ${pid}: ${error.message}`);
        }
      }
      
      // 最终验证端口是否已释放
      await new Promise(resolve => setTimeout(resolve, 1000));
      const isPortFree = await checkPort(port);
      if (isPortFree) {
        colorLog('green', 'PORT', `端口 ${port} 已成功释放`);
      } else {
        colorLog('red', 'PORT', `端口 ${port} 仍被占用，可能需要手动处理`);
      }
    }
  } catch (error) {
    // 端口没被占用或其他错误
    if (error.status === 1) {
      // lsof 返回1表示没找到进程，这是正常的
      colorLog('green', 'PORT', `端口 ${port} 未被占用`);
    } else {
      colorLog('yellow', 'PORT', `检查端口 ${port} 时出错: ${error.message}`);
    }
  }
}

// 启动单个服务
async function startService(name, config, env) {
  colorLog('blue', 'START', `正在启动 ${name}...`);
  
  // 检查工作目录是否存在
  if (!fs.existsSync(config.cwd)) {
    colorLog('red', 'ERROR', `工作目录不存在: ${config.cwd}`);
    return null;
  }
  
  // 检查并清理端口（Docker环境跳过端口检查）
  if (config.port && !process.env.DOCKER_CONTAINER) {
    colorLog('blue', 'CHECK', `检查端口 ${config.port} 状态...`);
    await killPort(config.port); // 直接清理，函数内部会检查是否被占用
  } else if (config.port && process.env.DOCKER_CONTAINER) {
    colorLog('blue', 'CHECK', `Docker环境跳过端口 ${config.port} 检查`);
  }
  
  // 特殊处理：生产环境前端构建检查
  if (env === 'prod' && name === 'frontend') {
    const distPath = path.join(config.cwd, 'dist');
    const indexPath = path.join(distPath, 'index.html');

    if (fs.existsSync(indexPath)) {
      colorLog('green', 'BUILD', '检测到前端文件已存在，跳过构建');
      return null; // 返回null表示不启动此服务
    } else {
      colorLog('cyan', 'BUILD', '正在构建前端项目...');
    }
  }
  
  // 组装环境变量（为服务显式设置端口）
  const serviceEnv = {
    ...process.env,
    NODE_ENV: env === 'dev' ? 'development' : env === 'prod' ? 'production' : 'test'
  };
  if (config.port) {
    serviceEnv.PORT = String(config.port);
  }
  // 网关(server)需要知道后端端口用于代理转发
  try {
    const allEnv = environments[env];
    if (name === 'server' && allEnv && allEnv.backend && allEnv.backend.port) {
      serviceEnv.BACKEND_PORT = String(allEnv.backend.port);
    }
  } catch {}

  const child = spawn(config.command, config.args, {
    cwd: config.cwd,
    stdio: 'pipe',
    env: serviceEnv
  });
  
  // 输出处理
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      colorLog(config.color, name.toUpperCase(), line);
    });
  });
  
  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      colorLog('red', name.toUpperCase(), line);
    });
  });
  
  child.on('close', (code) => {
    if (code === 0) {
      colorLog('green', name.toUpperCase(), `服务正常退出`);
    } else {
      colorLog('red', name.toUpperCase(), `服务异常退出，退出码: ${code}`);
    }
  });
  
  child.on('error', (error) => {
    colorLog('red', name.toUpperCase(), `启动失败: ${error.message}`);
  });
  
  // 特殊处理：如果是构建任务，等待完成
  if (config.buildOnly) {
    return new Promise((resolve) => {
      child.on('close', (code) => {
        if (code === 0) {
          colorLog('green', 'BUILD', '前端构建完成');
        } else {
          colorLog('red', 'BUILD', '前端构建失败');
        }
        resolve(child);
      });
    });
  }
  
  return child;
}

// 清理所有相关端口
async function cleanAllPorts() {
  const allPorts = [3010, 8400, 8300]; // 前端、后端、生产服务器端口
  
  colorLog('yellow', 'CLEANUP', '正在清理可能冲突的端口...');
  
  for (const port of allPorts) {
    await killPort(port);
  }
  
  colorLog('green', 'CLEANUP', '端口清理完成');
}

// 主函数
async function main() {
  // 显示启动信息
  console.log(`${colors.bright}${colors.magenta}
╔══════════════════════════════════════╗
║        nxlinkWebTools 启动器         ║
╚══════════════════════════════════════╝
${colors.reset}`);
  
  const { env, services } = parseArgs();
  const envConfig = environments[env];
  
  colorLog('blue', 'ENV', `启动环境: ${envConfig.name}`);
  
  // 清理所有相关端口（可选，如果用户传入 --clean 参数）
  if (process.argv.includes('--clean') || process.argv.includes('-c')) {
    await cleanAllPorts();
  }
  
  // 确定要启动的服务
  let servicesToStart = services.length > 0 ? services : Object.keys(envConfig).filter(key => key !== 'name');
  
  // 验证服务名称
  for (const service of servicesToStart) {
    if (!envConfig[service]) {
      colorLog('red', 'ERROR', `环境 ${env} 不支持服务: ${service}`);
      process.exit(1);
    }
  }
  
  colorLog('green', 'SERVICES', `将启动服务: ${servicesToStart.join(', ')}`);
  
  const processes = [];
  
  // 生产环境特殊处理：检查前端是否需要构建
  if (env === 'prod' && servicesToStart.includes('frontend')) {
    const frontendProcess = await startService('frontend', envConfig.frontend, env);
    if (!frontendProcess) {
      // 前端文件已存在，不需要启动构建进程
      servicesToStart = servicesToStart.filter(s => s !== 'frontend');
    }
  }
  
  // 启动其他服务
  for (const serviceName of servicesToStart) {
    const config = envConfig[serviceName];
    const process = await startService(serviceName, config, env);
    if (process) {
      processes.push({ name: serviceName, process });
    }
  }
  
  // 如果没有服务在运行，退出
  if (processes.length === 0) {
    colorLog('yellow', 'INFO', '没有服务在运行');
    process.exit(0);
  }
  
  // 显示服务状态
  console.log(`\n${colors.bright}服务状态:${colors.reset}`);
  for (const { name } of processes) {
    const config = envConfig[name];
    if (config.port) {
      colorLog('green', 'RUNNING', `${name} 运行在端口 ${config.port}`);
    } else {
      colorLog('green', 'RUNNING', `${name} 正在运行`);
    }
  }
  
  console.log(`\n${colors.yellow}按 Ctrl+C 停止所有服务${colors.reset}\n`);
  
  // 优雅退出处理
  process.on('SIGINT', () => {
    colorLog('yellow', 'SHUTDOWN', '正在关闭所有服务...');
    
    processes.forEach(({ name, process }) => {
      colorLog('blue', 'STOP', `正在停止 ${name}...`);
      process.kill('SIGTERM');
    });
    
    setTimeout(() => {
      processes.forEach(({ name, process }) => {
        if (!process.killed) {
          colorLog('red', 'FORCE', `强制停止 ${name}`);
          process.kill('SIGKILL');
        }
      });
      process.exit(0);
    }, 5000);
  });
}

// 检查是否显示帮助
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// 运行主函数
main().catch((error) => {
  colorLog('red', 'ERROR', error.message);
  process.exit(1);
});
