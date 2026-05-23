# 导航站优化：卡片分组快速切换 + 自动刷新

## 概述

对 Cloudflare Navihive 导航站进行两项体验优化：
1. 每个站点卡片增加可选分组切换功能（快速移动站点到其他分组）
2. 收藏后自动刷新页面内容，以及标签页切换时自动检测刷新

---

## 1. SiteCard 分组快速切换器

### 用户场景

用户在编辑模式下，希望在不打开设置弹窗的情况下，快速将某个站点卡片从一个分组移动到另一个分组。

### 交互设计

- 在 SiteCard **编辑模式**（`isEditMode=true`）下，卡片右下角/右上角新增一个 **"移动分组"（MoveToGroupIcon）** 图标按钮
- 点击后弹出 `Menu` 下拉菜单，列出除当前所在组外的所有其他分组
- 选中目标分组后，调用 `moveSiteToGroup(siteId, targetGroupId)` API
- 移动成功后自动调用 `fetchData()` 刷新页面

### UI 示意

```
┌───────────────────────────┐
│ [icon] 站点名称       [📁] │ ← 移动分组按钮
│ 站点描述                  │
│                           │
│ 当前: 常用工具         ✕  │ ← 可选：显示当前分组标签
└───────────────────────────┘
           ↓ 点击 📁
    ┌────────────────────┐
    │ 移动到...           │
    ├────────────────────┤
    │ ○ 开发资源          │
    │ ○ 新闻阅读          │
    │ ○ 娱乐              │
    │ ○ ...               │
    └────────────────────┘
```

### 技术实现

- **文件变更：** `src/components/SiteCard.tsx`
- **新增 prop：** 从上层接收 `groups`（全部分组列表）和 `onMoveGroup(siteId, targetGroupId)` 回调
- **API 复用：** 使用已在 `client.ts` 中存在的 `moveSiteToGroup(siteId, targetGroupId)` 接口
- **状态管理：** 按钮在编辑模式下显示，下拉菜单使用 MUI `Menu` + `MenuItem`

### 涉及的组件数据流

```
App.tsx
  └─ groups (GroupWithSites[]) ──→ GroupCard
                                      └─ sites (Site[]) ──→ SiteCard (新增 onMoveGroup, groups)
                                                               └─ onClick 📁 → Menu→选择分组
                                                                    → api.moveSiteToGroup(id, targetGroupId)
                                                                    → fetchData() 刷新
```

---

## 2. 自动刷新机制

### 2A. Bookmarklet 保存后自动刷新（跨标签页通信）

#### 用户场景

用户通过 Bookmarklet 弹窗添加站点后，如果导航站主页已在另一个标签页打开，希望它能自动刷新显示新增内容。

#### 技术方案：BroadcastChannel API

- 在 `BookmarkletAddPanel.tsx` 中：
  - 创建 `BroadcastChannel('navihive-updates')`
  - 站点保存成功后，`postMessage({ type: 'bookmark-added' })`
- 在 `App.tsx` 中：
  - 创建同名的 `BroadcastChannel('navihive-updates')`
  - 监听 `message` 事件，收到 `bookmark-added` 后调用 `fetchData()`

#### 降级策略

- BroadcastChannel 不支持时（如某些旧浏览器），不做额外处理，不影响现有功能
- 配合 2C 的可见性刷新，用户切换到导航站标签页时也会自动刷新

### 2C. 页面可见性变化自动刷新

#### 用户场景

用户切换到其他标签页操作后（例如修改了分组设置），再切回导航站标签页时，希望自动检测并刷新数据。

#### 技术方案：visibilitychange 事件

- 在 `App.tsx` 中添加 `useEffect`：
  - 监听 `document.visibilitychange` 事件
  - 当 `document.visibilityState === 'visible'` 时，调用 `fetchData()`
  - 使用 `useRef` 标记首次加载不触发（避免页面初始加载时重复请求）
  - 使用防抖（300ms）避免短时间内多次触发

#### 伪代码

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      fetchData();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

---

## 文件变更清单

| 文件 | 变更内容 |
|:---|:---|
| `src/components/SiteCard.tsx` | 新增 `groups` prop、`onMoveGroup` prop、分组切换按钮 + Menu |
| `src/components/GroupCard.tsx` | 向 SiteCard 透传 `groups` 和 `onMoveGroup` |
| `src/App.tsx` | 新增 BroadcastChannel 监听 + visibilitychange 自动刷新；向 GroupCard 传递 `groups` + `handleMoveGroup` |
| (可选) `src/components/NewFeatures/BookmarkletAddPanel.tsx` | 新增 BroadcastChannel 消息广播 |

## 不变的部分

- 数据库 schema 无需变更（复用已有的 `group_id` 字段和 `moveSiteToGroup` API）
- Worker 端 API 无需变更
- 已有的批量移动（BatchMoveDialog）不受影响
