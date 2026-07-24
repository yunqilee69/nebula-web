import { ReloadOutlined } from '@ant-design/icons';
import { Avatar, Button, Card, Descriptions, Empty, Form, Input, Popconfirm, Space, Tag, theme as antdTheme } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns } from '@/components/nebula-pro-table';
import { PageContainer } from '@/components/page-container';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { profileService as defaultProfileService } from '@/services/profile';
import type { ProfileService } from '@/services/profile';
import type { LoginRecordResp, OAuth2BindingResp, ProfileResp, UpdateProfileReq } from '@/types/profile';

export interface ProfileInfoPageProps {
  service?: ProfileService;
}

type ProfileFormValues = UpdateProfileReq;

const useStyles = createStyles(({ token }) => ({
  avatar: {
    background: token.colorPrimary,
  },
  oauthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: token.marginMD,
  },
}));

function normalizeOptionalText(value: string | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}

function resolveLoginIp(record: LoginRecordResp) {
  return record.loginIp ?? record.ip;
}

function resolveLoginSuccess(record: LoginRecordResp) {
  return record.success ?? record.successFlag ?? false;
}

function buildLoginRecordPageReq(params: NebulaPageReq) {
  return {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
  };
}

export function ProfileInfoPage({ service: serviceProp }: ProfileInfoPageProps) {
  const service = serviceProp ?? defaultProfileService;
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const { token } = antdTheme.useToken();
  const { styles } = useStyles();
  const [form] = Form.useForm<ProfileFormValues>();

  const [profile, setProfile] = useState<ProfileResp>();
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bindings, setBindings] = useState<OAuth2BindingResp[]>([]);
  const [bindingsLoading, setBindingsLoading] = useState(false);
  const [unbindProviderId, setUnbindProviderId] = useState<string>();

  const loginRecordColumns = useMemo<NebulaProColumns<LoginRecordResp>[]>(() => [
    {
      title: t('auth.profileInfo.columns.loginType'),
      dataIndex: 'loginType',
      render: (_, record) => renderNotProvided(record.loginType),
    },
    {
      title: t('auth.profileInfo.columns.loginIp'),
      key: 'loginIp',
      render: (_, record) => renderNotProvided(resolveLoginIp(record)),
    },
    {
      title: t('auth.profileInfo.columns.userAgent'),
      dataIndex: 'userAgent',
      render: (_, record) => renderNotProvided(record.userAgent),
    },
    {
      title: t('auth.profileInfo.columns.loginTime'),
      dataIndex: 'loginTime',
      render: (_, record) => renderNotProvided(record.loginTime),
    },
    {
      title: t('auth.profileInfo.columns.success'),
      key: 'success',
      render: (_, record) => {
        const success = resolveLoginSuccess(record);
        return <Tag color={success ? 'success' : 'error'}>{success ? t('auth.profileInfo.status.success') : t('auth.profileInfo.status.failed')}</Tag>;
      },
    },
    {
      title: t('auth.profileInfo.columns.failReason'),
      dataIndex: 'failReason',
      render: (_, record) => renderNotProvided(record.failReason),
    },
  ], [t]);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const nextProfile = await service.getProfile();
      setProfile(nextProfile);
      form.setFieldsValue({
        nickname: nextProfile.nickname,
        avatar: nextProfile.avatar,
        email: nextProfile.email,
        phone: nextProfile.phone,
      });
    } catch (error: unknown) {
      notice.error(t('auth.profileInfo.feedback.profileLoadFailed'));
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to load profile', message);
    } finally {
      setProfileLoading(false);
    }
  }, [form, notice, service, t]);

  const loadBindings = useCallback(async () => {
    setBindingsLoading(true);
    try {
      const result = await service.listOAuth2Bindings();
      setBindings(result.providers);
    } catch (error: unknown) {
      notice.error(t('auth.profileInfo.feedback.oauth2LoadFailed'));
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to load OAuth2 bindings', message);
    } finally {
      setBindingsLoading(false);
    }
  }, [notice, service, t]);

  useEffect(() => {
    void loadProfile();
    void loadBindings();
  }, [loadBindings, loadProfile]);

  const submitProfile = useCallback(
    async (values: ProfileFormValues) => {
      setSaving(true);
      try {
        const payload: UpdateProfileReq = {
          nickname: normalizeOptionalText(values.nickname),
          avatar: normalizeOptionalText(values.avatar),
          email: normalizeOptionalText(values.email),
          phone: normalizeOptionalText(values.phone),
        };
        const updatedProfile = await service.updateProfile(payload);
        setProfile(updatedProfile);
        form.setFieldsValue({
          nickname: updatedProfile.nickname,
          avatar: updatedProfile.avatar,
          email: updatedProfile.email,
          phone: updatedProfile.phone,
        });
        notice.success(t('auth.profileInfo.feedback.profileUpdateSuccess'));
      } catch (error: unknown) {
        notice.error(t('auth.profileInfo.feedback.profileUpdateFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Profile update failed', message);
      } finally {
        setSaving(false);
      }
    },
    [form, notice, service, t],
  );

  const unbindOAuth2 = useCallback(
    async (providerId: string) => {
      setUnbindProviderId(providerId);
      try {
        await service.unbindOAuth2(providerId);
        notice.success(t('auth.profileInfo.feedback.unbindSuccess'));
        await loadBindings();
      } catch (error: unknown) {
        notice.error(t('auth.profileInfo.feedback.unbindFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('OAuth2 unbind failed', message);
      } finally {
        setUnbindProviderId(undefined);
      }
    },
    [loadBindings, notice, service, t],
  );

  const renderNotProvided = useCallback((value: string | number | undefined) => value ?? t('auth.profileInfo.empty.notProvided'), [t]);

  return (
    <PageContainer>
      <Space orientation="vertical" size={token.marginMD} className="w-full">
        <Card title={t('auth.profileInfo.sections.basic')} loading={profileLoading} extra={<Button icon={<ReloadOutlined />} onClick={() => void loadProfile()}>{t('auth.profileInfo.actions.refresh')}</Button>}>
          <Space orientation="vertical" size={token.marginMD} className="w-full">
            <Space align="center" size={token.marginMD}>
              <Avatar src={profile?.avatar} size={64} className={styles.avatar}>
                {profile?.nickname?.slice(0, 1) ?? profile?.username?.slice(0, 1)}
              </Avatar>
              <Descriptions column={2} size="small">
                <Descriptions.Item label={t('auth.profileInfo.fields.username')}>{renderNotProvided(profile?.username)}</Descriptions.Item>
                <Descriptions.Item label={t('auth.profileInfo.fields.status')}>
                  <Tag color={profile?.status === 1 ? 'success' : 'default'}>{profile?.status === 1 ? t('auth.profileInfo.status.enabled') : t('auth.profileInfo.status.disabled')}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t('auth.profileInfo.fields.createTime')}>{renderNotProvided(profile?.createTime)}</Descriptions.Item>
              </Descriptions>
            </Space>
            <Form form={form} layout="vertical" onFinish={(values) => void submitProfile(values)}>
              <Form.Item name="nickname" label={t('auth.profileInfo.fields.nickname')} htmlFor="profile-nickname">
                <Input id="profile-nickname" allowClear placeholder={t('auth.profileInfo.placeholders.nickname')} />
              </Form.Item>
              <Form.Item name="avatar" label={t('auth.profileInfo.fields.avatar')} htmlFor="profile-avatar">
                <Input id="profile-avatar" allowClear placeholder={t('auth.profileInfo.placeholders.avatar')} />
              </Form.Item>
              <Form.Item name="email" label={t('auth.profileInfo.fields.email')} htmlFor="profile-email" rules={[{ type: 'email', message: t('auth.profileInfo.validation.email') }]}> 
                <Input id="profile-email" allowClear placeholder={t('auth.profileInfo.placeholders.email')} />
              </Form.Item>
              <Form.Item name="phone" label={t('auth.profileInfo.fields.phone')} htmlFor="profile-phone">
                <Input id="profile-phone" allowClear placeholder={t('auth.profileInfo.placeholders.phone')} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={saving}>{t('auth.profileInfo.actions.save')}</Button>
            </Form>
          </Space>
        </Card>

        <Card title={t('auth.profileInfo.sections.oauth2')} loading={bindingsLoading} extra={<Button icon={<ReloadOutlined />} onClick={() => void loadBindings()}>{t('auth.profileInfo.actions.refresh')}</Button>}>
          {bindings.length > 0 ? (
            <div className={styles.oauthGrid}>
              {bindings.map((binding) => (
                <Card key={binding.providerId} data-testid={`oauth2-provider-${binding.providerId}`} size="small" title={binding.providerName ?? binding.providerId}>
                  <Space orientation="vertical" size={token.marginSM} className="w-full">
                    <Tag color={binding.bound ? 'success' : 'default'}>{binding.bound ? t('auth.profileInfo.status.bound') : t('auth.profileInfo.status.unbound')}</Tag>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="ID">{renderNotProvided(binding.providerUserId)}</Descriptions.Item>
                      <Descriptions.Item label={t('auth.profileInfo.fields.createTime')}>{renderNotProvided(binding.linkedAt)}</Descriptions.Item>
                    </Descriptions>
                    {binding.bound ? (
                      <Popconfirm title={t('auth.profileInfo.confirm.unbindTitle')} onConfirm={() => void unbindOAuth2(binding.providerId)}>
                        <Button danger loading={unbindProviderId === binding.providerId}>{t('auth.profileInfo.actions.unbind')}</Button>
                      </Popconfirm>
                    ) : (
                      <Button onClick={() => notice.warning(t('auth.profileInfo.feedback.bindUnavailable'))}>{t('auth.profileInfo.actions.bind')}</Button>
                    )}
                  </Space>
                </Card>
              ))}
            </div>
          ) : (
            <Empty description={t('auth.profileInfo.empty.oauth2')} />
          )}
        </Card>

        <Card title={t('auth.profileInfo.sections.loginRecords')}>
          <NebulaProTable<LoginRecordResp>
            columns={loginRecordColumns}
            search={false}
            request={(params) => service.pageLoginRecords(buildLoginRecordPageReq(params))}
            onRequestError={(error) => {
              notice.error(t('auth.profileInfo.feedback.loginRecordsLoadFailed'));
              const message = error instanceof Error ? error.message : String(error);
              console.error('Failed to load login records', message);
            }}
            locale={{ emptyText: t('auth.profileInfo.empty.loginRecords') }}
          />
        </Card>
      </Space>
    </PageContainer>
  );
}

export default ProfileInfoPage;
