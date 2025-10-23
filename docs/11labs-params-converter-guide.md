# 11Labs 参数转换工具使用指南

## 功能概述

11Labs 参数转换工具是供应商应用管理模块中的一个新功能，用于将 11Labs 原生 Voice 参数格式转换为系统内部的供应商参数格式。

## 访问方式

1. 进入应用主菜单 → **供应商应用管理**
2. 在 Tab 栏找到 **"11Labs参数转换"** 标签页
3. 点击进入转换工具界面

## 功能特性

### 支持的输入格式

工具支持以下三种 JSON 格式：

#### 1. 完整的 Voices 对象格式
```json
{
  "voices": [
    {
      "voice_id": "xxx",
      "name": "xxx",
      "category": "professional",
      "labels": {
        "accent": "latin american",
        "descriptive": "upbeat",
        "age": "young",
        "gender": "female",
        "language": "es",
        "use_case": "social_media"
      },
      "description": "...",
      "verified_languages": [...],
      "high_quality_base_model_ids": [...]
    }
  ]
}
```

#### 2. Voice 数组格式
```json
[
  {
    "voice_id": "xxx",
    "name": "xxx",
    ...
  },
  {
    "voice_id": "yyy",
    "name": "yyy",
    ...
  }
]
```

#### 3. 单个 Voice 对象格式
```json
{
  "voice_id": "xxx",
  "name": "xxx",
  ...
}
```

## 使用步骤

### 步骤 1: 导入 JSON 数据

1. 从 11Labs 导出 Voice 列表的 JSON 数据
2. 复制 JSON 文本内容
3. 粘贴到工具中的 **"导入 11Labs JSON 数据"** 文本框
4. 点击 **"转换"** 按钮

### 步骤 2: 查看和下载结果

转换成功后，工具会显示：

#### 转换结果摘要
- 显示成功转换的数据条数
- 显示转换完成的提示信息

#### 操作按钮
- **下载 JSON 文件**: 将转换后的参数下载为 `vendor-11labs-params.json` 文件
- **复制到剪贴板**: 将转换后的 JSON 复制到剪贴板，方便粘贴使用
- **查看源数据**: 在抽屉窗口查看转换前的原始数据

#### 数据展示表格

| 列 | 说明 |
|-----|------|
| ID | 转换后的音色 ID（原 voice_id） |
| 名称 | 音色名称 |
| 标签 | 风格、性别、年龄、口音、用途等标签信息 |
| 语言列表 | 支持的语言代码列表 |
| 模型列表 | 支持的模型 ID 列表 |

#### JSON 预览
- 实时显示转换后的完整 JSON 格式
- 可复制内容用于其他用途

## 转换规则

### 字段映射关系

| 11Labs 原始字段 | 转换目标字段 | 说明 |
|-----------------|-------------|------|
| `voice_id` | `id` | 音色唯一标识 |
| `name` | `name` | 音色名称 |
| `category` | `labels.category` | 音色分类 |
| `labels.accent` | `labels.accent` | 口音 |
| `labels.descriptive` | `labels.descriptive` | 风格描述 |
| `labels.age` | `labels.age` | 年龄 |
| `labels.gender` | `labels.gender` | 性别 |
| `labels.language` | `labels.languages[0]` | 主要语言（转为数组） |
| `verified_languages[*].language` | `labels.languages[]` | 所有验证过的语言 |
| `labels.use_case` | `labels.use_case` | 使用场景 |
| `description` | `labels.description` | 音色描述 |
| `high_quality_base_model_ids[]` | `model_list[]` | 支持的模型列表（按类型分组） |

### 特殊处理规则

1. **语言字段处理**
   - 优先从 `verified_languages` 数组中提取所有语言代码
   - 如果没有 `verified_languages`，则使用 `labels.language` 作为单个语言
   - 转换后存储为 `labels.languages` 数组格式

2. **参数值处理**
   - `similarityBoost`: 固定值 **0.35**
   - `stability`: 固定值 **0.5**
   - `speed`: 固定值 **1**

3. **模型列表分组处理**（关键功能）
   - **按模型类型自动分组**：如果一条音色数据的模型列表中同时包含 `multilingual` 和非 `multilingual` 模型
   - **生成多条数据**：会自动分成两条独立的数据记录
   - **命名规则**：
     - 包含非 multilingual 模型的记录：使用原始名称
     - 包含 multilingual 模型的记录：在名称后附加 **" - multilingual"** 后缀
   - **例子**：
     - 原始数据：音色名为 "Daniela"，模型列表包含 `["eleven_turbo_v2_5", "eleven_multilingual_v2", "eleven_v2_5_flash"]`
     - 转换结果：
       - 记录 1：名称 "Daniela"，模型列表 `["eleven_turbo_v2_5", "eleven_v2_5_flash"]`
       - 记录 2：名称 "Daniela - multilingual"，模型列表 `["eleven_multilingual_v2"]`

## 应用场景

### 场景 1: 批量导入 11Labs 音色
1. 从 11Labs 平台导出所有 Voice 的 JSON 数据
2. 使用本工具转换为系统格式
3. 下载转换后的 JSON 文件
4. 导入到系统数据库

### 场景 2: 单个音色参数转换
1. 粘贴单个 Voice 的 JSON 对象
2. 转换获得对应的系统参数格式
3. 复制转换后的内容到其他系统

### 场景 3: 验证转换结果
1. 粘贴原始数据
2. 点击"查看源数据"查看原始内容
3. 在转换结果表格中核实所有字段

## 错误处理

### 常见错误

| 错误提示 | 原因 | 解决方案 |
|--------|------|--------|
| JSON 解析失败 | JSON 格式不正确 | 检查 JSON 的括号、引号等格式 |
| 不支持的 JSON 格式 | 输入数据不符合支持的三种格式 | 确保数据包含 `voice_id` 字段或 `voices` 数组 |
| 没有可下载的数据 | 转换失败或没有执行转换 | 先成功转换数据再下载 |

### 调试技巧

1. **查看源数据**: 使用"查看源数据"功能验证输入数据是否正确解析
2. **检查 JSON 格式**: 在 JSON 预览中查看转换后的完整格式
3. **分页查看**: 使用表格分页功能查看所有转换后的数据

## 性能考虑

- 支持批量转换数百条 Voice 数据
- 建议单次转换数据不超过 1000 条以确保性能
- 转换过程在前端完成，不占用服务器资源

## 相关文件

- 转换工具函数: `src/utils/elevenLabsConverter.ts`
- React 组件: `src/components/ElevenLabsParamsConverter.tsx`
- 集成页面: `src/pages/VendorAppManagementPage.tsx`

## 技术细节

### 转换流程

```
输入 JSON → 解析 → 验证格式 → 提取 Voice 对象 → 字段映射 → 输出 JSON
```

### 支持的语言代码

系统支持所有标准语言代码，包括但不限于：
- `es` - 西班牙语
- `en` - 英语
- `ko` - 韩语
- `ro` - 罗马尼亚语
- `nl` - 荷兰语
- `id` - 印尼语
- 等其他 ISO 639-1 语言代码

## 常见问题 (FAQ)

### Q: 转换后的数据可以直接在系统中使用吗？
A: 转换后的数据格式符合系统的 VendorEleven11LabsParams 结构，但还需要根据具体业务逻辑进行额外的验证和处理。

### Q: 支持修改转换后的数据吗？
A: 当前版本的 JSON 预览框是只读的。如果需要修改，可以复制内容到文本编辑器修改后重新导入。

### Q: 转换过程中会丢失数据吗？
A: 转换过程中只提取必要的字段进行映射，11Labs 原始数据中的其他字段不会被保留。

### Q: 如何批量处理多个 Voice 文件？
A: 可以多次使用本工具，每次导入不同的 JSON 文件，分别下载转换结果。

## 版本历史

### v1.0 (2025-10-23)
- 初始版本发布
- 支持三种 JSON 输入格式
- 完整的参数转换和下载功能
- 详细的数据展示和预览

## 反馈和改进建议

如有任何问题或建议，欢迎提交 Issue 或进行改进。
