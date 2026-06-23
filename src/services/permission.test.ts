import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { permissionService } from './permission';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('permissionService', () => {
  it('loads permissions for a selected subject', async () => {
    mockedRequest.mockResolvedValue({ records: [], total: 0 });

    await permissionService.pageSubjectPermissions({ subjectType: 'ROLE', subjectId: 'role-admin' });

    expect(mockedRequest).toHaveBeenCalledWith({
      url: '/api/auth/permissions/page',
      method: 'POST',
      data: {
        pageNo: 1,
        pageSize: 500,
        subjectType: 'ROLE',
        subjectId: 'role-admin',
      },
    });
  });

  it('saves all permissions for a subject through one service method', async () => {
    mockedRequest.mockResolvedValue(undefined);

    await permissionService.saveSubjectPermissions({
      subjectType: 'ORG',
      subjectId: 'org-rd',
      permissions: [
        { resourceType: 'MENU', resourceId: 'menu-user', effect: 'Allow', scope: 'ALL' },
        { resourceType: 'BUTTON', resourceId: 'btn-user-delete', effect: 'Deny', scope: 'ALL' },
      ],
    });

    expect(mockedRequest).toHaveBeenCalledWith({
      url: '/api/auth/permissions/batch-save',
      method: 'POST',
      data: {
        subjectType: 'ORG',
        subjectId: 'org-rd',
        permissions: [
          { resourceType: 'MENU', resourceId: 'menu-user', effect: 'Allow', scope: 'ALL' },
          { resourceType: 'BUTTON', resourceId: 'btn-user-delete', effect: 'Deny', scope: 'ALL' },
        ],
      },
    });
  });

  it('lists subjects by fetching orgs, roles, and users in parallel', async () => {
    const orgs = [{ id: 'org-rd', type: 'DEPARTMENT' as const, name: '研发中心', code: 'ORG_RD', status: 1 }];
    const roles = [{ id: 'role-admin', name: '超级管理员', code: 'ADMIN' }];
    const users = [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }];

    mockedRequest
      .mockResolvedValueOnce(orgs)
      .mockResolvedValueOnce(roles)
      .mockResolvedValueOnce({ records: users, total: 1 });

    const result = await permissionService.listSubjects();

    expect(result.orgs).toEqual([{ id: 'org-rd', type: 'ORG', name: '研发中心', code: 'ORG_RD', status: 1 }]);
    expect(result.roles).toEqual([{ id: 'role-admin', type: 'ROLE', name: '超级管理员', code: 'ADMIN' }]);
    expect(result.users).toEqual([{ id: 'user-1', type: 'USER', name: '云起', code: 'yunqi', status: 1 }]);

    expect(mockedRequest).toHaveBeenCalledTimes(3);
    expect(mockedRequest).toHaveBeenNthCalledWith(1, { url: '/api/auth/orgs/tree', method: 'GET' });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, { url: '/api/auth/roles/list', method: 'GET' });
    expect(mockedRequest).toHaveBeenNthCalledWith(3, {
      url: '/api/auth/users/page',
      method: 'POST',
      data: { pageNum: 1, pageSize: 500 },
    });
  });

  it('normalizes auth-management org, role, and user records into permission subject types', async () => {
    mockedRequest
      .mockResolvedValueOnce([
        {
          id: 'org-root',
          type: 'COMPANY',
          name: 'Cludix Nebula',
          code: 'CLUDIX',
          status: 1,
          children: [{ id: 'org-rd', type: 'DEPARTMENT', name: '研发中心', code: 'RND', status: 1 }],
        },
      ])
      .mockResolvedValueOnce([{ id: 'role-admin', name: '管理员', code: 'ADMIN' }])
      .mockResolvedValueOnce({ records: [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }], total: 1 });

    const result = await permissionService.listSubjects();

    expect(result.orgs[0]).toMatchObject({ id: 'org-root', type: 'ORG', name: 'Cludix Nebula', code: 'CLUDIX' });
    expect(result.orgs[0].children?.[0]).toMatchObject({ id: 'org-rd', type: 'ORG', name: '研发中心', code: 'RND' });
    expect(result.roles[0]).toMatchObject({ id: 'role-admin', type: 'ROLE', name: '管理员', code: 'ADMIN' });
    expect(result.users[0]).toMatchObject({ id: 'user-1', type: 'USER', name: '云起', code: 'yunqi' });
  });

  it('lists resource groups from the menu tree endpoint', async () => {
    const groups = [{ key: 'auth', name: '系统权限', menus: [] }];

    mockedRequest.mockResolvedValue(groups);

    const result = await permissionService.listResourceGroups();

    expect(result).toEqual(groups);
    expect(mockedRequest).toHaveBeenCalledWith({ url: '/api/auth/menus/tree', method: 'GET' });
  });
});
