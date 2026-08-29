import {
  Box,
  Paper,
  MenuList,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  ClickAwayListener,
  Portal,
} from '@mui/material';
import type { ContextMenuAction } from './ContextMenuActions';

interface ContextMenuPopperProps {
  position: { x: number; y: number } | null;
  onClose: () => void;
  actions: ContextMenuAction[];
  popperRef?: React.RefObject<HTMLDivElement | null>;
}

export function ContextMenuPopper({
  position,
  onClose,
  actions,
  popperRef,
}: ContextMenuPopperProps) {
  if (!position) return null;

  const menuContent = (
    <Box
      ref={popperRef}
      sx={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 2147483647,
      }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Paper
          elevation={0}
          onMouseDown={(e) => e.stopPropagation()}
          sx={{
            minWidth: 160,
            bgcolor: 'var(--color-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            py: 0.5,
          }}
        >
          <MenuList dense>
            {actions.map((action, i) => (
              <Box key={i}>
                <MenuItem
                  onClick={() => {
                    action.onClick();
                    onClose();
                  }}
                  sx={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: action.destructive ? 'var(--color-destructive)' : 'var(--text-primary)',
                    '&:hover': {
                      bgcolor: action.destructive
                        ? 'rgba(239,68,68,0.1)'
                        : 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  {action.icon && (
                    <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                      {action.icon}
                    </ListItemIcon>
                  )}
                  <ListItemText
                    primaryTypographyProps={{ fontSize: '13px', fontFamily: 'var(--font-body)' }}
                  >
                    {action.label}
                  </ListItemText>
                </MenuItem>
                {action.dividerAfter && (
                  <Divider sx={{ borderColor: 'var(--color-border)', my: 0.5 }} />
                )}
              </Box>
            ))}
          </MenuList>
        </Paper>
      </ClickAwayListener>
    </Box>
  );

  return <Portal>{menuContent}</Portal>;
}
