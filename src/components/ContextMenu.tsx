import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Paper, MenuList, MenuItem, ListItemIcon, ListItemText, Divider, Popper, ClickAwayListener } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import SortIcon from '@mui/icons-material/Sort';
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

  return (
    <Popper
      open
      anchorEl={null}
      placement="bottom-start"
      ref={popperRef}
      sx={{ zIndex: 1300 }}
      modifiers={[
        {
          name: 'offset',
          options: { offset: [position.x, position.y] },
        },
      ]}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Paper
          elevation={0}
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
    </Popper>
  );
}

export const siteContextActions = (
  onEdit: () => void,
  onMove: () => void,
  onDelete: () => void
): ContextMenuAction[] => [
  { label: '编辑', icon: <EditIcon fontSize="small" />, onClick: onEdit },
  { label: '移动到分组', icon: <DriveFileMoveIcon fontSize="small" />, onClick: onMove, dividerAfter: true },
  { label: '删除', icon: <DeleteIcon fontSize="small" />, onClick: onDelete, destructive: true },
];

export const groupContextActions = (
  onSort: () => void,
  onEdit: () => void,
  onDelete: () => void
): ContextMenuAction[] => [
  { label: '编辑排序', icon: <SortIcon fontSize="small" />, onClick: onSort, dividerAfter: true },
  { label: '编辑', icon: <EditIcon fontSize="small" />, onClick: onEdit },
  { label: '删除', icon: <DeleteIcon fontSize="small" />, onClick: onDelete, destructive: true },
];
