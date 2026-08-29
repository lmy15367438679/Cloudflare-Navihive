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
  /** 默认模型名称（模型列表第一个），例如 gpt-4o-mini */
  model: string;
  /** 多模型列表（同一 Base URL 下，访客可在对话中自由切换） */
  models: string[];
  /** 自定义系统提示词（可留空，使用内置默认值） */
  systemPrompt: string;
  /** 是否启用 AI 技能（函数调用：站点检索/分组查询/站内推荐）；上游不支持时自动降级 */
  toolsEnabled: boolean;
  /** 对话上下文 Token 预算（1000–8000），超出部分的历史消息将被截断以节省 token */
  tokenBudget: number;
  /** 服务端是否已保存 API 密钥（明文绝不回传） */
  hasKey: boolean;
  /** 已保存密钥的掩码，例如 sk-****abcd */
  maskedKey?: string;
}

export interface AISettingsInput {
  enabled?: boolean;
  baseUrl?: string;
  /** 默认模型名称（可选，未提供时服务端使用模型列表第一个） */
  model?: string;
  /** 多模型列表；提供时将整体覆盖服务端已保存的列表 */
  models?: string[];
  systemPrompt?: string;
  /** 是否启用 AI 技能（函数调用）；默认开启 */
  toolsEnabled?: boolean;
  /** 对话上下文 Token 预算（1000–8000），用于截断历史节省 token */
  tokenBudget?: number;
  /** 留空 / 未提供表示保持已保存的密钥不变 */
  apiKey?: string;
}

export interface AIChatResponse {
  success: boolean;
  reply?: string;
  model?: string;
  /** 本次回答实际调用过的技能名（例如 search_sites / list_groups） */
  skillsUsed?: string[];
  message?: string;
}

/** 内置默认系统提示词：让 AI 作为本导航站的管家式助手（含技能说明与省 token 约束） */
export const DEFAULT_AI_SYSTEM_PROMPT =
  '你是「NaviHive 导航站」的智能管家助手。你的职责：帮助用户使用本站（搜索、收藏、分组管理）；基于本站站点库推荐有价值的网站与工具并给出简短理由；解答导航与效率工具相关问题。\n' +
  '技能使用：涉及站内具体站点、分组或推荐时，优先调用技能（search_sites / get_group_sites / get_site_rankings / list_groups）查询真实数据，不要编造不存在的站点或链接；技能未返回结果时如实告知。\n' +
  '回答风格：使用简体中文；保持简洁——普通问题控制在 120 字以内，能用要点就不用大段；直接给出答案，不复述问题，不输出“好的/当然”等冗余开场白。';
