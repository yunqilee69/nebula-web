import { Button, Flex, Typography } from 'antd';
import { useState } from 'react';
import type { AuthService } from '@/api/auth';
import { redirectToAuthorizeUrl } from './wechat-redirect-navigation';

type OAuthRedirectProvider = 'wechat-web' | 'github';

interface OAuthRedirectPanelProps {
  readonly authService: AuthService;
  readonly provider: OAuthRedirectProvider;
}

const redirectText: Record<OAuthRedirectProvider, { readonly description: string; readonly error: string; readonly button: string; readonly testId: string }> = {
  'wechat-web': {
    description: '使用微信授权页面完成登录。',
    error: '微信跳转登录发起失败，请稍后重试。',
    button: '跳转微信授权',
    testId: 'wechat-redirect-login',
  },
  github: {
    description: '使用 GitHub 授权页面完成登录。',
    error: 'GitHub 登录发起失败，请稍后重试。',
    button: '跳转 GitHub 授权',
    testId: 'github-redirect-login',
  },
};

function getCurrentReturnPath(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}` || '/';
}

async function prepareRedirect(provider: OAuthRedirectProvider, authService: AuthService): Promise<string> {
  const data = { redirectAfterLogin: getCurrentReturnPath() };
  if (provider === 'github') {
    return (await authService.prepareGitHubRedirect(data)).authorizeUrl;
  }
  return (await authService.prepareWechatWebRedirect(data)).authorizeUrl;
}

export function OAuthRedirectPanel({ authService, provider }: OAuthRedirectPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = redirectText[provider];

  const handleRedirectLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      redirectToAuthorizeUrl(await prepareRedirect(provider, authService));
    } catch (caught: unknown) {
      if (!(caught instanceof Error)) throw caught;
      setError(text.error);
      setLoading(false);
    }
  };

  return (
    <Flex vertical align="center" gap={12}>
      <Typography.Text type="secondary">{text.description}</Typography.Text>
      {error ? <Typography.Text type="danger" data-testid={`${text.testId}-error`}>{error}</Typography.Text> : null}
      <Button type="primary" block loading={loading} onClick={handleRedirectLogin} data-testid={text.testId}>
        {text.button}
      </Button>
    </Flex>
  );
}
