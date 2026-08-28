import { useState, memo, useCallback } from 'react';
import { Site } from '../API/http';
import { GroupWithSites } from '../types';
import SiteSettingsModal from './SiteSettingsModal';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Typography, Skeleton, Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemText } from '@mui/material';
import { useContextMenu, ContextMenuPopper, siteContextActions } from './ContextMenu';

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
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
        transition: 'background-color 150ms ease, transform 150ms cubic-bezier(0.2, 0, 0, 1), box-shadow 150ms ease',
        contain: 'layout',
        minHeight: 56,
        '&:hover': {
          bgcolor: 'var(--color-card-hover)',
          transform: isEditMode ? 'none' : 'translate3d(0, -2px, 0)',
          boxShadow: isEditMode ? 'none' : 'var(--shadow-md)',
        },
        '&:active': {
          transform: isEditMode ? 'none' : 'translate3d(0, 0, 0)',
          transitionDuration: '60ms',
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
            <Skeleton variant="rounded" width={28} height={28} sx={{ position: 'absolute' }} />
          )}
          <Box
            component="img"
            src={site.icon}
            alt=""
            loading="lazy"
            decoding="async"
            sx={{
              width: 28,
              height: 28,
              borderRadius: '4px',
              objectFit: 'contain',
              display: imageLoaded ? 'block' : 'none',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
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
