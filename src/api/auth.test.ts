import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { authService } from './auth';
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
  WechatWebCallbackResp,
  WechatWebQrCodeResp,
  WechatWebLoginStatusResp,
  WechatWebRedirectPrepareResp,
} from '@/types/auth';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService', () => {
  it('getAuthConfig calls GET /api/frontend/init and returns loginConfig', async () => {
    const loginConfig: AuthInitResp = {
      usernameEnabled: true,
      phoneEnabled: false,
      emailEnabled: true,
      wechatWebEnabled: false,
    };
    const mockResp: FrontendInitResp = {
      loginConfig,
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const result = await authService.getAuthConfig();

    expect(result).toBe(loginConfig);
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/frontend/init',
    });
  });

  it('login calls POST /api/auth/login and returns accessToken/refreshToken with expiry', async () => {
    const mockResp: LoginResp = {
      accessToken: 'access-t',
      refreshToken: 'refresh-rt',
      accessTokenExpiresIn: 7200,
      refreshTokenExpiresIn: 604800,
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const data: LoginReq = { username: 'admin', password: '123456' };
    const result = await authService.login(data);

    expect(result).toBe(mockResp);
    expect(result.accessToken).toBe('access-t');
    expect(result.refreshToken).toBe('refresh-rt');
    expect(result.accessTokenExpiresIn).toBe(7200);
    expect(result.refreshTokenExpiresIn).toBe(604800);
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/login',
      data,
    });
  });

  it('phoneLogin calls POST /api/auth/phone-login and returns LoginResp', async () => {
    const mockResp: LoginResp = {
      accessToken: 'phone-access',
      refreshToken: 'phone-refresh',
      accessTokenExpiresIn: 7200,
      refreshTokenExpiresIn: 604800,
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const data: PhoneLoginReq = { phone: '13800000000', code: '1234' };
    const result = await authService.phoneLogin(data);

    expect(result).toBe(mockResp);
    expect(result.accessToken).toBe('phone-access');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/phone-login',
      data,
    });
  });

  it('emailLogin calls POST /api/auth/email-login and returns LoginResp', async () => {
    const mockResp: LoginResp = {
      accessToken: 'email-access',
      refreshToken: 'email-refresh',
      accessTokenExpiresIn: 7200,
      refreshTokenExpiresIn: 604800,
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const data: EmailLoginReq = { email: 'a@b.com', code: '5678' };
    const result = await authService.emailLogin(data);

    expect(result).toBe(mockResp);
    expect(result.accessToken).toBe('email-access');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/email-login',
      data,
    });
  });

  it('register calls POST /api/auth/register with registration data including optional nickname', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);

    const data: RegisterReq = { username: 'newuser', password: 'pass123', nickname: 'New User' };
    await authService.register(data);

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/register',
      data,
    });
  });

  it('sendPhoneCode calls POST /api/auth/send-phone-code with phone', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);

    const data: SendPhoneCodeReq = { phone: '13800000000' };
    await authService.sendPhoneCode(data);

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/send-phone-code',
      data,
    });
  });

  it('sendEmailCode calls POST /api/auth/send-email-code with email', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);

    const data: SendEmailCodeReq = { email: 'a@b.com' };
    await authService.sendEmailCode(data);

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/send-email-code',
      data,
    });
  });

  it('refreshToken calls POST /api/auth/refresh with skip auth refresh flag', async () => {
    const mockResp: LoginResp = {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      accessTokenExpiresIn: 7200,
      refreshTokenExpiresIn: 604800,
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const data: RefreshTokenReq = { refreshToken: 'old-rt' };
    const result = await authService.refreshToken(data);

    expect(result).toBe(mockResp);
    expect(result.accessToken).toBe('new-access');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/refresh',
      data,
      _nebulaSkipAuthRefresh: true,
    });
  });

  it('logout calls POST /api/auth/logout', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);

    await authService.logout();

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/logout',
    });
  });

  it('getCurrentUser calls GET /api/auth/current-user', async () => {
    const mockResp: CurrentUserResp = {
      id: '1',
      nickname: 'Admin',
      roleCodeList: ['admin'],
      permissionCodeList: ['read'],
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const result = await authService.getCurrentUser();

    expect(result).toBe(mockResp);
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/auth/current-user',
    });
  });

  it('createWechatWebQrCode calls POST /api/auth/wechat/web/qrcode and returns full QR response', async () => {
    const mockResp: WechatWebQrCodeResp = {
      loginId: 'lid',
      state: 'random-state',
      appId: 'wx-app-id',
      scope: 'snsapi_login',
      redirectUri: 'https://auth.example.com/api/auth/wechat/web/callback',
      status: 'WAITING',
      qrCodeUrl: 'https://qr.example.com/abc',
      expiresInSeconds: 300,
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const result = await authService.createWechatWebQrCode({ redirectAfterLogin: '/dashboard' });

    expect(result).toBe(mockResp);
    expect(result.loginId).toBe('lid');
    expect(result.state).toBe('random-state');
    expect(result.appId).toBe('wx-app-id');
    expect(result.expiresInSeconds).toBe(300);
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/wechat/web/qrcode',
      data: { redirectAfterLogin: '/dashboard' },
    });
  });

  it('getWechatWebLoginStatus calls GET /api/auth/wechat/web/status with loginId param', async () => {
    const mockResp: WechatWebLoginStatusResp = {
      loginId: 'test-login-id',
      status: 'SUCCESS',
      state: 'state-value',
      loginResult: {
        accessToken: 'wechat-access',
        refreshToken: 'wechat-refresh',
        accessTokenExpiresIn: 7200,
        refreshTokenExpiresIn: 604800,
      },
      returnPath: '/dashboard',
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const result = await authService.getWechatWebLoginStatus('test-login-id');

    expect(result).toBe(mockResp);
    expect(result.loginResult?.accessToken).toBe('wechat-access');
    expect(result.loginId).toBe('test-login-id');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/auth/wechat/web/status',
      params: { loginId: 'test-login-id' },
    });
  });

  it('prepareWechatWebRedirect calls POST /api/auth/wechat/web/redirect/prepare with redirectAfterLogin body', async () => {
    const mockResp: WechatWebRedirectPrepareResp = {
      loginId: 'redirect-login-id',
      state: 'redirect-state',
      status: 'WAITING',
      authorizeUrl: 'https://open.weixin.qq.com/connect/qrconnect?state=redirect-state',
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const result = await authService.prepareWechatWebRedirect({ redirectAfterLogin: '/workspace' });

    expect(result).toBe(mockResp);
    expect(result.authorizeUrl).toContain('redirect-state');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/wechat/web/redirect/prepare',
      data: { redirectAfterLogin: '/workspace' },
    });
  });

  it('completeWechatWebRedirectCallback calls POST /api/auth/wechat/web/redirect/callback without token fields', async () => {
    const mockResp: WechatWebCallbackResp = {
      loginId: 'redirect-login-id',
      status: 'SUCCESS',
      returnPath: '/workspace',
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const result = await authService.completeWechatWebRedirectCallback({ code: 'wechat-code', state: 'redirect-state' });

    expect(result).toBe(mockResp);
    expect(result.returnPath).toBe('/workspace');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/wechat/web/redirect/callback',
      data: { code: 'wechat-code', state: 'redirect-state' },
    });
  });
});
