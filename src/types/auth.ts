import type { ReactNode } from 'react';
import type { AuthService } from '@/api/auth';
import type { BackendMenuItem } from '@/route/types';

export interface CurrentUser {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  organizations?: Organization[];
  currentOrganizationId?: string;
  menuList?: BackendMenuItem[];
  preferences?: UserPreferences;
}

export interface Organization {
  id: string;
  name: string;
  code?: string;
}

export interface UserPreferences {
  themeMode?: 'light' | 'dark';
  compactMode?: boolean;
}

export interface AuthAdapter {
  getCurrentUser: () => Promise<CurrentUser | null>;
  onUnauthorized?: () => void;
}

export interface NebulaLoginBadgeContextValue {
  loginPath: string;
  registerPath: string;
  defaultLoginMethods: BuiltInLoginMethodKey[];
  extraLoginBadges: NebulaExtraLoginBadge[];
  authService?: AuthService;
  onLoginSuccess?: (response: LoginResp | WechatWebLoginStatusResp) => void | Promise<void>;
  onLogoutSuccess?: () => void | Promise<void>;
  onRegisterSuccess?: () => void | Promise<void>;
}

export interface NebulaExtraLoginBadgeRenderContext {
  onSuccess: (response?: LoginResp | WechatWebLoginStatusResp) => void | Promise<void>;
  loginBadge: NebulaLoginBadgeContextValue;
}

export interface NebulaExtraLoginBadge {
  key: string;
  label: string;
  render: (ctx: NebulaExtraLoginBadgeRenderContext) => ReactNode;
}

export interface LoginBadgeOptions {
  loginPath?: string;
  registerPath?: string;
  defaultLoginMethods?: BuiltInLoginMethodKey[];
  extraLoginBadges?: NebulaExtraLoginBadge[];
  authService?: AuthService;
  onLoginSuccess?: (response: LoginResp | WechatWebLoginStatusResp) => void | Promise<void>;
  onLogoutSuccess?: () => void | Promise<void>;
  onRegisterSuccess?: () => void | Promise<void>;
}

export interface ApiResult<T> {
  code: string;
  message: string;
  data: T;
}

export interface AuthInitResp {
  usernameEnabled?: boolean;
  phoneEnabled?: boolean;
  emailEnabled?: boolean;
  wechatWebEnabled?: boolean;
  wechatWebType?: string;
  usernameRegisterAllowed?: boolean;
  usernamePasswordMinLength?: number;
  usernamePasswordMaxLength?: number;
  phoneRegisterAllowed?: boolean;
  phoneCodeExpireMinutes?: number;
  phoneSendIntervalSeconds?: number;
  emailRegisterAllowed?: boolean;
  emailCodeExpireMinutes?: number;
  emailSendIntervalSeconds?: number;
  oauth2Enabled?: boolean;
  oauth2RegisterAllowed?: boolean;
  wechatMiniProgramEnabled?: boolean;
}

export interface FrontendConfigResp {
  projectName?: string;
  layoutMode?: string;
  defaultThemeCode?: string;
  defaultLocale?: string;
  localeOptions?: string[];
}

export interface FrontendPreferenceResp {
  localeTag?: string;
  themeCode?: string;
  navigationLayoutCode?: string;
  sidebarLayoutCode?: string;
}

export interface FrontendThemeResp {
  themeCode?: string;
  themeName?: string;
  builtinFlag?: boolean;
  themeConfig?: Record<string, string>;
}

export interface FrontendInitResp {
  frontendConfig?: FrontendConfigResp;
  loginConfig?: AuthInitResp;
  defaultPreference?: FrontendPreferenceResp;
  defaultTheme?: FrontendThemeResp;
}

export interface LoginReq {
  username: string;
  password: string;
}

export interface LoginResp {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

export interface RegisterReq {
  username: string;
  password: string;
  nickname?: string;
  phone?: string;
  email?: string;
}

export interface PhoneLoginReq {
  phone: string;
  code: string;
}

export interface EmailLoginReq {
  email: string;
  code: string;
}

export interface SendPhoneCodeReq {
  phone: string;
}

export interface SendEmailCodeReq {
  email: string;
}

export interface RefreshTokenReq {
  refreshToken: string;
}

export interface CurrentUserResp {
  id: string;
  username?: string;
  nickname?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  orgCodeList?: string[];
  roleCodeList?: string[];
  permissionCodeList?: string[];
  menuList?: BackendMenuItem[];
}

export interface WechatWebQrCodeCreateReq {
  redirectAfterLogin?: string;
}

export type WechatWebLoginStatus = 'WAITING' | 'SCANNED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CONSUMED';

export type WechatWebCallbackErrorCode =
  | 'missing_callback_parameter'
  | 'invalid_state'
  | 'expired_state'
  | 'replayed_state'
  | 'provider_error';

export interface WechatWebQrCodeResp {
  loginId: string;
  state: string;
  appId: string;
  scope: string;
  redirectUri: string;
  status: WechatWebLoginStatus;
  qrCodeUrl: string;
  expiresInSeconds: number;
}

export interface WechatWebLoginStatusResp {
  loginId: string;
  status: WechatWebLoginStatus;
  state: string;
  loginResult?: LoginResp;
  returnPath?: string;
}

export interface WechatWebRedirectPrepareReq {
  redirectAfterLogin?: string;
}

export interface WechatWebRedirectPrepareResp {
  loginId: string;
  state: string;
  status: WechatWebLoginStatus;
  authorizeUrl: string;
}

export interface WechatWebCallbackReq {
  code: string;
  state: string;
}

export interface WechatWebCallbackResp {
  loginId: string;
  status: WechatWebLoginStatus;
  returnPath?: string;
  errorCode?: WechatWebCallbackErrorCode;
}

export type BuiltInLoginMethodKey = 'password' | 'phone' | 'email' | 'wechat-web';
