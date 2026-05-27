import { useState, memo, useCallback } from 'react';
import { Site } from '../API/http';
import { GroupWithSites } from '../types';
import SiteSettingsModal from './SiteSettingsModal';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Typography, Skeleton } from '@mui/material';
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
  groups: _groups,
  onMoveGroup: _onMoveGroup,
}: SiteCardProps) {
  void _groups; void _onMoveGroup;
  const [showSettings, setShowSettings] = useState(false);
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
      open(e);
    },
    [viewMode, open]
  );

  const contextActions = siteContextActions(
    () => setShowSettings(true),
    () => {},
    () => {
      if (site.id && window.confirm(`确定删除站点「${site.name}」？`)) {
        onDelete(site.id);
      }
    }
  );

  const cardContent = (
    <Box
      ref={setNodeRef}
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
        transition: 'background-color 150ms ease',
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
        <Box position="relative" width={28} height={28} flexShrink={0}>
          {!imageLoaded && (
            <Skeleton variant="rounded" width={28} height={28} sx={{ position: 'absolute' }} />
          )}
          <Box
            component="img"
            src={site.icon}
            alt=""
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
