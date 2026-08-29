import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Group } from '../API/http';

interface EditGroupDialogProps {
  open: boolean;
  group: Group | null;
  onClose: () => void;
  onSave: (group: Group) => void;
}

const EditGroupDialog: React.FC<EditGroupDialogProps> = ({ open, group, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // 当弹窗打开时，初始化名称和公开状态
  React.useEffect(() => {
    if (group) {
      setName(group.name);
      setIsPublic(group.is_public !== 0);
    }
  }, [group, open]);

  const handleSave = () => {
    if (!group || !name.trim()) return;

    if (!group.id) {
      console.error('分组 ID 不存在,无法保存');
      return;
    }

    onSave({
      ...group,
      id: group.id,
      name: name.trim(),
      is_public: isPublic ? 1 : 0,
    });
  };

  if (!group) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>编辑分组</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1 }}>
          <TextField
            label='分组名称'
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            variant='outlined'
            autoFocus
          />
        </Box>

        {/* 公开/私密开关 */}
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                color='primary'
              />
            }
            label={
              <Box>
                <Typography variant='body1'>{isPublic ? '公开分组' : '私密分组'}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {isPublic ? '所有访客都可以看到此分组' : '只有管理员登录后才能看到此分组'}
                </Typography>
              </Box>
            }
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='inherit'>
          取消
        </Button>
        <Button onClick={handleSave} color='primary' variant='contained' disabled={!name.trim()}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditGroupDialog;
