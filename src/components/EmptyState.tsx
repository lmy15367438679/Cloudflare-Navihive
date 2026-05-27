import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 2,
        textAlign: 'center',
      }}
    >
      <Typography
        sx={{
          fontFamily: 'var(--font-heading)',
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          mb: 1,
        }}
      >
        {title}
      </Typography>
      {description && (
        <Typography
          sx={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'var(--text-tertiary)',
            mb: 3,
            maxWidth: 320,
          }}
        >
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAction}
          sx={{
            borderColor: 'var(--color-accent)',
            color: 'var(--color-accent)',
            fontFamily: 'var(--font-heading)',
            '&:hover': {
              borderColor: 'var(--color-accent)',
              bgcolor: 'var(--color-accent-dim)',
            },
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
