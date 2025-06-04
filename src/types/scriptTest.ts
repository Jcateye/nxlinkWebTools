// 话术测试系统类型定义

// TTS提供商
export enum TTSProvider {
  VOLCANO = 'volcano',  // 火山引擎
  ELEVENLABS = 'elevenlabs'  // 11labs
}

// 对话角色
export enum DialogueRole {
  CUSTOMER = 'customer',
  AGENT = 'agent'
}

// 对话行
export interface DialogueLine {
  id: string;         // 唯一ID
  role: DialogueRole; // 对话角色
  content: string;    // 对话内容
  expectation?: boolean; // 是否符合预期
  audioUrl?: string;  // 音频URL
  ttsProvider?: TTSProvider; // 使用的TTS提供商
  isPlaying?: boolean;
}

// 测试案例
export interface TestCase {
  id: string;           // 唯一ID
  name: string;         // 案例名称
  description?: string; // 案例描述
  dialogues: DialogueLine[]; // 对话行
}

// 测试任务
export interface TestTask {
  id: string;           // 唯一ID
  name: string;         // 任务名称
  description?: string; // 任务描述
  createdAt: string;    // 创建时间
  updatedAt: string;    // 更新时间
  cases: TestCase[];    // 测试案例
} 