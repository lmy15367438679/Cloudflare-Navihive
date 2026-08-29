/**
 * 搜索框组件
 * 支持站内搜索和站外搜索引擎跳转
 * 符合 WAI-ARIA combobox 模式，支持键盘导航
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
  InputBase,
  IconButton,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Menu,
  MenuItem,
  Tooltip,
  Avatar,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  TravelExplore as GlobalIcon,
  HomeWork as LocalIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import SearchResultPanel from './SearchResultPanel';
import { searchInternal, type SearchResultItem } from '../utils/search';
import {
  SEARCH_ENGINES,
  getDefaultSearchEngine,
  getSearchEngineByKey,
  buildSearchUrl,
  isUrl,
  normalizeUrl,
  type SearchEngine,
} from '../config/searchEngines';
import type { Group, Site } from '../API/http';
import { FOCUS_SEARCH_EVENT } from '../hooks/useSearchShortcut';

interface SearchBoxProps {
  groups: Group[];
  sites: Site[];
  onInternalResultClick?: (result: SearchResultItem) => void;
}

type SearchMode = 'internal' | 'external';

/**
 * 快捷键提示徽标（⌘K / Ctrl+K）
 *
 * 仅在输入框为空时显示，避免与「清空 / 搜索」按钮争抢宽度；移动端隐藏
 *（触屏无物理键盘，提示无意义且占用窄屏空间）。
 * aria-hidden：它只是视觉提示，键盘可用性已由 input 的 aria-keyshortcuts 声明。
 */
function SearchShortcutHint({ isMac }: { isMac: boolean }) {
  return (
    <Box
      component='kbd'
      aria-hidden='true'
      title='按此快捷键聚焦搜索框'
      sx={{
        flexShrink: 0,
        mr: 0.5,
        px: 0.75,
        py: 0.25,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        bgcolor: 'var(--color-card-hover)',
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-heading)',
        fontSize: '11px',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        display: { xs: 'none', sm: 'inline-flex' },
        transition: 'color 150ms ease, background-color 150ms ease',
      }}
    >
      {isMac ? '⌘K' : 'Ctrl K'}
    </Box>
  );
}

const SearchBox: React.FC<SearchBoxProps> = ({ groups, sites, onInternalResultClick }) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('internal');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedEngine, setSelectedEngine] = useState<SearchEngine>(getDefaultSearchEngine());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isOpening, setIsOpening] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsListId = 'search-results-list';

  // 平台探测（仅用于展示 ⌘K / Ctrl+K 键位徽标与 aria-keyshortcuts 文案）
  const isMac = useMemo(() => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent), []);

  // 处理站内搜索（带 try-catch 保护）
  const handleInternalSearch = useCallback(
    (searchQuery: string) => {
      try {
        if (!searchQuery.trim()) {
          setResults([]);
          setShowResults(false);
          return;
        }

        const searchResults = searchInternal(searchQuery, groups, sites);
        setResults(searchResults);
        setShowResults(true);
      } catch (error) {
        console.error('站内搜索失败:', error);
        setResults([]);
        setShowResults(false);
      }
    },
    [groups, sites]
  );

  // 处理输入变化（带防抖）
  useEffect(() => {
    // 查询变化时重置选中索引
    setSelectedIndex(-1);

    if (mode === 'internal') {
      const timer = setTimeout(() => {
        handleInternalSearch(query);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setShowResults(false);
    }

    return undefined;
  }, [query, mode, handleInternalSearch]);

  // 当结果变化时，确保 selectedIndex 在有效范围内
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (prev >= results.length) {
        return results.length > 0 ? results.length - 1 : -1;
      }
      return prev;
    });
  }, [results]);

  // 处理站外搜索（带加载状态反馈）
  const handleExternalSearch = () => {
    if (!query.trim() || isOpening) return;

    setIsOpening(true);

    let url: string;

    try {
      // 如果输入看起来像 URL，直接打开
      if (isUrl(query)) {
        url = normalizeUrl(query);
      } else {
        // 否则使用选中的搜索引擎
        url = buildSearchUrl(selectedEngine, query);
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('外部搜索出错:', error);
    } finally {
      // 短暂延迟让用户看到反馈
      setTimeout(() => {
        setIsOpening(false);
        setQuery('');
        setShowResults(false);
      }, 200);
    }
  };

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode === 'internal') {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (results.length > 0) {
            setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (results.length > 0) {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
          } else {
            setSelectedIndex(-1);
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            const selected = results[selectedIndex];
            if (selected) handleResultClick(selected);
          } else if (results.length > 0 && results[0]) {
            handleResultClick(results[0]);
          }
          break;

        case 'Escape':
          setShowResults(false);
          inputRef.current?.blur();
          break;
      }
    } else {
      // 站外模式
      if (e.key === 'Enter') {
        e.preventDefault();
        handleExternalSearch();
      } else if (e.key === 'Escape') {
        setShowResults(false);
        inputRef.current?.blur();
      }
    }
  };

  // 处理搜索模式切换
  const handleModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: SearchMode | null) => {
    if (newMode !== null) {
      setMode(newMode);
      setQuery('');
      setResults([]);
      setShowResults(false);
      setSelectedIndex(-1);
      inputRef.current?.focus();
    }
  };

  // 处理结果点击
  const handleResultClick = (result: SearchResultItem) => {
    setShowResults(false);
    setQuery('');
    setSelectedIndex(-1);

    if (result.type === 'site' && result.url) {
      // 打开站点 URL
      window.open(result.url, '_blank', 'noopener,noreferrer');
    }

    // 调用外部回调（如需要滚动到该元素等）
    onInternalResultClick?.(result);
  };

  // 处理清空输入
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // 处理搜索引擎选择菜单
  const handleEngineMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleEngineMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEngineSelect = (engine: SearchEngine) => {
    setSelectedEngine(engine);
    handleEngineMenuClose();
    localStorage.setItem('selectedSearchEngine', engine.key);
  };

  // 点击外部关闭搜索结果
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 从 localStorage 恢复上次选择的搜索引擎
  useEffect(() => {
    const savedEngineKey = localStorage.getItem('selectedSearchEngine');
    if (savedEngineKey) {
      const engine = getSearchEngineByKey(savedEngineKey);
      if (engine) {
        setSelectedEngine(engine);
      }
    }
  }, []);

  // 响应顶层派发的 ⌘K/Ctrl+K / ` 快捷键聚焦（事件已延迟到侧栏展开 commit 之后）。
  // 每个挂载的 SearchBox 都监听：同一时刻至多一个实例是「可见」的
  //（桌面=hover 侧栏、移动端=抽屉；抽屉关闭时子树不挂载，被 display:none 隐藏的副本
  // 调用 focus() 只是静默 no-op），因此不会产生重复聚焦。
  // preventScroll：侧栏收起时输入框被 translateX 移出视口，默认 focus() 会把视口
  // 滚到元素位置 → 页面出现无意义的横向/纵向抖动；preventScroll 后由过渡自行呈现。
  // select()：快捷键的目的就是「立刻搜」，直接全选已有内容便于一次性覆盖输入。
  useEffect(() => {
    const handleFocusSearch = () => {
      const input = inputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      input.select();
    };
    window.addEventListener(FOCUS_SEARCH_EVENT, handleFocusSearch);
    return () => window.removeEventListener(FOCUS_SEARCH_EVENT, handleFocusSearch);
  }, []);

  return (
    <Box ref={searchBoxRef} sx={{ position: 'relative', width: '100%', maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* 搜索模式切换 */}
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          size='small'
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value='internal' aria-label='站内搜索'>
            <Tooltip title='站内搜索'>
              <LocalIcon fontSize='small' />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value='external' aria-label='站外搜索'>
            <Tooltip title='站外搜索'>
              <GlobalIcon fontSize='small' />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        <Paper
          elevation={2}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 0.5,
            borderRadius: 3,
            transition: 'box-shadow 200ms ease, border-color 200ms ease',
            flex: 1,
            border: '2px solid transparent',
            '&:focus-within': {
              borderColor: 'primary.main',
              boxShadow: (theme) => `0 0 0 1px ${theme.palette.primary.main}`,
            },
          }}
        >
          {/* 搜索引擎选择器（仅站外模式） */}
          {mode === 'external' && (
            <>
              <Tooltip title={`当前: ${selectedEngine.name}`}>
                <IconButton size='small' onClick={handleEngineMenuOpen} sx={{ p: 0.5, ml: 0.5 }}>
                  {selectedEngine.icon ? (
                    <Avatar
                      src={selectedEngine.icon}
                      sx={{ width: 24, height: 24 }}
                      alt={selectedEngine.name}
                    />
                  ) : (
                    <SearchIcon fontSize='small' />
                  )}
                  <ExpandMoreIcon fontSize='small' />
                </IconButton>
              </Tooltip>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleEngineMenuClose}>
                {SEARCH_ENGINES.map((engine) => (
                  <MenuItem
                    key={engine.key}
                    onClick={() => handleEngineSelect(engine)}
                    selected={engine.key === selectedEngine.key}
                  >
                    <ListItemIcon>
                      {engine.icon ? (
                        <Avatar
                          src={engine.icon}
                          sx={{ width: 24, height: 24 }}
                          alt={engine.name}
                        />
                      ) : (
                        <SearchIcon fontSize='small' />
                      )}
                    </ListItemIcon>
                    <ListItemText>{engine.name}</ListItemText>
                    {engine.key === selectedEngine.key && (
                      <CheckIcon fontSize='small' color='primary' />
                    )}
                  </MenuItem>
                ))}
              </Menu>
              <Divider orientation='vertical' flexItem sx={{ mx: 1 }} />
            </>
          )}

          {/* 搜索输入框 — WAI-ARIA combobox 模式 */}
          <InputBase
            ref={inputRef}
            placeholder={
              mode === 'internal'
                ? '搜索站点、分组...'
                : `使用 ${selectedEngine.name} 搜索或输入网址...`
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{ ml: 1, flex: 1 }}
            inputProps={{
              'aria-label': mode === 'internal' ? '站内搜索' : '站外搜索',
              'aria-autocomplete': 'list',
              'aria-controls': mode === 'internal' ? resultsListId : undefined,
              'aria-expanded': mode === 'internal' ? showResults && results.length > 0 : undefined,
              'aria-activedescendant':
                mode === 'internal' && selectedIndex >= 0
                  ? `search-result-${selectedIndex}`
                  : undefined,
              role: 'combobox',
              autoComplete: 'off',
              // 无障碍：向读屏软件声明快捷键（格式遵循 WAI-ARIA aria-keyshortcuts）
              'aria-keyshortcuts': isMac ? 'Meta+K Slash' : 'Control+K Slash',
            }}
          />

          {query || <SearchShortcutHint isMac={isMac} />}

          {/* 模式标签 */}
          {query && (
            <Chip
              label={mode === 'internal' ? '站内' : '站外'}
              size='small'
              color={mode === 'internal' ? 'secondary' : 'primary'}
              sx={{ mr: 1, height: 20, '& .MuiChip-label': { px: 0.8, fontSize: 11 } }}
            />
          )}

          {/* 清空按钮 */}
          {query && (
            <IconButton size='small' onClick={handleClear} sx={{ mr: 0.5 }} aria-label='清空搜索'>
              <CloseIcon fontSize='small' />
            </IconButton>
          )}

          {/* 搜索按钮 — 站外模式显示加载指示 */}
          <IconButton
            size='small'
            onClick={mode === 'external' ? handleExternalSearch : undefined}
            disabled={!query.trim() || (mode === 'external' && isOpening)}
            sx={{ mr: 0.5 }}
            aria-label={mode === 'external' ? '执行外部搜索' : '搜索'}
          >
            {mode === 'external' && isOpening ? <CircularProgress size={20} /> : <SearchIcon />}
          </IconButton>
        </Paper>
      </Box>

      {/* 站内搜索结果面板 */}
      {mode === 'internal' && (
        <SearchResultPanel
          results={results}
          query={query}
          onResultClick={handleResultClick}
          open={showResults}
          selectedIndex={selectedIndex}
        />
      )}
    </Box>
  );
};

export default SearchBox;
