import { DashboardPage } from '@/pages/dashboard';
import { MenuManagementPage } from '@/pages/auth/menu';
import { OrgManagementPage } from '@/pages/auth/org';
import { PermissionConfigPage } from '@/pages/auth/permission';
import { RoleManagementPage } from '@/pages/auth/role';
import { UserManagementPage } from '@/pages/auth/user';
import type { MenuComponentRegistry } from './types';

export function createMenuComponentRegistry(registry: MenuComponentRegistry): MenuComponentRegistry {
  return registry;
}

function BuiltInMenuManagementPage() {
  return <MenuManagementPage componentRegistry={builtInMenuComponentRegistry} />;
}

// Component names here are the contract with backend menu records.
// 用户管理、组织管理、角色管理、权限配置、菜单管理等页面由后端菜单下发 path/component 后在这里解析。
export const builtInMenuComponentRegistry = createMenuComponentRegistry({
  DashboardPage: {
    component: 'DashboardPage',
    defaultName: '仪表盘',
    defaultCode: 'DASHBOARD',
    defaultPath: '/dashboard',
    loader: () => Promise.resolve({ default: DashboardPage }),
  },
  UserManagementPage: {
    component: 'UserManagementPage',
    defaultName: '用户管理',
    defaultCode: 'USER_MANAGEMENT',
    defaultPath: '/auth/user',
    defaultIcon: 'UserOutlined',
    loader: () => Promise.resolve({ default: UserManagementPage }),
  },
  OrgManagementPage: {
    component: 'OrgManagementPage',
    defaultName: '组织管理',
    defaultCode: 'ORG_MANAGEMENT',
    defaultPath: '/auth/org',
    loader: () => Promise.resolve({ default: OrgManagementPage }),
  },
  RoleManagementPage: {
    component: 'RoleManagementPage',
    defaultName: '角色管理',
    defaultCode: 'ROLE_MANAGEMENT',
    defaultPath: '/auth/role',
    loader: () => Promise.resolve({ default: RoleManagementPage }),
  },
  PermissionConfigPage: {
    component: 'PermissionConfigPage',
    defaultName: '权限配置',
    defaultCode: 'PERMISSION_CONFIG',
    defaultPath: '/auth/permission',
    loader: () => Promise.resolve({ default: PermissionConfigPage }),
  },
  MenuManagementPage: {
    component: 'MenuManagementPage',
    defaultName: '菜单管理',
    defaultCode: 'MENU_MANAGEMENT',
    defaultPath: '/auth/menu',
    loader: () => Promise.resolve({ default: BuiltInMenuManagementPage }),
  },
});
