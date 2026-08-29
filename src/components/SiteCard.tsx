import { useState, useEffect, memo, useCallback } from 'react';
import { Site } from '../API/http';
import { GroupWithSites } from '../types';
import SiteSettingsModal from './SiteSettingsModal';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box,
  Typography,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
} from '@mui/material';
import { Star as StarIcon, StarBorder as StarBorderIcon } from '@mui/icons-material';
import { useContextMenu } from './useContextMenu';
import { ContextMenuPopper } from './ContextMenu';
import { siteContextActions } from './ContextMenuActions';
import { getIconProxyUrl } from '../utils/url';

interface SiteCardProps {
  site: Site;
  onUpdate: (updatedSite: Site) => void;
  onDelete: (siteId: number) => void;
  isEditMode?: boolean;
  viewMode?: 'readonly' | 'edit';
  index?: number;
  iconApi?: string;
  groups?: GroupWithSites[];
  onMoveGroup?: (siteId: number, targetGroupId: number) => void;
  /** 是否已收藏（浏览模式的本地置顶收藏） */
  isFavorite?: boolean;
  /** 切换收藏状态 */
  onToggleFavorite?: (siteId: number) => void;
  /** 图标懒加载开关（site.lazyLoadImages，默认关闭即 eager） */
  lazyLoadImages?: boolean;
  /** 图标本地缓存开关（site.imageCache，叠加 /api/icon 边缘缓存） */
  imageCache?: boolean;
}

const SiteCard = memo(function SiteCard({
  site,
  onUpdate,
  onDelete,
  isEditMode = false,
  viewMode = 'edit',
  index = 0,
  iconApi,
  groups,
  onMoveGroup,
  isFavorite = false,
  onToggleFavorite,
  lazyLoadImages = false,
  imageCache = false,
}: SiteCardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [iconError, setIconError] = useState(!site.icon);
  const [imageLoaded, setImageLoaded] = useState(false);
  // 图标资源地址：默认直连 /api/icon 代理（内含 Cloudflare 边缘缓存）；
  // 开启 site.imageCache 后优先用 Cache API 命中本地副本，二次渲染时零网络往返
  const iconHref = site.icon ? getIconProxyUrl(site.icon) : '';
  const [iconSrc, setIconSrc] = useState(iconHref);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (
      !site.icon ||
      !imageCache ||
      typeof window === 'undefined' ||
      !('caches' in window) ||
      !window.isSecureContext
    ) {
      setIconSrc(iconHref);
      return;
    }

    (async () => {
      try {
        const cache = await caches.open('navihive-icons');
        const req = new Request(iconHref, { method: 'GET' });
        let res = await cache.match(req);
        if (!res) {
          res = await fetch(req);
          if (res && res.ok) {
            await cache.put(req, res.clone());
          }
        }
        if (!res || !res.ok || cancelled) return;
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setIconSrc(objectUrl);
      } catch {
        // data:/blob: URL 或 Cache API 不可用等异常：回落到直连代理
        if (!cancelled) setIconSrc(iconHref);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [iconHref, imageCache, site.icon]);
  const { position, close, open } = useContextMenu();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `site-${site.id || index}`,
    disabled: !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 9999 : 'auto',
    opacity: isDragging ? 0.7 : 1,
    position: 'relative' as const,
  };

  const fallbackIcon = site.name.charAt(0).toUpperCase();

  const handleCardClick = useCallback(() => {
    if (!isEditMode && site.url) {
      window.open(site.url, '_blank');
    }
  }, [isEditMode, site.url]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (viewMode !== 'edit') return;
      e.stopPropagation();
      open(e);
    },
    [viewMode, open]
  );

  const contextActions = siteContextActions(
    () => setShowSettings(true),
    () => {
      if (site.id && window.confirm(`确定删除站点「${site.name}」？`)) {
        onDelete(site.id);
      }
    },
    groups && groups.length > 1
      ? () => {
          close();
          setShowMoveDialog(true);
        }
      : undefined
  );

  const cardContent = (
    <Box
      ref={setNodeRef}
      className='site-card'
      style={isEditMode ? style : undefined}
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
      onClick={isEditMode ? undefined : handleCardClick}
      onContextMenu={handleContextMenu}
      title={isEditMode ? undefined : site.url}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        bgcolor: 'var(--color-card)',
        cursor: isEditMode ? 'grab' : 'pointer',
        // 性能：静态卡片不强制建 GPU 合成层（translate3d/backface-visibility 会让
        // Chrome 为每张卡各建一层，卡片一多 GPU 合成即饱和 → 桌面掉帧）。
        // 拖拽时 DnD 通过 style 注入 transform/zIndex/opacity，仍走 GPU 合成，不受影响。
        // 性能：静态卡片不强制建 GPU 合成层，也不加 contain: layout（每个卡片独立
        // containment 单元会阻止 Chrome 滚动时合并/复用 tile，是滚动掉帧的隐性来源）。
        // hover 仅在编辑模式启用且瞬时变色（无 transition）：浏览模式（访客滚动书签）
        // 完全无 hover 视觉变化 → 滚动时零 tile invalidate，Chrome 纯 GPU 平移即流畅。
        minHeight: 56,
        // 静态柔和阴影：创造 Z 轴悬浮层次（premium 质感）。静态 box-shadow 由 Chrome
        // 一次性绘制为 tile，滚动时不触发 invalidate（区别于 hover 过渡），性能安全。
        boxShadow: 'var(--shadow-sm)',
        ...(viewMode === 'edit'
          ? {
              '&:hover': {
                bgcolor: 'var(--color-card-hover)',
                boxShadow: 'var(--shadow-md)',
              },
            }
          : {}),
        ...(isDragging && {
          opacity: 0.7,
          boxShadow: 'var(--shadow-md)',
        }),
      }}
    >
      {/* Icon */}
      {!iconError && site.icon ? (
        <Box position='relative' width={28} height={28} flexShrink={0} className='site-card-icon'>
          {!imageLoaded && (
            <Skeleton
              variant='rounded'
              width={28}
              height={28}
              animation={false}
              sx={{ position: 'absolute' }}
            />
          )}
          <Box
            component='img'
            src={iconSrc}
            alt=''
            loading={lazyLoadImages ? 'lazy' : 'eager'}
            decoding='async'
            fetchPriority={lazyLoadImages ? 'low' : 'auto'}
            sx={{
              width: 28,
              height: 28,
              borderRadius: '4px',
              objectFit: 'contain',
              display: imageLoaded ? 'block' : 'none',
            }}
            onError={() => setIconError(true)}
            onLoad={() => setImageLoaded(true)}
          />
        </Box>
      ) : (
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '4px',
            bgcolor: 'var(--color-accent-dim)',
            color: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontFamily: 'var(--font-heading)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {fallbackIcon}
        </Box>
      )}

      {/* Text */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          noWrap
          sx={{
            fontFamily: 'var(--font-heading)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
          }}
        >
          {site.name}
        </Typography>
        {site.description && (
          <Typography
            sx={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {site.description}
          </Typography>
        )}
      </Box>

      {/* 收藏星标（浏览与管理员编辑模式都显示）：
          用原生 title 而非 MUI Tooltip，保持零 JS hover 行为；
          编辑模式用 pointerdown/mousedown 拦截，避免星标点击触发 DnD 拖拽 */}
      {onToggleFavorite && site.id != null && (
        <IconButton
          size='small'
          title={isFavorite ? '取消收藏' : '收藏此站点'}
          aria-label={isFavorite ? '取消收藏' : '收藏此站点'}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleFavorite(site.id as number);
          }}
          sx={{
            ml: 0.5,
            p: 0.5,
            color: isFavorite ? '#f5b301' : 'var(--text-tertiary)',
            '&:hover': {
              color: isFavorite ? '#f5b301' : 'var(--text-secondary)',
              bgcolor: 'transparent',
            },
          }}
        >
          {isFavorite ? <StarIcon fontSize='small' /> : <StarBorderIcon fontSize='small' />}
        </IconButton>
      )}
    </Box>
  );

  return (
    <>
      {cardContent}

      <ContextMenuPopper position={position} onClose={close} actions={contextActions} />

      {/* 移动到分组对话框 */}
      <Dialog
        open={showMoveDialog}
        onClose={() => setShowMoveDialog(false)}
        maxWidth='xs'
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'var(--color-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 600 }}>
          将「{site.name}」移到哪个分组？
        </DialogTitle>
        <DialogContent sx={{ p: 1 }}>
          <List dense>
            {(groups || [])
              .filter((g) => g.id !== site.group_id)
              .map((group) => (
                <ListItemButton
                  key={group.id}
                  onClick={() => {
                    if (onMoveGroup && site.id && group.id) {
                      onMoveGroup(site.id, group.id);
                    }
                    setShowMoveDialog(false);
                  }}
                  sx={{
                    borderRadius: 'var(--radius-md)',
                    mb: 0.25,
                    '&:hover': { bgcolor: 'var(--color-accent-dim)' },
                  }}
                >
                  <ListItemText
                    primary={group.name}
                    primaryTypographyProps={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '14px',
                    }}
                  />
                </ListItemButton>
              ))}
          </List>
        </DialogContent>
      </Dialog>

      {showSettings && (
        <SiteSettingsModal
          site={site}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={() => setShowSettings(false)}
          iconApi={iconApi}
        />
      )}
    </>
  );
});

export default SiteCard;
