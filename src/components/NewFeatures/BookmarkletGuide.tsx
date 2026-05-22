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
                如果浏览器书签栏未显示，请按 <b>Ctrl+Shift+B</b> (Windows) 或 <b>Cmd+Shift+B</b> (Mac) 显示书签栏
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
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                <b>第一步：</b>确保已在导航站登录管理员账号
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                <b>第二步：</b>浏览任意网页时，点击书签栏的"收藏到导航站"
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                <b>第三步：</b>页面会自动添加到导航站的默认分组中
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                <b>第四步：</b>在导航站编辑站点信息，调整分组和可见性
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                <Chip label='提示' size='small' color='info' variant='outlined' sx={{ mr: 0.5 }} />
                收藏成功后可在导航站编辑站点信息，调整分组和可见性
              </Typography>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>
              <Typography fontWeight='500'>常见问题</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                <b>Q：点击书签后没有反应？</b>
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                A：请确认已登录导航站管理员账号。部分浏览器可能阻止跨域请求，请检查浏览器控制台是否有错误信息。
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                <b>Q：收藏的站点出现在哪个分组？</b>
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                A：默认添加到第一个分组。收藏后可在导航站编辑站点信息，将其移动到其他分组。
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                <b>Q：如何在不同浏览器间同步书签？</b>
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                A：在每个浏览器中分别安装书签脚本即可。所有收藏都会保存到同一个导航站。
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                <b>Q：书签脚本安全吗？</b>
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                A：脚本仅读取当前页面的标题、URL、图标和描述信息，不会读取其他数据。所有数据仅发送到您自己的导航站服务器。
              </Typography>
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
        <Button onClick={onClose} variant='contained' color='primary' fullWidth>
          完成
        </Button>
      </DialogActions>
    </Dialog>
  );
}
