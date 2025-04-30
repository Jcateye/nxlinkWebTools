# NXLink协作服务器

这是一个基于Socket.io的实时协作服务器，用于支持NXLink Web工具中的协作模式功能。

## 功能

- 实时多用户协作
- 聊天消息功能
- 会话管理
- 用户在线状态监控

## 安装和运行

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run dev
```

### 生产模式运行

```bash
npm start
```

## 配置

服务器默认运行在3020端口，可以通过环境变量`PORT`进行更改。

## API

### WebSocket事件

- `connection`: 建立连接
- `joinSession`: 加入会话
- `leaveSession`: 离开会话
- `message`: 发送消息
- `updateSessionData`: 更新会话数据

### HTTP接口

- `GET /api/status`: 获取服务器状态 