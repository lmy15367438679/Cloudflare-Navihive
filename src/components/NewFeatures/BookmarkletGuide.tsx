/**
 * 一键收藏（浏览器书签脚本）引导组件
 * 提供书签脚本安装和使用说明
 */
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Divider,
  IconButton,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';


interface BookmarkletGuideProps {
  open: boolean;
  onClose: () => void;
  siteUrl?: string;
}

export default function BookmarkletGuide({ open, onClose, siteUrl = window.location.origin }: BookmarkletGuideProps) {
  // 生成书签脚本代码
  const bookmarkletCode = `javascript:(function(){
  const title=document.title;
  const url=window.location.href;
  const icon=document.querySelector('link[rel*="icon"]')?.href||'';
  const desc=document.querySelector('meta[name="description"]')?.content||'';
  fetch('${siteUrl}/api/bookmarklet/add',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    credentials:'include',
    body:JSON.stringify({name:title,url,icon,description:desc})
  }).then(r=>r.json()).then(d=>{
    if(d.success) alert('✓ 已收藏: '+d.site.name);
    else alert('✗ 收藏失败: '+(d.message||'请先登录'));
  }).catch(()=>alert('✗ 收藏失败，请确认已登录'));
})();`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(bookmarkletCode).then(() => {
      alert('脚本代码已复制到剪贴板！');
    });
  };

  const handleDragCode = (e: React.MouseEvent) => {
    // 阻止默认行为，让用户拖拽
    e.preventDefault();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>
        <Box display='flex' justifyContent='space-between' alignItems='center'>
          <Box display='flex' alignItems='center' gap={1}>
            <BookmarkIcon color='primary' />
            <Typography variant='h6' fontWeight='600'>
              一键收藏（书签脚本）
            </Typography>
          </Box>
          <IconButton onClick={onClose} size='small'>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Alert severity='info' sx={{ mb: 3 }}>
          安装书签脚本后，浏览任何网页时点击书签即可一键收藏到导航站。
        </Alert>

        <Stepper orientation='vertical' activeStep={-1}>
          <Step>
            <StepLabel>
              <Typography fontWeight='500'>方法一：拖拽安装（推荐）</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                将下方按钮拖拽到浏览器书签栏即可完成安装
              </Typography>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  textAlign: 'center',
                  cursor: 'grab',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 2,
                  display: 'inline-block',
                  width: '100%',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  userSelect: 'none',
                }}
                component='a'
                href={bookmarkletCode}
                onClick={handleDragCode}
              >
                <Box display='flex' alignItems='center' justifyContent='center' gap={1}>
                  <BookmarkIcon />
                  <Typography fontWeight='600'>📥 收藏到导航站</Typography>
                </Box>
              </Paper>
              <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                如果浏览器书签栏未显示，请按 Ctrl+Shift+B (Windows) 或 Cmd+Shift+B (Mac) 显示书签栏
              </Typography>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>
              <Typography fontWeight='500'>方法二：手动创建书签</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                如果拖拽不生效，可以手动创建书签并粘贴以下代码：
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: 'grey.900',
                  color: 'grey.100',
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  maxHeight: 200,
                  overflow: 'auto',
                  position: 'relative',
                  wordBreak: 'break-all',
                }}
              >
                {bookmarkletCode}
              </Paper>
              <Button
                size='small'
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyCode}
                sx={{ mt: 1 }}
              >
                复制代码
              </Button>
              <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                在浏览器书签管理器中新建书签，名称填"收藏到导航站"，URL粘贴上述代码
              </Typography>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>
              <Typography fontWeight='500'>使用方法</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant='body2' color='text.secondary'>
                1. 确保已在导航站登录管理员账号
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                2. 浏览任意网页时，点击书签栏的"收藏到导航站"
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                3. 页面会自动添加到导航站的默认分组中
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                <Chip label='提示' size='small' color='info' variant='outlined' sx={{ mr: 0.5 }} />
                收藏成功后可在导航站编辑站点信息，调整分组和可见性
              </Typography>
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant='contained' color='primary'>
          完成
        </Button>
      </DialogActions>
    </Dialog>
  );
}
