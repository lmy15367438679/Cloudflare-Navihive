// src/API/ai.ts
// AI 辅助功能共享类型与常量（密钥在服务端 AES-256-GCM 加密存储，前端仅能看到掩码）

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AISettings {
  /** 是否启用 AI 辅助（对应 configs['ai.enabled']） */
  enabled: boolean;
  /** OpenAI 兼容接口 Base URL，例如 https://api.openai.com/v1 */
  baseUrl: string;
  /** 模型名称，例如 gpt-4o-mini / deepseek-chat */
  model: string;
  /** 自定义系统提示词（可留空，使用内置默认值） */
  systemPrompt: string;
  /** 服务端是否已保存 API 密钥（明文绝不回传） */
  hasKey: boolean;
  /** 已保存密钥的掩码，例如 sk-****abcd */
  maskedKey?: string;
}

export interface AISettingsInput {
  enabled?: boolean;
  baseUrl?: string;
  model?: string;
  systemPrompt?: string;
  /** 留空 / 未提供表示保持已保存的密钥不变 */
  apiKey?: string;
}

export interface AIChatResponse {
  success: boolean;
  reply?: string;
  model?: string;
  message?: string;
}

/** 内置默认系统提示词：让 AI 作为本导航站的管家式助手 */
export const DEFAULT_AI_SYSTEM_PROMPT =
  '你是「NaviHive 导航站」的智能助手。你的职责包括：帮助用户使用本站（搜索、收藏、分组管理）；推荐有价值的网站与工具，并给出简短理由；解答导航与效率工具相关的问题。回答请使用简体中文，保持简洁友好，必要时可用列表。';
