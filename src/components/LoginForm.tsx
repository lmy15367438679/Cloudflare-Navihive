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
  loading?: boolean;
  error?: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, loading = false, error = null }) => {
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
          <Alert severity='error' sx={{
            mb: 3,
            bgcolor: 'rgba(239,68,68,0.1)',
            color: 'var(--color-destructive)',
            border: '1px solid var(--color-destructive)',
            '& .MuiAlert-icon': {
              color: 'var(--color-destructive)',
            },
          }}>
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
      </Paper>
    </Box>
  );
};

export default LoginForm;
