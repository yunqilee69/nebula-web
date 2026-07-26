import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

vi.mock('@/services/permission', () => ({
  permissionService: {
    listSubjects: vi.fn().mockResolvedValue({
      orgs: [{ id: '1', type: 'ORG', name: 'Org 1', code: 'ORG1' }],
      roles: [{ id: '2', type: 'ROLE', name: 'Role 1', code: 'ROLE1' }],
      users: [],
    }),
    listResourceGroups: vi.fn().mockResolvedValue([
      {
        key: 'group1',
        name: 'Group 1',
        menus: [
          {
            id: 'menu1',
            type: 'MENU',
            name: 'Menu 1',
            code: 'MENU1',
            path: '/menu1',
            buttons: [
              { id: 'btn1', type: 'BUTTON', name: 'Button 1', code: 'BTN1', menuId: 'menu1' },
            ],
          },
        ],
      },
    ]),
    pageSubjectPermissions: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    saveSubjectPermissions: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ButtonPermissionPage', () => {
  it('renders without crashing', async () => {
    render(<ButtonPermissionPage />);
    // Wait for loading to complete
    expect(await screen.findByText('auth.buttonPermission.title')).toBeInTheDocument();
  });
});