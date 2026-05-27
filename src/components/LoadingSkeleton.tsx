import { Box, Skeleton } from '@mui/material';

export default function LoadingSkeleton() {
  const siteCards = Array.from({ length: 6 }, (_, i) => (
    <Box
      key={i}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        bgcolor: 'var(--color-card)',
        minHeight: 56,
      }}
    >
      <Skeleton variant="rounded" width={28} height={28} sx={{ flexShrink: 0, borderRadius: '4px' }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Skeleton variant="text" width="60%" height={16} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="80%" height={12} />
      </Box>
    </Box>
  ));

  const groupSections = Array.from({ length: 3 }, (_, i) => (
    <Box key={i} sx={{ mb: 5 }}>
      {/* Group header skeleton */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Skeleton variant="rounded" width={20} height={20} />
        <Skeleton variant="text" width={120} height={24} />
        <Skeleton variant="rounded" width={56} height={28} sx={{ ml: 'auto' }} />
      </Box>
      {/* Site cards grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: '1fr 1fr 1fr',
            lg: '1fr 1fr 1fr 1fr',
          },
          gap: 1.5,
        }}
      >
        {siteCards.slice(0, i === 1 ? 8 : 4)}
      </Box>
    </Box>
  ));

  return (
    <Box sx={{ minHeight: '100px', px: { xs: 2, sm: 3, md: 4 } }}>
      {groupSections}
    </Box>
  );
}
