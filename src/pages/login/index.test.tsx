import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthService } from '@/api/auth';
import type {
  AuthInitResp,
  BuiltInLoginMethodKey,
  LoginResp,
  NebulaExtraLoginBadge,
  NebulaExtraLoginBadgeRenderContext,
} from '@/types/auth';
import { saveAuthTokens } from '@/utils/auth/token-session';
import { LoginPage } from './index';

const redirectToAuthorizeUrlMock = vi.hoisted(() => vi.fn());

const wxLoginMock = vi.fn(({ id }: { id: string }) => {
  const container = document.getElementById(id);
  if (!container) return;
  const iframe = document.createElement('iframe');
  iframe.title = '微信登录二维码';
  container.appendChild(iframe);
});

vi.mock('@/utils/auth/token-session', () => ({
  saveAuthTokens: vi.fn(),
  getStoredAccessToken: vi.fn(() => null),
  getStoredRefreshToken: vi.fn(() => null),
  clearAuthTokens: vi.fn(),
}));

vi.mock('./wechat-redirect-navigation', () => ({
  redirectToAuthorizeUrl: redirectToAuthorizeUrlMock,
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
    sendForgotPasswordCode: partial?.sendForgotPasswordCode ?? vi.fn(),
    verifyForgotPasswordCode: partial?.verifyForgotPasswordCode ?? vi.fn(),
    changeForgottenPassword: partial?.changeForgottenPassword ?? vi.fn(),
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

const fullConfig: AuthInitResp = {
  usernameEnabled: true,
  phoneEnabled: true,
  emailEnabled: true,
  wechatWebEnabled: true,
  wechatWebType: 'qr',
  githubEnabled: true,
  phoneSendIntervalSeconds: 60,
  emailSendIntervalSeconds: 60,
};

const passwordOnlyConfig: AuthInitResp = {
  usernameEnabled: true,
  phoneEnabled: false,
  emailEnabled: false,
  wechatWebEnabled: false,
};

const loginResp: LoginResp = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  accessTokenExpiresIn: 7200,
  refreshTokenExpiresIn: 604800,
};

function renderLoginPage(
  overrides: {
    authService?: AuthService;
    onLoginSuccess?: Mock;
    extraLoginBadges?: NebulaExtraLoginBadge[];
    defaultLoginMethods?: BuiltInLoginMethodKey[];
  } = {},
) {
  const authService = overrides.authService ?? createMockAuthService();
  const onLoginSuccess = overrides.onLoginSuccess ?? vi.fn();

  return {
    authService,
    onLoginSuccess,
    ...render(
      <MemoryRouter>
        <NebulaProvider
          loginBadge={{
            authService,
            onLoginSuccess,
            extraLoginBadges: overrides.extraLoginBadges,
            defaultLoginMethods: overrides.defaultLoginMethods,
          }}
        >
          <LoginPage />
        </NebulaProvider>
      </MemoryRouter>,
    ),
  };
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.mocked(saveAuthTokens).mockClear();
    wxLoginMock.mockClear();
    redirectToAuthorizeUrlMock.mockClear();
  });

  it('loads config, shows password login by default, and renders login methods as tabs', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(fullConfig),
    });

    renderLoginPage({ authService });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.queryByText(/当前登录方式/)).not.toBeInTheDocument();
    expect(screen.queryByText('其他登录方式')).not.toBeInTheDocument();
    const passwordTab = screen.getByRole('tab', { name: '账号密码' });
    const phoneTab = screen.getByRole('tab', { name: '手机验证码' });
    const emailTab = screen.getByRole('tab', { name: '邮箱验证码' });
    const wechatTab = screen.getByRole('tab', { name: '微信扫码' });
    const githubTab = screen.getByRole('tab', { name: 'GitHub' });
    expect(passwordTab).toHaveAttribute('aria-selected', 'true');
    expect(phoneTab.querySelector('.anticon-mobile')).toBeInTheDocument();
    expect(emailTab.querySelector('.anticon-mail')).toBeInTheDocument();
    expect(wechatTab.querySelector('.anticon-wechat')).toBeInTheDocument();
    expect(githubTab.querySelector('.anticon-github')).toBeInTheDocument();

    await user.click(phoneTab);

    expect(phoneTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('手机号')).toBeInTheDocument();
    expect(authService.getAuthConfig).toHaveBeenCalledOnce();
  });

  it('renders extra login badges from NebulaProvider loginBadge.extraLoginBadges', async () => {
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
    });

    renderLoginPage({
      authService,
      extraLoginBadges: [
        {
          key: 'sso',
          label: '企业 SSO',
          render: (_ctx: NebulaExtraLoginBadgeRenderContext) => (
            <button type="button">企业 SSO 登录</button>
          ),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '企业 SSO' })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: '企业 SSO' }).querySelector('.anticon-login')).toBeInTheDocument();
  });

  it('shows loading state while config is loading', () => {
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderLoginPage({ authService });

    expect(screen.getByText('加载中')).toBeInTheDocument();
  });

  it('shows an empty login state instead of requiring authService', async () => {
    render(
      <MemoryRouter>
        <NebulaProvider>
          <LoginPage />
        </NebulaProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/暂无可用登录方式/i)).toBeInTheDocument();
    });
    expect(screen.getByText('当前认证服务未返回可用登录方式，请联系系统管理员检查登录管理配置。')).toBeInTheDocument();
    expect(screen.queryByText(/未配置认证服务/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/NebulaProvider/i)).not.toBeInTheDocument();
  });

  it('renders extra login badges without authService', async () => {
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn();
    const extraResp: LoginResp = {
      accessToken: 'extra-token',
      refreshToken: 'extra-refresh',
      accessTokenExpiresIn: 3600,
      refreshTokenExpiresIn: 86400,
    };

    render(
      <MemoryRouter>
        <NebulaProvider
          loginBadge={{
            onLoginSuccess,
            extraLoginBadges: [
              {
                key: 'sso',
                label: 'SSO',
                render: (ctx) => (
                  <button type="button" onClick={() => ctx.onSuccess(extraResp)}>
                    SSO 登录
                  </button>
                ),
              },
            ],
          }}
        >
          <LoginPage />
        </NebulaProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'SSO 登录' }));

    expect(onLoginSuccess).toHaveBeenCalledWith(extraResp);
    expect(screen.queryByText(/未配置认证服务/i)).not.toBeInTheDocument();
  });

  it('falls back to password login if config loading fails', async () => {
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockRejectedValue(new Error('Stack trace: database password leaked')),
    });

    renderLoginPage({ authService });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '账号密码' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText(/加载认证配置失败/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/database password/i)).not.toBeInTheDocument();
  });

  it('uses project-configured default login methods when config loading fails', async () => {
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockRejectedValue(new Error('config unavailable')),
    });

    renderLoginPage({ authService, defaultLoginMethods: ['phone'] });

    await waitFor(() => {
      expect(screen.getByLabelText('手机号')).toBeInTheDocument();
    });
    expect(screen.getByText('验证码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发送验证码' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '手机验证码' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByLabelText('用户名')).not.toBeInTheDocument();
  });

  it('password login sends checked autoLogin by default and calls onLoginSuccess with LoginResp', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
      login: vi.fn().mockResolvedValue(loginResp),
    });
    const onLoginSuccess = vi.fn();

    renderLoginPage({ authService, onLoginSuccess });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });
    expect(screen.getByRole('checkbox', { name: '自动登录' })).toBeChecked();

    await user.type(screen.getByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123',
        autoLogin: true,
      });
    });

    expect(onLoginSuccess).toHaveBeenCalledWith(loginResp);
  });

  it('password login sends unchecked autoLogin when the user disables automatic login', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
      login: vi.fn().mockResolvedValue(loginResp),
    });

    renderLoginPage({ authService });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('checkbox', { name: '自动登录' }));
    await user.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123',
        autoLogin: false,
      });
    });
  });

  it('saves auth tokens after password login', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
      login: vi.fn().mockResolvedValue(loginResp),
    });

    renderLoginPage({ authService });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => {
      expect(saveAuthTokens).toHaveBeenCalledWith(loginResp);
    });
  });

  it('does not render inline password login errors because request errors are shown globally', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
      login: vi.fn().mockRejectedValue(new Error('invalid credentials')),
    });

    renderLoginPage({ authService });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'wrong-password',
        autoLogin: true,
      });
    });

    expect(screen.queryByText('登录失败，请检查输入后重试。')).not.toBeInTheDocument();
  });

  it('extra badge onSuccess(response) forwards response to onLoginSuccess', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
    });
    const onLoginSuccess = vi.fn();

    const extraResp: LoginResp = {
      accessToken: 'extra-token',
      refreshToken: 'extra-refresh',
      accessTokenExpiresIn: 3600,
      refreshTokenExpiresIn: 86400,
    };

    renderLoginPage({
      authService,
      onLoginSuccess,
      extraLoginBadges: [
        {
          key: 'sso',
          label: 'SSO',
          render: (ctx) => (
            <button type="button" onClick={() => ctx.onSuccess(extraResp)}>
              SSO 登录
            </button>
          ),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'SSO' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'SSO' }));

    await user.click(await screen.findByRole('button', { name: 'SSO 登录' }));

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledWith(extraResp);
    });
  });

  it('extra badge onSuccess() without response does not call onLoginSuccess', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
    });
    const onLoginSuccess = vi.fn();

    renderLoginPage({
      authService,
      onLoginSuccess,
      extraLoginBadges: [
        {
          key: 'sso',
          label: 'SSO',
          render: (ctx) => (
            <button type="button" onClick={() => ctx.onSuccess()}>
              SSO 无载荷
            </button>
          ),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'SSO' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'SSO' }));

    await user.click(await screen.findByRole('button', { name: 'SSO 无载荷' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SSO 无载荷' })).toBeInTheDocument();
    });

    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('saves auth tokens after extra badge login with token response', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
    });

    const extraResp: LoginResp = {
      accessToken: 'extra-token',
      refreshToken: 'extra-refresh',
      accessTokenExpiresIn: 3600,
      refreshTokenExpiresIn: 86400,
    };

    renderLoginPage({
      authService,
      extraLoginBadges: [
        {
          key: 'sso',
          label: 'SSO',
          render: (ctx) => (
            <button type="button" onClick={() => ctx.onSuccess(extraResp)}>
              SSO 登录
            </button>
          ),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'SSO' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'SSO' }));
    await user.click(await screen.findByRole('button', { name: 'SSO 登录' }));

    await waitFor(() => {
      expect(saveAuthTokens).toHaveBeenCalledWith(extraResp);
    });
  });

  it('does not save auth tokens when extra badge succeeds without a response', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
    });

    renderLoginPage({
      authService,
      extraLoginBadges: [
        {
          key: 'sso',
          label: 'SSO',
          render: (ctx) => (
            <button type="button" onClick={() => ctx.onSuccess()}>
              SSO 无载荷
            </button>
          ),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'SSO' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'SSO' }));
    await user.click(await screen.findByRole('button', { name: 'SSO 无载荷' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SSO 无载荷' })).toBeInTheDocument();
    });

    expect(saveAuthTokens).not.toHaveBeenCalled();
  });

  it('navigates to the workspace route after successful password login when no custom callback redirects', async () => {
    const user = userEvent.setup();
    useAuthStore.getState().clearUser();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
      login: vi.fn().mockResolvedValue(loginResp),
      getCurrentUser: vi.fn().mockResolvedValue({
        id: 'user-1',
        username: 'alice',
        nickname: 'Alice',
        roleCodeList: ['ADMIN'],
        permissionCodeList: ['MENU:dashboard:Allow'],
        orgCodeList: ['TECH'],
        menuList: [
          {
            id: 'dashboard-menu',
            code: 'dashboard',
            name: 'Dashboard',
            path: '/dashboard',
            component: 'DashboardPage',
            status: 1,
          },
        ],
      }),
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <NebulaProvider loginBadge={{ authService }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>Workspace Home</div>} />
          </Routes>
        </NebulaProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => {
      expect(authService.getCurrentUser).toHaveBeenCalledOnce();
    });
    expect(saveAuthTokens).toHaveBeenCalledWith(loginResp);
    expect(useAuthStore.getState().user).toMatchObject({
      id: 'user-1',
      name: 'Alice',
      roles: ['ADMIN'],
      permissions: ['MENU:dashboard:Allow'],
      menuList: [
        expect.objectContaining({
          code: 'dashboard',
          path: '/dashboard',
          component: 'DashboardPage',
        }),
      ],
    });
    expect(await screen.findByText('Workspace Home')).toBeInTheDocument();
  });

  it('mounts official WxLogin with backend QR session values and does not render QR URLs as images', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('WxLogin', wxLoginMock);
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue({ ...passwordOnlyConfig, wechatWebEnabled: true, wechatWebType: 'qr' }),
      createWechatWebQrCode: vi.fn().mockResolvedValue({
        loginId: 'wechat-login',
        state: 'state',
        appId: 'wx-app-id',
        scope: 'snsapi_login',
        redirectUri: 'https://auth.example.com/api/auth/wechat/web/callback',
        status: 'WAITING',
        qrCodeUrl: 'https://evil.example.com/track.png',
        expiresInSeconds: 300,
      }),
    });

    renderLoginPage({ authService });

    await user.click(await screen.findByRole('tab', { name: '微信扫码' }));

    await waitFor(() => {
      expect(authService.createWechatWebQrCode).toHaveBeenCalled();
      expect(wxLoginMock).toHaveBeenCalledWith({
        id: 'wechat-login-qr',
        appid: 'wx-app-id',
        scope: 'snsapi_login',
        redirect_uri: 'https://auth.example.com/api/auth/wechat/web/callback',
        state: 'state',
        self_redirect: false,
      });
    });
    expect(document.querySelector('#wechat-login-qr iframe')).toBeInTheDocument();
    expect(document.querySelector('img[alt="微信登录二维码"]')).not.toBeInTheDocument();
  });

  it('marks WeChat login ready after the widget iframe loads', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('WxLogin', wxLoginMock);
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue({ ...passwordOnlyConfig, wechatWebEnabled: true, wechatWebType: 'qr' }),
      createWechatWebQrCode: vi.fn().mockResolvedValue({
        loginId: 'wechat-login',
        state: 'state',
        appId: 'wx-app-id',
        scope: 'snsapi_login',
        redirectUri: 'https://auth.example.com/api/auth/wechat/web/callback',
        status: 'WAITING',
        qrCodeUrl: '/unused-by-official-widget.png',
        expiresInSeconds: 300,
      }),
    });

    renderLoginPage({ authService });

    await user.click(await screen.findByRole('tab', { name: '微信扫码' }));
    const iframe = await waitFor(() => {
      const mountedIframe = document.querySelector<HTMLIFrameElement>('#wechat-login-qr iframe');
      expect(mountedIframe).toBeInTheDocument();
      if (!mountedIframe) throw new Error('WxLogin iframe was not mounted.');
      return mountedIframe;
    });
    iframe.dispatchEvent(new Event('load'));

    await waitFor(() => {
      expect(screen.getByTestId('wechat-login-ready')).toBeInTheDocument();
    });
  });

  it('shows retry when the official WxLogin script fails to load', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue({ ...passwordOnlyConfig, wechatWebEnabled: true, wechatWebType: 'qr' }),
      createWechatWebQrCode: vi.fn().mockResolvedValue({
        loginId: 'wechat-login',
        state: 'state',
        appId: 'wx-app-id',
        scope: 'snsapi_login',
        redirectUri: 'https://auth.example.com/api/auth/wechat/web/callback',
        status: 'WAITING',
        qrCodeUrl: '/unused-by-official-widget.png',
        expiresInSeconds: 300,
      }),
    });

    renderLoginPage({ authService });

    await user.click(await screen.findByRole('tab', { name: '微信扫码' }));
    const script = await waitFor(() => {
      const loadedScript = document.querySelector<HTMLScriptElement>('script[src="https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js"]');
      expect(loadedScript).toBeInTheDocument();
      if (!loadedScript) throw new Error('WxLogin script was not mounted.');
      return loadedScript;
    });
    script.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(screen.getByTestId('wechat-login-error')).toHaveTextContent('二维码加载失败，请稍后重试。');
      expect(screen.getByTestId('wechat-login-retry')).toBeInTheDocument();
    });
  });

  it('disposes the official WeChat iframe when the tab is unmounted', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('WxLogin', wxLoginMock);
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(fullConfig),
      createWechatWebQrCode: vi.fn().mockResolvedValue({
        loginId: 'wechat-login',
        state: 'state',
        appId: 'wx-app-id',
        scope: 'snsapi_login',
        redirectUri: 'https://auth.example.com/api/auth/wechat/web/callback',
        status: 'WAITING',
        qrCodeUrl: '/unused-by-official-widget.png',
        expiresInSeconds: 300,
      }),
    });

    renderLoginPage({ authService });

    await user.click(await screen.findByRole('tab', { name: '微信扫码' }));
    await waitFor(() => {
      expect(document.querySelector('#wechat-login-qr iframe')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('tab', { name: '账号密码' }));

    await waitFor(() => {
      expect(document.querySelector('#wechat-login-qr iframe')).not.toBeInTheDocument();
    });
  });

  it('polls WeChat login status and forwards successful token response', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('WxLogin', wxLoginMock);
    const wechatResp = {
      status: 'SUCCESS',
      loginId: 'wechat-login',
      state: 'state',
      loginResult: {
        accessToken: 'wechat-access',
        refreshToken: 'wechat-refresh',
        accessTokenExpiresIn: 7200,
        refreshTokenExpiresIn: 604800,
      },
    };
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue({ ...passwordOnlyConfig, wechatWebEnabled: true, wechatWebType: 'qr' }),
      createWechatWebQrCode: vi.fn().mockResolvedValue({
        loginId: 'wechat-login',
        state: 'state',
        appId: 'wx-app-id',
        scope: 'snsapi_login',
        redirectUri: 'https://auth.example.com/api/auth/wechat/web/callback',
        status: 'WAITING',
        qrCodeUrl: '/wechat-qr.png',
        expiresInSeconds: 300,
      }),
      getWechatWebLoginStatus: vi.fn().mockResolvedValue(wechatResp),
    });
    const onLoginSuccess = vi.fn();

    renderLoginPage({ authService, onLoginSuccess });

    await user.click(await screen.findByRole('tab', { name: '微信扫码' }));
    await waitFor(() => {
      expect(document.querySelector('#wechat-login-qr iframe')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(authService.getWechatWebLoginStatus).toHaveBeenCalledWith('wechat-login');
      expect(onLoginSuccess).toHaveBeenCalledWith(wechatResp);
    }, { timeout: 3000 });
  });

  it('saves auth tokens after WeChat login returns tokens', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('WxLogin', wxLoginMock);
    const wechatResp = {
      status: 'SUCCESS',
      loginId: 'wechat-login',
      state: 'state',
      loginResult: {
        accessToken: 'wechat-access',
        refreshToken: 'wechat-refresh',
        accessTokenExpiresIn: 7200,
        refreshTokenExpiresIn: 604800,
      },
    };
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue({ ...passwordOnlyConfig, wechatWebEnabled: true, wechatWebType: 'qr' }),
      createWechatWebQrCode: vi.fn().mockResolvedValue({
        loginId: 'wechat-login',
        state: 'state',
        appId: 'wx-app-id',
        scope: 'snsapi_login',
        redirectUri: 'https://auth.example.com/api/auth/wechat/web/callback',
        status: 'WAITING',
        qrCodeUrl: '/wechat-qr.png',
        expiresInSeconds: 300,
      }),
      getWechatWebLoginStatus: vi.fn().mockResolvedValue(wechatResp),
    });

    renderLoginPage({ authService });

    await user.click(await screen.findByRole('tab', { name: '微信扫码' }));
    await waitFor(() => {
      expect(document.querySelector('#wechat-login-qr iframe')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(saveAuthTokens).toHaveBeenCalledWith(wechatResp);
    }, { timeout: 3000 });
  });

  it('starts WeChat redirect login with the backend authorize URL when redirect mode is configured', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue({ ...passwordOnlyConfig, wechatWebEnabled: true, wechatWebType: 'redirect' }),
      prepareWechatWebRedirect: vi.fn().mockResolvedValue({
        loginId: 'redirect-login',
        state: 'redirect-state',
        status: 'WAITING',
        authorizeUrl: 'https://open.weixin.qq.com/connect/qrconnect?appid=wx-app-id&state=redirect-state',
      }),
    });

    renderLoginPage({ authService });

    await user.click(await screen.findByRole('tab', { name: '微信扫码' }));
    await user.click(screen.getByTestId('wechat-redirect-login'));

    await waitFor(() => {
      expect(authService.prepareWechatWebRedirect).toHaveBeenCalledWith({ redirectAfterLogin: '/' });
      expect(redirectToAuthorizeUrlMock).toHaveBeenCalledWith('https://open.weixin.qq.com/connect/qrconnect?appid=wx-app-id&state=redirect-state');
    });
  });

  it('starts GitHub redirect login with the backend authorize URL when GitHub is enabled', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue({ ...passwordOnlyConfig, githubEnabled: true }),
      prepareGitHubRedirect: vi.fn().mockResolvedValue({
        loginId: 'github-login',
        state: 'github-state',
        status: 'WAITING',
        authorizeUrl: 'https://github.com/login/oauth/authorize?client_id=github-client&state=github-state',
      }),
    });

    renderLoginPage({ authService });

    await user.click(await screen.findByRole('tab', { name: 'GitHub' }));
    await user.click(screen.getByTestId('github-redirect-login'));

    await waitFor(() => {
      expect(authService.prepareGitHubRedirect).toHaveBeenCalledWith({ redirectAfterLogin: '/' });
      expect(redirectToAuthorizeUrlMock).toHaveBeenCalledWith('https://github.com/login/oauth/authorize?client_id=github-client&state=github-state');
    });
  });
});
