import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PermissionService } from '@/api/permission';
import { ButtonPermissionPage } from './index';

vi.mock('@/hooks/use-nebula-i18n', () => ({
  useNebulaI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/use-notice', () => ({
  useNotice: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock('@/api/permission', () => ({
  permissionService: {
    listSubjects: vi.fn().mockResolvedValue({
      orgs: [{ id: '1', type: 'ORG', name: 'Org 1', code: 'ORG1' }],
      roles: [{ id: '2', type: 'ROLE', name: 'Role 1', code: 'ROLE1' }],
      users: [],
    }),
    listMenuTree: vi.fn().mockResolvedValue([
      {
        id: 'menu1',
        type: 'MENU',
        name: 'Menu 1',
        code: 'MENU1',
        path: '/menu1',
        status: 1,
        buttons: [
          { id: 'btn1', type: 'BUTTON', name: 'Button 1', code: 'BTN1', menuId: 'menu1' },
        ],
      },
    ]),
    pageSubjectPermissions: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    createPermissions: vi.fn().mockResolvedValue([]),
    createPermissionItems: vi.fn().mockResolvedValue([]),
    updatePermissions: vi.fn().mockResolvedValue([]),
    updatePermission: vi.fn().mockResolvedValue('permission-id'),
    removePermissionsBySubjectAndResources: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ButtonPermissionPage', () => {
  it('renders without crashing', async () => {
    render(<ButtonPermissionPage />);
    // Wait for loading to complete
    expect(await screen.findByText('auth.buttonPermission.title')).toBeInTheDocument();
  });

  it('renders loaded denied button permissions as tri-state controls', async () => {
    const service = {
      listSubjects: vi.fn().mockResolvedValue({
        orgs: [{ id: 'org1', type: 'ORG', name: 'Org 1', code: 'ORG1' }],
        roles: [],
        users: [],
      }),
      listMenuTree: vi.fn().mockResolvedValue([
        {
          id: 'menu1',
          type: 'MENU',
          name: 'Menu 1',
          code: 'MENU1',
          path: '/menu1',
          status: 1,
          buttons: [
            { id: 'btn1', type: 'BUTTON', name: 'Button 1', code: 'BTN1', menuId: 'menu1' },
          ],
        },
      ]),
      pageSubjectPermissions: vi.fn().mockResolvedValue({
        data: [{ id: 'grant1', subjectType: 'ORG', subjectId: 'org1', resourceType: 'BUTTON', resourceId: 'btn1', effect: 'Deny', scope: 'ALL' }],
        total: 1,
      }),
      createPermissions: vi.fn().mockResolvedValue([]),
      createPermissionItems: vi.fn().mockResolvedValue([]),
      updatePermissions: vi.fn().mockResolvedValue([]),
      updatePermission: vi.fn().mockResolvedValue('permission-id'),
      removePermissionsBySubjectAndResources: vi.fn().mockResolvedValue(undefined),
    } satisfies PermissionService;

    render(<ButtonPermissionPage service={service} />);

    const permissionToggle = await screen.findByRole('checkbox', { name: 'Button 1 auth.buttonPermission.effects.deny' });

    expect(permissionToggle).toHaveAttribute('aria-checked', 'mixed');
    expect(permissionToggle).toHaveAttribute('data-permission-effect', 'Deny');
  });
});
