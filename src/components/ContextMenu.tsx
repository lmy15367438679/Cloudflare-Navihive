import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Paper, MenuList, MenuItem, ListItemIcon, ListItemText, Divider, ClickAwayListener } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import SortIcon from '@mui/icons-material/Sort';
import type { ReactNode } from 'react';

import { Group } from '../API/http';

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
  const menuRef = useRef<HTMLDivElement>(null);

  // 计算菜单位置，防止超出视口
  const getAdjustedPosition = useCallback(() => {
    if (!position || !menuRef.current) return { left: position?.x ?? 0, top: position?.y ?? 0 };

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = position.x;
    let top = position.y;

    // 如果菜单超出右边界，向左偏移
    if (left + menuRect.width > viewportW - 8) {
      left = viewportW - menuRect.width - 8;
    }
    // 如果菜单超出下边界，向上偏移
    if (top + menuRect.height > viewportH - 8) {
      top = viewportH - menuRect.height - 8;
    }

    return { left, top };
  }, [position]);

  if (!position) return null;

  return (
    <Box
      ref={popperRef}
      sx={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1300,
      }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Paper
          ref={menuRef}
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
}

export const siteContextActions = (
  onEdit: () => void,
  onDelete: () => void,
  groups?: Group[],
  onMoveGroup?: (targetGroupId: number) => void,
): ContextMenuAction[] => {
  const actions: ContextMenuAction[] = [
    { label: '编辑', icon: <EditIcon fontSize="small" />, onClick: onEdit },
  ];

  if (groups && groups.length > 0 && onMoveGroup) {
    actions.push({
      label: '移动到分组',
      icon: <DriveFileMoveIcon fontSize="small" />,
      onClick: () => {}, // 子菜单由 MenuList 处理
      dividerAfter: true,
    });
    groups.forEach((group) => {
      actions.push({
        label: `  ↳ ${group.name}`,
        onClick: () => onMoveGroup(group.id as number),
      });
    });
  } else {
    actions.push({
      label: '移动到分组',
      icon: <DriveFileMoveIcon fontSize="small" />,
      onClick: () => {},
      dividerAfter: true,
    });
  }

  actions.push({ label: '删除', icon: <DeleteIcon fontSize="small" />, onClick: onDelete, destructive: true });
  return actions;
};

export const groupContextActions = (
  onSort: () => void,
  onEdit: () => void,
  onDelete: () => void
): ContextMenuAction[] => [
  { label: '编辑排序', icon: <SortIcon fontSize="small" />, onClick: onSort, dividerAfter: true },
  { label: '编辑', icon: <EditIcon fontSize="small" />, onClick: onEdit },
  { label: '删除', icon: <DeleteIcon fontSize="small" />, onClick: onDelete, destructive: true },
];
