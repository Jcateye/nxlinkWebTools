# 🚀 11Labs 参数转换工具 - 快速开始指南

## 一句话描述
在供应商应用管理页面中，有一个新的 **"11Labs参数转换"** 标签页，可以将 11Labs 原生 JSON 一键转换为系统格式。

---

## ⚡ 最快上手方式

### 1️⃣ 进入工具
```
应用主菜单 → 供应商应用管理 → 11Labs参数转换 标签页
```

### 2️⃣ 导入数据
1. 从 11Labs 复制 JSON 文本
2. 粘贴到左侧的大文本框
3. 点击 **"转换"** 按钮

### 3️⃣ 获取结果
- **📥 下载**: 点击 "下载JSON文件" 获取 `vendor-11labs-params.json`
- **📋 复制**: 点击 "复制到剪贴板" 复制转换后的 JSON
- **👀 预览**: 查看转换结果表格和 JSON 预览

---

## 📝 支持的输入格式

### ✅ 格式 1: 完整的 Voices 对象
```json
{
  "voices": [
    { "voice_id": "xxx", "name": "xxx", ... },
    { "voice_id": "yyy", "name": "yyy", ... }
  ]
}
```

### ✅ 格式 2: Voice 数组
```json
[
  { "voice_id": "xxx", "name": "xxx", ... },
  { "voice_id": "yyy", "name": "yyy", ... }
]
```

### ✅ 格式 3: 单个 Voice 对象
```json
{
  "voice_id": "xxx",
  "name": "xxx",
  ...
}
```

---

## 🔄 转换示例

### 输入
```json
{
  "voice_id": "ajOR9IDAaubDK5qtLUqQ",
  "name": "Daniela",
  "category": "professional",
  "labels": {
    "accent": "latin american",
    "descriptive": "upbeat",
    "age": "young",
    "gender": "female",
    "language": "es"
  }
}
```

### 输出
```json
[
  {
    "id": "ajOR9IDAaubDK5qtLUqQ",
    "name": "Daniela",
    "labels": {
      "accent": "latin american",
      "age": "young",
      "category": "professional",
      "descriptive": "upbeat",
      "gender": "female",
      "languages": ["es"],
      "use_case": "social_media"
    },
    "similarityBoost": 0.35,
    "stability": 0.5,
    "speed": 1,
    "model_list": []
  }
]
```

---

## 🎯 常见用途

### 场景 1: 批量导入音色
```
11Labs 导出 → 粘贴到工具 → 转换 → 下载文件 → 导入系统
```

### 场景 2: 单个转换
```
复制 Voice JSON → 粘贴 → 转换 → 复制结果 → 使用
```

### 场景 3: 验证数据
```
粘贴数据 → 查看源数据 → 对比转换结果 → 确认无误
```

### 场景 4: 按模型类型分离（自动功能）
系统会自动将包含 multilingual 模型的音色分离成独立记录
```
原始音色 (Daniela) 
  ↓
自动分组
  ├─ Daniela (非 multilingual 模型)
  └─ Daniela - multilingual (multilingual 模型)
```

---

## ⚙️ 快速参考

| 操作 | 按钮名称 | 功能 |
|------|--------|------|
| 开始转换 | **转换** | 将 JSON 转换为系统格式 |
| 清空输入 | **清空** | 清除输入文本和结果 |
| 导出结果 | **下载JSON文件** | 下载为 vendor-11labs-params.json |
| 快速复制 | **复制到剪贴板** | 复制转换后的 JSON |
| 查看原始 | **查看源数据** | 在弹窗查看原始 11Labs 数据 |

---

## 🆘 遇到问题？

### ❌ "JSON 解析失败"
**原因**: JSON 格式不正确
**解决**: 检查 JSON 的大括号 `{}` 和引号 `""` 是否配对

### ❌ "不支持的 JSON 格式"
**原因**: 数据格式不是上述三种之一
**解决**: 确保数据包含 `voice_id` 字段或 `voices` 数组

### ❌ "没有可下载的数据"
**原因**: 还未成功转换或转换失败
**解决**: 先粘贴 JSON 并点击"转换"按钮

---

## 💡 最佳实践

✅ **DO**
- 一次导入 100-1000 条数据
- 点击"查看源数据"验证导入的数据
- 下载后再上传到系统

❌ **DON'T**
- 粘贴非 JSON 格式的内容
- 手动修改页面上的结果（应下载后再改）
- 一次导入超过 5000 条数据

---

## 📚 更多资源

| 文档 | 说明 |
|------|------|
| `FEATURE_11LABS_CONVERTER.md` | 功能完整说明 |
| `docs/11labs-params-converter-guide.md` | 详细使用指南 |
| `apiDemo/vendorApp/11labs-converter-example.md` | 示例和对照表 |

---

## 🎓 学习路径

1. **新手**: 阅读本文档的"最快上手方式"
2. **初级**: 跟随"常见用途"中的场景操作
3. **中级**: 查看"转换示例"理解字段映射
4. **高级**: 阅读 `docs/11labs-params-converter-guide.md` 的完整文档

---

## ✨ 核心卖点

- 🎯 **一键转换** - 复制粘贴即可完成
- 📊 **批量处理** - 支持数百条数据
- 💾 **三种导出** - 下载/复制/预览
- 🔍 **数据对比** - 源数据和结果对比
- ⚡ **零延迟** - 前端处理，即时转换

---

**最后更新**: 2025-10-23
**版本**: 1.0
**分钟级掌握**: ⏱️ 约 5 分钟
