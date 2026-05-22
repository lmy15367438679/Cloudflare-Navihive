/**
 * 跨分组批量移动导航卡片组件
 * 支持选择多个站点并移动到目标分组
 */
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Divider,
  IconButton,
  Alert,
  Avatar,
  SelectChangeEvent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import type { Site, Group } from '../../API/http';

interface BatchMoveDialogProps {
  open: boolean;
  onClose: () => void;
  sites: Site[];
  groups: Group[];
  onBatchMove: (siteIds: number[], targetGroupId: number) => Promise<void>;
}

export default function BatchMoveDialog({
  open,
  onClose,
  sites,
  groups,
  onBatchMove,
}: BatchMoveDialogProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [targetGroupId, setTargetGroupId] = useState<number | ''>('');
  const [moving, setMoving] = useState(false);

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === sites.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sites.map((s) => s.id!).filter(Boolean));
    }
  };

  const handleMove = async () => {
    if (selectedIds.length === 0 || !targetGroupId) return;
    setMoving(true);
    try {
      await onBatchMove(selectedIds, targetGroupId);
      setSelectedIds([]);
      setTargetGroupId('');
      onClose();
    } catch (err) {
      console.error('批量移动失败:', err);
    } finally {
      setMoving(false);
    }
  };

  const handleClose = () => {
    setSelectedIds([]);
    setTargetGroupId('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>
        <Box display='flex' justifyContent='space-between' alignItems='center'>
          <Box display='flex' alignItems='center' gap={1}>
            <DriveFileMoveIcon color='primary' />
            <Typography variant='h6' fontWeight='600'>
              批量移动卡片
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size='small'>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        {/* 目标分组选择 */}
        <FormControl fullWidth size='small' sx={{ mb: 2 }}>
          <InputLabel>目标分组</InputLabel>
          <Select
            value={String(targetGroupId)}
            label='目标分组'
            onChange={(e: SelectChangeEvent) => setTargetGroupId(Number(e.target.value))}
          >
            {groups.map((group) => (
              <MenuItem key={group.id} value={group.id}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 统计信息 */}
        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            已选择 {selectedIds.length} / {sites.length} 个站点
          </Typography>
          <Button size='small' onClick={handleSelectAll} sx={{ minWidth: 'auto', fontSize: '0.75rem' }}>
            {selectedIds.length === sites.length ? '取消全选' : '全选'}
          </Button>
        </Box>

        {/* 站点列表 */}
        <List sx={{ maxHeight: 350, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          {sites.map((site) => (
              <ListItemButton
                key={site.id}
                dense
                component="div"
                onClick={() => site.id && handleToggleSelect(site.id)}
                selected={site.id ? selectedIds.includes(site.id) : false}
                sx={{ cursor: 'pointer' }}
              >

              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  edge='start'
                  checked={site.id ? selectedIds.includes(site.id) : false}
                  tabIndex={-1}
                  disableRipple
                  size='small'
                />
              </ListItemIcon>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Avatar
                  src={site.icon || undefined}
                  sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                >
                  {site.name.charAt(0)}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={site.name}
                secondary={site.url}
                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
              />
            </ListItemButton>
          ))}
        </List>

        {selectedIds.length > 0 && targetGroupId && (
          <Alert severity='info' sx={{ mt: 2 }}>
            将 {selectedIds.length} 个站点移动到「{groups.find((g) => g.id === targetGroupId)?.name || '目标分组'}」
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} variant='outlined'>
          取消
        </Button>
        <Button
          onClick={handleMove}
          variant='contained'
          color='primary'
          disabled={selectedIds.length === 0 || !targetGroupId || moving}
          startIcon={<DriveFileMoveIcon />}
        >
          {moving ? '移动中...' : `移动 (${selectedIds.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
