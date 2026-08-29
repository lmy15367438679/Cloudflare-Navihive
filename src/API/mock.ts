import { Group, Site, LoginResponse, ExportData, ImportResult, GroupWithSites } from './http';
import { AIMessage, AISettings, AISettingsInput, AIChatResponse } from './ai';

// 模拟数据
const mockGroups: Group[] = [
  {
    id: 1,
    name: '常用工具',
    order_num: 1,
    is_public: 1, // 公开分组
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: '开发资源',
    order_num: 2,
    is_public: 1, // 公开分组
    created_at: '2024-01-01T20:00:00Z',
    updated_at: '2024-01-01T30:00:00Z',
  },
  {
    id: 3,
    name: '私密分组',
    order_num: 3,
    is_public: 0, // 私密分组（仅管理员可见）
    created_at: '2024-01-01T40:00:00Z',
    updated_at: '2024-01-01T50:00:00Z',
  },
];

const mockSites: Site[] = [
  {
    id: 1,
    group_id: 1,
    name: 'Google',
    url: 'https://www.google.com',
    icon: 'https://img.zhengmi.org/file/1742480539412_微信图片_20240707011628.jpg',
    description: '搜索引擎',
    notes: '',
    order_num: 1,
    is_public: 1, // 公开站点
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    group_id: 1,
    name: 'GitHub',
    url: 'https://github.com',
    icon: 'https://img.zhengmi.org/file/1742480539412_微信图片_20240707011628.jpg',
    description: '代码托管平台',
    notes: '',
    order_num: 2,
    is_public: 1, // 公开站点
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    group_id: 1,
    name: '私密书签',
    url: 'https://private.example.com',
    icon: 'https://img.zhengmi.org/file/1742480539412_微信图片_20240707011628.jpg',
    description: '私密站点（仅管理员可见）',
    notes: '',
    order_num: 3,
    is_public: 0, // 私密站点
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 4,
    group_id: 2,
    name: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    icon: 'github.png',
    description: '技术问答社区',
    notes: '',
    order_num: 1,
    is_public: 1, // 公开站点
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 5,
    group_id: 3,
    name: '内部工具',
    url: 'https://internal.example.com',
    icon: 'github.png',
    description: '公司内部工具',
    notes: '',
    order_num: 1,
    is_public: 1, // 公开站点（但属于私密分组）
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// 添加模拟配置数据
const mockConfigs: Record<string, string> = {
  'site.title': '我的导航站',
  'site.name': '个人导航',
  'site.customCss': '',
  'site.glassEffect': 'true',
  // 与前端 DEFAULT_CONFIGS 保持一致
  'site.particlesEnabled': 'false',
  'site.backgroundBlur': 'false',
  'site.cardAnimation': 'false',
  'site.smoothScroll': 'false',
  'site.reduceMotion': 'false',
  'site.compactMode': 'false',
  'site.lazyLoadImages': 'false',
  'site.imageCache': 'false',
  // AI 相关（与 App.tsx DEFAULT_CONFIGS 保持一致）
  'ai.enabled': 'false',
  'ai.models': '[]',
  'ai.toolsEnabled': 'true',
  'ai.tokenBudget': '2600',
};

// 模拟API实现
export class MockNavigationClient {
  private token: string | null = null;
  public isAuthenticated: boolean = false; // 公开认证状态

  constructor() {
    // 从本地存储加载令牌
    if (typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      this.isAuthenticated = !!this.token;
    }
  }

  // 检查是否已登录
  isLoggedIn(): boolean {
    return !!this.token;
  }

  // 设置认证令牌
  setToken(token: string): void {
    this.token = token;
    this.isAuthenticated = true;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // 清除认证令牌
  clearToken(): void {
    this.token = null;
    this.isAuthenticated = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // 登录API
  async login(
    username: string,
    _password: string, // Mock 环境不验证密码，参数保留以保持接口一致
    rememberMe: boolean = false
  ): Promise<LoginResponse> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    // 模拟登录验证逻辑 - 在Mock环境中任何账号密码都能登录

    const token = btoa(`${username}:${new Date().getTime()}:${rememberMe}`);

    this.setToken(token);

    return {
      success: true,
      token: token,
      message: `登录成功(模拟环境)${rememberMe ? '，已记住登录状态' : ''}`,
    };
  }

  // 登出
  logout(): void {
    this.clearToken();
  }

  // 检查身份验证状态
  async checkAuthStatus(): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 模拟真实环境中的行为：如果有token则认为已认证
    if (this.token) {
      return true;
    }

    // 开发环境中，也可以设置为总是返回true，便于开发
    // return true;

    // 没有token则需要登录
    return false;
  }

  // 检查认证是否已启用
  async isAuthEnabled(): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Mock 环境中默认启用认证
    return true;
  }

  async getGroups(): Promise<Group[]> {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 根据认证状态过滤分组
    if (!this.isAuthenticated) {
      return mockGroups.filter((g) => g.is_public === 1);
    }
    return [...mockGroups];
  }

  // 获取所有分组及其站点 (使用 JOIN 优化,避免 N+1 查询)
  async getGroupsWithSites(): Promise<GroupWithSites[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    let groups = [...mockGroups];
    let sites = [...mockSites];

    // 根据认证状态过滤
    if (!this.isAuthenticated) {
      // 访客只能看到公开分组下的公开站点
      groups = groups.filter((g) => g.is_public === 1);
      const publicGroupIds = groups.map((g) => g.id!);
      sites = sites.filter(
        (site) => site.is_public === 1 && publicGroupIds.includes(site.group_id)
      );
    }

    // 组合分组和站点
    return groups.map((group) => ({
      ...group,
      id: group.id!, // 确保 id 存在
      sites: sites.filter((site) => site.group_id === group.id),
    }));
  }

  async getGroup(id: number): Promise<Group | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockGroups.find((g) => g.id === id) || null;
  }

  async createGroup(group: Group): Promise<Group> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const newGroup = {
      ...group,
      id: Math.max(0, ...mockGroups.map((g) => g.id || 0)) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockGroups.push(newGroup);
    return newGroup;
  }

  async updateGroup(id: number, group: Partial<Group>): Promise<Group | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const index = mockGroups.findIndex((g) => g.id === id);
    if (index === -1) return null;

    const existing = mockGroups[index];
    if (!existing) return null;

    mockGroups[index] = {
      ...existing,
      ...group,
      updated_at: new Date().toISOString(),
    };
    const updated = mockGroups[index];
    return updated || null;
  }

  async deleteGroup(id: number): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const index = mockGroups.findIndex((g) => g.id === id);
    if (index === -1) return false;

    mockGroups.splice(index, 1);
    return true;
  }

  async getSites(groupId?: number): Promise<Site[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    let sites = [...mockSites];

    // 根据认证状态过滤站点
    if (!this.isAuthenticated) {
      // 访客只能看到公开分组下的公开站点
      const publicGroupIds = mockGroups.filter((g) => g.is_public === 1).map((g) => g.id);

      sites = sites.filter(
        (site) => site.is_public === 1 && publicGroupIds.includes(site.group_id)
      );
    }

    // 按分组过滤
    if (groupId) {
      return sites.filter((site) => site.group_id === groupId);
    }

    return sites;
  }

  // 实现其他方法，与NavigationClient保持一致的接口...
  async getSite(id: number): Promise<Site | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockSites.find((s) => s.id === id) || null;
  }

  async createSite(site: Site): Promise<Site> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const newSite = {
      ...site,
      id: Math.max(0, ...mockSites.map((s) => s.id || 0)) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockSites.push(newSite);
    return newSite;
  }

  async updateSite(id: number, site: Partial<Site>): Promise<Site | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const index = mockSites.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const existing = mockSites[index];
    if (!existing) return null;

    mockSites[index] = {
      ...existing,
      ...site,
      updated_at: new Date().toISOString(),
    };
    const updated = mockSites[index];
    return updated || null;
  }

  async deleteSite(id: number): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const index = mockSites.findIndex((s) => s.id === id);
    if (index === -1) return false;

    mockSites.splice(index, 1);
    return true;
  }

  async updateGroupOrder(groupOrders: { id: number; order_num: number }[]): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    for (const order of groupOrders) {
      const index = mockGroups.findIndex((g) => g.id === order.id);
      if (index !== -1) {
        const group = mockGroups[index];
        if (group) {
          group.order_num = order.order_num;
        }
      }
    }
    return true;
  }

  async updateSiteOrder(siteOrders: { id: number; order_num: number }[]): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    for (const order of siteOrders) {
      const index = mockSites.findIndex((s) => s.id === order.id);
      if (index !== -1) {
        const site = mockSites[index];
        if (site) {
          site.order_num = order.order_num;
        }
      }
    }
    return true;
  }

  // 配置相关API
  async getConfigs(): Promise<Record<string, string>> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { ...mockConfigs };
  }

  async getConfig(key: string): Promise<string | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockConfigs[key] || null;
  }

  async setConfig(key: string, value: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    mockConfigs[key] = value;
    return true;
  }

  async deleteConfig(key: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (key in mockConfigs) {
      delete mockConfigs[key];
      return true;
    }
    return false;
  }

  // 数据导出
  async exportData(): Promise<ExportData> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      groups: [...mockGroups],
      sites: [...mockSites],
      configs: { ...mockConfigs },
      version: '1.0',
      exportDate: new Date().toISOString(),
    };
  }

  // ========== 新增功能 API ==========

  // 链接检测
  async checkLinks(urls: string[]): Promise<{ success: boolean; results: any[] }> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    // 模拟检测结果
    const results = urls.map((url) => ({
      url,
      status: Math.random() > 0.2 ? ('ok' as const) : ('error' as const),
      statusCode: Math.random() > 0.2 ? 200 : 404,
      duration: Math.floor(Math.random() * 500) + 100,
    }));
    return { success: true, results };
  }

  // 书签脚本添加站点
  async bookmarkletAdd(data: {
    name: string;
    url: string;
    icon?: string;
    description?: string;
    group_id?: number;
  }): Promise<{ success: boolean; site?: Site; message?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const newSite: Site = {
      id: Math.max(0, ...mockSites.map((s) => s.id || 0)) + 1,
      group_id: data.group_id || 1,
      name: data.name,
      url: data.url,
      icon: data.icon || '',
      description: data.description || '',
      notes: '',
      order_num: mockSites.filter((s) => s.group_id === (data.group_id || 1)).length,
      is_public: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockSites.push(newSite);
    return { success: true, site: newSite };
  }

  // 移动单个站点到其他分组（跨组拖拽）
  async moveSiteToGroup(
    siteId: number,
    targetGroupId: number
  ): Promise<{ success: boolean; site?: Site }> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const site = mockSites.find((s) => s.id === siteId);
    if (site) {
      site.group_id = targetGroupId;
      return { success: true, site };
    }
    return { success: false };
  }

  // 批量移动站点
  async batchMoveSites(
    siteIds: number[],
    targetGroupId: number
  ): Promise<{ success: boolean; moved: number }> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    let moved = 0;
    for (const siteId of siteIds) {
      const site = mockSites.find((s) => s.id === siteId);
      if (site) {
        site.group_id = targetGroupId;
        moved++;
      }
    }
    return { success: true, moved };
  }

  // 数据导入
  async importData(data: ExportData): Promise<ImportResult> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      // 统计信息
      const stats = {
        groups: {
          total: data.groups.length,
          created: 0,
          merged: 0,
        },
        sites: {
          total: data.sites.length,
          created: 0,
          updated: 0,
          skipped: 0,
        },
      };

      // 模拟合并处理
      // 为分组创建映射 - 旧ID到新ID
      const groupMap = new Map<number, number>();

      // 处理分组
      for (const importGroup of data.groups) {
        // 检查是否存在同名分组
        const existingGroupIndex = mockGroups.findIndex((g) => g.name === importGroup.name);

        if (existingGroupIndex >= 0) {
          // 已存在同名分组，添加到映射
          const existingGroup = mockGroups[existingGroupIndex];
          if (importGroup.id && existingGroup && existingGroup.id) {
            groupMap.set(importGroup.id, existingGroup.id);
          }
          stats.groups.merged++;
        } else {
          // 创建新分组
          const newId = Math.max(0, ...mockGroups.map((g) => g.id || 0)) + 1;
          const newGroup = {
            ...importGroup,
            id: newId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          mockGroups.push(newGroup);

          // 添加到映射
          if (importGroup.id) {
            groupMap.set(importGroup.id, newId);
          }
          stats.groups.created++;
        }
      }

      // 处理站点
      for (const importSite of data.sites) {
        // 获取新分组ID
        const newGroupId = groupMap.get(importSite.group_id);

        // 如果没有映射的分组ID，跳过该站点
        if (!newGroupId) {
          stats.sites.skipped++;
          continue;
        }

        // 检查是否有相同URL的站点在同一分组下
        const existingSiteIndex = mockSites.findIndex(
          (s) => s.group_id === newGroupId && s.url === importSite.url
        );

        if (existingSiteIndex >= 0) {
          // 更新现有站点
          const existingSite = mockSites[existingSiteIndex];
          if (existingSite) {
            mockSites[existingSiteIndex] = {
              ...existingSite,
              name: importSite.name,
              icon: importSite.icon,
              description: importSite.description,
              notes: importSite.notes,
              updated_at: new Date().toISOString(),
            };
            stats.sites.updated++;
          }
        } else {
          // 创建新站点
          const newId = Math.max(0, ...mockSites.map((s) => s.id || 0)) + 1;
          const newSite = {
            ...importSite,
            id: newId,
            group_id: newGroupId, // 使用新的分组ID
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          mockSites.push(newSite);
          stats.sites.created++;
        }
      }

      // 导入配置数据
      Object.entries(data.configs).forEach(([key, value]) => {
        mockConfigs[key] = value;
      });

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('模拟导入数据失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  // ========== AI 辅助（内存模拟，dev 模式无需真实加密） ==========

  // 模拟 AI 设置：明文仅存在于本机内存，不会与任何远端服务通信
  private mockAISettings: {
    enabled: boolean;
    baseUrl: string;
    model: string;
    models: string[];
    systemPrompt: string;
    toolsEnabled: boolean;
    tokenBudget: number;
    apiKey: string;
  } = {
    enabled: false,
    baseUrl: '',
    model: '',
    models: [],
    systemPrompt: '',
    toolsEnabled: true,
    tokenBudget: 2600,
    apiKey: '',
  };

  /**
   * 模拟「上游不支持函数调用」：置为 true 时 aiChat 会走降级路径
   * （等价于真实模式下上游对 tools 参数报错、worker 自动重试无工具 + 摘要注入）
   */
  private mockToolsUnsupported: boolean = false;

  async getAISettings(): Promise<AISettings> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const s = this.mockAISettings;
    return {
      enabled: s.enabled,
      baseUrl: s.baseUrl,
      model: s.model,
      models: s.models,
      systemPrompt: s.systemPrompt,
      toolsEnabled: s.toolsEnabled,
      tokenBudget: s.tokenBudget,
      hasKey: Boolean(s.apiKey),
      maskedKey: s.apiKey ? `****${s.apiKey.slice(-4)}` : '',
    };
  }

  async saveAISettings(data: AISettingsInput): Promise<{ success: boolean; message?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const s = this.mockAISettings;
    if (data.enabled !== undefined) s.enabled = data.enabled;
    if (data.baseUrl !== undefined) s.baseUrl = data.baseUrl.trim();
    if (data.systemPrompt !== undefined) s.systemPrompt = data.systemPrompt;
    // 模型列表整体覆盖：去空白 / 去空 / 去重，最多 20 个
    if (data.models !== undefined) {
      const seen = new Set<string>();
      const next: string[] = [];
      for (const raw of data.models) {
        const m = typeof raw === 'string' ? raw.trim() : '';
        if (m && !seen.has(m) && next.length < 20) {
          seen.add(m);
          next.push(m);
        }
      }
      s.models = next;
      // 未显式传默认模型时，列表第一个作为默认模型
      if (data.model === undefined) s.model = next[0] || '';
      if (data.model !== undefined) s.model = data.model.trim();
    } else if (data.model !== undefined) {
      s.model = data.model.trim();
      // 兼容旧数据：仅传单模型时自动初始化模型列表
      if (s.models.length === 0 && s.model) s.models = [s.model];
    }
    // 留空 = 保持已有密钥不变
    if (data.apiKey !== undefined && data.apiKey.trim() !== '') {
      s.apiKey = data.apiKey.trim();
    }
    if (data.toolsEnabled !== undefined) {
      s.toolsEnabled = data.toolsEnabled;
      mockConfigs['ai.toolsEnabled'] = data.toolsEnabled ? 'true' : 'false';
    }
    if (data.tokenBudget !== undefined && Number.isFinite(data.tokenBudget)) {
      s.tokenBudget = Math.min(8000, Math.max(1000, Math.round(data.tokenBudget)));
      mockConfigs['ai.tokenBudget'] = String(s.tokenBudget);
    }
    mockConfigs['ai.enabled'] = s.enabled ? 'true' : 'false';
    return { success: true, message: 'AI 设置已保存' };
  }

  async aiChat(messages: AIMessage[], model?: string): Promise<AIChatResponse> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (!this.mockAISettings.enabled || !this.mockAISettings.apiKey) {
      return { success: false, message: 'AI 尚未配置，请先在设置中填写 Base URL 与 API 密钥' };
    }
    const activeModel =
      model?.trim() || this.mockAISettings.model || this.mockAISettings.models[0] || 'mock';
    const last = messages[messages.length - 1];
    const userText = (last?.content ?? '').trim();

    // 技能总开关关闭：走「站点库摘要注入」兜底（与真实 worker 的知识注入路径一致）
    if (!this.mockAISettings.toolsEnabled) {
      return {
        success: true,
        reply: this.buildFallbackReply(userText, false),
        model: activeModel,
      };
    }

    // 模拟上游不支持函数调用：降级为「无工具 + 摘要注入」
    if (this.mockToolsUnsupported) {
      return {
        success: true,
        reply: this.buildFallbackReply(userText, true),
        model: activeModel,
        skillsUsed: [],
      };
    }

    const skill = this.detectSkill(userText);
    if (skill) {
      const rows = this.runMockSkill(skill.name, skill.args);
      return {
        success: true,
        reply: `（模拟技能调用：${skill.name}）\n${this.renderSkillReply(
          skill.name,
          rows,
          skill.args
        )}`,
        model: activeModel,
        skillsUsed: [skill.name],
      };
    }

    // 普通闲聊：保持原有模拟回复
    return {
      success: true,
      reply: `（模拟回复）你好，我是 NaviHive 助手。你刚才说的是：「${userText}」。当前为开发模拟模式，接入真实 AI 后即可获得智能回答。`,
      model: activeModel,
    };
  }
  /** 规则式意图识别：从用户提问中判断应调用的技能（模拟真实模型的 function_calls） */
  private detectSkill(userText: string): { name: string; args: Record<string, unknown> } | null {
    const t = userText.toLowerCase();
    if (/有哪些分组|分组有哪些|怎么分类|哪些分类|什么分类/.test(t)) {
      return { name: 'list_groups', args: {} };
    }
    if (/推荐|热门|排行|最棒|最好的|Top /.test(t)) {
      return { name: 'get_site_rankings', args: {} };
    }
    const groupMatch = mockGroups.find(
      (g) => g.is_public !== 0 && t.includes(g.name.toLowerCase())
    );
    if (groupMatch) {
      return { name: 'get_group_sites', args: { groupName: groupMatch.name } };
    }
    if (/分组|站点|网站|分类/.test(t)) {
      return { name: 'list_groups', args: {} };
    }
    const keyword = t
      .replace(
        /^(帮我|请|想|要|能)?(搜索|搜一|搜|查找|找一下|找|查询|查一下|查|看看|有没有|有哪些)/,
        ''
      )
      .trim();
    if (keyword) {
      return { name: 'search_sites', args: { keyword } };
    }
    return null;
  }

  /** 内存版技能执行器：只读公开分组下的公开站点（与 worker 可见性策略一致） */
  private runMockSkill(
    name: string,
    args: Record<string, unknown>
  ): Array<{ name: string; url: string; description: string; group_name: string }> {
    const publicGroupIds = new Set(mockGroups.filter((g) => g.is_public !== 0).map((g) => g.id));
    const visible = mockSites.filter((s) => publicGroupIds.has(s.group_id) && s.is_public !== 0);
    const groupOf = (siteId: number | undefined) =>
      mockGroups.find((g) => g.id === siteId)?.name ?? '';
    const toRows = (list: Site[]) =>
      list
        .slice()
        .sort((a, b) => a.order_num - b.order_num)
        .slice(0, this.toLimit(args.limit, 10))
        .map((s) => ({
          name: s.name,
          url: s.url,
          description: s.description || '',
          group_name: groupOf(s.id),
        }));

    const groupName =
      typeof args.groupName === 'string'
        ? args.groupName
        : typeof args.tag === 'string'
          ? args.tag
          : '';
    const keyword = typeof args.keyword === 'string' ? args.keyword : '';

    if (name === 'get_group_sites') {
      const g = mockGroups.find(
        (x) => x.is_public !== 0 && x.name.toLowerCase().includes(groupName.toLowerCase())
      );
      if (!g) return [];
      return toRows(visible.filter((s) => s.group_id === g.id));
    }
    if (name === 'get_site_rankings') {
      return toRows(visible);
    }
    // search_sites / list_groups 都按关键词检索站点（list_groups 在渲染层单列分组）
    const kw = (keyword || groupName).toLowerCase();
    return toRows(
      kw
        ? visible.filter((s) =>
            `${s.name} ${s.description} ${groupOf(s.id)}`.toLowerCase().includes(kw)
          )
        : visible
    );
  }

  /** 渲染技能返回：分组列表单列，站点列表统一为编号列表 */
  private renderSkillReply(
    name: string,
    rows: Array<{ name: string; url: string; description: string; group_name: string }>,
    args: Record<string, unknown>
  ): string {
    if (name === 'list_groups') {
      const groups = mockGroups.filter((g) => g.is_public !== 0);
      if (groups.length === 0) return '站内还没有任何分组';
      return `站内全部分组（${groups.length} 个）：\n${groups
        .map((g) => {
          const count = mockSites.filter((s) => s.group_id === g.id && s.is_public !== 0).length;
          return `- ${g.name}（${count} 个站点）`;
        })
        .join('\n')}`;
    }
    if (rows.length === 0) {
      const kw =
        (args.keyword as string) || (args.groupName as string) || (args.tag as string) || '';
      return `未找到「${kw || '相关'}」结果，试试「推荐几个网站」或换个关键词？`;
    }
    const title =
      name === 'get_group_sites'
        ? `分组「${args.groupName || ''}」下的站点`
        : name === 'get_site_rankings'
          ? '站内推荐站点排行'
          : '站点搜索结果';
    return `${title}：\n${rows
      .map((r, i) => `${i + 1}. ${r.name}｜${r.description || '暂无描述'}｜${r.url}`)
      .join('\n')}`;
  }

  /** 兜底回复：模拟「站点库摘要注入」模式（技能关闭 / 上游不支持时由 worker 采用） */
  private buildFallbackReply(userText: string, upstreamUnsupported: boolean): string {
    const top = mockSites
      .filter(
        (s) =>
          s.is_public !== 0 &&
          mockGroups.find((g) => g.id === s.group_id && g.is_public !== 0) !== undefined
      )
      .slice(0, 3)
      .map((s) => `- ${s.name}：${s.url}`)
      .join('\n');
    const mode = upstreamUnsupported
      ? '（当前所配上游不支持函数调用，已自动降级为站点库摘要模式）'
      : '（AI 技能已关闭，使用站点库摘要兜底）';
    return `${mode}\n基于站内站点库，为你推荐当前热门站点：\n${top}\n（用户问题：${userText.slice(
      0,
      40
    )}）`;
  }

  private toLimit(raw: unknown, def: number): number {
    const n = typeof raw === 'number' ? raw : def;
    return Math.max(1, Math.min(20, Math.floor(n)));
  }
}
