import { App as AntdApp, ConfigProvider, type ThemeConfig } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { useEffect, type PropsWithChildren } from 'react';
import { NebulaBrandProvider, useNebulaBrand, type NebulaBrandConfig } from '@/app/brand-context';
import { NoticeProvider, type NoticeConfig } from '@/app/notice';
import { AuthProvider } from '@/auth/auth-context';
import { NebulaLoginBadgeProvider } from '@/auth/login-badge-context';
import { SessionExpiredModal } from '@/auth/session-expired-modal';
import type { AuthAdapter, LoginBadgeOptions } from '@/auth/types';
import { useNebulaTheme } from '@/hooks/use-nebula-theme';
import { useLocaleStore } from '@/stores/locale-store';
import { NebulaThemeProvider, type NebulaThemeMode } from '@/theme/theme-context';
import { defaultDarkTheme, defaultLightTheme } from '@/theme/themes';

const antdLocales = { 'zh-CN': zhCN, 'en-US': enUS } as const;

interface NebulaProviderProps extends PropsWithChildren {
  authAdapter?: AuthAdapter;
  loginBadge?: LoginBadgeOptions;
  /** Startup-level defaults that package consumers can override before rendering the app. */
  brand?: NebulaBrandConfig;
  defaultThemeMode?: NebulaThemeMode;
  lightTheme?: ThemeConfig;
  darkTheme?: ThemeConfig;
  notice?: NoticeConfig;
}

function AntdProviderBridge({ children, lightTheme, darkTheme, notice }: PropsWithChildren<Pick<NebulaProviderProps, 'lightTheme' | 'darkTheme' | 'notice'>>) {
  const mode = useNebulaTheme((state) => state.mode);
  const locale = useLocaleStore((state) => state.locale);
  const themeConfig = mode === 'dark' ? darkTheme ?? defaultDarkTheme : lightTheme ?? defaultLightTheme;

  return (
    <ConfigProvider locale={antdLocales[locale]} theme={themeConfig}>
      <AntdApp>
        <NoticeProvider options={notice}>{children}</NoticeProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

function ensureFaviconLink(): HTMLLinkElement {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (existing) {
    return existing;
  }

  const link = document.createElement('link');
  link.rel = 'icon';
  document.head.appendChild(link);
  return link;
}

function NebulaBrandMetadata() {
  const resolvedBrand = useNebulaBrand();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.title = resolvedBrand.title;

    if (resolvedBrand.faviconHref) {
      ensureFaviconLink().href = resolvedBrand.faviconHref;
    }
  }, [resolvedBrand.title, resolvedBrand.faviconHref]);

  return null;
}

function NebulaViewportStyle() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const existing = document.head.querySelector<HTMLStyleElement>('[data-nebula-viewport-style]');
    if (existing) return;

    const style = document.createElement('style');
    style.dataset.nebulaViewportStyle = 'true';
    style.textContent = `
html, body, #root {
  height: 100%;
  margin: 0;
  overflow: hidden;
}

body {
  min-width: 320px;
}
`;
    document.head.appendChild(style);
  }, []);

  return null;
}

export function NebulaProvider({ authAdapter, loginBadge, brand, defaultThemeMode = 'light', lightTheme, darkTheme, notice, children }: NebulaProviderProps) {
  return (
    <NebulaBrandProvider brand={brand}>
      <NebulaViewportStyle />
      <NebulaBrandMetadata />
      <NebulaThemeProvider defaultMode={defaultThemeMode}>
        <AuthProvider adapter={authAdapter}>
          <AntdProviderBridge lightTheme={lightTheme} darkTheme={darkTheme} notice={notice}>
            <NebulaLoginBadgeProvider loginBadge={loginBadge}>
              <SessionExpiredModal />
              {children}
            </NebulaLoginBadgeProvider>
          </AntdProviderBridge>
        </AuthProvider>
      </NebulaThemeProvider>
    </NebulaBrandProvider>
  );
}
