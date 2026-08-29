import { useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { GroupWithSites } from '../types';
import type { ReactNode, Ref } from 'react';

export interface VirtualizedGroupListHandle {
  /** 平滑滚动到指定分组（虚拟化下必须按 index 滚动，元素可能未挂载） */
  scrollToGroup: (groupId: number) => void;
}

interface VirtualizedGroupListProps {
  groups: GroupWithSites[];
  renderGroup: (group: GroupWithSites) => ReactNode;
  /** 转发给内部 virtualizer 的 ref：外部侧栏/搜索点击后按 id 滚动到该分组 */
  ref?: Ref<VirtualizedGroupListHandle>;
  /** 相邻渲染缓冲行数，越大滚动时越不容易出现空白帧 */
  overscan?: number;
  /** 分组卡片之间的垂直间距（px），与普通模式 Stack spacing={3} 的 24px 一致 */
  gap?: number;
  /** 未测量高度时的分组估算值（px），测量完成后自动按真实高度修正 */
  estimateGroupHeight?: number;
  /** 视口顶部固定遮挡（sticky TopBar）高度 + 冗余，scrollToIndex 时预留以免内容被遮挡 */
  headerOffset?: number;
}

const ESTIMATE_GROUP_HEIGHT = 260;
const LIST_GAP = 24;

/**
 * 浏览全部视图的虚拟化分组列表：只渲染视口附近的分组卡片，
 * 把「几百个 GroupCard 同时挂载」的初始绘制/滚动成本降到「视口行数」。
 *
 * 使用 @tanstack/react-virtual 的 useWindowVirtualizer——页面滚动是本项目的
 * 原生 window 滚动，该 API 直接以 window 为滚动容器，无需引入额外容器滚动，
 * 因此 window.scrollTo / scrollIntoView 等现有交互不受影响。
 */
function VirtualizedGroupList({
  groups,
  renderGroup,
  ref,
  overscan = 3,
  gap = LIST_GAP,
  estimateGroupHeight = ESTIMATE_GROUP_HEIGHT,
  headerOffset = 56, // TopBar 48 + 8 冗余
}: VirtualizedGroupListProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // 列表顶部相对文档顶部的偏移：window 滚动模式下虚拟项以
  // translateY(start - scrollMargin) 定位，margin 不准会导致虚拟项可见范围的
  // 判断错位（表现为提前/推迟挂载或滚动定位偏一处），故挂载后及分组数量变化时重测。
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const el = rootRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setScrollMargin((prev) => (Math.abs(prev - top) > 1 ? top : prev));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [groups.length]);

  const virtualizer = useWindowVirtualizer({
    count: groups.length,
    estimateSize: () => estimateGroupHeight,
    // 以分组 id 作为虚拟项的 key/测量维度：分组顺序变化（如收藏置顶）时，
    // 已测得的高度缓存能跟随分组而不是错位到新 index 下的其他分组。
    getItemKey: (index) => {
      const id = groups[index]?.id;
      return id ?? index;
    },
    gap,
    overscan,
    scrollMargin,
    scrollPaddingStart: headerOffset,
  });

  const scrollToGroup = useCallback(
    (groupId: number) => {
      const index = groups.findIndex((g) => g.id === groupId);
      if (index >= 0) {
        virtualizer.scrollToIndex(index, { align: 'start', behavior: 'smooth' });
      }
    },
    [groups, virtualizer]
  );

  useImperativeHandle(ref, () => ({ scrollToGroup }), [scrollToGroup]);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={rootRef}
      role='list'
      style={{
        position: 'relative',
        width: '100%',
        height: virtualizer.getTotalSize(),
      }}
    >
      {virtualItems.map((vi) => {
        const group = groups[vi.index];
        if (!group) return null;
        return (
          <div
            key={vi.key}
            role='listitem'
            id={`group-${group.id}`}
            data-index={vi.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${vi.start - scrollMargin}px)`,
            }}
          >
            {renderGroup(group)}
          </div>
        );
      })}
    </div>
  );
}

export default VirtualizedGroupList;
