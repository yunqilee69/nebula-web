import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { NebulaProvider } from '@/app/nebula-provider';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthService } from '@/services/auth';
import type {
  AuthInitResp,
  BuiltInLoginMethodKey,
  LoginResp,
  NebulaExtraLoginBadge,
  NebulaExtraLoginBadgeRenderContext,
} from '@/auth/types';
import { saveAuthTokens } from '@/auth/token-session';
import { LoginPage } from './login';

vi.mock('@/auth/token-session', () => ({
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
  };
}

const fullConfig: AuthInitResp = {
  usernameEnabled: true,
  phoneEnabled: true,
  emailEnabled: true,
  wechatWebEnabled: true,
  wechatWebType: 'qr',
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
    vi.mocked(saveAuthTokens).mockClear();
  });

  it('loads config, shows password login by default, and renders alternate methods as badges', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(fullConfig),
    });

    renderLoginPage({ authService });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByText('当前登录方式：账号密码')).toBeInTheDocument();
    expect(screen.getByText('其他登录方式')).toBeInTheDocument();
    const phoneButton = screen.getByRole('button', { name: '手机验证码' });
    const emailButton = screen.getByRole('button', { name: '邮箱验证码' });
    const wechatButton = screen.getByRole('button', { name: '微信扫码' });
    expect(phoneButton).toHaveClass('ant-btn-circle');
    expect(emailButton).toHaveClass('ant-btn-circle');
    expect(wechatButton).toHaveClass('ant-btn-circle');
    expect(phoneButton).not.toHaveTextContent('手机验证码');
    expect(emailButton).not.toHaveTextContent('邮箱验证码');
    expect(wechatButton).not.toHaveTextContent('微信扫码');
    expect(within(phoneButton).getByRole('img', { name: 'mobile' })).toBeInTheDocument();
    expect(within(emailButton).getByRole('img', { name: 'mail' })).toBeInTheDocument();
    expect(within(wechatButton).getByRole('img', { name: 'wechat' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '手机验证码' })).not.toBeInTheDocument();

    await user.click(phoneButton);

    expect(screen.getByText('当前登录方式：手机验证码')).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: '企业 SSO' })).toHaveClass('ant-btn-circle');
    });
    expect(within(screen.getByRole('button', { name: '企业 SSO' })).getByRole('img', { name: 'login' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '企业 SSO' })).not.toBeInTheDocument();
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
    expect(screen.getByText('当前登录方式：账号密码')).toBeInTheDocument();
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
    expect(screen.getByText('当前登录方式：手机验证码')).toBeInTheDocument();
    expect(screen.queryByLabelText('用户名')).not.toBeInTheDocument();
  });

  it('password login calls authService.login and onLoginSuccess with LoginResp', async () => {
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

    await user.type(screen.getByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123',
      });
    });

    expect(onLoginSuccess).toHaveBeenCalledWith(loginResp);
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
      expect(screen.getByRole('button', { name: 'SSO' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'SSO' }));

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
      expect(screen.getByRole('button', { name: 'SSO' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'SSO' }));

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
      expect(screen.getByRole('button', { name: 'SSO' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'SSO' }));
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
      expect(screen.getByRole('button', { name: 'SSO' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'SSO' }));
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

  it('does not render unsafe WeChat QR code URLs', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue({ ...passwordOnlyConfig, wechatWebEnabled: true, wechatWebType: 'qr' }),
      createWechatWebQrCode: vi.fn().mockResolvedValue({
        loginId: 'wechat-login',
        state: 'state',
        qrCodeUrl: 'https://evil.example.com/track.png',
        expireSeconds: 300,
      }),
    });

    renderLoginPage({ authService });

    await user.click(await screen.findByRole('button', { name: '微信扫码' }));

    await waitFor(() => {
      expect(authService.createWechatWebQrCode).toHaveBeenCalled();
    });
    expect(screen.getByText('二维码地址未被信任，请联系管理员。')).toBeInTheDocument();
    expect(screen.queryByAltText('微信登录二维码')).not.toBeInTheDocument();
  });

  it('polls WeChat login status and forwards successful token response', async () => {
    const user = userEvent.setup();
    const wechatResp = {
      status: 'SUCCESS',
      loginId: 'wechat-login',
      accessToken: 'wechat-access',
      refreshToken: 'wechat-refresh',
      expiresIn: 7200,
    };
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue({ ...passwordOnlyConfig, wechatWebEnabled: true, wechatWebType: 'qr' }),
      createWechatWebQrCode: vi.fn().mockResolvedValue({
        loginId: 'wechat-login',
        state: 'state',
        qrCodeUrl: '/wechat-qr.png',
        expireSeconds: 300,
      }),
      getWechatWebLoginStatus: vi.fn().mockResolvedValue(wechatResp),
    });
    const onLoginSuccess = vi.fn();

    renderLoginPage({ authService, onLoginSuccess });

    await user.click(await screen.findByRole('button', { name: '微信扫码' }));
    await waitFor(() => {
      expect(screen.getByAltText('微信登录二维码')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(authService.getWechatWebLoginStatus).toHaveBeenCalledWith('wechat-login');
      expect(onLoginSuccess).toHaveBeenCalledWith(wechatResp);
    }, { timeout: 3000 });
  });

  it('saves auth tokens after WeChat login returns tokens', async () => {
    const user = userEvent.setup();
    const wechatResp = {
      status: 'SUCCESS',
      loginId: 'wechat-login',
      accessToken: 'wechat-access',
      refreshToken: 'wechat-refresh',
      expiresIn: 7200,
    };
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue({ ...passwordOnlyConfig, wechatWebEnabled: true, wechatWebType: 'qr' }),
      createWechatWebQrCode: vi.fn().mockResolvedValue({
        loginId: 'wechat-login',
        state: 'state',
        qrCodeUrl: '/wechat-qr.png',
        expireSeconds: 300,
      }),
      getWechatWebLoginStatus: vi.fn().mockResolvedValue(wechatResp),
    });

    renderLoginPage({ authService });

    await user.click(await screen.findByRole('button', { name: '微信扫码' }));
    await waitFor(() => {
      expect(screen.getByAltText('微信登录二维码')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(saveAuthTokens).toHaveBeenCalledWith(wechatResp);
    }, { timeout: 3000 });
  });
});
