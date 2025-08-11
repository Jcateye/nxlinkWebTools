# 供应商应用管理接口问题修复指南

## 问题总结

1. **域名配置错误**：错误地使用了 `nxlink.ai` 而不是正确的 `nxlink.nxcloud.com`
2. **接口重复请求**：React.StrictMode 导致的开发环境重复渲染
3. **CORS跨域错误**：部分请求绕过了代理直接访问生产环境

## 已实施的解决方案

### 1. 调试工具
- 添加了 `src/utils/debugHelper.ts`，自动拦截并修正错误的域名
- 在控制台显示详细的请求日志，帮助定位问题

### 2. API请求优化
- 修改了 `vendorAppApi.ts`，在请求拦截器中自动修正URL
- 添加了 `apiHelper.ts` 工具函数，统一处理URL转换

### 3. 防止重复请求
- 在 `VendorAppManagementPage.tsx` 中添加了防抖机制
- 优化了 useEffect 依赖，避免不必要的重复调用

## 立即生效的操作

1. **清除浏览器缓存**
   ```bash
   # Chrome DevTools
   1. 打开开发者工具 (F12)
   2. 右键点击刷新按钮
   3. 选择"清空缓存并硬性重新加载"
   ```

2. **重启开发服务器**
   ```bash
   # 停止当前服务
   Ctrl + C
   
   # 重新启动
   npm run dev
   ```

3. **检查控制台日志**
   - 查看是否有 `[XHR拦截]` 或 `[Fetch拦截]` 的日志
   - 如果发现包含 `nxlink.ai` 的请求，会自动修正

## 验证修复效果

1. 打开供应商应用管理页面
2. 切换不同的标签页（TTS/ASR/LLM）
3. 观察控制台：
   - ✅ 所有请求应该使用 `/api/` 前缀
   - ✅ 不应该出现 `nxlink.ai` 域名
   - ✅ 不应该有CORS错误

## 如果问题仍然存在

1. **检查localStorage**
   ```javascript
   // 在控制台执行
   Object.keys(localStorage).forEach(key => {
     const value = localStorage.getItem(key);
     if (value && value.includes('nxlink.ai')) {
       console.log(`发现错误配置: ${key} = ${value}`);
     }
   });
   ```

2. **检查网络请求**
   - 打开 Network 面板
   - 过滤 XHR 请求
   - 查看请求的完整URL

3. **临时禁用React.StrictMode**
   如果要验证是否是重复渲染的问题，可以临时修改 `src/main.tsx`：
   ```tsx
   // 注释掉 React.StrictMode
   ReactDOM.createRoot(document.getElementById('root')!).render(
     // <React.StrictMode>
       <ConfigProvider locale={zhCN}>
         <App />
       </ConfigProvider>
     // </React.StrictMode>,
   );
   ```

## 长期解决方案

1. **统一API配置管理**
   - 所有API基础URL都从 `apiConfig.ts` 读取
   - 不在代码中硬编码任何域名

2. **使用环境变量**
   ```bash
   # .env.development
   VITE_API_BASE_URL=https://nxlink.nxcloud.com
   
   # .env.production
   VITE_API_BASE_URL=https://nxlink.nxcloud.com
   ```

3. **完善错误处理**
   - 为所有API请求添加统一的错误处理
   - 提供用户友好的错误提示