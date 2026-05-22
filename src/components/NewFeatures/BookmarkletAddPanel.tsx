/**
 * 一键收藏弹窗面板组件
 * 当用户通过书签脚本点击时，在弹窗中渲染此面板
 * 支持选择分组、修改标题、设置公开/私密
 */
import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  CircularProgress,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { extractDomain } from '../../utils/url';

interface BookmarkletAddPanelProps {
  initialData: {
    title: string;
    url: string;
    icon: string;
    description: string;
  };
  groups: any[];
  configs: Record<string, string>;
  onSave: (siteData: any) => Promise<void>;
  onClose: () => void;
  handleError: (msg: string) => void;
}

export default function BookmarkletAddPanel({
  initialData,
  groups,
  configs,
  onSave,
  onClose,
  handleError,
}: BookmarkletAddPanelProps) {
  // 自动填充解析来的数据
  const [name, setName] = useState(initialData.title);
  const [url, setUrl] = useState(initialData.url);
  const [icon, setIcon] = useState(initialData.icon);
  const [description, setDescription] = useState(initialData.description);
  const [groupId, setGroupId] = useState<number | string>('');
  const [isPublic, setIsPublic] = useState(1);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // 当可用分组数据加载完毕后，默认选定第一个分组作为填充
  useEffect(() => {
    if (groups && groups.length > 0) {
      setGroupId(groups[0].id);
    }
  }, [groups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) {
      handleError('站点名称和 URL 不能为空');
      return;
    }
    if (!groupId) {
      handleError('请选择目标分组');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        name,
        url,
        icon,
        description,
        group_id: Number(groupId),
        is_public: isPublic,
        order_num: 0,
      });
      setSuccess(true);
      // 成功后延迟关闭弹窗
      setTimeout(() => {
        onClose(); // 添加成功后关闭弹出的迷你窗口
      }, 1500);
    } catch (err) {
      console.error(err);
      handleError('快捷收藏失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  // 收藏成功视图
  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          px: 2,
        }}
      >
        <Container maxWidth="xs" sx={{ p: 0 }}>
          <Paper elevation={4} sx={{ p: 4, borderRadius: 3, width: '100%', textAlign: 'center' }}>
            <Typography variant="h3" sx={{ mb: 2 }}>✅</Typography>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              收藏成功！
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              「{name}」已添加到导航站
            </Typography>
            <Typography variant="caption" color="text.secondary">
              窗口即将自动关闭...
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="xs" sx={{ p: 0 }}>
        <Paper elevation={4} sx={{ p: 3, borderRadius: 3, width: '100%' }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <BookmarkIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              一键保存到导航站
            </Typography>
          </Box>
          <form onSubmit={handleSubmit}>
            <TextField
              label="页面名称"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
              size="small"
            />
            <TextField
              label="网页链接 (URL)"
              fullWidth
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              margin="normal"
              required
              size="small"
            />
            <TextField
              label="图标 URL"
              fullWidth
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              margin="normal"
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => {
                        if (!url) {
                          handleError('请先输入网页链接');
                          return;
                        }
                        const domain = extractDomain(url);
                        if (domain) {
                          const actualIconApi =
                            configs['site.iconApi'] ||
                            'https://www.faviconextractor.com/favicon/{domain}?larger=true';
                          setIcon(actualIconApi.replace('{domain}', domain));
                        } else {
                          handleError('无法从URL中提取域名');
                        }
                      }}
                      edge="end"
                      title="自动获取图标"
                      size="small"
                    >
                      <AutoFixHighIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="网页描述"
              fullWidth
              multiline
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
              size="small"
            />

            {/* 可选分组选择器 */}
            <FormControl fullWidth margin="normal" size="small" required>
              <InputLabel id="select-group-label">存入分组</InputLabel>
              <Select
                labelId="select-group-label"
                value={groupId}
                label="存入分组"
                onChange={(e) => setGroupId(e.target.value)}
              >
                {groups.map((g: any) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={isPublic === 1}
                  onChange={(e) => setIsPublic(e.target.checked ? 1 : 0)}
                  color="primary"
                />
              }
              label={isPublic === 1 ? '公开站点 (所有访客可见)' : '私密站点 (仅管理员可见)'}
              sx={{ mt: 1, mb: 2, '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
            />

            <Box display="flex" gap={2} mt={1}>
              <Button
                variant="outlined"
                fullWidth
                onClick={onClose}
                disabled={saving}
                size="small"
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={saving || groups.length === 0}
                size="small"
              >
                {saving ? <CircularProgress size={20} /> : '确定收藏'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
