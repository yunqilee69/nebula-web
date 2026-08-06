import { expect, test, type Page, type Route } from '@playwright/test';

type LoginMode = 'qr' | 'redirect';
type StatusMode = 'SUCCESS' | 'EXPIRED' | 'FAILED' | 'CONSUMED';

interface WxLoginWidgetOptions {
  readonly id: string;
  readonly appid: string;
  readonly scope: string;
  readonly redirect_uri: string;
  readonly state: string;
  readonly self_redirect: boolean;
}

declare global {
  interface Window {
    readonly __nebulaWxLoginOptions?: readonly WxLoginWidgetOptions[];
  }
}

interface ApiCall {
  readonly method: string;
  readonly url: string;
  readonly body: string | null;
  readonly authorization: string | null;
}

interface BrowserMessages {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
}

function apiResult(data: unknown): string {
  return JSON.stringify({ code: '0', message: 'OK', data });
}

async function fulfillApi(route: Route, data: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: apiResult(data),
  });
}

async function setupBrowserMessages(page: Page): Promise<BrowserMessages> {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  return { consoleErrors, pageErrors };
}

async function setupWechatRoutes(page: Page, options: { readonly loginMode: LoginMode; readonly statusMode?: StatusMode }): Promise<ApiCall[]> {
  const apiCalls: ApiCall[] = [];
  const statusMode = options.statusMode ?? 'SUCCESS';

  const recordCall = (route: Route): void => {
    const request = route.request();
    apiCalls.push({
      method: request.method(),
      url: request.url(),
      body: request.postData(),
      authorization: request.headers().authorization ?? null,
    });
  };

  await page.route('https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.__nebulaWxLoginOptions=[]; window.WxLogin = function(options) { window.__nebulaWxLoginOptions.push(options); const target = document.getElementById(options.id); if (target) { const frame = document.createElement('iframe'); frame.title = '微信登录二维码'; frame.src = 'about:blank'; target.appendChild(frame); setTimeout(() => frame.dispatchEvent(new Event('load')), 0); } };`,
    });
  });

  await page.route('**/api/frontend/init', async (route) => {
    recordCall(route);
    await fulfillApi(route, {
      loginConfig: {
        usernameEnabled: false,
        phoneEnabled: false,
        emailEnabled: false,
        wechatWebEnabled: true,
        wechatWebType: options.loginMode,
      },
    });
  });

  await page.route('**/api/auth/wechat/web/qrcode', async (route) => {
    recordCall(route);
    await fulfillApi(route, {
      loginId: 'qr-login-id',
      state: 'qr-state',
      appId: 'wx-browser-app',
      scope: 'snsapi_login',
      redirectUri: 'http://auth.test/api/auth/wechat/web/callback',
      status: 'WAITING',
      qrCodeUrl: 'weixin://connect/qrconnect?unused=1',
      expiresInSeconds: 180,
    });
  });

  await page.route('**/api/auth/wechat/web/redirect/prepare', async (route) => {
    recordCall(route);
    await fulfillApi(route, {
      loginId: 'redirect-login-id',
      state: 'redirect-state',
      status: 'WAITING',
      authorizeUrl: 'http://127.0.0.1:5173/mock-wechat-authorize?loginId=redirect-login-id&state=redirect-state',
    });
  });

  await page.route('**/api/auth/wechat/web/status**', async (route) => {
    recordCall(route);
    const url = new URL(route.request().url());
    await fulfillApi(route, {
      loginId: url.searchParams.get('loginId') ?? 'callback-login-id',
      state: 'callback-state',
      status: statusMode,
      returnPath: '/',
      loginResult: statusMode === 'SUCCESS'
        ? {
            accessToken: 'browser-access-token',
            refreshToken: 'browser-refresh-token',
            accessTokenExpiresIn: 7200,
            refreshTokenExpiresIn: 604800,
          }
        : undefined,
    });
  });

  await page.route('**/api/auth/current-user', async (route) => {
    recordCall(route);
    await fulfillApi(route, {
      id: 'browser-user-1',
      username: 'browser-user',
      nickname: 'Browser User',
      roleCodeList: ['ADMIN'],
      permissionCodeList: ['PROFILE:READ'],
      orgCodeList: ['TECH'],
      menuList: [],
    });
  });

  return apiCalls;
}

test('renders official WeChat QR widget from backend session values and supports retry after script failure', async ({ page }) => {
  const messages = await setupBrowserMessages(page);
  const apiCalls = await setupWechatRoutes(page, { loginMode: 'qr' });

  await page.goto('/login');

  await expect(page.locator('#wechat-login-qr iframe')).toBeVisible();
  await expect(page.getByTestId('wechat-login-ready')).toBeAttached();
  await expect(page.getByText('二维码将在 180s 后过期')).toBeVisible();

  const options = await page.evaluate(() => window.__nebulaWxLoginOptions ?? []);
  expect(options).toEqual([
    {
      id: 'wechat-login-qr',
      appid: 'wx-browser-app',
      scope: 'snsapi_login',
      redirect_uri: 'http://auth.test/api/auth/wechat/web/callback',
      state: 'qr-state',
      self_redirect: false,
    },
  ]);
  await expect(page.locator('img[src*="weixin"]')).toHaveCount(0);

  await page.unroute('https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js');
  await page.route('https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '',
    });
  });
  await page.goto('/login');
  await expect(page.getByTestId('wechat-login-error')).toHaveText('二维码加载失败，请稍后重试。');
  await expect(page.getByTestId('wechat-login-retry')).toBeVisible();

  expect(apiCalls.some((call) => call.url.includes('/api/auth/wechat/web/qrcode'))).toBe(true);
  expect(messages.consoleErrors).toEqual([]);
  expect(messages.pageErrors).toEqual([]);
});

test('redirect login and callback recovery claim tokens without putting token values in URLs', async ({ page }) => {
  const messages = await setupBrowserMessages(page);
  const apiCalls = await setupWechatRoutes(page, { loginMode: 'redirect' });

  await page.goto('/login');
  await page.getByRole('button', { name: '跳转微信授权' }).click();
  await page.waitForURL((url) => url.href.includes('/mock-wechat-authorize?loginId=redirect-login-id'));
  const redirectUrl = page.url();

  await page.goto('/login/wechat-callback?loginId=redirect-login-id&returnPath=https%3A%2F%2Fevil.example');
  await page.waitForURL('http://127.0.0.1:5173/');
  const callbackUrl = page.url();
  const tokens = await page.evaluate(() => ({
    accessToken: window.localStorage.getItem('nebula-web.access-token'),
    refreshToken: window.localStorage.getItem('nebula-web.refresh-token'),
  }));

  expect(tokens).toEqual({ accessToken: 'browser-access-token', refreshToken: 'browser-refresh-token' });
  expect(`${redirectUrl}${callbackUrl}`).not.toContain('browser-access-token');
  expect(`${redirectUrl}${callbackUrl}`).not.toContain('browser-refresh-token');
  expect(apiCalls).toContainEqual(expect.objectContaining({
    method: 'POST',
    url: 'http://127.0.0.1:5173/api/auth/wechat/web/redirect/prepare',
    body: JSON.stringify({ redirectAfterLogin: '/login' }),
  }));
  expect(apiCalls).toContainEqual(expect.objectContaining({
    method: 'GET',
    url: 'http://127.0.0.1:5173/api/auth/current-user',
    authorization: 'Bearer browser-access-token',
  }));
  expect(messages.consoleErrors).toEqual([]);
  expect(messages.pageErrors).toEqual([]);
});

test('callback terminal states and provider errors do not store tokens', async ({ page }) => {
  const messages = await setupBrowserMessages(page);
  await setupWechatRoutes(page, { loginMode: 'redirect', statusMode: 'CONSUMED' });

  await page.goto('/login/wechat-callback?loginId=consumed-login-id');
  await expect(page.getByTestId('wechat-callback-error')).toContainText('微信登录结果已被领取，请重新发起登录。');
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('nebula-web.access-token'))).toBeNull();

  await page.goto('/login/wechat-callback?loginId=provider-error-login-id&error=provider_error');
  await expect(page.getByTestId('wechat-callback-error')).toContainText('微信授权失败，请稍后重试。');
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('nebula-web.refresh-token'))).toBeNull();

  expect(messages.consoleErrors).toEqual([]);
  expect(messages.pageErrors).toEqual([]);
});
