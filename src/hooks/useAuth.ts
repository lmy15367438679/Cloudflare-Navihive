// src/hooks/useAuth.ts
import { useState, useCallback } from 'react';
import { NavigationClient } from '../API/client';
import { MockNavigationClient } from '../API/mock';

type ViewMode = 'readonly' | 'edit';

interface UseAuthOptions {
  api: NavigationClient | MockNavigationClient;
  onLoginSuccess?: () => Promise<void>;
  onLogout?: () => Promise<void>;
}

// 游客模式的会话标记：游客进入后写 localStorage，刷新后不再弹登录墙（纯前端状态，不生成 token）
const GUEST_MODE_KEY = 'navihive_guest_mode';

function readGuestMode(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(GUEST_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeGuestMode(active: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (active) localStorage.setItem(GUEST_MODE_KEY, '1');
    else localStorage.removeItem(GUEST_MODE_KEY);
  } catch {
    // localStorage 不可用（隐私模式等）时静默失败，游客会话仅保留在内存中
  }
}

export function useAuth({ api, onLoginSuccess, onLogout }: UseAuthOptions) {
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [guestAvailable, setGuestAvailable] = useState(false); // 是否允许游客访问公开内容
  const [isGuestMode, setIsGuestMode] = useState(false); // 当前是否处于游客会话（只读浏览公开内容）
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('readonly');

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsAuthChecking(true);

      const result = await api.checkAuthStatus();

      if (!result) {
        if (api.isLoggedIn()) {
          api.logout();
        }
        setIsAuthenticated(false);
        // 获取认证配置：认证是否启用 + 游客模式是否可用
        const authConfig = await api.getAuthConfig();
        setGuestAvailable(authConfig.enabled && authConfig.guestAvailable);
        // 刷新页面时恢复游客会话：认证开启 + 游客开放 + 存在游客标记 → 跳过登录墙直接进入只读模式
        const guestModeActive = readGuestMode();
        if (!authConfig.enabled || !authConfig.guestAvailable) {
          writeGuestMode(false); // 站点关闭了游客模式，清除标记
        }
        setIsGuestMode(guestModeActive && authConfig.enabled && authConfig.guestAvailable);
        setIsAuthRequired(authConfig.enabled && !(guestModeActive && authConfig.guestAvailable));
        setViewMode('readonly');
        await onLoginSuccess?.();
      } else {
        setIsAuthenticated(true);
        setIsAuthRequired(false);
        setGuestAvailable(false);
        setIsGuestMode(false);
        setViewMode('edit');
        writeGuestMode(false); // 已是登录用户，清除游客标记
        await onLoginSuccess?.();
      }
    } catch {
      setIsAuthenticated(false);
      setIsAuthRequired(false);
      setGuestAvailable(false);
      setIsGuestMode(false);
      setViewMode('readonly');
      try {
        await onLoginSuccess?.();
      } catch {
        // 静默失败
      }
    } finally {
      setIsAuthChecking(false);
    }
  }, [api, onLoginSuccess]);

  // 游客登录：在站点启用认证但开放公开内容时，以游客身份浏览公开分组/站点
  const handleGuestLogin = useCallback(async () => {
    try {
      setLoginLoading(true);
      setLoginError(null);

      const authConfig = await api.getAuthConfig();
      const canGuestAccess = authConfig.enabled && authConfig.guestAvailable;

      if (!canGuestAccess) {
        setLoginError('当前站点未开放游客访问');
        return false;
      }

      setIsAuthenticated(false);
      setIsAuthRequired(false);
      setGuestAvailable(true);
      setIsGuestMode(true);
      setViewMode('readonly');
      writeGuestMode(true); // 持久化游客会话：刷新后跳过登录墙直接进入只读模式
      await onLoginSuccess?.();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '游客访问失败';
      setLoginError(message);
      return false;
    } finally {
      setLoginLoading(false);
    }
  }, [api, onLoginSuccess]);

  const handleLogin = useCallback(
    async (username: string, password: string, rememberMe: boolean = false) => {
      try {
        setLoginLoading(true);
        setLoginError(null);

        const loginResponse = await api.login(username, password, rememberMe);

        if (loginResponse?.success) {
          setIsAuthenticated(true);
          setIsAuthRequired(false);
          setGuestAvailable(false);
          setIsGuestMode(false);
          setViewMode('edit');
          writeGuestMode(false); // 登录成功，清除游客标记
          await onLoginSuccess?.();
        } else {
          const message = loginResponse?.message || '用户名或密码错误';
          setLoginError(message);
          setIsAuthenticated(false);
          setViewMode('readonly');
          return false;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误';
        setLoginError(message);
        setIsAuthenticated(false);
        setViewMode('readonly');
        return false;
      } finally {
        setLoginLoading(false);
      }
      return true;
    },
    [api, onLoginSuccess]
  );

  const handleLogout = useCallback(async () => {
    await api.logout();
    writeGuestMode(false); // 登出后清除游客标记：下次访问按站点配置重新呈现登录页或游客入口
    setIsAuthenticated(false);
    setIsGuestMode(false);
    // 登出后检查认证是否启用，如果启用则显示登录页面
    const authConfig = await api.getAuthConfig();
    setIsAuthRequired(authConfig.enabled);
    setGuestAvailable(authConfig.enabled && authConfig.guestAvailable);
    setViewMode('readonly');
    await onLogout?.();
  }, [api, onLogout]);

  return {
    isAuthChecking,
    isAuthRequired,
    setIsAuthRequired,
    isAuthenticated,
    guestAvailable,
    isGuestMode,
    loginError,
    loginLoading,
    viewMode,
    setViewMode,
    checkAuthStatus,
    handleLogin,
    handleGuestLogin,
    handleLogout,
  };
}
