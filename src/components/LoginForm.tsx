import React, { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

interface LoginFormProps {
  onLogin: (username: string, password: string, rememberMe: boolean) => void;
  /** 游客访问：无需登录即可浏览公开内容 */
  onGuestLogin?: () => void;
  /** 是否开放游客访问（由后端 AUTH_REQUIRED_FOR_READ 决定） */
  guestAvailable?: boolean;
  loading?: boolean;
  error?: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onGuestLogin,
  guestAvailable = false,
  loading = false,
  error = null,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password, rememberMe);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '100%',
        p: { xs: 2, sm: 4 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: { xs: '90%', sm: 400 },
          bgcolor: 'var(--color-elevated)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Box
            sx={{
              mb: 2,
              width: 56,
              height: 56,
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'var(--color-accent)',
              color: 'white',
            }}
          >
            <LockOutlinedIcon fontSize='large' />
          </Box>
          <Typography
            component='h1'
            variant='h5'
            fontWeight={700}
            textAlign='center'
            sx={{ fontFamily: 'var(--font-heading)' }}
          >
            导航站登录
          </Typography>
        </Box>

        {error && (
          <Alert
            severity='error'
            sx={{
              mb: 3,
              bgcolor: 'rgba(239,68,68,0.1)',
              color: 'var(--color-destructive)',
              border: '1px solid var(--color-destructive)',
              '& .MuiAlert-icon': {
                color: 'var(--color-destructive)',
              },
            }}
          >
            {error}
          </Alert>
        )}

        <Box component='form' onSubmit={handleSubmit}>
          <TextField
            margin='normal'
            required
            fullWidth
            id='username'
            label='用户名'
            name='username'
            autoComplete='username'
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />
          <TextField
            margin='normal'
            required
            fullWidth
            name='password'
            label='密码'
            type='password'
            id='password'
            autoComplete='current-password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                value='remember'
                color='primary'
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
            }
            label='记住我（一个月内免登录）'
            sx={{ mb: 2 }}
          />
          <Button
            type='submit'
            fullWidth
            variant='contained'
            color='primary'
            disabled={loading || !username || !password}
            size='large'
            sx={{
              py: 1.5,
              mt: 2,
              mb: 2,
              borderRadius: 2,
            }}
          >
            {loading ? <CircularProgress size={24} color='inherit' /> : '登录'}
          </Button>
        </Box>

        {guestAvailable && onGuestLogin && (
          <Box sx={{ mt: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                my: 1.5,
                color: 'var(--text-secondary)',
              }}
            >
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'var(--color-border)' }} />
              <Typography variant='caption' sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                或
              </Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'var(--color-border)' }} />
            </Box>
            <Button
              type='button'
              fullWidth
              variant='outlined'
              onClick={onGuestLogin}
              disabled={loading}
              size='large'
              sx={{
                py: 1.2,
                borderRadius: 2,
                borderColor: 'var(--color-border)',
                color: 'var(--text-secondary)',
                '&:hover': {
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-accent)',
                  bgcolor: 'transparent',
                },
              }}
            >
              游客访问 · 浏览公开内容
            </Button>
            <Typography
              variant='caption'
              sx={{
                display: 'block',
                textAlign: 'center',
                mt: 1,
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              无需账号密码，仅可查看公开的分组与站点
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default LoginForm;
