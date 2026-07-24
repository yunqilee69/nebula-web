import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NebulaProvider } from '@/providers/nebula-provider';
import { roleService as defaultRoleService } from '@/services/role';
import { useLocaleStore } from '@/stores/locale-store';
import type { RoleService } from '@/services/role';
import type { PageResp, RoleResp } from '@/types/role';
import { RoleManagementPage } from './index';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createRoleService(overrides: Partial<RoleService> = {}): RoleService {
  return {
    createRole: overrides.createRole ?? vi.fn(),
    updateRole: overrides.updateRole ?? vi.fn(),
    removeRole: overrides.removeRole ?? vi.fn(),
    getRoleById: overrides.getRoleById ?? vi.fn(),
    pageRoles: overrides.pageRoles ?? vi.fn(),
    listAllRoles: overrides.listAllRoles ?? vi.fn(),
  };
}

function renderRoleManagementPage(roleService: RoleService) {
  return render(
    <NebulaProvider>
      <RoleManagementPage roleService={roleService} />
    </NebulaProvider>,
  );
}

describe('RoleManagementPage', () => {
  beforeEach(() => {
    useLocaleStore.getState().setLocale('zh-CN');
  });

  afterEach(() => {
    useLocaleStore.getState().setLocale('zh-CN');
  });

  it('loads roles through ProTable with backend pageNum/pageSize fields', async () => {
    const page: PageResp<RoleResp> = {
      data: [{ id: 'role-1', name: '管理员', code: 'ADMIN', status: 1, createTime: '2026-06-06T10:00:00' }],
      total: 1,
    };
    const roleService = createRoleService({ pageRoles: vi.fn().mockResolvedValue(page) });

    renderRoleManagementPage(roleService);

    expect(await screen.findByText('管理员')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('启用')).toBeInTheDocument();
    expect(roleService.pageRoles).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 });
  });

  it('submits role filters to the page API and resets to the first page', async () => {
    const user = userEvent.setup();
    const page: PageResp<RoleResp> = { data: [], total: 0 };
    const roleService = createRoleService({ pageRoles: vi.fn().mockResolvedValue(page) });

    renderRoleManagementPage(roleService);

    await waitFor(() => {
      expect(roleService.pageRoles).toHaveBeenCalledTimes(1);
    });

    await user.type(screen.getByLabelText('角色名称'), '管理员');
    await user.type(screen.getByLabelText('角色编码'), 'ADMIN');
    await user.click(screen.getByLabelText('状态'));
    await user.click(await screen.findByTitle('启用'));
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(roleService.pageRoles).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 10,
        name: '管理员',
        code: 'ADMIN',
        status: 1,
      });
    });
  });

  it('renders page labels from the active English locale', async () => {
    useLocaleStore.getState().setLocale('en-US');
    const page: PageResp<RoleResp> = {
      data: [{ id: 'role-1', name: 'Operator', code: 'OPS', status: 1 }],
      total: 1,
    };
    const roleService = createRoleService({ pageRoles: vi.fn().mockResolvedValue(page) });

    renderRoleManagementPage(roleService);

    expect(screen.getByLabelText('Role Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Role Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New\s*Role/ })).toBeInTheDocument();
    expect(await screen.findByText('Enabled')).toBeInTheDocument();
  });

  it('uses the default role service when roleService is not provided', async () => {
    const pageRolesSpy = vi.spyOn(defaultRoleService, 'pageRoles').mockResolvedValue({
      data: [{ id: 'role-1', name: '管理员', code: 'ADMIN', status: 1 }],
      total: 1,
    });

    render(
      <NebulaProvider>
        <RoleManagementPage />
      </NebulaProvider>,
    );

    expect(await screen.findByText('管理员')).toBeInTheDocument();
    expect(pageRolesSpy).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 });
    expect(screen.queryByText('未配置角色服务')).not.toBeInTheDocument();
  });
});
