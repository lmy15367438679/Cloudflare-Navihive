import { useState, memo, useCallback } from 'react';
import { Site } from '../API/http';
import { GroupWithSites } from '../types';
import SiteSettingsModal from './SiteSettingsModal';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Typography, Skeleton, Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemText } from '@mui/material';
import { useContextMenu, ContextMenuPopper, siteContextActions } from './ContextMenu';
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
}: SiteCardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [iconError, setIconError] = useState(!site.icon);
  const [imageLoaded, setImageLoaded] = useState(false);
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
    groups && groups.length > 1 ? () => {
      close();
      setShowMoveDialog(true);
    } : undefined
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
        // hover 只用背景色表达，且不设 transition（瞬时变色）：向下滚动时卡片会连续从
        // 鼠标下方穿过，若 hover 带任何过渡动画（transform/box-shadow/background-color），
        // Chrome 每帧重建 tile → 掉帧（Safari 的 tile 缓存能扛，Chrome 扛不住）。
        contain: 'layout',
        minHeight: 56,
        '&:hover': {
          bgcolor: 'var(--color-card-hover)',
        },
        ...(isDragging && {
          opacity: 0.7,
          boxShadow: 'var(--shadow-md)',
        }),
      }}
    >
      {/* Icon */}
      {!iconError && site.icon ? (
        <Box position="relative" width={28} height={28} flexShrink={0} className='site-card-icon'>
          {!imageLoaded && (
            <Skeleton
              variant="rounded"
              width={28}
              height={28}
              animation={false}
              sx={{ position: 'absolute' }}
            />
          )}
          <Box
            component="img"
            src={getIconProxyUrl(site.icon)}
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
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
