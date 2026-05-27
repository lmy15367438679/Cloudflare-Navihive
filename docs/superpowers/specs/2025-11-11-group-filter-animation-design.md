# 分组过滤 + 右键菜单 + 丝滑动画 设计方案

## 作者
**日期**: 2025-11-11
**状态**: 设计已批准，待实现

---

## 1. 背景

用户在使用 NaviHive 导航站时反馈三个 UI 问题：

1. **分组右键菜单** — 在 GroupCard 上无法通过右键快速编辑/排序/删除分组
2. **分组过滤** — 点击侧边栏分组后，主内容区仍然显示全部分组，希望只显示选中的分组
3. **切换动画** — 分组切换没有过渡效果，显得生硬

## 2. 设计方案

### 2.1 分组右键菜单

**目标**: 在 GroupCard 卡片上右键 → 弹出菜单（编辑排序/编辑/删除）于鼠标位置

**实现**:
- GroupCard 导入 `useContextMenu()` + `ContextMenuPopper` + `groupContextActions`
- 在 GroupCard 的最外层 Box 添加 `onContextMenu` 处理
- 复用现有 SiteCard 的右键菜单模式

**定位修复**:
- `ContextMenuPopper` 目前使用 `Popper` + `offset: [x, y]` 定位不准
- 改用 `sx={{ position: 'fixed', left: position.x, top: position.y }}` 的 `Paper` 直接定位

**影响范围**:
- `src/components/ContextMenu.tsx` — 修复定位方式
- `src/components/GroupCard.tsx` — 添加右键菜单

### 2.2 分组过滤 + 自动恢复

**目标**: 
- 侧边栏展开 → 点击某分组 → 只显示该分组
- 侧边栏收起（鼠标离开）→ 自动恢复显示全部分组

**实现**:
- 利用已有 `activeGroupId` 状态
- `App.tsx` 渲染时根据 `activeGroupId` 过滤 `groups`：
  - `activeGroupId === null` → 渲染所有分组
  - `activeGroupId !== null` → 只渲染匹配的分组
- Sidebar 的 `onMouseLeave` 中增加回调，延迟 200ms 后清除 `activeGroupId`（与侧边栏收起动画同步）
- 在 Sidebar 分组点击后，保持 `activeGroupId` 直到侧边栏收起

**影响范围**:
- `src/App.tsx` — GroupCard 渲染逻辑增加过滤
- `src/components/Layout/Sidebar.tsx` — 新增 `onSidebarCollapse` 回调

### 2.3 丝滑切换动画

**目标**: 分组切换/恢复时，内容区平滑过渡

**实现**:
- 新增 CSS 动画 `contentIn`（已有 `350ms ease-out`，fadeIn + translateY 8px）
- 内容包裹层添加 `key={activeGroupId ?? 'all'}` 触发 React 卸载/挂载动画
- `GroupCard` 自身添加 `animation: contentIn 350ms ease-out`
- 过滤为空时不闪白屏，保持背景

**影响范围**:
- `src/App.tsx` — 内容区动画逻辑

## 3. 文件变更总览

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/components/ContextMenu.tsx` | 修改 | 修复定位方式（Popper offset → 固定定位） |
| `src/components/GroupCard.tsx` | 修改 | 添加右键菜单 + 动画 |
| `src/App.tsx` | 修改 | 添加分组过滤逻辑 + 清理 activeGroupId |
| `src/components/Layout/Sidebar.tsx` | 修改 | 新增侧边栏收起回调 |

## 4. 风险与注意事项

- **定位稳定性**: 固定定位在页面滚动时需要正确处理
- **兼容性**: 侧边栏 hover 模式和 static 模式都需要处理
- **动画性能**: 使用 CSS animation/transition 而非 JS 驱动，避免卡顿
