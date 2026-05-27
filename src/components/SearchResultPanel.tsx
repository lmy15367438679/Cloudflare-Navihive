/**
 * 搜索结果面板组件
 * 显示站内搜索结果的下拉面板
 * 支持 ARIA 无障碍、键盘导航高亮、空状态提示
 */

import React from 'react';
import {
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  Box,
  Divider,
} from '@mui/material';
import {
  Language as LanguageIcon,
  Folder as FolderIcon,
  SearchOff as SearchOffIcon,
} from '@mui/icons-material';
import type { SearchResultItem } from '../utils/search';

interface SearchResultPanelProps {
  results: SearchResultItem[];
  query: string;
  onResultClick: (result: SearchResultItem) => void;
  open: boolean;
  /** 当前键盘导航选中的索引（-1 表示无选中） */
  selectedIndex?: number;
}

const SearchResultPanel: React.FC<SearchResultPanelProps> = ({
  results,
  query,
  onResultClick,
  open,
  selectedIndex = -1,
}) => {
  // 未打开或无查询词时不渲染
  if (!open || !query) {
    return null;
  }

  // 高亮匹配文本
  const highlightText = (text: string, query: string) => {
    if (!text || !query) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return text;

    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    return (
      <>
        {before}
        <Box
          component='span'
          sx={{
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            padding: '0 2px',
            borderRadius: '2px',
          }}
        >
          {match}
        </Box>
        {after}
      </>
    );
  };

  // ===== 空状态（有查询词但无结果） =====
  if (results.length === 0) {
    return (
      <Paper
        elevation={8}
        role='region'
        aria-label='搜索结果'
        sx={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          mt: 1,
          zIndex: 1300,
          borderRadius: 2,
          overflow: 'hidden',
          animation: 'fadeIn 150ms ease-out',
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(-4px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        {/* aria-live 播报 — 对屏幕阅读器隐藏 */}
        <Box aria-live='polite' aria-atomic='true' sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
        }}>
          未找到 {query} 的相关结果
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 4,
            px: 3,
            textAlign: 'center',
          }}
        >
          <SearchOffIcon
            sx={{ fontSize: 48, color: 'action.disabled', mb: 1.5 }}
          />
          <Typography variant='body1' color='text.secondary' sx={{ fontWeight: 500 }}>
            未找到「{query}」相关结果
          </Typography>
          <Typography variant='caption' color='text.disabled' sx={{ mt: 0.5 }}>
            试试不同的关键词，或检查拼写
          </Typography>
        </Box>
      </Paper>
    );
  }

  // ===== 有结果 =====
  return (
    <Paper
      elevation={8}
      role='region'
      aria-label='搜索结果'
      sx={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        mt: 1,
        maxHeight: '400px',
        overflowY: 'auto',
        zIndex: 1300,
        borderRadius: 2,
        animation: 'fadeIn 150ms ease-out',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(-4px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {/* aria-live 播报结果数量 — 对屏幕阅读器隐藏 */}
      <Box aria-live='polite' aria-atomic='true' sx={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
      }}>
        找到 {results.length} 个结果
      </Box>

      <List id='search-results-list' role='listbox' sx={{ py: 0 }}>
        {results.map((result, index) => (
          <React.Fragment key={`${result.type}-${result.id}`}>
            {index > 0 && <Divider />}
            <ListItem
              disablePadding
              role='option'
              aria-selected={index === selectedIndex}
              id={`search-result-${index}`}
            >
              <ListItemButton
                onClick={() => onResultClick(result)}
                selected={index === selectedIndex}
                sx={{
                  transition: 'background-color 100ms ease',
                  ...(index === selectedIndex && {
                    bgcolor: 'action.selected',
                    '&:hover': { bgcolor: 'action.selected' },
                  }),
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                    py: 0.5,
                  }}
                >
                  {/* 图标 */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      bgcolor: result.type === 'site' ? 'primary.light' : 'secondary.light',
                      color: result.type === 'site' ? 'primary.main' : 'secondary.main',
                      transition: 'background-color 150ms ease',
                      ...(index === selectedIndex && {
                        bgcolor: result.type === 'site' ? 'primary.main' : 'secondary.main',
                        color: '#fff',
                      }),
                    }}
                  >
                    {result.type === 'site' ? <LanguageIcon /> : <FolderIcon />}
                  </Box>

                  {/* 内容 */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant='body1'
                            sx={{
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {highlightText(result.name, query)}
                          </Typography>
                          <Chip
                            label={result.type === 'site' ? '站点' : '分组'}
                            size='small'
                            color={result.type === 'site' ? 'primary' : 'secondary'}
                            sx={{ height: 20, flexShrink: 0 }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          {result.type === 'site' && result.groupName && (
                            <Typography
                              variant='caption'
                              sx={{ color: 'text.secondary', display: 'block' }}
                            >
                              分组: {result.groupName}
                            </Typography>
                          )}
                          {result.url && (
                            <Typography
                              variant='caption'
                              sx={{
                                color: 'text.secondary',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {highlightText(result.url, query)}
                            </Typography>
                          )}
                          {result.description && (
                            <Typography
                              variant='caption'
                              sx={{
                                color: 'text.secondary',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {highlightText(result.description, query)}
                            </Typography>
                          )}
                          {result.notes && (
                            <Typography
                              variant='caption'
                              sx={{
                                color: 'text.secondary',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              备注: {highlightText(result.notes, query)}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </Box>
                </Box>
              </ListItemButton>
            </ListItem>
          </React.Fragment>
        ))}
      </List>

      {/* 结果统计 */}
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: 'action.hover',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant='caption' color='text.secondary'>
          共 {results.length} 个结果
        </Typography>
        {results.length >= 50 && (
          <Typography variant='caption' color='text.disabled' sx={{ ml: 1 }}>
            （显示前 50 条）
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default SearchResultPanel;
