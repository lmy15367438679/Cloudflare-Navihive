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

export function useAuth({ api, onLoginSuccess, onLogout }: UseAuthOptions) {
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
        // 检查认证是否已启用，如果启用则需要登录
        const authEnabled = await api.isAuthEnabled();
        setIsAuthRequired(authEnabled);
        setViewMode('readonly');
        await onLoginSuccess?.();
      } else {
        setIsAuthenticated(true);
        setIsAuthRequired(false);
        setViewMode('edit');
        await onLoginSuccess?.();
      }
    } catch {
      setIsAuthenticated(false);
      setIsAuthRequired(false);
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

  const handleLogin = useCallback(
    async (username: string, password: string, rememberMe: boolean = false) => {
      try {
        setLoginLoading(true);
        setLoginError(null);

        const loginResponse = await api.login(username, password, rememberMe);

        if (loginResponse?.success) {
          setIsAuthenticated(true);
          setIsAuthRequired(false);
          setViewMode('edit');
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
    setIsAuthenticated(false);
    // 登出后检查认证是否启用，如果启用则显示登录页面
    const authEnabled = await api.isAuthEnabled();
    setIsAuthRequired(authEnabled);
    setViewMode('readonly');
    await onLogout?.();
  }, [api, onLogout]);

  return {
    isAuthChecking,
    isAuthRequired,
    setIsAuthRequired,
    isAuthenticated,
    loginError,
    loginLoading,
    viewMode,
    setViewMode,
    checkAuthStatus,
    handleLogin,
    handleLogout,
  };
}
