import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/app/nebula-provider';
import type { PermissionService } from '@/services/permission';
import { useLocaleStore } from '@/stores/locale-store';
import { PermissionConfigPage } from './index';

const groups = [
  {
    key: 'auth',
    name: '系统权限',
    menus: [
      {
        id: 'menu-user',
        type: 'MENU' as const,
        name: '用户管理',
        code: 'USER',
        path: '/auth/user',
        buttons: [
          { id: 'btn-user-create', type: 'BUTTON' as const, menuId: 'menu-user', name: '新增用户', code: 'USER_CREATE' },
        ],
      },
    ],
  },
];

function createService(overrides: Partial<PermissionService> = {}): PermissionService {
  return {
    pageSubjectPermissions: vi.fn().mockResolvedValue({ records: [], total: 0 }),
    saveSubjectPermissions: vi.fn().mockResolvedValue(undefined),
    listSubjects: vi.fn().mockResolvedValue({
      orgs: [{ id: 'org-rd', type: 'ORG' as const, name: '研发中心', code: 'ORG_RD' }],
      roles: [{ id: 'role-admin', type: 'ROLE' as const, name: '超级管理员', code: 'ADMIN' }],
      users: [{ id: 'user-linyu', type: 'USER' as const, name: '林屿', code: 'linyu' }],
    }),
    listResourceGroups: vi.fn().mockResolvedValue(groups),
    ...overrides,
  };
}

function renderPage(service = createService()) {
  render(
    <NebulaProvider>
      <PermissionConfigPage service={service} />
    </NebulaProvider>,
  );

  return service;
}

describe('PermissionConfigPage', () => {
  afterEach(() => {
    act(() => {
      useLocaleStore.getState().setLocale('zh-CN');
    });
  });

  it('renders subject tabs and resources', async () => {
    renderPage();

    expect(await screen.findByText('权限主体')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '组织' })).toBeInTheDocument();
    expect((await screen.findAllByText('用户管理')).length).toBeGreaterThan(0);
    expect(screen.getByText('新增用户')).toBeInTheDocument();
  });

  it('saves selected effects for the active subject', async () => {
    const user = userEvent.setup();
    const service = createService({
      pageSubjectPermissions: vi.fn().mockResolvedValue({
        records: [{ id: 'g1', subjectType: 'ORG', subjectId: 'org-rd', resourceType: 'MENU', resourceId: 'menu-user', effect: 'Allow' }],
        total: 1,
      }),
    });
    renderPage(service);

    await screen.findAllByText('用户管理');
    await user.click(screen.getByRole('button', { name: '保存全部授权' }));

    await waitFor(() => {
      expect(service.saveSubjectPermissions).toHaveBeenCalledWith({
        subjectType: 'ORG',
        subjectId: 'org-rd',
        permissions: [{ resourceType: 'MENU', resourceId: 'menu-user', effect: 'Allow', scope: 'ALL' }],
      });
    });
  });

  it('defaults to first org subject on load', async () => {
    renderPage();

    await screen.findAllByText('用户管理');
    expect(screen.getByText('研发中心')).toBeInTheDocument();
  });

  it('renders page labels from the active English locale', async () => {
    act(() => {
      useLocaleStore.getState().setLocale('en-US');
    });

    renderPage();

    expect(await screen.findByText('Permission Subjects')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Organizations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Permissions' })).toBeInTheDocument();
  });
});
