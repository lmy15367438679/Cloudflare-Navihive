# Card Group Switcher & Auto-Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a quick group-switch button on each SiteCard and implement auto-refresh via BroadcastChannel + visibilitychange.

**Architecture:** Three independent changes: (1) SiteCard gets a "move to group" dropdown menu, (2) App.tsx listens for BroadcastChannel messages from bookmarklet popup, (3) App.tsx listens for visibilitychange to refresh on tab focus. All use existing `moveSiteToGroup` API and `fetchData()`.

**Tech Stack:** React 19, TypeScript, MUI (Menu, MenuItem, IconButton), BroadcastChannel API, document.visibilitychange

---

### Task 1: Add group-switch button to SiteCard

**Files:**
- Modify: `src/components/SiteCard.tsx`
- Modify: `src/components/GroupCard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update SiteCard props and add move-group button + menu**

In `src/components/SiteCard.tsx`, add two new props and a MUI Menu for group selection:

```typescript
// Add to imports
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';

// Update interface
interface SiteCardProps {
  site: Site;
  onUpdate: (updatedSite: Site) => void;
  onDelete: (siteId: number) => void;
  isEditMode?: boolean;
  viewMode?: 'readonly' | 'edit';
  index?: number;
  iconApi?: string;
  groups?: GroupWithSites[];          // NEW
  onMoveGroup?: (siteId: number, targetGroupId: number) => void;  // NEW
}
```

Add state and menu handler inside the component (after `const [imageLoaded, setImageLoaded] = useState(false);`):

```typescript
const [groupMenuAnchor, setGroupMenuAnchor] = useState<null | HTMLElement>(null);

const handleGroupMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
  e.stopPropagation();
  e.preventDefault();
  setGroupMenuAnchor(e.currentTarget);
};

const handleGroupMenuClose = () => {
  setGroupMenuAnchor(null);
};

const handleMoveToGroup = (targetGroupId: number) => {
  handleGroupMenuClose();
  if (onMoveGroup && site.id) {
    onMoveGroup(site.id, targetGroupId);
  }
};
```

In the edit mode card content (`isEditMode` branch), add the move-group button and menu after the DragIndicatorIcon:

```tsx
{/* Move group button */}
<IconButton
  size="small"
  onClick={handleGroupMenuOpen}
  sx={{ position: 'absolute', bottom: 8, right: 8 }}
  title="移动到其他分组"
>
  <DriveFileMoveIcon fontSize="small" />
</IconButton>

{/* Group selection menu */}
<Menu
  anchorEl={groupMenuAnchor}
  open={Boolean(groupMenuAnchor)}
  onClose={handleGroupMenuClose}
>
  {groups?.filter(g => g.id !== site.group_id).map(group => (
    <MenuItem key={group.id} onClick={() => handleMoveToGroup(group.id)}>
      <ListItemIcon>
        <DriveFileMoveIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>{group.name}</ListItemText>
    </MenuItem>
  ))}
</Menu>
```

- [ ] **Step 2: Update GroupCard to pass groups and onMoveGroup to SiteCard**

In `src/components/GroupCard.tsx`, update the SiteCard usage in both render paths (edit mode and normal mode) to pass the new props:

```typescript
// In the edit mode SiteCard (around line 202-210):
<SiteCard
  site={site}
  onUpdate={onUpdate}
  onDelete={onDelete}
  isEditMode={true}
  viewMode={viewMode}
  index={idx}
  iconApi={configs?.['site.iconApi']}
  groups={[group]}  // Pass current group context - will be overridden by App-level groups
  onMoveGroup={(siteId, targetGroupId) => {
    // This will be set from App.tsx via a callback
  }}
/>
```

Actually, a cleaner approach: pass `groups` and `onMoveGroup` through GroupCard props from App.tsx.

Update `GroupCardProps` interface:

```typescript
interface GroupCardProps {
  group: GroupWithSites;
  index?: number;
  sortMode: 'None' | 'GroupSort' | 'SiteSort';
  currentSortingGroupId: number | null;
  viewMode?: 'readonly' | 'edit';
  onUpdate: (updatedSite: Site) => void;
  onDelete: (siteId: number) => void;
  onSaveSiteOrder: (groupId: number, sites: Site[]) => void;
  onStartSiteSort: (groupId: number) => void;
  onAddSite?: (groupId: number) => void;
  onUpdateGroup?: (group: Group) => void;
  onDeleteGroup?: (groupId: number) => void;
  configs?: Record<string, string>;
  groups?: GroupWithSites[];          // NEW - all groups for move-to
  onMoveGroup?: (siteId: number, targetGroupId: number) => void;  // NEW
}
```

Then pass `groups` and `onMoveGroup` to every `<SiteCard>` in the file (both edit mode and normal mode render paths).

- [ ] **Step 3: Add handleMoveGroup to App.tsx and pass groups + handler down**

In `src/App.tsx`, add the handler:

```typescript
// Add after handleSiteDelete (around line 518)
const handleMoveGroup = async (siteId: number, targetGroupId: number) => {
  try {
    await api.moveSiteToGroup(siteId, targetGroupId);
    await fetchData();
  } catch (error) {
    console.error('移动站点失败:', error);
    handleError('移动站点失败: ' + (error as Error).message);
  }
};
```

Pass `groups` and `handleMoveGroup` to GroupCard in the render section:

```tsx
<GroupCard
  key={group.id}
  group={group}
  sortMode={sortMode}
  currentSortingGroupId={currentSortingGroupId}
  viewMode={viewMode}
  onUpdate={handleSiteUpdate}
  onDelete={handleSiteDelete}
  onSaveSiteOrder={handleSaveSiteOrder}
  onStartSiteSort={startSiteSort}
  onAddSite={handleOpenAddSite}
  onUpdateGroup={handleGroupUpdate}
  onDeleteGroup={handleGroupDelete}
  configs={configs}
  groups={groups}           // NEW
  onMoveGroup={handleMoveGroup}  // NEW
/>
```

---

### Task 2: Add BroadcastChannel auto-refresh (bookmarklet cross-tab)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/NewFeatures/BookmarkletAddPanel.tsx`

- [ ] **Step 1: Add BroadcastChannel listener in App.tsx**

In `src/App.tsx`, add a new useEffect after the existing ones (around line 450):

```typescript
// BroadcastChannel for cross-tab refresh
useEffect(() => {
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel('navihive-updates');
    channel.onmessage = (event) => {
      if (event.data?.type === 'bookmark-added' || event.data?.type === 'data-changed') {
        console.log('收到跨标签页更新通知，刷新数据');
        fetchData();
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel 不受支持:', e);
  }
  return () => {
    channel?.close();
  };
}, []);
```

- [ ] **Step 2: Add BroadcastChannel post in BookmarkletAddPanel.tsx**

In `src/components/NewFeatures/BookmarkletAddPanel.tsx`, after successful save (inside `handleSubmit`, after `await onSave(...)` and before `onClose()`):

```typescript
// Broadcast data change to other tabs
try {
  const channel = new BroadcastChannel('navihive-updates');
  channel.postMessage({ type: 'bookmark-added' });
  channel.close();
} catch (e) {
  // BroadcastChannel not supported, ignore
  console.warn('BroadcastChannel 不受支持:', e);
}
```

---

### Task 3: Add visibilitychange auto-refresh

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add visibilitychange listener in App.tsx**

In `src/App.tsx`, add another useEffect (can be combined with the BroadcastChannel one or separate):

```typescript
// Auto-refresh on tab visibility change
const isFirstVisibleRef = useRef(true);

useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Skip the first visibility change (initial page load)
      if (isFirstVisibleRef.current) {
        isFirstVisibleRef.current = false;
        return;
      }
      console.log('标签页切换回前台，刷新数据');
      fetchData();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

Add `useRef` import if not already present (it is already imported in App.tsx line 1).

---

### Task 4: Verify and commit

- [ ] **Step 1: Run build to verify no TypeScript errors**

```bash
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run dev server and manually test**

```bash
pnpm dev
```

Test scenarios:
1. Open navigation site, enter edit mode → verify each SiteCard shows the move-group icon
2. Click move-group icon → verify dropdown shows other groups (not current group)
3. Select a target group → verify site moves and page refreshes
4. Open bookmarklet popup → add a site → verify main page auto-refreshes (if in another tab)
5. Switch to another tab, make a change, switch back → verify auto-refresh

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-23-card-group-switcher-and-auto-refresh-design.md docs/superpowers/plans/2026-05-23-card-group-switcher-and-auto-refresh.md src/components/SiteCard.tsx src/components/GroupCard.tsx src/App.tsx src/components/NewFeatures/BookmarkletAddPanel.tsx
git commit -m "feat(ui): add card group switcher and auto-refresh

- Add move-to-group button on SiteCard with group selection menu
- Add BroadcastChannel cross-tab refresh for bookmarklet saves
- Add visibilitychange auto-refresh on tab focus
"
```
