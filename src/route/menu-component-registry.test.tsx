import { describe, expect, it } from 'vitest';
import { builtInMenuComponentRegistry } from './menu-component-registry';

describe('builtInMenuComponentRegistry', () => {
  it('keeps built-in route component defaults in the routing module', async () => {
    expect(builtInMenuComponentRegistry.UserManagementPage).toMatchObject({
      component: 'UserManagementPage',
      defaultName: '用户管理',
      defaultCode: 'USER_MANAGEMENT',
      defaultPath: '/system/operation/user',
      defaultIcon: 'UserOutlined',
    });
    expect(builtInMenuComponentRegistry.MenuManagementPage).toMatchObject({
      component: 'MenuManagementPage',
      defaultName: '菜单管理',
      defaultCode: 'MENU_MANAGEMENT',
      defaultPath: '/system/operation/menu',
    });

    await expect(builtInMenuComponentRegistry.UserManagementPage.loader()).resolves.toHaveProperty('default');
  });
});
