import { useEffect } from 'react';

/**
 * 全局搜索快捷键（⌘K / Ctrl+K / /）
 *
 * 绑定规则（与 VS Code / Gmail / GitHub 等主流产品一致）：
 * - ⌘K / Ctrl+K：任意位置生效（含输入框内），不受当前焦点影响
 * - `/`        ：仅非输入目标时生效，避免破坏用户在文本框内的正常输入
 *
 * 实现方式：在 App 顶层捕获阶段（capture=true）统一拦截 keydown，再通过 CustomEvent
 * 与 UI 解耦，两端各自监听自己关心的事件，避免组件间直接耦合：
 *
 *   1. EXPAND_SIDEBAR_EVENT     —— 桌面 hover 侧栏展开（侧栏收起时输入框不可见）
 *   2. OPEN_MOBILE_DRAWER_EVENT —— 移动端抽屉打开（Drawer 关闭时子树不挂载）
 *   3. FOCUS_SEARCH_EVENT       —— 搜索输入框聚焦（由 requestSearchFocus 派发）
 *
 * ⚠️ 聚焦不能「同步派发一次就算完」：展开侧栏是 setState 驱动的 transform/opacity
 * 过渡，事件同步派发时输入框仍处于 translateX 的隐藏态，此时 focus() 是静默 no-op ——
 * 用户看不到光标闪烁，只能再点一次鼠标。requestSearchFocus() 用「立即 + 双 rAF + timeout」
 * 三次派发覆盖各种挂载时点，接收端（SearchBox）再校验焦点是否真正落上并按帧重试。
 */

export const EXPAND_SIDEBAR_EVENT = 'navihive:expand-sidebar';
export const OPEN_MOBILE_DRAWER_EVENT = 'navihive:open-mobile-drawer';
export const FOCUS_SEARCH_EVENT = 'navihive:focus-search';

/** 兜底延迟：覆盖合成器繁忙导致 rAF 被推迟的场景（远小于侧栏 200ms 过渡，不影响观感） */
const FOCUS_FALLBACK_MS = 80;

/**
 * 派发「聚焦搜索框」请求，三次兜底（接收端幂等，并自行校验焦点是否真正落上、按帧重试）：
 *   1. 立即     —— 侧栏已展开（如桌面端已处于 hover 展开态）时当帧即聚焦，无多余延迟
 *   2. 双 rAF   —— 侧栏由本次事件展开时，等 setState commit + 下一帧布局完成再聚焦
 *   3. timeout  —— 覆盖合成器繁忙导致 rAF 被推迟的场景
 *
 * 为什么不能「派发一次就算成功」：侧栏默认 translateX 在视口外、移动端抽屉关闭时
 * 子树根本不挂载，此时单次 focus() 是静默 no-op，用户看不到光标，只能再点一次鼠标。
 * 三次派发 + 接收端重试链 = 任何挂载时点都能被覆盖。
 */
export function requestSearchFocus(): void {
  window.dispatchEvent(new CustomEvent(FOCUS_SEARCH_EVENT));
  requestAnimationFrame(() =>
    requestAnimationFrame(() => window.dispatchEvent(new CustomEvent(FOCUS_SEARCH_EVENT)))
  );
  window.setTimeout(
    () => window.dispatchEvent(new CustomEvent(FOCUS_SEARCH_EVENT)),
    FOCUS_FALLBACK_MS
  );
}

/** 输入目标判定：`/` 在这些元素内不应被劫持 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * 挂载全局搜索快捷键监听。在 App 顶层调用一次即可。
 *
 * 注：监听挂在 document 捕获阶段，Dialog/Drawer 内的输入框无法提前拦截，
 *     保证快捷键在任何弹层状态下都可用；`/` 通过 isTypingTarget 自行退让。
 */
export function useSearchShortcut(): void {
  useEffect(() => {
    const handleGlobalShortcut = (e: KeyboardEvent) => {
      // 按住不放会连续触发 keydown，只响应首次按下
      if (e.repeat) return;

      const mod = e.metaKey || e.ctrlKey;
      // 用 e.code 判定，避免 Caps Lock / 非 QWERTY 布局下 e.key 大小写与字符漂移
      const isFocusSearch = mod && !e.altKey && (e.code === 'KeyK' || e.key.toLowerCase() === 'k');
      const isSlashSearch = !mod && !e.altKey && e.key === '/' && !isTypingTarget(e.target);
      if (!isFocusSearch && !isSlashSearch) return;

      e.preventDefault();
      window.dispatchEvent(new CustomEvent(EXPAND_SIDEBAR_EVENT));
      window.dispatchEvent(new CustomEvent(OPEN_MOBILE_DRAWER_EVENT));
      requestSearchFocus();
    };

    document.addEventListener('keydown', handleGlobalShortcut, true);
    return () => document.removeEventListener('keydown', handleGlobalShortcut, true);
  }, []);
}
