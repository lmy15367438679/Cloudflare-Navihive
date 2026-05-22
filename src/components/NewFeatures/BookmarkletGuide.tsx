/**
 * 一键收藏（浏览器书签脚本）引导组件
 * 简化版：留出上传书签URL的地方，主要解决一键收藏功能
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
  Paper,
  Divider,
  IconButton,
  Alert,
  TextField,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

interface BookmarkletGuideProps {
  open: boolean;
  onClose: () => void;
  siteUrl?: string;
}

export default function BookmarkletGuide({ open, onClose, siteUrl = window.location.origin }: BookmarkletGuideProps) {
  // 允许用户自定义导航站URL
  const [customUrl, setCustomUrl] = useState(siteUrl);

  // 生成书签脚本代码 - 简化版，只做一键收藏
  const bookmarkletCode = `javascript:(function(){
  const t=document.title;
  const u=window.location.href;
  const i=(document.querySelector('link[rel*="icon"]')||document.querySelector('link[rel="shortcut icon"]'))?.href||'';
  const d=document.querySelector('meta[name="description"]')?.content||'';
  fetch('${customUrl}/api/bookmarklet/add',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    credentials:'include',
    body:JSON.stringify({name:t,url:u,icon:i,description:d})
  }).then(r=>r.json()).then(d=>{
    if(d.success){
      alert('✓ 已收藏: '+d.site.name);
    }else{alert('✗ 收藏失败: '+(d.message||'请先登录导航站'));}
  }).catch(()=>alert('✗ 请求失败，请确认已登录导航站'));
})();`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(bookmarkletCode).then(() => {
      alert('脚本代码已复制到剪贴板！');
    });
  };

  const handleDownload = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>安装书签脚本 - 导航站</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; background: #f5f5f5;">
  <div style="background: white; border-radius: 16px; padding: 40px 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <h1 style="font-size: 24px; margin: 0 0 8px;">📥 一键收藏书签脚本</h1>
    <p style="color: #666; margin-bottom: 30px;">将下方按钮拖拽到浏览器书签栏即可安装</p>
    <a href="${bookmarkletCode}"
       style="display: inline-block; padding: 14px 28px; background: #1976d2; color: white;
              text-decoration: none; border-radius: 8px; font-size: 18px; cursor: grab;
              box-shadow: 0 2px 8px rgba(25,118,210,0.3);">
      ⭐ 收藏到导航站
    </a>
    <p style="color: #999; margin-top: 30px; font-size: 14px;">
      如果书签栏未显示，请按 <b>Ctrl+Shift+B</b> (Windows) 或 <b>Cmd+Shift+B</b> (Mac) 显示
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 13px;">
      手动创建书签：新建书签 → 名称填"收藏到导航站" → URL粘贴下方代码
    </p>
    <div style="background: #1a1a2e; color: #e0e0e0; border-radius: 8px; padding: 16px; font-size: 12px; text-align: left; word-break: break-all; max-height: 200px; overflow: auto;">
      ${bookmarkletCode}
    </div>
  </div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'navihive-bookmarklet.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

        {/* 导航站URL设置 - 留出上传书签URL的地方 */}
        <Paper variant='outlined' sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant='subtitle2' gutterBottom fontWeight='600'>
            🌐 导航站地址
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
            如果书签脚本收藏的导航站地址不正确，请在此修改：
          </Typography>
          <TextField
            fullWidth
            size='small'
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder='https://your-navihive.pages.dev'
            helperText='修改后书签脚本代码会自动更新'
          />
        </Paper>

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
                onClick={(e) => e.preventDefault()}
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
                <b>第三步：</b>收藏成功后弹出提示，站点将添加到导航站
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                <b>第四步：</b>在导航站编辑站点信息，调整分组和可见性
              </Typography>
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
        <Button
          onClick={handleDownload}
          variant='outlined'
          color='primary'
          fullWidth
          startIcon={<FileDownloadIcon />}
        >
          下载书签安装页（HTML）
        </Button>
        <Button onClick={onClose} variant='contained' color='primary' fullWidth>
          完成
        </Button>
      </DialogActions>
    </Dialog>
  );
}
