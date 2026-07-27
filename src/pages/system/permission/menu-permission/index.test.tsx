import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { PermissionService } from '@/services/permission';
import { useLocaleStore } from '@/stores/locale-store';
import type { PermissionResourceGroup } from '@/types/permission';
import { MenuPermissionPage } from './index';

function createPermissionService(overrides: Partial<PermissionService> = {}): PermissionService {
  return {
    listSubjects: overrides.listSubjects ?? vi.fn().mockResolvedValue({
      orgs: [{ id: 'org-1', type: 'ORG', name: '研发中心', code: 'RND' }],
      roles: [],
      users: [],
    }),
    listResourceGroups: overrides.listResourceGroups ?? vi.fn().mockResolvedValue([]),
    pageSubjectPermissions: overrides.pageSubjectPermissions ?? vi.fn().mockResolvedValue({ data: [], total: 0 }),
    saveSubjectPermissions: overrides.saveSubjectPermissions ?? vi.fn().mockResolvedValue(undefined),
  };
}

function renderMenuPermissionPage(service: PermissionService) {
  return render(
    <NebulaProvider>
      <MenuPermissionPage service={service} />
    </NebulaProvider>,
  );
}

const nestedResources = [
  {
    key: 'system',
    name: '系统管理',
    menus: [
      {
        id: 'menu-system',
        type: 'MENU' as const,
        name: '系统设置',
        code: 'SYSTEM_SETTINGS',
        path: '/system',
        buttons: [],
        children: [
          {
            id: 'menu-user',
            type: 'MENU' as const,
            name: '用户管理',
            code: 'USER_MANAGEMENT',
            path: '/system/users',
            buttons: [],
            children: [
              {
                id: 'menu-user-list',
                type: 'MENU' as const,
                name: '用户列表',
                code: 'USER_LIST',
                path: '/system/users/list',
                buttons: [],
              },
            ],
          },
        ],
      },
    ],
  },
] as unknown as PermissionResourceGroup[];

describe('MenuPermissionPage', () => {
  beforeEach(() => {
    useLocaleStore.getState().setLocale('zh-CN');
  });

  afterEach(() => {
    useLocaleStore.getState().setLocale('zh-CN');
  });

  it('renders every nested menu and selects every menu in the hierarchy', async () => {
    const user = userEvent.setup();
    const saveSubjectPermissions = vi.fn().mockResolvedValue(undefined);
    const service = createPermissionService({
      listResourceGroups: vi.fn().mockResolvedValue(nestedResources),
      saveSubjectPermissions,
    });

    renderMenuPermissionPage(service);

    expect(await screen.findByText('用户列表')).toBeInTheDocument();
    expect(screen.getByText('系统设置')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '全部选中' }));
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(saveSubjectPermissions).toHaveBeenCalledWith(expect.objectContaining({
        permissions: expect.arrayContaining([
          expect.objectContaining({ resourceId: 'menu-system', effect: 'Allow' }),
          expect.objectContaining({ resourceId: 'menu-user', effect: 'Allow' }),
          expect.objectContaining({ resourceId: 'menu-user-list', effect: 'Allow' }),
        ]),
      }));
    });
  });

  it('keeps menu ancestors visible when searching for a descendant', async () => {
    const user = userEvent.setup();
    const service = createPermissionService({
      listResourceGroups: vi.fn().mockResolvedValue(nestedResources),
    });

    renderMenuPermissionPage(service);

    const searchInput = await screen.findByPlaceholderText('搜索菜单');
    await user.type(searchInput, '用户列表');

    expect(screen.getByText('用户列表')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('系统设置')).toBeInTheDocument();
    expect(screen.getByText('系统管理')).toBeInTheDocument();
  });
});
