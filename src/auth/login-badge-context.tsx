import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import type { LoginBadgeOptions, NebulaLoginBadgeContextValue } from './types';

const defaultLoginBadge: NebulaLoginBadgeContextValue = {
  loginPath: '/login',
  registerPath: '/register',
  defaultLoginMethods: ['password'],
  extraLoginBadges: [],
  authService: undefined,
  onLoginSuccess: undefined,
  onLogoutSuccess: undefined,
  onRegisterSuccess: undefined,
};

function resolveLoginBadge(options?: LoginBadgeOptions): NebulaLoginBadgeContextValue {
  return {
    loginPath: options?.loginPath ?? defaultLoginBadge.loginPath,
    registerPath: options?.registerPath ?? defaultLoginBadge.registerPath,
    defaultLoginMethods: options?.defaultLoginMethods ?? defaultLoginBadge.defaultLoginMethods,
    extraLoginBadges: options?.extraLoginBadges ?? defaultLoginBadge.extraLoginBadges,
    authService: options?.authService ?? defaultLoginBadge.authService,
    onLoginSuccess: options?.onLoginSuccess ?? defaultLoginBadge.onLoginSuccess,
    onLogoutSuccess: options?.onLogoutSuccess ?? defaultLoginBadge.onLogoutSuccess,
    onRegisterSuccess: options?.onRegisterSuccess ?? defaultLoginBadge.onRegisterSuccess,
  };
}

const NebulaLoginBadgeContext = createContext<NebulaLoginBadgeContextValue>(defaultLoginBadge);

export function NebulaLoginBadgeProvider({ loginBadge, children }: PropsWithChildren<{ loginBadge?: LoginBadgeOptions }>) {
  const value = useMemo(() => resolveLoginBadge(loginBadge), [loginBadge]);

  return <NebulaLoginBadgeContext.Provider value={value}>{children}</NebulaLoginBadgeContext.Provider>;
}

export function useNebulaLoginBadge(): NebulaLoginBadgeContextValue {
  return useContext(NebulaLoginBadgeContext);
}
