import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Paper, MenuList, MenuItem, ListItemIcon, ListItemText, Divider, ClickAwayListener, Portal } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import type { ReactNode } from 'react';

export interface ContextMenuAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  destructive?: boolean;
  dividerAfter?: boolean;
}

export function useContextMenu() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const popperRef = useRef<HTMLDivElement>(null);

  const open = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent) => {
    e.preventDefault();
    let clientX: number;
    let clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      const touch = e.touches[0]!;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = 0;
      clientY = 0;
    }
    setPosition({ x: clientX, y: clientY });
  }, []);

  const close = useCallback(() => {
    setPosition(null);
  }, []);

  useEffect(() => {
    const handleClick = () => close();
    if (position) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
    return undefined;
  }, [position, close]);

  return { position, close, open, popperRef };
}

interface ContextMenuPopperProps {
  position: { x: number; y: number } | null;
  onClose: () => void;
  actions: ContextMenuAction[];
  popperRef?: React.RefObject<HTMLDivElement | null>;
}

export function ContextMenuPopper({ position, onClose, actions, popperRef }: ContextMenuPopperProps) {
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
                      bgcolor: action.destructive ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  {action.icon && (
                    <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                      {action.icon}
                    </ListItemIcon>
                  )}
                  <ListItemText primaryTypographyProps={{ fontSize: '13px', fontFamily: 'var(--font-body)' }}>
                    {action.label}
                  </ListItemText>
                </MenuItem>
                {action.dividerAfter && <Divider sx={{ borderColor: 'var(--color-border)', my: 0.5 }} />}
              </Box>
            ))}
          </MenuList>
        </Paper>
      </ClickAwayListener>
    </Box>
  );

  return <Portal>{menuContent}</Portal>;
}

export const siteContextActions = (
  onEdit: () => void,
  onDelete: () => void,
  onMoveGroupRequest?: () => void,
): ContextMenuAction[] => {
  const actions: ContextMenuAction[] = [
    { label: '编辑', icon: <EditIcon fontSize="small" />, onClick: onEdit },
  ];

  if (onMoveGroupRequest) {
    actions.push({
      label: '移动到分组',
      icon: <DriveFileMoveIcon fontSize="small" />,
      onClick: onMoveGroupRequest,
      dividerAfter: true,
    });
  }

  actions.push({ label: '删除', icon: <DeleteIcon fontSize="small" />, onClick: onDelete, destructive: true });
  return actions;
};

export const groupContextActions = (
  onDelete: () => void
): ContextMenuAction[] => [
  { label: '删除', icon: <DeleteIcon fontSize="small" />, onClick: onDelete, destructive: true },
];
