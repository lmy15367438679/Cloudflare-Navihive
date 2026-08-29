import type { ReactNode } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';

export interface ContextMenuAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  destructive?: boolean;
  dividerAfter?: boolean;
}

export const siteContextActions = (
  onEdit: () => void,
  onDelete: () => void,
  onMoveGroupRequest?: () => void
): ContextMenuAction[] => {
  const actions: ContextMenuAction[] = [
    { label: '编辑', icon: <EditIcon fontSize='small' />, onClick: onEdit },
  ];

  if (onMoveGroupRequest) {
    actions.push({
      label: '移动到分组',
      icon: <DriveFileMoveIcon fontSize='small' />,
      onClick: onMoveGroupRequest,
      dividerAfter: true,
    });
  }

  actions.push({
    label: '删除',
    icon: <DeleteIcon fontSize='small' />,
    onClick: onDelete,
    destructive: true,
  });
  return actions;
};

export const groupContextActions = (onDelete: () => void): ContextMenuAction[] => [
  { label: '删除', icon: <DeleteIcon fontSize='small' />, onClick: onDelete, destructive: true },
];
