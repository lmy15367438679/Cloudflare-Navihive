import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GroupWithSites } from '../types';
import { Paper, Typography, Box } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface SortableGroupItemProps {
  id: string;
  group: GroupWithSites;
}

export default function SortableGroupItem({ id, group }: SortableGroupItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 9999 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      sx={{
        p: 3,
        borderRadius: 'var(--radius-lg)',
        // 只过渡会被动画的属性（transform/box-shadow/border-color），避免 transition: all
        // 在拖拽重排时触发整卡逐帧重绘（数百卡片场景的掉帧来源）
        transition: isDragging ? 'none !important' : 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
        border: '1px solid var(--color-border)',
        boxShadow: isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        bgcolor: 'var(--color-card)',
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        '&:hover': {
          borderColor: 'var(--color-border-strong)',
          boxShadow: 'var(--shadow-md)',
        },
        ...(isDragging && {
          outline: '2px solid var(--color-focus-ring)',
          transform: 'none',
          '& *': {
            transition: 'none !important',
          },
        }),
      }}
      {...attributes}
      {...listeners}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          userSelect: 'none',
          transition: isDragging ? 'none' : 'inherit',
        }}
      >
        <DragIndicatorIcon
          sx={{
            mr: 2,
            color: 'var(--color-accent)',
            opacity: 0.7,
          }}
        />
        <Typography variant='h5' component='h2' fontWeight='600' color='text.primary'>
          {group.name}
        </Typography>
      </Box>
    </Paper>
  );
}
