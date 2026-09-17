import React, { useState, useEffect, useCallback, memo } from 'react';
import { Site, Group } from '../API/http';
import SiteCard from './SiteCard';
import { GroupWithSites } from '../types';
import EditGroupDialog from './EditGroupDialog';
import { useContextMenu } from './useContextMenu';
import { ContextMenuPopper } from './ContextMenu';
import { groupContextActions } from './ContextMenuActions';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// 引入Material UI组件
import {
  Paper,
  Typography,
  Button,
  Box,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Collapse,
} from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

// 更新组件属性接口
interface GroupCardProps {
  group: GroupWithSites;
  sortMode: 'None' | 'SiteSort';
  currentSortingGroupId: number | null;
  viewMode?: 'readonly' | 'edit'; // 访问模式
  /** 选中分组自动展开信号（id 命中时展开该分组） */
  expandSignal?: { id: number; n: number } | null;
  onUpdate: (updatedSite: Site) => void;
  onDelete: (siteId: number) => void;
  onSaveSiteOrder: (groupId: number, sites: Site[]) => void;
  onStartSiteSort: (groupId: number) => void;
  onAddSite?: (groupId: number) => void; // 新增添加卡片的可选回调函数
  onUpdateGroup?: (group: Group) => void; // 更新分组的回调函数
  onDeleteGroup?: (groupId: number) => void; // 删除分组的回调函数
  configs?: Record<string, string>; // 传入配置
  groups?: GroupWithSites[]; // 全部分组列表（用于快速移动）
  onMoveGroup?: (siteId: number, targetGroupId: number) => void; // 快速移动回调
  /** 仅在“全部分组”的编辑视图中允许通过标题手柄移动分组 */
  enableGroupDrag?: boolean;
  /** 分组顺序保存中，避免并发提交覆盖顺序 */
  isGroupOrderUpdating?: boolean;
  /** 收藏站点 ID 集合（浏览模式置顶排序用） */
  favoriteIds?: Set<number>;
  /** 切换收藏状态 */
  onToggleFavorite?: (siteId: number) => void;
}

const GroupCard = memo(function GroupCard({
  group,
  sortMode,
  currentSortingGroupId,
  viewMode = 'edit', // 默认为编辑模式
  expandSignal,
  onUpdate,
  onDelete,
  onSaveSiteOrder,
  onStartSiteSort,
  onAddSite,
  onUpdateGroup,
  onDeleteGroup,
  configs,
  groups,
  onMoveGroup,
  enableGroupDrag = false,
  isGroupOrderUpdating = false,
  favoriteIds,
  onToggleFavorite,
}: GroupCardProps) {
  const groupSortableId = `group-${group.id}`;
  const {
    attributes: groupDragAttributes,
    listeners: groupDragListeners,
    setNodeRef: setGroupNodeRef,
    transform: groupTransform,
    transition: groupTransition,
    isDragging: isGroupDragging,
  } = useSortable({
    id: groupSortableId,
    disabled: !enableGroupDrag || isGroupOrderUpdating,
  });

  // 添加本地状态来管理站点排序
  const [sites, setSites] = useState<Site[]>(group.sites);
  useEffect(() => {
    setSites(group.sites);
  }, [group.sites]);
  // 添加编辑弹窗的状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  // 添加提示消息状态
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  // 右键菜单
  const { position: ctxPosition, close: closeCtx, open: openCtx } = useContextMenu();

  // 添加折叠状态
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem(`group-${group.id}-collapsed`);
    if (!savedState) return false;
    try {
      return JSON.parse(savedState) === true;
    } catch {
      return false;
    }
  });

  // 保存折叠状态到本地存储
  useEffect(() => {
    if (group.id) {
      localStorage.setItem(`group-${group.id}-collapsed`, JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, group.id]);

  // 处理折叠切换
  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // 选中分组时自动展开（即使此前被折叠）：侧栏/搜索结果点击后由 App 下发信号
  useEffect(() => {
    if (expandSignal?.id === group.id) {
      setIsCollapsed(false);
    }
  }, [expandSignal, group.id]);

  // 配置传感器，支持鼠标、触摸和键盘操作
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px 的移动才激活拖拽，防止误触
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 延迟250ms激活，防止误触
        tolerance: 5, // 容忍5px的移动
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 站点拖拽结束处理函数
  const handleSiteDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      // 查找拖拽的站点索引
      const oldIndex = sites.findIndex((site) => `site-${site.id}` === active.id);
      const newIndex = sites.findIndex((site) => `site-${site.id}` === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // 更新本地站点顺序
        const newSites = arrayMove(sites, oldIndex, newIndex);
        setSites(newSites);
      }
    }
  };

  // 右键菜单处理函数
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (viewMode !== 'edit') return;
      e.stopPropagation();
      openCtx(e);
    },
    [viewMode, openCtx]
  );

  // 编辑分组处理函数
  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  // 更新分组处理函数
  const handleUpdateGroup = (updatedGroup: Group) => {
    if (onUpdateGroup) {
      onUpdateGroup(updatedGroup);
      setEditDialogOpen(false);
    }
  };

  // 删除分组处理函数
  const handleDeleteGroup = (groupId: number) => {
    if (onDeleteGroup) {
      onDeleteGroup(groupId);
      setEditDialogOpen(false);
    }
  };

  // 判断是否为当前正在编辑的分组
  const isCurrentEditingGroup = sortMode === 'SiteSort' && currentSortingGroupId === group.id;

  // 渲染站点卡片区域
  const renderSites = () => {
    // 使用本地状态中的站点数据
    const sitesToRender = isCurrentEditingGroup ? sites : group.sites;

    // 浏览模式：收藏站点置顶（稳定排序，保持其余站点原有顺序）
    let orderedSites = sitesToRender;
    if (viewMode !== 'edit' && favoriteIds && favoriteIds.size > 0) {
      orderedSites = [...sitesToRender].sort(
        (a, b) =>
          (favoriteIds.has(b.id as number) ? 1 : 0) - (favoriteIds.has(a.id as number) ? 1 : 0)
      );
    }

    // 如果当前不是正在编辑的分组且处于站点排序模式，不显示站点
    if (!isCurrentEditingGroup && sortMode === 'SiteSort') {
      return null;
    }

    // 如果是编辑模式，使用DndContext包装
    if (isCurrentEditingGroup) {
      return (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSiteDragEnd}
        >
          <SortableContext
            items={sitesToRender.map((site) => `site-${site.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            <Box sx={{ width: '100%' }}>
              <Box
                className='group-sites-row'
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  margin: -1, // 抵消内部padding，确保边缘对齐
                }}
              >
                {sitesToRender.map((site, idx) => (
                  <Box
                    key={site.id || idx}
                    className='group-site-item'
                    sx={{
                      width: {
                        xs: '50%',
                        sm: '50%',
                        md: '25%',
                        lg: '25%',
                        xl: '25%',
                      },
                      padding: 1, // 内部间距，更均匀的分布
                      boxSizing: 'border-box', // 确保padding不影响宽度计算
                    }}
                  >
                    <SiteCard
                      site={site}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      isEditMode={true}
                      viewMode={viewMode}
                      index={idx}
                      iconApi={configs?.['site.iconApi']} // 传入iconApi配置
                      groups={groups}
                      onMoveGroup={onMoveGroup}
                      isFavorite={favoriteIds?.has(site.id as number) ?? false}
                      onToggleFavorite={onToggleFavorite}
                      lazyLoadImages={configs?.['site.lazyLoadImages'] === 'true'} // 懒加载开关（性能优化）
                      imageCache={configs?.['site.imageCache'] === 'true'} // 图标本地缓存开关（性能优化）
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </SortableContext>
        </DndContext>
      );
    }

    // 普通模式下的渲染
    return (
      <Box
        className='group-sites-row'
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          margin: -1, // 抵消内部padding，确保边缘对齐
        }}
      >
        {orderedSites.map((site) => (
          <Box
            key={site.id}
            className='group-site-item'
            sx={{
              width: {
                xs: '100%',
                sm: '50%',
                md: '33.33%',
                lg: '25%',
                xl: '20%',
              },
              padding: 1, // 内部间距，更均匀的分布
              boxSizing: 'border-box', // 确保padding不影响宽度计算
            }}
          >
            <SiteCard
              site={site}
              onUpdate={onUpdate}
              onDelete={onDelete}
              isEditMode={false}
              viewMode={viewMode}
              iconApi={configs?.['site.iconApi']} // 传入iconApi配置
              groups={groups}
              onMoveGroup={onMoveGroup}
              isFavorite={favoriteIds?.has(site.id as number) ?? false}
              onToggleFavorite={onToggleFavorite}
              lazyLoadImages={configs?.['site.lazyLoadImages'] === 'true'} // 懒加载开关（性能优化）
              imageCache={configs?.['site.imageCache'] === 'true'} // 图标本地缓存开关（性能优化）
            />
          </Box>
        ))}
      </Box>
    );
  };

  // 保存站点排序
  const handleSaveSiteOrder = () => {
    if (!group.id) {
      console.error('分组 ID 不存在,无法保存排序');
      return;
    }
    onSaveSiteOrder(group.id, sites);
  };

  // 处理排序按钮点击
  const handleSortClick = () => {
    if (!group.id) {
      console.error('分组 ID 不存在,无法开始排序');
      return;
    }
    if (group.sites.length < 2) {
      setSnackbarMessage('至少需要2个站点才能进行排序');
      setSnackbarOpen(true);
      return;
    }
    // 确保分组展开
    if (isCollapsed) {
      setIsCollapsed(false);
    }
    onStartSiteSort(group.id);
  };

  // 关闭提示消息
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Paper
      ref={setGroupNodeRef}
      elevation={0}
      onContextMenu={handleContextMenu}
      className='group-card'
      data-group-dragging={isGroupDragging ? 'true' : undefined}
      style={{
        transform: CSS.Transform.toString(groupTransform),
        transition: groupTransition,
        zIndex: isGroupDragging ? 20 : undefined,
        position: 'relative',
      }}
      sx={{
        borderRadius: 'var(--radius-lg)',
        p: { xs: 1.75, sm: 2.25 },
        border: '1px solid var(--color-border)',
        bgcolor: 'var(--color-card)',
        boxShadow: isGroupDragging ? 'var(--shadow-md)' : 'none',
        transition: isGroupDragging
          ? 'none'
          : 'border-color 160ms ease, background-color 160ms ease',
        '&:hover': {
          borderColor: 'var(--color-border-strong)',
          bgcolor: 'var(--color-card-hover)',
        },
        '&[data-group-dragging="true"]': {
          borderColor: 'var(--color-accent-muted)',
          bgcolor: 'var(--color-elevated)',
        },
      }}
    >
      <Box
        display='flex'
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        mb={isCollapsed ? 0 : 2}
        gap={1.25}
        className='group-card-header'
        sx={{
          '&:hover .group-drag-handle, &:focus-within .group-drag-handle': {
            opacity: 0.72,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            minWidth: 0,
          }}
        >
          {enableGroupDrag && (
            <Tooltip title={isGroupOrderUpdating ? '正在保存分组顺序' : '拖动调整分组顺序'}>
              <span>
                <IconButton
                  className='group-drag-handle'
                  size='small'
                  disabled={isGroupOrderUpdating}
                  aria-label='拖动调整分组顺序'
                  aria-busy={isGroupOrderUpdating}
                  {...groupDragAttributes}
                  {...groupDragListeners}
                  sx={{
                    width: 36,
                    height: 36,
                    ml: -0.75,
                    color: 'var(--text-tertiary)',
                    cursor: isGroupDragging ? 'grabbing' : 'grab',
                    opacity: isGroupDragging ? 1 : 0,
                    transition: 'opacity 140ms ease, color 140ms ease',
                    touchAction: 'none',
                    '&:hover, &:focus-visible': {
                      opacity: 1,
                      color: 'var(--color-accent)',
                      bgcolor: 'var(--color-accent-dim)',
                    },
                    '@media (hover: none), (pointer: coarse)': {
                      opacity: 0.5,
                    },
                  }}
                >
                  <DragIndicatorIcon fontSize='small' />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <IconButton
            size='small'
            className='collapse-icon'
            onClick={handleToggleCollapse}
            sx={{
              width: 36,
              height: 36,
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              color: 'var(--text-tertiary)',
              transition: 'transform 180ms ease, color 140ms ease',
              '&:hover': { color: 'var(--color-accent)', bgcolor: 'var(--color-accent-dim)' },
            }}
            aria-label={isCollapsed ? '展开分组' : '折叠分组'}
          >
            <ExpandMoreIcon />
          </IconButton>
          <Typography
            variant='h6'
            component='h2'
            onClick={handleToggleCollapse}
            sx={{
              fontFamily: 'var(--font-heading)',
              fontSize: { xs: '1rem', sm: '1.05rem' },
              lineHeight: 1.35,
              fontWeight: 650,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              minWidth: 0,
            }}
          >
            {group.name}
            <Typography
              component='span'
              variant='body2'
              sx={{
                ml: 1,
                fontFamily: 'var(--font-body)',
                color: 'var(--text-tertiary)',
                fontSize: '12px',
              }}
            >
              {group.sites.length}
            </Typography>
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'row', sm: 'row' },
            gap: 1,
            width: { xs: '100%', sm: 'auto' },
            flexWrap: 'wrap',
            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
          }}
        >
          {isCurrentEditingGroup ? (
            <Button
              variant='contained'
              color='primary'
              size='small'
              startIcon={<SaveIcon />}
              onClick={handleSaveSiteOrder}
              sx={{
                minWidth: 'auto',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
              }}
            >
              保存顺序
            </Button>
          ) : (
            sortMode === 'None' &&
            viewMode === 'edit' && ( // 只在编辑模式显示按钮
              <>
                {onAddSite && group.id && (
                  <Button
                    variant='contained'
                    color='primary'
                    size='small'
                    onClick={() => onAddSite(group.id)}
                    startIcon={<AddIcon />}
                    sx={{
                      minWidth: 'auto',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    }}
                  >
                    添加卡片
                  </Button>
                )}
                <Button
                  variant='outlined'
                  color='primary'
                  size='small'
                  startIcon={<SortIcon />}
                  onClick={handleSortClick}
                  sx={{
                    minWidth: 'auto',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}
                >
                  排序
                </Button>

                {onUpdateGroup && onDeleteGroup && (
                  <Tooltip title='编辑分组'>
                    <IconButton
                      color='primary'
                      onClick={handleEditClick}
                      size='small'
                      sx={{ alignSelf: 'center' }}
                      aria-label='编辑分组'
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )
          )}
        </Box>
      </Box>

      {/* 使用 Collapse 组件包装站点卡片区域 */}
      <Collapse in={!isCollapsed} timeout='auto'>
        {renderSites()}
      </Collapse>

      {/* 编辑分组弹窗 */}
      {onUpdateGroup && onDeleteGroup && (
        <EditGroupDialog
          open={editDialogOpen}
          group={group}
          onClose={() => setEditDialogOpen(false)}
          onSave={handleUpdateGroup}
        />
      )}

      {/* 分组右键菜单 */}
      {viewMode === 'edit' && (
        <ContextMenuPopper
          position={ctxPosition}
          onClose={closeCtx}
          actions={groupContextActions(() => {
            if (
              group.id &&
              window.confirm(`确定删除分组「${group.name}」？\n此分组下的所有站点也将被删除。`)
            ) {
              handleDeleteGroup(group.id);
            }
          })}
        />
      )}

      {/* 提示消息 */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity='info' sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
});

export default GroupCard;
