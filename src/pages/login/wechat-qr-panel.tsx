import { Button, Flex, Spin, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthService } from '@/api/auth';
import type { WechatWebLoginStatusResp, WechatWebQrCodeResp } from '@/types/auth';
import { loadWxLoginScript, mountWxLogin, type WxLoginOptions } from './wechat-web-login';

const qrCodeErrorDescription = '二维码加载失败，请稍后重试。';
const wechatQrContainerId = 'wechat-login-qr';

interface WechatQrPanelProps {
  readonly authService: AuthService;
  readonly onSuccess: (result: WechatWebLoginStatusResp) => void | Promise<void>;
}

function buildWxLoginOptions(qrData: WechatWebQrCodeResp): WxLoginOptions {
  return {
    appid: qrData.appId,
    scope: qrData.scope,
    redirect_uri: qrData.redirectUri,
    state: qrData.state,
    self_redirect: false,
  };
}

export function WechatQrPanel({ authService, onSuccess }: WechatQrPanelProps) {
  const [qrData, setQrData] = useState<WechatWebQrCodeResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [widgetReady, setWidgetReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expireSeconds, setExpireSeconds] = useState(0);
  const [statusText, setStatusText] = useState('请使用微信扫描二维码登录');

  const wxLoginOptions = useMemo(() => (qrData ? buildWxLoginOptions(qrData) : null), [qrData]);

  const createQr = useCallback(async () => {
    setLoading(true);
    setWidgetReady(false);
    setError(null);
    setStatusText('请使用微信扫描二维码登录');
    try {
      const redirectUrl = typeof window !== 'undefined' ? window.location.href : '';
      const result = await authService.createWechatWebQrCode({ redirectAfterLogin: redirectUrl });
      setQrData(result);
      setExpireSeconds(result.expiresInSeconds);
    } catch {
      setQrData(null);
      setError(qrCodeErrorDescription);
    } finally {
      setLoading(false);
    }
  }, [authService]);

  useEffect(() => {
    createQr();
  }, [createQr]);

  useEffect(() => {
    if (!wxLoginOptions) return undefined;

    let active = true;
    let mountedWidget: { readonly dispose: () => void } | null = null;
    let iframe: HTMLIFrameElement | null = null;

    const markReady = () => {
      if (active) setWidgetReady(true);
    };

    const markError = () => {
      if (active) setError(qrCodeErrorDescription);
    };

    loadWxLoginScript()
      .then(() => {
        if (!active) return;
        mountedWidget = mountWxLogin(wxLoginOptions, wechatQrContainerId);
        iframe = document.querySelector(`#${wechatQrContainerId} iframe`);
        if (iframe) {
          iframe.addEventListener('load', markReady, { once: true });
          iframe.addEventListener('error', markError, { once: true });
        } else {
          markReady();
        }
      })
      .catch(markError);

    return () => {
      active = false;
      iframe?.removeEventListener('load', markReady);
      iframe?.removeEventListener('error', markError);
      mountedWidget?.dispose();
    };
  }, [wxLoginOptions]);

  useEffect(() => {
    if (!qrData) return undefined;

    const pollTimer = setTimeout(async () => {
      try {
        const status = await authService.getWechatWebLoginStatus(qrData.loginId);
        switch (status.status) {
          case 'SUCCESS':
            await onSuccess(status);
            return;
          case 'SCANNED':
          case 'PROCESSING':
            setStatusText('微信已确认，正在完成登录');
            return;
          case 'FAILED':
            setExpireSeconds(0);
            setStatusText('微信登录失败，请刷新后重试');
            return;
          case 'EXPIRED':
            setExpireSeconds(0);
            setStatusText('二维码已过期，请刷新后重试');
            return;
          case 'CONSUMED':
            setExpireSeconds(0);
            setStatusText('登录结果已领取，请重新发起登录');
            return;
          case 'WAITING':
            return;
        }
      } catch {
        setError(qrCodeErrorDescription);
      }
    }, 2000);

    return () => {
      clearTimeout(pollTimer);
    };
  }, [authService, onSuccess, qrData]);

  if (loading) {
    return <Spin />;
  }

  if (error) {
    return (
      <Flex vertical align="center" gap={8}>
        <Typography.Text type="danger" data-testid="wechat-login-error">{error}</Typography.Text>
        <Button onClick={createQr} data-testid="wechat-login-retry">刷新</Button>
      </Flex>
    );
  }

  if (!qrData) return null;

  return (
    <Flex vertical align="center" gap={8}>
      <div id={wechatQrContainerId} aria-label="微信登录二维码" />
      {widgetReady && <span data-testid="wechat-login-ready" hidden />}
      <Typography.Text type="secondary">{statusText}</Typography.Text>
      {expireSeconds > 0 && <Typography.Text type="secondary">二维码将在 {expireSeconds}s 后过期</Typography.Text>}
      <Button size="small" onClick={createQr} data-testid="wechat-login-retry">
        刷新二维码
      </Button>
    </Flex>
  );
}
