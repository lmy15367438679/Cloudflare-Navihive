// src/components/ThemeToggle.tsx
import { IconButton, Tooltip } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

interface ThemeToggleProps {
  darkMode: boolean;
  onToggle: () => void;
}

export default function ThemeToggle({ darkMode, onToggle }: ThemeToggleProps) {
  return (
    <Tooltip title={darkMode ? '切换到浅色模式' : '切换到深色模式'}>
      <IconButton
        onClick={onToggle}
        color='inherit'
        aria-label='切换主题'
        sx={{
          p: 1.5,
          borderRadius: '50%',
          bgcolor: 'var(--color-elevated)',
          boxShadow: 'var(--shadow-sm)',
          color: 'var(--text-primary)',
          '&:hover': {
            bgcolor: 'var(--color-card-hover)',
          },
        }}
      >
        {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
