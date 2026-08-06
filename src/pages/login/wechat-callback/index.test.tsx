import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AuthService } from '@/api/auth';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useAuthStore } from '@/stores/auth-store';
import type { WechatWebLoginStatusResp } from '@/types/auth';
import { saveAuthTokens } from '@/utils/auth/token-session';
import { WechatCallbackPage } from './index';

vi.mock('@/utils/auth/token-session', () => ({
  saveAuthTokens: vi.fn(),
  getStoredAccessToken: vi.fn(() => null),
  getStoredRefreshToken: vi.fn(() => null),
  clearAuthTokens: vi.fn(),
}));

function createMockAuthService(partial?: Partial<AuthService>): AuthService {
  return {
    getAuthConfig: partial?.getAuthConfig ?? vi.fn(),
    login: partial?.login ?? vi.fn(),
    phoneLogin: partial?.phoneLogin ?? vi.fn(),
    emailLogin: partial?.emailLogin ?? vi.fn(),
    register: partial?.register ?? vi.fn(),
    sendPhoneCode: partial?.sendPhoneCode ?? vi.fn(),
    sendEmailCode: partial?.sendEmailCode ?? vi.fn(),
    refreshToken: partial?.refreshToken ?? vi.fn(),
    logout: partial?.logout ?? vi.fn(),
    getCurrentUser: partial?.getCurrentUser ?? vi.fn(),
    createWechatWebQrCode: partial?.createWechatWebQrCode ?? vi.fn(),
    getWechatWebLoginStatus: partial?.getWechatWebLoginStatus ?? vi.fn(),
    prepareWechatWebRedirect: partial?.prepareWechatWebRedirect ?? vi.fn(),
    completeWechatWebRedirectCallback: partial?.completeWechatWebRedirectCallback ?? vi.fn(),
    prepareGitHubRedirect: partial?.prepareGitHubRedirect ?? vi.fn(),
    getGitHubLoginStatus: partial?.getGitHubLoginStatus ?? vi.fn(),
    completeGitHubRedirectCallback: partial?.completeGitHubRedirectCallback ?? vi.fn(),
  };
}

function renderCallbackPage(initialEntry: string, authService: AuthService, onLoginSuccess?: Mock) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <NebulaProvider loginBadge={{ authService, onLoginSuccess }}>
        <Routes>
          <Route path="/login/wechat-callback" element={<WechatCallbackPage />} />
          <Route path="/dashboard" element={<div>Dashboard Home</div>} />
          <Route path="/" element={<div>Workspace Home</div>} />
        </Routes>
      </NebulaProvider>
    </MemoryRouter>,
  );
}

describe('WechatCallbackPage', () => {
  afterEach(() => {
    vi.mocked(saveAuthTokens).mockClear();
    useAuthStore.getState().clearUser();
  });

  it('claims a successful login result, saves tokens, refreshes the current user, and navigates to the server returnPath', async () => {
    const statusResp: WechatWebLoginStatusResp = {
      loginId: 'callback-login',
      state: 'callback-state',
      status: 'SUCCESS',
      returnPath: '/dashboard',
      loginResult: {
        accessToken: 'callback-access',
        refreshToken: 'callback-refresh',
        accessTokenExpiresIn: 7200,
        refreshTokenExpiresIn: 604800,
      },
    };
    const authService = createMockAuthService({
      getWechatWebLoginStatus: vi.fn().mockResolvedValue(statusResp),
      getCurrentUser: vi.fn().mockResolvedValue({
        id: 'user-1',
        username: 'alice',
        nickname: 'Alice',
        roleCodeList: ['ADMIN'],
        permissionCodeList: ['DASHBOARD:READ'],
        orgCodeList: ['TECH'],
      }),
    });

    renderCallbackPage('/login/wechat-callback?loginId=callback-login&returnPath=https://evil.example', authService);

    await waitFor(() => {
      expect(authService.getWechatWebLoginStatus).toHaveBeenCalledWith('callback-login');
      expect(saveAuthTokens).toHaveBeenCalledWith(statusResp);
      expect(authService.getCurrentUser).toHaveBeenCalledOnce();
    });
    expect(useAuthStore.getState().user).toMatchObject({ id: 'user-1', name: 'Alice' });
    expect(await screen.findByText('Dashboard Home')).toBeInTheDocument();
  });

  it('does not save tokens when loginId is missing', async () => {
    const authService = createMockAuthService();

    renderCallbackPage('/login/wechat-callback?returnPath=/dashboard', authService);

    expect(await screen.findByTestId('wechat-callback-error')).toHaveTextContent('微信登录编号缺失，请重新发起登录。');
    expect(authService.getWechatWebLoginStatus).not.toHaveBeenCalled();
    expect(saveAuthTokens).not.toHaveBeenCalled();
  });

  it('shows safe callback errors without claiming status or saving tokens', async () => {
    const authService = createMockAuthService();

    renderCallbackPage('/login/wechat-callback?loginId=callback-login&error=provider_error', authService);

    expect(await screen.findByTestId('wechat-callback-error')).toHaveTextContent('微信授权失败，请稍后重试。');
    expect(authService.getWechatWebLoginStatus).not.toHaveBeenCalled();
    expect(saveAuthTokens).not.toHaveBeenCalled();
  });

  it('shows consumed status as terminal without saving tokens', async () => {
    const authService = createMockAuthService({
      getWechatWebLoginStatus: vi.fn().mockResolvedValue({
        loginId: 'callback-login',
        state: 'callback-state',
        status: 'CONSUMED',
      } satisfies WechatWebLoginStatusResp),
    });

    renderCallbackPage('/login/wechat-callback?loginId=callback-login', authService);

    expect(await screen.findByTestId('wechat-callback-error')).toHaveTextContent('微信登录结果已被领取，请重新发起登录。');
    expect(saveAuthTokens).not.toHaveBeenCalled();
  });
});
