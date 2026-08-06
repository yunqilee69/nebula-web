import { Alert, Button, Flex, Spin, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '@/layouts/auth-shell';
import { useNebulaLoginBadge } from '@/providers/login-badge-provider';
import { useAuthStore } from '@/stores/auth-store';
import type { WechatWebCallbackErrorCode, WechatWebLoginStatusResp } from '@/types/auth';
import { toCurrentUser } from '@/utils/auth/current-user';
import { saveAuthTokens } from '@/utils/auth/token-session';

const callbackErrorMessages: Record<WechatWebCallbackErrorCode, string> = {
  missing_callback_parameter: '微信回调参数缺失，请重新发起登录。',
  invalid_state: '微信登录状态无效，请重新发起登录。',
  expired_state: '微信登录已过期，请重新发起登录。',
  replayed_state: '微信登录结果已被领取，请重新发起登录。',
  provider_error: '微信授权失败，请稍后重试。',
};

function isCallbackErrorCode(value: string): value is WechatWebCallbackErrorCode {
  return Object.prototype.hasOwnProperty.call(callbackErrorMessages, value);
}

function getFragmentSearch(hash: string): string {
  const queryStart = hash.indexOf('?');
  return queryStart >= 0 ? hash.slice(queryStart) : '';
}

function createCallbackSearchParams(location: ReturnType<typeof useLocation>): URLSearchParams {
  const search = location.search || getFragmentSearch(location.hash);
  return new URLSearchParams(search);
}

function getCallbackError(value: string | null): WechatWebCallbackErrorCode | null {
  if (!value) return null;
  return isCallbackErrorCode(value) ? value : 'invalid_state';
}

function getSafeReturnPath(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export function WechatCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const loginBadge = useNebulaLoginBadge();
  const setUser = useAuthStore((state) => state.setUser);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在完成微信登录');

  const callbackParams = useMemo(() => createCallbackSearchParams(location), [location]);
  const loginId = callbackParams.get('loginId');
  const callbackError = getCallbackError(callbackParams.get('error'));

  const recoverLogin = useCallback(async (claimedStatus: WechatWebLoginStatusResp) => {
    saveAuthTokens(claimedStatus);
    if (loginBadge.onLoginSuccess) {
      await loginBadge.onLoginSuccess(claimedStatus);
      setStatus('success');
      setMessage('微信登录已完成');
      return;
    }

    if (loginBadge.authService) {
      const currentUser = await loginBadge.authService.getCurrentUser();
      setUser(toCurrentUser(currentUser));
    }
    navigate(getSafeReturnPath(claimedStatus.returnPath), { replace: true });
  }, [loginBadge, navigate, setUser]);

  useEffect(() => {
    if (callbackError) {
      setStatus('error');
      setMessage(callbackErrorMessages[callbackError]);
      return;
    }

    if (!loginId) {
      setStatus('error');
      setMessage('微信登录编号缺失，请重新发起登录。');
      return;
    }

    if (!loginBadge.authService) {
      setStatus('error');
      setMessage('当前认证服务不可用，请稍后重试。');
      return;
    }

    let active = true;

    loginBadge.authService.getWechatWebLoginStatus(loginId)
      .then(async (result) => {
        if (!active) return;
        switch (result.status) {
          case 'SUCCESS':
            await recoverLogin(result);
            return;
          case 'WAITING':
          case 'SCANNED':
          case 'PROCESSING':
            setStatus('loading');
            setMessage('微信授权已收到，正在等待登录结果');
            return;
          case 'FAILED':
            setStatus('error');
            setMessage('微信登录失败，请重新发起登录。');
            return;
          case 'EXPIRED':
            setStatus('error');
            setMessage('微信登录已过期，请重新发起登录。');
            return;
          case 'CONSUMED':
            setStatus('error');
            setMessage('微信登录结果已被领取，请重新发起登录。');
            return;
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (!(error instanceof Error)) throw error;
        setStatus('error');
        setMessage('微信登录状态查询失败，请重新发起登录。');
      });

    return () => {
      active = false;
    };
  }, [callbackError, loginBadge.authService, loginId, recoverLogin]);

  return (
    <AuthShell>
      <Flex vertical align="center" gap={16}>
        {status === 'loading' ? (
          <Spin description={message}>
            <div data-testid="wechat-callback-loading" />
          </Spin>
        ) : null}
        {status === 'success' ? (
          <Alert type="success" showIcon title="微信登录成功" description={message} data-testid="wechat-callback-success" />
        ) : null}
        {status === 'error' ? (
          <Alert type="error" showIcon title="微信登录未完成" description={message} data-testid="wechat-callback-error" />
        ) : null}
        <Typography.Text type="secondary">没有收到登录结果时，可以返回登录页重新扫码。</Typography.Text>
        <Button type="primary">
          <Link to="/login">返回登录页</Link>
        </Button>
      </Flex>
    </AuthShell>
  );
}
