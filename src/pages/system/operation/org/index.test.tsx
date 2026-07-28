import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { AuthManagementService } from '@/api/auth-management';
import { useLocaleStore } from '@/stores/locale-store';
import type { OrgResp, OrgTreeResp, PageResp } from '@/types/auth-management';
import { OrgManagementPage } from './index';

const orgTree: OrgTreeResp[] = [
  {
    id: 'org-root',
    name: 'Cludix Nebula',
    code: 'CLUDIX',
    type: 'COMPANY',
    status: 1,
    children: [
      { id: 'org-1', name: '研发中心', code: 'RND', type: 'DEPARTMENT', status: 1 },
    ],
  },
];

const orgPage: PageResp<OrgResp> = {
  data: [
    { id: 'org-1', name: '研发中心', code: 'RND', type: 'DEPARTMENT', status: 1 },
  ],
  total: 1,
};

function createService(overrides: Partial<AuthManagementService> = {}): AuthManagementService {
  return {
    pageUsers: vi.fn().mockResolvedValue({
      data: [],
      total: 0,
    } satisfies PageResp<OrgResp>),
    createUser: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn().mockResolvedValue(undefined),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    getUserDetail: vi.fn().mockResolvedValue({
      id: 'user-1',
      username: 'yunqi',
      nickname: '云起',
      status: 1,
    }),
    listRoles: vi.fn().mockResolvedValue([]),
    listOrgs: vi.fn().mockResolvedValue([]),
    getOrgTree: vi.fn().mockResolvedValue(orgTree),
    pageOrgs: vi.fn().mockResolvedValue(orgPage satisfies PageResp<OrgResp>),
    createOrg: vi.fn().mockResolvedValue(undefined),
    updateOrg: vi.fn().mockResolvedValue(undefined),
    deleteOrg: vi.fn().mockResolvedValue(undefined),
    getOrgDetail: vi.fn().mockResolvedValue({
      id: 'org-1',
      name: '研发中心',
      code: 'RND',
      type: 'DEPARTMENT',
      status: 1,
    }),
    ...overrides,
  };
}

function renderPage(service = createService()) {
  render(
    <NebulaProvider>
      <OrgManagementPage service={service} />
    </NebulaProvider>,
  );
  return service;
}

describe('OrgManagementPage', () => {
  afterEach(() => {
    act(() => {
      useLocaleStore.getState().setLocale('zh-CN');
    });
  });

  it('renders org tree, toolbar, and initial table rows', async () => {
    const service = renderPage();

    expect(await screen.findByRole('treeitem', { name: /Cludix Nebula/ })).toBeInTheDocument();
    expect(screen.getAllByLabelText('组织名称').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('组织编码').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /新增组织/ })).toBeInTheDocument();

    expect(await screen.findByRole('row', { name: /研发中心 RND/ })).toBeInTheDocument();

    expect(service.getOrgTree).toHaveBeenCalledTimes(1);
    expect(service.pageOrgs).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 });
  });

  it('filters table by parentId when a tree node is selected', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await waitFor(() => {
      expect(service.pageOrgs).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 });
    });

    const tree = await screen.findByRole('tree');
    expect(tree).toBeInTheDocument();

    const rootNode = await screen.findByRole('treeitem', { name: /Cludix Nebula/ });
    expect(rootNode).toBeInTheDocument();

    const expandButton = await screen.findByRole('button', { name: /展开.*Cludix Nebula/ });
    await user.click(expandButton);

    const childNode = await screen.findByRole('treeitem', { name: /研发中心/ });
    await user.click(childNode);

    await waitFor(() => {
      expect(service.pageOrgs).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 10,
        parentId: 'org-1',
      });
    });
  });

  it('opens create org dialog from toolbar button', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /新增组织/ }));

    const dialog = await screen.findByRole('dialog', { name: '新增组织' });
    expect(within(dialog).getByLabelText('组织名称')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('组织编码')).toBeInTheDocument();
  });

  it('renders page labels from the active English locale', async () => {
    act(() => {
      useLocaleStore.getState().setLocale('en-US');
    });

    renderPage();

    expect(await screen.findByRole('treeitem', { name: /Cludix Nebula/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Organization/ })).toBeInTheDocument();
  });
});
