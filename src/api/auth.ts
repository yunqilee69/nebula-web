import { request } from '@/request/request';
import type {
  AuthInitResp,
  FrontendInitResp,
  LoginReq,
  LoginResp,
  RegisterReq,
  PhoneLoginReq,
  EmailLoginReq,
  SendPhoneCodeReq,
  SendEmailCodeReq,
  RefreshTokenReq,
  CurrentUserResp,
  GitHubCallbackReq,
  GitHubCallbackResp,
  GitHubLoginStatusResp,
  GitHubRedirectPrepareReq,
  GitHubRedirectPrepareResp,
  WechatWebCallbackReq,
  WechatWebCallbackResp,
  WechatWebQrCodeCreateReq,
  WechatWebQrCodeResp,
  WechatWebLoginStatusResp,
  WechatWebRedirectPrepareReq,
  WechatWebRedirectPrepareResp,
} from '@/types/auth';

export interface AuthService {
  getAuthConfig: () => Promise<AuthInitResp>;
  login: (data: LoginReq) => Promise<LoginResp>;
  phoneLogin: (data: PhoneLoginReq) => Promise<LoginResp>;
  emailLogin: (data: EmailLoginReq) => Promise<LoginResp>;
  register: (data: RegisterReq) => Promise<void>;
  sendPhoneCode: (data: SendPhoneCodeReq) => Promise<void>;
  sendEmailCode: (data: SendEmailCodeReq) => Promise<void>;
  refreshToken: (data: RefreshTokenReq) => Promise<LoginResp>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<CurrentUserResp>;
  createWechatWebQrCode: (data: WechatWebQrCodeCreateReq) => Promise<WechatWebQrCodeResp>;
  getWechatWebLoginStatus: (loginId: string) => Promise<WechatWebLoginStatusResp>;
  prepareWechatWebRedirect: (data: WechatWebRedirectPrepareReq) => Promise<WechatWebRedirectPrepareResp>;
  completeWechatWebRedirectCallback: (data: WechatWebCallbackReq) => Promise<WechatWebCallbackResp>;
  prepareGitHubRedirect: (data: GitHubRedirectPrepareReq) => Promise<GitHubRedirectPrepareResp>;
  getGitHubLoginStatus: (loginId: string) => Promise<GitHubLoginStatusResp>;
  completeGitHubRedirectCallback: (data: GitHubCallbackReq) => Promise<GitHubCallbackResp>;
}

export const authService: AuthService = {
  getAuthConfig: async () => {
    const resp = await request<FrontendInitResp>({
      method: 'GET',
      url: '/api/frontend/init',
    });
    return resp.loginConfig ?? {};
  },

  login: (data: LoginReq) =>
    request<LoginResp>({
      method: 'POST',
      url: '/api/auth/login',
      data,
    }),

  phoneLogin: (data: PhoneLoginReq) =>
    request<LoginResp>({
      method: 'POST',
      url: '/api/auth/phone-login',
      data,
    }),

  emailLogin: (data: EmailLoginReq) =>
    request<LoginResp>({
      method: 'POST',
      url: '/api/auth/email-login',
      data,
    }),

  register: (data: RegisterReq) =>
    request<void>({
      method: 'POST',
      url: '/api/auth/register',
      data,
    }),

  sendPhoneCode: (data: SendPhoneCodeReq) =>
    request<void>({
      method: 'POST',
      url: '/api/auth/send-phone-code',
      data,
    }),

  sendEmailCode: (data: SendEmailCodeReq) =>
    request<void>({
      method: 'POST',
      url: '/api/auth/send-email-code',
      data,
    }),

  refreshToken: (data: RefreshTokenReq) =>
    request<LoginResp>({
      method: 'POST',
      url: '/api/auth/refresh',
      data,
      _nebulaSkipAuthRefresh: true,
    }),

  logout: () =>
    request<void>({
      method: 'POST',
      url: '/api/auth/logout',
    }),

  getCurrentUser: () =>
    request<CurrentUserResp>({
      method: 'GET',
      url: '/api/auth/current-user',
    }),

  createWechatWebQrCode: (data: WechatWebQrCodeCreateReq) =>
    request<WechatWebQrCodeResp>({
      method: 'POST',
      url: '/api/auth/wechat/web/qrcode',
      data,
    }),

  getWechatWebLoginStatus: (loginId: string) =>
    request<WechatWebLoginStatusResp>({
      method: 'GET',
      url: '/api/auth/wechat/web/status',
      params: { loginId },
    }),

  prepareWechatWebRedirect: (data: WechatWebRedirectPrepareReq) =>
    request<WechatWebRedirectPrepareResp>({
      method: 'POST',
      url: '/api/auth/wechat/web/redirect/prepare',
      data,
    }),

  completeWechatWebRedirectCallback: (data: WechatWebCallbackReq) =>
    request<WechatWebCallbackResp>({
      method: 'POST',
      url: '/api/auth/wechat/web/redirect/callback',
      data,
    }),

  prepareGitHubRedirect: (data: GitHubRedirectPrepareReq) =>
    request<GitHubRedirectPrepareResp>({
      method: 'POST',
      url: '/api/auth/github/redirect/prepare',
      data,
    }),

  getGitHubLoginStatus: (loginId: string) =>
    request<GitHubLoginStatusResp>({
      method: 'GET',
      url: '/api/auth/github/status',
      params: { loginId },
    }),

  completeGitHubRedirectCallback: (data: GitHubCallbackReq) =>
    request<GitHubCallbackResp>({
      method: 'POST',
      url: '/api/auth/github/redirect/callback',
      data,
    }),
};
