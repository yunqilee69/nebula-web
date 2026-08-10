import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { ProfileService } from '@/api/profile';
import { useLocaleStore } from '@/stores/locale-store';
import type { LoginRecordResp, PageResp, ProfileResp } from '@/types/profile';
import { ProfileInfoPage } from './index';

const profile: ProfileResp = {
  id: 'user-1',
  username: 'yunqi',
  nickname: '云起',
  avatar: 'https://example.com/avatar.png',
  email: 'yunqi@cludix.com',
  phone: '13800000001',
  status: 1,
  createTime: '2026-06-06 10:00:00',
};

const loginRecords: PageResp<LoginRecordResp> = {
  data: [
    {
      id: 'record-1',
      loginType: 'PASSWORD',
      loginIp: '127.0.0.1',
      userAgent: 'Chrome on macOS',
      loginTime: '2026-06-06 12:00:00',
      success: true,
    },
  ],
  total: 1,
};

function createService(overrides: Partial<ProfileService> = {}): ProfileService {
  return {
    getProfile: vi.fn().mockResolvedValue(profile),
    updateProfile: vi.fn().mockResolvedValue(profile),
    listOAuth2Bindings: vi.fn().mockResolvedValue({
      providers: [
        { providerId: 'wechat-web', providerName: '微信网页', bound: true, providerUserId: 'openid-1', linkedAt: '2026-06-06 11:00:00' },
        { providerId: 'github', providerName: 'GitHub', bound: false },
      ],
    }),
    bindOAuth2: vi.fn().mockResolvedValue('binding-1'),
    unbindOAuth2: vi.fn().mockResolvedValue(true),
    changePassword: vi.fn().mockResolvedValue(undefined),
    pageLoginRecords: vi.fn().mockResolvedValue(loginRecords),
    ...overrides,
  };
}

function renderPage(service = createService()) {
  render(
    <NebulaProvider>
      <ProfileInfoPage service={service} />
    </NebulaProvider>,
  );
  return service;
}

describe('ProfileInfoPage', () => {
  afterEach(() => {
    cleanup();
    act(() => {
      useLocaleStore.getState().setLocale('zh-CN');
    });
  });

  it('loads profile, OAuth2 bindings, and login records', async () => {
    const service = renderPage();

    expect(await screen.findByDisplayValue('云起')).toBeInTheDocument();
    expect(screen.getByDisplayValue('yunqi@cludix.com')).toBeInTheDocument();
    expect(screen.getByText('微信网页')).toBeInTheDocument();
    expect(screen.getByText('已绑定')).toBeInTheDocument();
    expect(await screen.findByText('127.0.0.1')).toBeInTheDocument();
    expect(service.getProfile).toHaveBeenCalledTimes(1);
    expect(service.listOAuth2Bindings).toHaveBeenCalledTimes(1);
    expect(service.pageLoginRecords).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 });
  });

  it('submits editable profile fields through the service', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    const nickname = await screen.findByLabelText('昵称');
    await user.clear(nickname);
    await user.type(nickname, '新昵称');
    await user.click(screen.getByRole('button', { name: /保存资料/ }));

    await waitFor(() => {
      expect(service.updateProfile).toHaveBeenCalledWith({
        nickname: '新昵称',
        avatar: 'https://example.com/avatar.png',
        email: 'yunqi@cludix.com',
        phone: '13800000001',
      });
    });
  });

  it('unbinds a bound OAuth2 provider and refreshes binding status', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('微信网页');
    const providerCard = screen.getByTestId('oauth2-provider-wechat-web');

    await user.click(within(providerCard).getByRole('button', { name: /解\s*绑/ }));
    await user.click(await screen.findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => {
      expect(service.unbindOAuth2).toHaveBeenCalledWith('wechat-web');
      expect(service.listOAuth2Bindings).toHaveBeenCalledTimes(2);
    });
  });

  it('submits password changes through the service', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByRole('button', { name: /修改密码/ });
    await user.type(screen.getByLabelText('原密码'), 'old-secret');
    await user.type(screen.getByLabelText('新密码'), 'new-secret');
    await user.type(screen.getByLabelText('确认新密码'), 'new-secret');
    await user.click(screen.getByRole('button', { name: /修改密码/ }));

    await waitFor(() => {
      expect(service.changePassword).toHaveBeenCalledWith({ oldPassword: 'old-secret', newPassword: 'new-secret' });
    });
  });

  it('renders page labels from the active English locale', async () => {
    act(() => {
      useLocaleStore.getState().setLocale('en-US');
    });

    renderPage();

    expect(await screen.findByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Profile/ })).toBeInTheDocument();
    expect(await screen.findByText('127.0.0.1')).toBeInTheDocument();
  });
});
