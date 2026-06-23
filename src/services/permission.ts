import { request } from '@/request/request';
import type { OrgTreeResp, RoleOptionResp, UserResp } from '@/types/auth-management';
import type {
  PageResp,
  PermissionGrantResp,
  PermissionPageReq,
  PermissionResourceGroup,
  PermissionSubject,
  SaveSubjectPermissionsReq,
} from '@/types/permission';

export interface PermissionSubjectBundle {
  orgs: PermissionSubject[];
  roles: PermissionSubject[];
  users: PermissionSubject[];
}

export interface PermissionService {
  listSubjects: () => Promise<PermissionSubjectBundle>;
  listResourceGroups: () => Promise<PermissionResourceGroup[]>;
  pageSubjectPermissions: (params: PermissionPageReq) => Promise<PageResp<PermissionGrantResp>>;
  saveSubjectPermissions: (data: SaveSubjectPermissionsReq) => Promise<void>;
}

function mapOrgSubject(org: OrgTreeResp): PermissionSubject {
  return {
    id: org.id,
    type: 'ORG',
    name: org.name,
    code: org.code,
    status: org.status,
    parentId: org.parentId,
    children: org.children?.map(mapOrgSubject),
  };
}

function mapRoleSubject(role: RoleOptionResp): PermissionSubject {
  return {
    id: role.id,
    type: 'ROLE',
    name: role.name,
    code: role.code,
  };
}

function mapUserSubject(user: UserResp): PermissionSubject {
  return {
    id: user.id,
    type: 'USER',
    name: user.nickname || user.username,
    code: user.username,
    status: user.status,
  };
}

export const permissionService: PermissionService = {
  async listSubjects() {
    const [orgs, roles, usersPage] = await Promise.all([
      request<OrgTreeResp[]>({ url: '/api/auth/orgs/tree', method: 'GET' }),
      request<RoleOptionResp[]>({ url: '/api/auth/roles/list', method: 'GET' }),
      request<PageResp<UserResp>>({
        url: '/api/auth/users/page',
        method: 'POST',
        data: { pageNum: 1, pageSize: 500 },
      }),
    ]);

    return {
      orgs: orgs.map(mapOrgSubject),
      roles: roles.map(mapRoleSubject),
      users: usersPage.records.map(mapUserSubject),
    };
  },

  listResourceGroups() {
    return request<PermissionResourceGroup[]>({ url: '/api/auth/menus/tree', method: 'GET' });
  },

  pageSubjectPermissions(params) {
    return request<PageResp<PermissionGrantResp>>({
      url: '/api/auth/permissions/page',
      method: 'POST',
      data: {
        pageNo: params.pageNo ?? 1,
        pageSize: params.pageSize ?? 500,
        ...params,
      },
    });
  },

  saveSubjectPermissions(data) {
    return request<void>({
      url: '/api/auth/permissions/batch-save',
      method: 'POST',
      data,
    });
  },
};
