# 11Labs 参数转换工具示例

## 什么是 11Labs 参数转换工具？

这是一个集成在供应商应用管理页面中的转换工具，用于将 11Labs 原生的音色 (Voice) 参数格式转换为系统内部的 VendorEleven11LabsParams 格式。

## 功能演示

### 示例 1: 完整的 Voices 对象转换

**输入 (从 11labs-origin-voice-list.json):**
```json
{
  "voices": [
    {
      "voice_id": "ajOR9IDAaubDK5qtLUqQ",
      "name": "Daniela - Friendly Host",
      "category": "professional",
      "labels": {
        "accent": "latin american",
        "descriptive": "upbeat",
        "age": "young",
        "gender": "female",
        "language": "es",
        "use_case": "social_media"
      },
      "description": "Energetic and engaging young female Spanish speaker...",
      "verified_languages": [
        {"language": "ko"},
        {"language": "ro"},
        {"language": "es"}
      ],
      "high_quality_base_model_ids": [
        "eleven_multilingual_v2",
        "eleven_turbo_v2_5",
        "eleven_v2_5_flash"
      ]
    }
  ]
}
```

**输出 (vendor-11labs-params.json 格式):**
```json
[
  {
    "id": "ajOR9IDAaubDK5qtLUqQ",
    "labels": {
      "accent": "latin american",
      "age": "young",
      "category": "professional",
      "descriptive": "upbeat",
      "description": "Energetic and engaging young female Spanish speaker...",
      "gender": "female",
      "languages": ["ko", "ro", "es"],
      "use_case": "social_media"
    },
    "name": "Daniela - Friendly Host",
    "similarityBoost": "",
    "stability": "",
    "speed": "",
    "model_list": [
      "eleven_multilingual_v2",
      "eleven_turbo_v2_5",
      "eleven_v2_5_flash"
    ]
  }
]
```

### 示例 2: 单个 Voice 对象转换

**输入:**
```json
{
  "voice_id": "Wl3O9lmFSMgGFTTwuS6f",
  "name": "Martin Alvarez",
  "category": "professional",
  "labels": {
    "accent": "latin american",
    "descriptive": "confident",
    "age": "middle_aged",
    "gender": "male",
    "language": "es",
    "use_case": "narrative_story"
  },
  "description": "Casual and conversational adult male tone in Spanish..."
}
```

**输出:**
```json
[
  {
    "id": "Wl3O9lmFSMgGFTTwuS6f",
    "labels": {
      "accent": "latin american",
      "age": "middle_aged",
      "category": "professional",
      "descriptive": "confident",
      "description": "Casual and conversational adult male tone in Spanish...",
      "gender": "male",
      "languages": ["es"],
      "use_case": "narrative_story"
    },
    "name": "Martin Alvarez",
    "similarityBoost": "",
    "stability": "",
    "speed": "",
    "model_list": []
  }
]
```

### 示例 3: Voice 数组转换

**输入:**
```json
[
  {
    "voice_id": "voice1",
    "name": "Voice 1",
    "labels": {"gender": "female"}
  },
  {
    "voice_id": "voice2",
    "name": "Voice 2",
    "labels": {"gender": "male"}
  }
]
```

**输出:**
```json
[
  {
    "id": "voice1",
    "labels": {
      "accent": "",
      "age": "",
      "category": "",
      "descriptive": "",
      "description": "",
      "gender": "female",
      "languages": [],
      "use_case": ""
    },
    "name": "Voice 1",
    "similarityBoost": 0.35,
    "stability": 0.5,
    "speed": 1,
    "model_list": []
  },
  {
    "id": "voice2",
    "labels": {
      "accent": "",
      "age": "",
      "category": "",
      "descriptive": "",
      "description": "",
      "gender": "male",
      "languages": [],
      "use_case": ""
    },
    "name": "Voice 2",
    "similarityBoost": 0.35,
    "stability": 0.5,
    "speed": 1,
    "model_list": []
  }
]
```

### 示例 4: 模型分组转换（关键功能 🎯）

**输入（单个 Voice 对象）:**
```json
{
  "voice_id": "ajOR9IDAaubDK5qtLUqQ",
  "name": "Daniela - Friendly Host",
  "labels": {"gender": "female"},
  "high_quality_base_model_ids": [
    "eleven_turbo_v2_5",
    "eleven_v2_5_flash",
    "eleven_flash_v2_5",
    "eleven_multilingual_sts_v2",
    "eleven_multilingual_v2"
  ]
}
```

**输出（自动分成 2 条记录）:**

记录 1（非 multilingual 模型）:
```json
{
  "id": "ajOR9IDAaubDK5qtLUqQ",
  "name": "Daniela - Friendly Host",
  "labels": { ... },
  "similarityBoost": 0.35,
  "stability": 0.5,
  "speed": 1,
  "model_list": [
    "eleven_turbo_v2_5",
    "eleven_v2_5_flash",
    "eleven_flash_v2_5"
  ]
}
```

记录 2（multilingual 模型，名称自动加后缀）:
```json
{
  "id": "ajOR9IDAaubDK5qtLUqQ",
  "name": "Daniela - Friendly Host - multilingual",
  "labels": { ... },
  "similarityBoost": 0.35,
  "stability": 0.5,
  "speed": 1,
  "model_list": [
    "eleven_multilingual_sts_v2",
    "eleven_multilingual_v2"
  ]
}
```

## 使用步骤

### 步骤 1: 进入工具
1. 打开应用 → 供应商应用管理
2. 点击 "11Labs参数转换" 标签页

### 步骤 2: 导入 JSON
1. 复制 11Labs 导出的 JSON 数据
2. 粘贴到左侧的文本框
3. 点击 "转换" 按钮

### 步骤 3: 查看和下载结果
- ✅ **下载 JSON 文件**: 自动下载 vendor-11labs-params.json
- ✅ **复制到剪贴板**: 复制转换后的 JSON 文本
- ✅ **查看源数据**: 查看原始的 11Labs 数据
- ✅ **查看转换结果表格**: 分页查看所有转换后的音色参数
- ✅ **JSON 预览**: 查看完整的 JSON 格式

## 字段映射对照表

| 11Labs 原始字段 | → | 转换后字段 | 说明 |
|---|---|---|---|
| `voice_id` | → | `id` | 音色的唯一标识符 |
| `name` | → | `name` | 音色名称 |
| `category` | → | `labels.category` | 音色分类（如 professional） |
| `labels.accent` | → | `labels.accent` | 口音特征 |
| `labels.descriptive` | → | `labels.descriptive` | 风格描述 |
| `labels.age` | → | `labels.age` | 年龄特征 |
| `labels.gender` | → | `labels.gender` | 性别 |
| `labels.language` | → | `labels.languages[0]` | 主语言转为数组 |
| `verified_languages[].language` | → | `labels.languages[]` | 所有验证过的语言 |
| `labels.use_case` | → | `labels.use_case` | 使用场景 |
| `description` | → | `labels.description` | 音色描述 |
| `high_quality_base_model_ids[]` | → | `model_list[]` | 支持的模型列表 |
| - | → | `similarityBoost` | 留空（可后续配置） |
| - | → | `stability` | 留空（可后续配置） |
| - | → | `speed` | 留空（可后续配置） |

## 实际应用场景

### 场景 1: 从 11Labs 批量导入音色到系统

1. 登录 11Labs 官网
2. 导出所有音色的 JSON 列表
3. 在本工具中粘贴 JSON 数据
4. 点击转换
5. 点击 "下载 JSON 文件"
6. 将下载的文件导入到系统数据库

### 场景 2: 实时转换单个音色参数

1. 获取某个音色的 JSON 对象
2. 粘贴到工具中
3. 转换后复制结果
4. 粘贴到其他系统使用

### 场景 3: 验证和检查转换质量

1. 粘贴原始数据
2. 在表格中查看转换后的各个字段
3. 在 "查看源数据" 中对比原始数据
4. 确保没有遗漏重要信息

## 支持的格式总结

✅ **完整的 Voices 对象** - `{ "voices": [...] }`
✅ **Voice 数组** - `[{...}, {...}]`
✅ **单个 Voice 对象** - `{...}`

## 常见问题

### Q: 转换后的空字段（如 similarityBoost）是什么意思？
A: 这些字段在 11Labs 数据中没有对应值，可以根据业务需求后续填充。

### Q: 可以转换多少条音色数据？
A: 建议不超过 1000 条，系统会在前端快速处理。

### Q: 转换过程需要上传服务器吗？
A: 不需要，所有转换都在浏览器前端完成，数据不会上传。

### Q: 如果 JSON 格式错误会怎样？
A: 工具会显示错误提示，检查 JSON 的括号和引号是否正确。

## 相关资源

- 📄 完整文档: `docs/11labs-params-converter-guide.md`
- 📁 源代码: 
  - `src/utils/elevenLabsConverter.ts` - 转换逻辑
  - `src/components/ElevenLabsParamsConverter.tsx` - React 组件
  - `src/pages/VendorAppManagementPage.tsx` - 主页面集成

## 版本信息

- **版本**: 1.0
- **发布日期**: 2025-10-23
- **支持格式**: vendor-11labs-params.json
