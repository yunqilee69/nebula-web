import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/app/nebula-provider';
import type { AuthManagementService } from '@/services/auth-management';
import { useLocaleStore } from '@/stores/locale-store';
import type { PageResp, UserResp } from '@/types/auth-management';
import { UserManagementPage } from './index';

function createService(overrides: Partial<AuthManagementService> = {}): AuthManagementService {
  return {
    pageUsers: vi.fn().mockResolvedValue({
      records: [
        { id: 'user-1', username: 'yunqi', nickname: '云起', email: 'yunqi@cludix.com', phone: '13800000001', status: 1 },
      ],
      total: 1,
    } satisfies PageResp<UserResp>),
    createUser: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn().mockResolvedValue(undefined),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    getUserDetail: vi.fn().mockResolvedValue({ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }),
    listRoles: vi.fn().mockResolvedValue([{ id: 'role-1', name: '平台管理员', code: 'ADMIN' }]),
    listOrgs: vi.fn().mockResolvedValue([{ id: 'org-1', name: '研发中心', code: 'RND' }]),
    pageOrgs: vi.fn().mockResolvedValue({ records: [], total: 0 }),
    getOrgTree: vi.fn().mockResolvedValue([]),
    createOrg: vi.fn().mockResolvedValue(undefined),
    updateOrg: vi.fn().mockResolvedValue(undefined),
    deleteOrg: vi.fn().mockResolvedValue(undefined),
    getOrgDetail: vi.fn().mockResolvedValue({ id: 'org-1', name: '研发中心', code: 'RND', type: 'DEPARTMENT', status: 1 }),
    ...overrides,
  };
}

function renderPage(service = createService()) {
  render(
    <NebulaProvider>
      <UserManagementPage service={service} />
    </NebulaProvider>,
  );
  return service;
}

describe('UserManagementPage', () => {
  afterEach(() => {
    act(() => {
      useLocaleStore.getState().setLocale('zh-CN');
    });
  });

  it('renders a NeTable search area, toolbar, and user rows', async () => {
    const service = renderPage();

    expect(screen.getByTestId('ne-table-search')).toBeInTheDocument();
    expect(screen.getByTestId('ne-table-toolbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新增用户/ })).toBeInTheDocument();
    expect(await screen.findByText('yunqi')).toBeInTheDocument();
    expect(service.pageUsers).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 });
  });

  it('submits search values through NeTable request query', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await user.type(screen.getByLabelText('账号'), 'yunqi');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageUsers).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 10, username: 'yunqi' });
    });
  });

  it('opens the user drawer from the NeTable toolbar', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /新增用户/ }));

    const dialog = screen.getByRole('dialog', { name: '新增用户' });
    expect(within(dialog).getByLabelText('用户名')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('密码')).toBeInTheDocument();
  });

  it('renders page labels from the active English locale', async () => {
    act(() => {
      useLocaleStore.getState().setLocale('en-US');
    });

    renderPage();

    expect(screen.getByRole('button', { name: /New User/ })).toBeInTheDocument();
    expect(await screen.findByText('yunqi')).toBeInTheDocument();
  });
});
