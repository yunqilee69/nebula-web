import { KeyOutlined, LoginOutlined, MailOutlined, MobileOutlined, WechatOutlined } from '@ant-design/icons';
import { Alert, Button, Flex, Form, Input, Space, Spin, Typography, theme } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toCurrentUser } from '@/utils/auth/current-user';
import { useNebulaLoginBadge } from '@/providers/login-badge-provider';
import { saveAuthTokens } from '@/utils/auth/token-session';
import { getBuiltInLoginMethods, mergeLoginBadges } from '@/utils/auth/auth-methods';
import type {
  AuthInitResp,
  BuiltInLoginMethodKey,
  LoginResp,
  NebulaExtraLoginBadge,
  WechatWebLoginStatusResp,
  WechatWebQrCodeResp,
} from '@/types/auth';
import type { AuthService } from '@/services/auth';
import { AuthShell } from '@/components/auth-shell';
import { useAuthStore } from '@/stores/auth-store';

const builtInLabels: Record<BuiltInLoginMethodKey, string> = {
  password: '账号密码',
  phone: '手机验证码',
  email: '邮箱验证码',
  'wechat-web': '微信扫码',
};

type LoginResult = LoginResp | WechatWebLoginStatusResp;

type LoginMethodDescriptor =
  | { key: BuiltInLoginMethodKey; label: string; kind: 'built-in'; method: BuiltInLoginMethodKey }
  | { key: string; label: string; kind: 'extra'; badge: NebulaExtraLoginBadge };

type LoginSuccessHandler = (result: LoginResult) => void | Promise<void>;
type ExtraSuccessHandler = (result?: LoginResult) => void | Promise<void>;

const qrCodeErrorDescription = '二维码加载失败，请稍后重试。';
const untrustedQrCodeDescription = '二维码地址未被信任，请联系管理员。';

function isTrustedQrCodeUrl(url: string) {
  if (!url) return false;
  if (url.startsWith('/')) return true;
  if (typeof window === 'undefined') return false;

  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && (parsed.protocol === 'https:' || parsed.protocol === 'http:');
  } catch {
    return false;
  }
}

function buildLoginMethodDescriptors(
  keys: string[],
  builtInMethods: BuiltInLoginMethodKey[],
  extraBadges: NebulaExtraLoginBadge[],
): LoginMethodDescriptor[] {
  return keys
    .map((key): LoginMethodDescriptor | null => {
      const isBuiltIn = builtInMethods.includes(key as BuiltInLoginMethodKey);

      if (isBuiltIn) {
        const method = key as BuiltInLoginMethodKey;
        return { key: method, label: builtInLabels[method], kind: 'built-in', method };
      }

      const badge = extraBadges.find((item) => item.key === key);
      if (!badge) return null;

      return { key: badge.key, label: badge.label, kind: 'extra', badge };
    })
    .filter((item): item is LoginMethodDescriptor => item !== null);
}

function getLoginMethodIcon(method: LoginMethodDescriptor): ReactNode {
  if (method.kind === 'extra') return <LoginOutlined />;

  switch (method.method) {
    case 'password':
      return <KeyOutlined />;
    case 'phone':
      return <MobileOutlined />;
    case 'email':
      return <MailOutlined />;
    case 'wechat-web':
      return <WechatOutlined />;
  }
}

export function LoginPage() {
  const loginBadge = useNebulaLoginBadge();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const setUser = useAuthStore((state) => state.setUser);

  const [config, setConfig] = useState<AuthInitResp | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configLoadFailed, setConfigLoadFailed] = useState(false);

  useEffect(() => {
    if (!loginBadge.authService) {
      setConfigLoading(false);
      return;
    }

    let cancelled = false;
    loginBadge.authService
      .getAuthConfig()
      .then((resp) => {
        if (!cancelled) {
          setConfig(resp);
          setConfigLoadFailed(false);
          setConfigLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfig(null);
          setConfigLoadFailed(true);
          setConfigLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loginBadge.authService]);

  const builtInMethods = useMemo(
    () => (config ? getBuiltInLoginMethods(config) : configLoadFailed ? loginBadge.defaultLoginMethods : []),
    [config, configLoadFailed, loginBadge.defaultLoginMethods],
  );

  const mergedKeys = useMemo(
    () => mergeLoginBadges(builtInMethods, loginBadge.extraLoginBadges),
    [builtInMethods, loginBadge.extraLoginBadges],
  );

  const handleExtraSuccess = useCallback(
    async (result?: LoginResult) => {
      if (result) {
        saveAuthTokens(result);
        if (loginBadge.onLoginSuccess) {
          await loginBadge.onLoginSuccess(result);
        } else {
          if (loginBadge.authService) {
            const currentUser = await loginBadge.authService.getCurrentUser();
            setUser(toCurrentUser(currentUser));
          }
          navigate('/');
        }
      }
    },
    [loginBadge.authService, loginBadge.onLoginSuccess, navigate, setUser],
  );

  const handleLoginSuccess = useCallback(
    async (result: LoginResult) => {
      saveAuthTokens(result);
      if (loginBadge.onLoginSuccess) {
        await loginBadge.onLoginSuccess(result);
      } else {
        if (loginBadge.authService) {
          const currentUser = await loginBadge.authService.getCurrentUser();
          setUser(toCurrentUser(currentUser));
        }
        navigate('/');
      }
    },
    [loginBadge.authService, loginBadge.onLoginSuccess, navigate, setUser],
  );

  if (configLoading) {
    return (
      <AuthShell>
        <Flex justify="center" className="p-6">
          <Spin description="加载中">
            <div />
          </Spin>
        </Flex>
      </AuthShell>
    );
  }

  if (!loginBadge.authService) {
    const extraMethods = loginBadge.extraLoginBadges.map(
      (badge): LoginMethodDescriptor => ({ key: badge.key, label: badge.label, kind: 'extra', badge }),
    );

    return (
      <AuthShell>
        {extraMethods.length > 0 ? (
          <LoginMethodSwitcher
            methods={extraMethods}
            authService={null}
            config={null}
            loginBadgeContext={loginBadge}
            onLoginSuccess={handleLoginSuccess}
            onExtraSuccess={handleExtraSuccess}
          />
        ) : (
          <Alert type="info" title="暂无可用登录方式" description="当前认证服务未返回可用登录方式，请联系系统管理员检查登录管理配置。" showIcon />
        )}
      </AuthShell>
    );
  }

  const authService = loginBadge.authService;
  const methods = buildLoginMethodDescriptors(mergedKeys, builtInMethods, loginBadge.extraLoginBadges);

  return (
    <AuthShell>
      <LoginMethodSwitcher
        methods={methods}
        authService={authService}
        config={config}
        loginBadgeContext={loginBadge}
        onLoginSuccess={handleLoginSuccess}
        onExtraSuccess={handleExtraSuccess}
      />

      {loginBadge.registerPath && (
        <Flex justify="center" className="mt-4">
          <Typography.Text type="secondary">
            没有账号？
            <Link to={loginBadge.registerPath}>立即注册</Link>
          </Typography.Text>
        </Flex>
      )}
    </AuthShell>
  );
}

interface LoginMethodSwitcherProps {
  methods: LoginMethodDescriptor[];
  authService: AuthService | null;
  config: AuthInitResp | null;
  loginBadgeContext: ReturnType<typeof useNebulaLoginBadge>;
  onLoginSuccess: (result: LoginResult) => void;
  onExtraSuccess: ExtraSuccessHandler;
}

function LoginMethodSwitcher({
  methods,
  authService,
  config,
  loginBadgeContext,
  onLoginSuccess,
  onExtraSuccess,
}: LoginMethodSwitcherProps) {
  const { token } = theme.useToken();
  const initialMethodKey = useMemo(() => methods.find((method) => method.key === 'password')?.key ?? methods[0]?.key, [methods]);
  const [activeMethodKey, setActiveMethodKey] = useState(initialMethodKey);

  useEffect(() => {
    setActiveMethodKey(initialMethodKey);
  }, [initialMethodKey]);

  const activeMethod = methods.find((method) => method.key === activeMethodKey) ?? methods[0];

  if (!activeMethod) {
    return <Alert type="info" title="暂无可用登录方式" description="当前认证服务未返回可用登录方式，请联系系统管理员检查登录管理配置。" showIcon />;
  }

  const alternateMethods = methods.filter((method) => method.key !== activeMethod.key);

  return (
    <Flex vertical gap={token.marginMD}>
      <Typography.Text strong className="text-center">
        当前登录方式：{activeMethod.label}
      </Typography.Text>

      {activeMethod.kind === 'built-in' && authService ? (
        <LoginMethodPanel
          method={activeMethod.method}
          authService={authService}
          onSuccess={onLoginSuccess}
          config={config}
        />
      ) : null}

      {activeMethod.kind === 'extra' ? (
        <ExtraBadgePanel
          badge={activeMethod.badge}
          onSuccess={onExtraSuccess}
          loginBadgeContext={loginBadgeContext}
        />
      ) : null}

      {alternateMethods.length > 0 && (
        <Flex vertical align="center" gap={token.marginXS}>
          <Typography.Text type="secondary">其他登录方式</Typography.Text>
          <Space size={[token.marginXS, token.marginXS]} wrap className="justify-center">
            {alternateMethods.map((method) => (
              <Button
                key={method.key}
                aria-label={method.label}
                title={method.label}
                type="default"
                shape="circle"
                icon={getLoginMethodIcon(method)}
                className="h-11 w-11"
                onClick={() => setActiveMethodKey(method.key)}
              />
            ))}
          </Space>
        </Flex>
      )}
    </Flex>
  );
}

interface LoginMethodPanelProps {
  method: BuiltInLoginMethodKey;
  authService: AuthService;
  onSuccess: LoginSuccessHandler;
  config: AuthInitResp | null;
}

function LoginMethodPanel({ method, authService, onSuccess, config }: LoginMethodPanelProps) {
  switch (method) {
    case 'password':
      return <PasswordPanel authService={authService} onSuccess={onSuccess} />;
    case 'phone':
      return <PhonePanel authService={authService} onSuccess={onSuccess} sendInterval={config?.phoneSendIntervalSeconds ?? 60} />;
    case 'email':
      return <EmailPanel authService={authService} onSuccess={onSuccess} sendInterval={config?.emailSendIntervalSeconds ?? 60} />;
    case 'wechat-web':
      return <WechatQrPanel authService={authService} onSuccess={onSuccess} />;
  }
}

interface PasswordPanelProps {
  authService: AuthService;
  onSuccess: LoginSuccessHandler;
}

function PasswordPanel({ authService, onSuccess }: PasswordPanelProps) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const result = await authService.login(values);
      await onSuccess(result);
    } catch {
      // Request client already surfaces API failures through the global notice path.
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} onFinish={handleSubmit} layout="vertical">
      <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
        <Input />
      </Form.Item>
      <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
        <Input.Password />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          登录
        </Button>
      </Form.Item>
    </Form>
  );
}

interface PhonePanelProps {
  authService: AuthService;
  onSuccess: LoginSuccessHandler;
  sendInterval: number;
}

function PhonePanel({ authService, onSuccess, sendInterval }: PhonePanelProps) {
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [form] = Form.useForm();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSendCode = async () => {
    const phone = form.getFieldValue('phone');
    if (!phone) return;

    setSendingCode(true);
    try {
      await authService.sendPhoneCode({ phone });
      setCountdown(sendInterval);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (values: { phone: string; code: string }) => {
    setLoading(true);
    try {
      const result = await authService.phoneLogin(values);
      await onSuccess(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} onFinish={handleSubmit} layout="vertical">
      <Form.Item label="手机号" name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
        <Input />
      </Form.Item>
      <Form.Item label="验证码" name="code" rules={[{ required: true, message: '请输入验证码' }]}>
        <Flex gap={8}>
          <Input className="flex-1" />
          <Button onClick={handleSendCode} loading={sendingCode} disabled={countdown > 0}>
            {countdown > 0 ? `${countdown}s` : '发送验证码'}
          </Button>
        </Flex>
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          登录
        </Button>
      </Form.Item>
    </Form>
  );
}

interface EmailPanelProps {
  authService: AuthService;
  onSuccess: LoginSuccessHandler;
  sendInterval: number;
}

function EmailPanel({ authService, onSuccess, sendInterval }: EmailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [form] = Form.useForm();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSendCode = async () => {
    const email = form.getFieldValue('email');
    if (!email) return;

    setSendingCode(true);
    try {
      await authService.sendEmailCode({ email });
      setCountdown(sendInterval);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (values: { email: string; code: string }) => {
    setLoading(true);
    try {
      const result = await authService.emailLogin(values);
      await onSuccess(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} onFinish={handleSubmit} layout="vertical">
      <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱' }]}>
        <Input />
      </Form.Item>
      <Form.Item label="验证码" name="code" rules={[{ required: true, message: '请输入验证码' }]}>
        <Flex gap={8}>
          <Input className="flex-1" />
          <Button onClick={handleSendCode} loading={sendingCode} disabled={countdown > 0}>
            {countdown > 0 ? `${countdown}s` : '发送验证码'}
          </Button>
        </Flex>
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          登录
        </Button>
      </Form.Item>
    </Form>
  );
}

interface WechatQrPanelProps {
  authService: AuthService;
  onSuccess: LoginSuccessHandler;
}

function WechatQrPanel({ authService, onSuccess }: WechatQrPanelProps) {
  const [qrData, setQrData] = useState<WechatWebQrCodeResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expireSeconds, setExpireSeconds] = useState(0);
  const [statusText, setStatusText] = useState('请使用微信扫描二维码登录');

  const createQr = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatusText('请使用微信扫描二维码登录');
    try {
      const redirectUrl = typeof window !== 'undefined' ? window.location.href : '';
      const result = await authService.createWechatWebQrCode({ redirectAfterLogin: redirectUrl });
      setQrData(result);
      setExpireSeconds(result.expireSeconds);
    } catch {
      setError(qrCodeErrorDescription);
    } finally {
      setLoading(false);
    }
  }, [authService]);

  useEffect(() => {
    createQr();
  }, [createQr]);

  useEffect(() => {
    if (!qrData) return;

    const pollTimer = setTimeout(async () => {
      try {
        const status = await authService.getWechatWebLoginStatus(qrData.loginId);
        if (status.status === 'SUCCESS') {
          await onSuccess(status);
        } else if (status.status === 'EXPIRED') {
          setExpireSeconds(0);
          setStatusText('二维码已过期，请刷新后重试');
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
        <Typography.Text type="danger">{error}</Typography.Text>
        <Button onClick={createQr}>刷新</Button>
      </Flex>
    );
  }

  if (!qrData) return null;

  const trustedQrCodeUrl = isTrustedQrCodeUrl(qrData.qrCodeUrl) ? qrData.qrCodeUrl : null;

  return (
    <Flex vertical align="center" gap={8}>
      {trustedQrCodeUrl ? (
        <img src={trustedQrCodeUrl} alt="微信登录二维码" className="max-w-[200px]" />
      ) : (
        <Typography.Text type="danger">{untrustedQrCodeDescription}</Typography.Text>
      )}
      <Typography.Text type="secondary">{statusText}</Typography.Text>
      {expireSeconds > 0 && <Typography.Text type="secondary">二维码将在 {expireSeconds}s 后过期</Typography.Text>}
      <Button size="small" onClick={createQr}>
        刷新二维码
      </Button>
    </Flex>
  );
}

interface ExtraBadgePanelProps {
  badge: NebulaExtraLoginBadge;
  onSuccess: ExtraSuccessHandler;
  loginBadgeContext: ReturnType<typeof useNebulaLoginBadge>;
}

function ExtraBadgePanel({ badge, onSuccess, loginBadgeContext }: ExtraBadgePanelProps) {
  const handleBadgeSuccess = useCallback(
    async (response?: LoginResult) => {
      await onSuccess(response);
    },
    [onSuccess],
  );

  return <>{badge.render({ onSuccess: handleBadgeSuccess, loginBadge: loginBadgeContext })}</>;
}
