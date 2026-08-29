/**
 * 一键链接检测组件
 * 批量检测所有站点URL的可访问性
 */
import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Chip,
  IconButton,
  Divider,
  Alert,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import TimerIcon from '@mui/icons-material/Timer';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { Site } from '../../API/http';

interface LinkCheckResult {
  url: string;
  status: 'ok' | 'redirect' | 'error' | 'timeout';
  statusCode?: number;
  error?: string;
  duration?: number;
}

interface LinkCheckerProps {
  open: boolean;
  onClose: () => void;
  sites: Site[];
  apiBaseUrl?: string;
}

export default function LinkChecker({
  open,
  onClose,
  sites,
  apiBaseUrl = '/api',
}: LinkCheckerProps) {
  const [results, setResults] = useState<LinkCheckResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleCheckLinks = useCallback(async () => {
    if (sites.length === 0) return;

    setChecking(true);
    setProgress(0);
    setResults([]);

    const urls = sites.map((s) => s.url);
    const batchSize = 20;
    const allResults: LinkCheckResult[] = [];

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      try {
        const response = await fetch(`${apiBaseUrl}/check-links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ urls: batch }),
        });
        const data = await response.json();
        if (data.success && data.results) {
          allResults.push(...data.results);
        }
      } catch {
        // API 调用失败，使用前端模拟检测
        for (const url of batch) {
          allResults.push({
            url,
            status: 'error',
            error: '检测服务不可用',
          });
        }
      }
      setProgress(Math.min(((i + batchSize) / urls.length) * 100, 100));
    }

    setResults(allResults);
    setProgress(100);
    setChecking(false);
  }, [sites, apiBaseUrl]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'redirect':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'error':
      case 'timeout':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      default:
        return <WarningIcon />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ok':
        return '正常';
      case 'redirect':
        return '重定向';
      case 'error':
        return '异常';
      case 'timeout':
        return '超时';
      default:
        return '未知';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'success' as const;
      case 'redirect':
        return 'warning' as const;
      case 'error':
      case 'timeout':
        return 'error' as const;
      default:
        return 'default' as const;
    }
  };

  const stats = {
    total: results.length,
    ok: results.filter((r) => r.status === 'ok').length,
    redirect: results.filter((r) => r.status === 'redirect').length,
    error: results.filter((r) => r.status === 'error' || r.status === 'timeout').length,
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        <Box display='flex' justifyContent='space-between' alignItems='center'>
          <Typography variant='h6' fontWeight='600'>
            链接检测
          </Typography>
          <IconButton onClick={onClose} size='small'>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant='body2' color='text.secondary' gutterBottom>
            检测所有站点链接的可用性，共 {sites.length} 个站点
          </Typography>
          {!checking && results.length === 0 && (
            <Alert severity='info' sx={{ mt: 1 }}>
              点击"开始检测"按钮，系统将批量检查所有站点链接是否可访问。
              每次最多检测20个链接，超时时间为10秒。
            </Alert>
          )}
        </Box>

        {checking && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress variant='determinate' value={progress} />
            <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
              检测中... {Math.round(progress)}%
            </Typography>
          </Box>
        )}

        {results.length > 0 && (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`正常 ${stats.ok}`}
                color='success'
                size='small'
                variant='outlined'
              />
              <Chip
                icon={<WarningIcon />}
                label={`重定向 ${stats.redirect}`}
                color='warning'
                size='small'
                variant='outlined'
              />
              <Chip
                icon={<ErrorIcon />}
                label={`异常 ${stats.error}`}
                color='error'
                size='small'
                variant='outlined'
              />
              <Chip
                icon={<TimerIcon />}
                label={`总计 ${stats.total}`}
                color='default'
                size='small'
                variant='outlined'
              />
            </Box>

            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {results.map((result, index) => {
                const site = sites.find((s) => s.url === result.url);
                return (
                  <ListItem key={index} divider>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {getStatusIcon(result.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display='flex' alignItems='center' gap={1}>
                          <Typography variant='body2' fontWeight='500'>
                            {site?.name || '未知站点'}
                          </Typography>
                          <Chip
                            label={getStatusLabel(result.status)}
                            color={getStatusColor(result.status)}
                            size='small'
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant='caption' display='block' color='text.secondary'>
                            {result.url}
                          </Typography>
                          {result.statusCode && (
                            <Typography variant='caption' color='text.secondary'>
                              状态码: {result.statusCode}
                              {result.duration && ` | 耗时: ${result.duration}ms`}
                            </Typography>
                          )}
                          {result.error && (
                            <Typography variant='caption' color='error'>
                              错误: {result.error}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant='outlined'>
          关闭
        </Button>
        <Button
          onClick={handleCheckLinks}
          variant='contained'
          color='primary'
          disabled={checking || sites.length === 0}
          startIcon={<PlayArrowIcon />}
        >
          {checking ? '检测中...' : '开始检测'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
